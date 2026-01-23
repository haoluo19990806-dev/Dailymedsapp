import { HistoryRecord, TimelineEvent } from '@/types';
import NetInfo from '@react-native-community/netinfo';
import { offlineStorage } from './offlineStorage';
import { syncQueue } from './syncQueue';
import { supabase } from './supabase';

const transformLogsToHistory = (logs: any[]): HistoryRecord => {
  const history: HistoryRecord = {};
  logs.forEach(log => {
    const date = new Date(Number(log.timestamp));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const event: TimelineEvent = {
      id: log.id,
      type: log.type as 'MEDICATION' | 'HEALTH_RECORD',
      timestamp: Number(log.timestamp),
      dateKey: dateKey,
      note: log.note || '',
      medId: log.med_id,
      isTaken: true,
      healthType: log.health_type,
      healthValue: log.health_value,
      isImportant: log.is_important || false
    };

    if (!history[dateKey]) history[dateKey] = [];
    history[dateKey].push(event);
  });
  return history;
};

export const historyService = {
  // 1. 获取历史（离线优先：先返回本地数据，后台同步云端）
  fetchHistory: async (targetUserId?: string): Promise<HistoryRecord> => {
    // 确定用户ID
    let userId = targetUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      userId = user.id;
    }

    // 先返回本地数据（立即响应，不等待网络，按用户隔离）
    const localHistory = await offlineStorage.loadHistory(userId);
    
    // 后台静默同步云端数据（不阻塞UI）
    historyService.syncFromCloud(targetUserId).catch(e => {
      console.error('后台同步失败', e);
    });
    
    return localHistory;
  },

  // 2. 静默同步云端数据（后台执行）
  syncFromCloud: async (targetUserId?: string): Promise<HistoryRecord> => {
    try {
      // 确定用户ID
      let userId = targetUserId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return await offlineStorage.loadHistory();
        userId = user.id;
      }

      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return await offlineStorage.loadHistory(userId); // 无网络，返回本地数据（按用户隔离）
      }

    const { data, error } = await supabase
      .from('history_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('获取历史失败:', error);
        return await offlineStorage.loadHistory(userId);
    }

      const cloudHistory = transformLogsToHistory(data);
      // 合并云端和本地数据（按用户隔离）
      const merged = await offlineStorage.mergeCloudHistory(cloudHistory, userId);
      await offlineStorage.saveLastSyncTime(userId);
      return merged;
    } catch (e) {
      console.error('同步云端数据失败', e);
      return await offlineStorage.loadHistory(targetUserId);
    }
  },

  // 3. 添加记录（离线优先：立即保存本地，后台同步云端）
  addEvent: async (event: TimelineEvent, targetUserId?: string) => {
    // 确定用户ID
    let userId = targetUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // 未登录，无法添加记录
        throw new Error('未登录，无法添加记录');
      }
      userId = user.id;
    }

    // 生成临时ID（如果还没有）
    if (!event.id || event.id.startsWith('temp-')) {
      event.id = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // 立即保存到本地（用户立即看到效果，按用户隔离）
    await offlineStorage.addEventLocally(event, userId);

    // 检查网络状态
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      // 有网络，尝试立即同步
      try {
    let userId = targetUserId;
    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            // 未登录，加入队列
            await syncQueue.addTask({
              id: event.id,
              type: 'ADD',
              event,
              targetUserId,
            });
            return { id: event.id, ...event };
          }
        userId = user.id;
    }

    const dbPayload = {
          user_id: userId,
      type: event.type,
      timestamp: event.timestamp,
      med_id: event.type === 'MEDICATION' ? event.medId : null,
      health_type: event.type === 'HEALTH_RECORD' ? event.healthType : null,
      health_value: event.type === 'HEALTH_RECORD' ? event.healthValue : null,
      note: event.note
    };

    const { data, error } = await supabase.from('history_logs').insert([dbPayload]).select().single();
        
        if (!error && data) {
          // 同步成功，更新本地ID（按用户隔离）
          const updatedEvent = { ...event, id: data.id };
          const history = await offlineStorage.loadHistory(userId);
          if (history[event.dateKey]) {
            const index = history[event.dateKey].findIndex(e => e.id === event.id);
            if (index >= 0) {
              history[event.dateKey][index] = updatedEvent;
              await offlineStorage.saveHistory(history, userId);
            }
          }
    return data;
        } else {
          // 同步失败，加入队列
          await syncQueue.addTask({
            id: event.id,
            type: 'ADD',
            event,
            targetUserId,
          });
          return { id: event.id, ...event };
        }
      } catch (e) {
        console.error('立即同步失败，加入队列', e);
        // 同步失败，加入队列
        await syncQueue.addTask({
          id: event.id,
          type: 'ADD',
          event,
          targetUserId,
        });
        return { id: event.id, ...event };
      }
    } else {
      // 无网络，加入同步队列
      await syncQueue.addTask({
        id: event.id,
        type: 'ADD',
        event,
        targetUserId,
      });
      return { id: event.id, ...event };
    }
  },

  // 4. 切换重要标记
  toggleImportant: async (eventId: string, isImportant: boolean, targetUserId?: string): Promise<boolean> => {
    // 确定用户ID
    let userId = targetUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      userId = user.id;
    }

    // 如果是临时ID，只更新本地（按用户隔离）
    if (eventId.startsWith('temp-')) {
      const history = await offlineStorage.loadHistory(userId);
      for (const dateKey in history) {
        const index = history[dateKey].findIndex(e => e.id === eventId);
        if (index >= 0) {
          history[dateKey][index].isImportant = isImportant;
          await offlineStorage.saveHistory(history, userId);
          return true;
        }
      }
      return false;
    }

    // 检查网络状态
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      try {
        const { error } = await supabase
          .from('history_logs')
          .update({ is_important: isImportant })
          .eq('id', eventId);
        
        if (error) {
          console.error('更新重要标记失败:', error);
          return false;
        }
        
        // 同步更新本地（按用户隔离）
        const history = await offlineStorage.loadHistory(userId);
        for (const dateKey in history) {
          const index = history[dateKey].findIndex(e => e.id === eventId);
          if (index >= 0) {
            history[dateKey][index].isImportant = isImportant;
            await offlineStorage.saveHistory(history, userId);
            break;
          }
        }
        return true;
      } catch (e) {
        console.error('更新重要标记异常:', e);
        return false;
      }
    }
    return false;
  },

  // 5. 获取重要记录（按月份）
  fetchImportantRecords: async (year: number, month: number, targetUserId?: string): Promise<HistoryRecord> => {
    try {
      let userId = targetUserId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return {};
        userId = user.id;
      }

      // 计算月份的开始和结束时间戳
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();

      const { data, error } = await supabase
        .from('history_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_important', true)
        .gte('timestamp', startTimestamp)
        .lte('timestamp', endTimestamp)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('获取重要记录失败:', error);
        return {};
      }

      return transformLogsToHistory(data || []);
    } catch (e) {
      console.error('获取重要记录异常:', e);
      return {};
    }
  },

  // 6. 删除记录（离线优先）
  deleteEvent: async (eventId: string, targetUserId?: string) => {
    // 确定用户ID
    let userId = targetUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
    }

    // 先删除本地（按用户隔离）
    const history = await offlineStorage.loadHistory(userId);
    let eventToDelete: TimelineEvent | null = null;
    let dateKey = '';

    for (const key in history) {
      const event = history[key].find(e => e.id === eventId);
      if (event) {
        eventToDelete = event;
        dateKey = key;
        break;
      }
    }

    if (eventToDelete) {
      await offlineStorage.removeEventLocally(eventId, dateKey, userId);
    }

    // 如果是临时ID，不需要同步删除
    if (eventId.startsWith('temp-')) {
      return;
    }

    // 检查网络状态
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      // 有网络，尝试立即删除
      try {
    const { error } = await supabase.from('history_logs').delete().eq('id', eventId);
        if (error) {
          console.error('删除记录失败:', error);
          // 删除失败，加入队列
          if (eventToDelete) {
            await syncQueue.addTask({
              id: eventId,
              type: 'DELETE',
              event: eventToDelete,
            });
          }
        }
      } catch (e) {
        console.error('删除记录异常:', e);
        // 异常，加入队列
        if (eventToDelete) {
          await syncQueue.addTask({
            id: eventId,
            type: 'DELETE',
            event: eventToDelete,
          });
        }
      }
    } else {
      // 无网络，加入队列
      if (eventToDelete) {
        await syncQueue.addTask({
          id: eventId,
          type: 'DELETE',
          event: eventToDelete,
        });
      }
    }
  }
};