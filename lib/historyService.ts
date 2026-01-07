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
      healthValue: log.health_value
    };

    if (!history[dateKey]) history[dateKey] = [];
    history[dateKey].push(event);
  });
  return history;
};

export const historyService = {
  // 1. 获取历史（离线优先：先返回本地数据，后台同步云端）
  fetchHistory: async (targetUserId?: string): Promise<HistoryRecord> => {
    // 先返回本地数据（立即响应，不等待网络）
    const localHistory = await offlineStorage.loadHistory();
    
    // 后台静默同步云端数据（不阻塞UI）
    historyService.syncFromCloud(targetUserId).catch(e => {
      console.error('后台同步失败', e);
    });
    
    return localHistory;
  },

  // 2. 静默同步云端数据（后台执行）
  syncFromCloud: async (targetUserId?: string): Promise<HistoryRecord> => {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return await offlineStorage.loadHistory(); // 无网络，返回本地数据
      }

      let userId = targetUserId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return await offlineStorage.loadHistory();
        userId = user.id;
      }

      const { data, error } = await supabase
        .from('history_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('获取历史失败:', error);
        return await offlineStorage.loadHistory();
      }

      const cloudHistory = transformLogsToHistory(data);
      // 合并云端和本地数据
      const merged = await offlineStorage.mergeCloudHistory(cloudHistory);
      await offlineStorage.saveLastSyncTime();
      return merged;
    } catch (e) {
      console.error('同步云端数据失败', e);
      return await offlineStorage.loadHistory();
    }
  },

  // 3. 添加记录（离线优先：立即保存本地，后台同步云端）
  addEvent: async (event: TimelineEvent, targetUserId?: string) => {
    // 生成临时ID（如果还没有）
    if (!event.id || event.id.startsWith('temp-')) {
      event.id = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // 立即保存到本地（用户立即看到效果）
    await offlineStorage.addEventLocally(event);

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
          // 同步成功，更新本地ID
          const updatedEvent = { ...event, id: data.id };
          const history = await offlineStorage.loadHistory();
          if (history[event.dateKey]) {
            const index = history[event.dateKey].findIndex(e => e.id === event.id);
            if (index >= 0) {
              history[event.dateKey][index] = updatedEvent;
              await offlineStorage.saveHistory(history);
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

  // 4. 删除记录（离线优先）
  deleteEvent: async (eventId: string) => {
    // 先删除本地
    const history = await offlineStorage.loadHistory();
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
      await offlineStorage.removeEventLocally(eventId, dateKey);
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