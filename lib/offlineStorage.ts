import { HistoryRecord, TimelineEvent } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  HISTORY: 'offline_history',
  PENDING_SYNC: 'pending_sync_queue',
  LAST_SYNC_TIME: 'last_sync_time',
};

/**
 * 离线存储服务 - 优先使用本地数据，确保无网络也能使用
 */
export const offlineStorage = {
  /**
   * 保存历史记录到本地（立即生效）
   */
  saveHistory: async (history: HistoryRecord): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('保存本地历史失败', e);
    }
  },

  /**
   * 从本地加载历史记录（优先使用）
   */
  loadHistory: async (): Promise<HistoryRecord> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('加载本地历史失败', e);
    }
    return {};
  },

  /**
   * 添加事件到本地（立即生效，不等待云端）
   */
  addEventLocally: async (event: TimelineEvent): Promise<void> => {
    try {
      const history = await offlineStorage.loadHistory();
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
        await offlineStorage.saveHistory(history);
      }
    } catch (e) {
      console.error('本地添加事件失败', e);
    }
  },

  /**
   * 从本地删除事件（立即生效）
   */
  removeEventLocally: async (eventId: string, dateKey: string): Promise<void> => {
    try {
      const history = await offlineStorage.loadHistory();
      if (history[dateKey]) {
        history[dateKey] = history[dateKey].filter(e => e.id !== eventId);
        await offlineStorage.saveHistory(history);
      }
    } catch (e) {
      console.error('本地删除事件失败', e);
    }
  },

  /**
   * 合并云端数据到本地（智能合并，避免冲突）
   */
  mergeCloudHistory: async (cloudHistory: HistoryRecord): Promise<HistoryRecord> => {
    try {
      const localHistory = await offlineStorage.loadHistory();
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

      // 保存合并后的数据
      await offlineStorage.saveHistory(merged);
      return merged;
    } catch (e) {
      console.error('合并数据失败', e);
      return cloudHistory;
    }
  },

  /**
   * 保存最后同步时间
   */
  saveLastSyncTime: async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, Date.now().toString());
    } catch (e) {
      console.error('保存同步时间失败', e);
    }
  },

  /**
   * 获取最后同步时间
   */
  getLastSyncTime: async (): Promise<number> => {
    try {
      const time = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
      return time ? parseInt(time, 10) : 0;
    } catch (e) {
      return 0;
    }
  },
};
