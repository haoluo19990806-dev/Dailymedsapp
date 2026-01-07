import { TimelineEvent } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { historyService } from './historyService';

const QUEUE_KEY = 'sync_queue';

interface SyncTask {
  id: string;
  type: 'ADD' | 'DELETE';
  event: TimelineEvent;
  targetUserId?: string;
  timestamp: number;
  retries: number;
}

/**
 * 同步队列服务 - 后台静默同步离线操作
 */
export const syncQueue = {
  /**
   * 添加同步任务到队列
   */
  addTask: async (task: Omit<SyncTask, 'timestamp' | 'retries'>): Promise<void> => {
    try {
      const queue = await syncQueue.getQueue();
      queue.push({
        ...task,
        timestamp: Date.now(),
        retries: 0,
      });
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('添加同步任务失败', e);
    }
  },

  /**
   * 获取队列
   */
  getQueue: async (): Promise<SyncTask[]> => {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * 清空队列
   */
  clearQueue: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch (e) {
      console.error('清空队列失败', e);
    }
  },

  /**
   * 移除已完成的任务
   */
  removeTask: async (taskId: string): Promise<void> => {
    try {
      const queue = await syncQueue.getQueue();
      const filtered = queue.filter(t => t.id !== taskId);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('移除任务失败', e);
    }
  },

  /**
   * 执行同步（静默后台执行，不阻塞UI）
   */
  sync: async (): Promise<void> => {
    try {
      // 检查网络状态
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return; // 无网络，跳过同步
      }

      const queue = await syncQueue.getQueue();
      if (queue.length === 0) {
        return; // 队列为空
      }

      // 按时间顺序处理任务
      const sortedQueue = queue.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const task of sortedQueue) {
        try {
          if (task.type === 'ADD') {
            // 尝试同步到云端
            const result = await historyService.addEvent(task.event, task.targetUserId);
            if (result) {
              // 同步成功，移除任务
              await syncQueue.removeTask(task.id);
            } else {
              // 同步失败，增加重试次数
              task.retries++;
              if (task.retries < 3) {
                // 更新队列
                await syncQueue.removeTask(task.id);
                await syncQueue.addTask(task);
              } else {
                // 超过重试次数，移除任务（避免无限重试）
                await syncQueue.removeTask(task.id);
              }
            }
          } else if (task.type === 'DELETE') {
            // 删除操作
            if (task.event.id && !task.event.id.startsWith('temp-')) {
              await historyService.deleteEvent(task.event.id);
              await syncQueue.removeTask(task.id);
            } else {
              // temp-id 不需要同步删除
              await syncQueue.removeTask(task.id);
            }
          }
        } catch (e) {
          console.error(`同步任务失败 ${task.id}:`, e);
          // 增加重试次数
          task.retries++;
          if (task.retries < 3) {
            await syncQueue.removeTask(task.id);
            await syncQueue.addTask(task);
          } else {
            await syncQueue.removeTask(task.id);
          }
        }
      }
    } catch (e) {
      console.error('同步队列执行失败', e);
    }
  },

  /**
   * 启动自动同步（每30秒检查一次）
   */
  startAutoSync: (): (() => void) => {
    let intervalId: NodeJS.Timeout | null = null;
    
    const sync = () => {
      syncQueue.sync().catch(e => {
        console.error('自动同步失败', e);
      });
    };

    // 立即执行一次
    sync();

    // 每30秒执行一次
    intervalId = setInterval(sync, 30000);

    // 返回清理函数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  },
};
