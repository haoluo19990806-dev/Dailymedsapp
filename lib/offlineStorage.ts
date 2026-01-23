import { HistoryRecord, TimelineEvent } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  HISTORY_PREFIX: 'offline_history_',
  PENDING_SYNC: 'pending_sync_queue',
  LAST_SYNC_TIME_PREFIX: 'last_sync_time_',
};

/**
 * 获取当前用户ID（用于缓存键）
 */
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (e) {
    return null;
  }
};

/**
 * 获取用户特定的缓存键
 */
const getUserHistoryKey = async (userId?: string): Promise<string> => {
  const uid = userId || await getCurrentUserId();
  if (!uid) {
    throw new Error('无法获取用户ID，无法访问缓存');
  }
  return `${STORAGE_KEYS.HISTORY_PREFIX}${uid}`;
};

const getUserSyncTimeKey = async (userId?: string): Promise<string> => {
  const uid = userId || await getCurrentUserId();
  if (!uid) {
    throw new Error('无法获取用户ID，无法访问缓存');
  }
  return `${STORAGE_KEYS.LAST_SYNC_TIME_PREFIX}${uid}`;
};

/**
 * 离线存储服务 - 优先使用本地数据，确保无网络也能使用
 * 按用户ID隔离缓存，避免数据混乱
 */
export const offlineStorage = {
  /**
   * 保存历史记录到本地（立即生效，按用户隔离）
   */
  saveHistory: async (history: HistoryRecord, userId?: string): Promise<void> => {
    try {
      const key = await getUserHistoryKey(userId);
      await AsyncStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.error('保存本地历史失败', e);
    }
  },

  /**
   * 从本地加载历史记录（优先使用，按用户隔离）
   */
  loadHistory: async (userId?: string): Promise<HistoryRecord> => {
    try {
      const key = await getUserHistoryKey(userId);
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('加载本地历史失败', e);
    }
    return {};
  },

  /**
   * 添加事件到本地（立即生效，不等待云端，按用户隔离）
   */
  addEventLocally: async (event: TimelineEvent, userId?: string): Promise<void> => {
    try {
      // 验证 dateKey 是否存在
      if (!event.dateKey || typeof event.dateKey !== 'string') {
        console.error('addEventLocally: event.dateKey is missing or invalid', event);
        return;
      }

      const history = await offlineStorage.loadHistory(userId);
      const dateKey = event.dateKey;
      
      if (!history[dateKey]) {
        history[dateKey] = [];
      }
      
      // 检查是否已存在（避免重复）
      const exists = history[dateKey].some(e => 
        e.id === event.id || 
        (e.type === 'MEDICATION' && e.medId === event.medId && e.dateKey === event.dateKey)
      );
      
      if (!exists) {
        history[dateKey].push(event);
        await offlineStorage.saveHistory(history, userId);
      }
    } catch (e) {
      console.error('本地添加事件失败', e);
    }
  },

  /**
   * 从本地删除事件（立即生效，按用户隔离）
   */
  removeEventLocally: async (eventId: string, dateKey: string, userId?: string): Promise<void> => {
    try {
      const history = await offlineStorage.loadHistory(userId);
      if (history[dateKey]) {
        history[dateKey] = history[dateKey].filter(e => e.id !== eventId);
        await offlineStorage.saveHistory(history, userId);
      }
    } catch (e) {
      console.error('本地删除事件失败', e);
    }
  },

  /**
   * 合并云端数据到本地（智能合并，避免冲突，按用户隔离）
   */
  mergeCloudHistory: async (cloudHistory: HistoryRecord, userId?: string): Promise<HistoryRecord> => {
    try {
      const localHistory = await offlineStorage.loadHistory(userId);
      const merged: HistoryRecord = { ...cloudHistory };

      // 合并本地数据（保留本地未同步的记录）
      Object.keys(localHistory).forEach(dateKey => {
        if (!merged[dateKey]) {
          merged[dateKey] = [];
        }

        localHistory[dateKey].forEach(localEvent => {
          // 如果本地事件有 temp-id，说明是未同步的，需要保留
          if (localEvent.id && localEvent.id.startsWith('temp-')) {
            // 检查云端是否已有相同记录
            const cloudExists = merged[dateKey].some(e => 
              e.type === localEvent.type &&
              e.medId === localEvent.medId &&
              e.timestamp === localEvent.timestamp
            );
            
            if (!cloudExists) {
              merged[dateKey].push(localEvent);
            }
          } else {
            // 已同步的记录，检查云端是否有更新
            const cloudEvent = merged[dateKey].find(e => e.id === localEvent.id);
            if (!cloudEvent) {
              // 云端没有，保留本地
              merged[dateKey].push(localEvent);
            }
          }
        });

        // 按时间戳排序
        merged[dateKey].sort((a, b) => a.timestamp - b.timestamp);
      });

      // 保存合并后的数据（按用户隔离）
      await offlineStorage.saveHistory(merged, userId);
      return merged;
    } catch (e) {
      console.error('合并数据失败', e);
      return cloudHistory;
    }
  },

  /**
   * 保存最后同步时间（按用户隔离）
   */
  saveLastSyncTime: async (userId?: string): Promise<void> => {
    try {
      const key = await getUserSyncTimeKey(userId);
      await AsyncStorage.setItem(key, Date.now().toString());
    } catch (e) {
      console.error('保存同步时间失败', e);
    }
  },

  /**
   * 获取最后同步时间（按用户隔离）
   */
  getLastSyncTime: async (userId?: string): Promise<number> => {
    try {
      const key = await getUserSyncTimeKey(userId);
      const time = await AsyncStorage.getItem(key);
      return time ? parseInt(time, 10) : 0;
    } catch (e) {
      return 0;
    }
  },
};
