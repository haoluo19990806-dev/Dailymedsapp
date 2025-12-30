import { HistoryRecord, TimelineEvent } from '@/types';
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
  // 1. 获取历史
  fetchHistory: async (targetUserId?: string): Promise<HistoryRecord> => {
    let userId = targetUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('history_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('获取历史失败:', error);
      return {};
    }
    return transformLogsToHistory(data);
  },

  // 2. 添加记录 (🔥 升级：支持传入 targetUserId)
  addEvent: async (event: TimelineEvent, targetUserId?: string) => {
    // 如果传了 targetUserId (比如监督者代写)，就用它
    // 否则获取当前登录用户 ID (自己写)
    let userId = targetUserId;
    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        userId = user.id;
    }

    const dbPayload = {
      user_id: userId, // ✅ 写入目标 ID
      type: event.type,
      timestamp: event.timestamp,
      med_id: event.type === 'MEDICATION' ? event.medId : null,
      health_type: event.type === 'HEALTH_RECORD' ? event.healthType : null,
      health_value: event.type === 'HEALTH_RECORD' ? event.healthValue : null,
      note: event.note
    };

    const { data, error } = await supabase.from('history_logs').insert([dbPayload]).select().single();
    if (error) throw error;
    return data;
  },

  // 3. 删除记录
  deleteEvent: async (eventId: string) => {
    const { error } = await supabase.from('history_logs').delete().eq('id', eventId);
    if (error) console.error('删除记录失败:', error);
  }
};