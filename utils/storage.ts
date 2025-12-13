import { HistoryRecord, TimelineEvent } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  MED_CONFIG: 'med_config',
  MED_HISTORY: 'med_history',
  SUPERVISOR_CODE: 'supervisor_code',
  APP_MODE: 'app_mode'
};

export const saveData = async (key: string, value: any) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error("Saving data failed", e);
  }
};

export const loadData = async (key: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error("Loading data failed", e);
    return null;
  }
};

/**
 * 数据迁移函数：将旧版历史记录 (string[]) 转换为新版 (TimelineEvent[])
 * @param oldHistory 旧版数据对象
 * @returns 新版 TimelineEvent[] 结构的历史记录
 */
export const migrateHistoryData = (oldHistory: any): HistoryRecord => {
  const newHistory: HistoryRecord = {};

  if (!oldHistory) return {};

  Object.keys(oldHistory).forEach(dateKey => {
    const dayData = oldHistory[dateKey];

    // 检查是否是旧数据（旧数据是字符串数组）
    if (Array.isArray(dayData) && dayData.length > 0 && typeof dayData[0] === 'string') {
      console.log(`正在迁移 ${dateKey} 的旧数据...`);
      
      const newEvents: TimelineEvent[] = dayData.map((medId: string) => ({
        id: Math.random().toString(36).substr(2, 9), // 生成随机ID
        type: 'MEDICATION',
        timestamp: new Date(dateKey + 'T12:00:00').getTime(), // 旧数据默认为当天中午12点
        dateKey: dateKey,
        medId: medId,
        isTaken: true
      }));
      
      newHistory[dateKey] = newEvents;
    } else {
      // 已经是新结构，直接保留
      newHistory[dateKey] = dayData;
    }
  });

  return newHistory;
};