// 药物图标类型
export enum MedIconType {
  CANDY = 'CANDY',
  DROP = 'DROP',
  NEEDLE = 'NEEDLE',
  CAPSULE = 'CAPSULE',
  PILL = 'PILL',
  PATCH = 'PATCH',
}

// 服药时间段
export enum TimeOfDay {
  MORNING = 'MORNING',
  NOON = 'NOON',
  EVENING = 'EVENING',
}

// 服药频率
export enum FrequencyType {
  WEEKLY = 'WEEKLY',
  INTERVAL = 'INTERVAL',
}

// 身体数据类型
export enum HealthDataType {
  BLOOD_PRESSURE = 'BLOOD_PRESSURE', // 血压 (高压/低压)
  BLOOD_SUGAR = 'BLOOD_SUGAR',       // 血糖
  TEMPERATURE = 'TEMPERATURE',       // 体温
  WEIGHT = 'WEIGHT',                 // 体重
  SPO2 = 'SPO2',                     // 血氧
  HEART_RATE = 'HEART_RATE',         // 心率
  OTHER = 'OTHER'                    // 其他
}

// --- 核心接口定义 ---

// 1. 药物配置
export interface MedConfig {
  id: string;
  iconType: MedIconType;
  timeOfDay: TimeOfDay;
  colorClass: string;
  shadowClass: string;
  frequencyType: FrequencyType;
  days: number[]; // 1-7 (Mon-Sun)
  interval?: number;
  startDate?: string;
  name?: string;
}

// 2. 身体数据记录值结构
export interface HealthValue {
  value1: number;       // 主数值
  value2?: number;      // 副数值
  unit: string;         // 单位
}

// 3. 时间线事件类型
export type EventType = 'MEDICATION' | 'HEALTH_RECORD';

export interface TimelineEvent {
  id: string;           // 事件唯一ID
  type: EventType;      // 事件类型
  timestamp: number;    // 精确时间戳
  dateKey: string;      // 日期键 "YYYY-MM-DD"
  
  // 吃药事件字段
  medId?: string;       
  medName?: string;     
  isTaken?: boolean;    

  // 身体数据事件字段
  healthType?: HealthDataType; 
  healthValue?: HealthValue;   
  note?: string;
  
  // 重要标记
  isImportant?: boolean;
}

// 4. 历史记录存储结构
export interface HistoryRecord {
  [date: string]: TimelineEvent[]; 
}

// 5. 老人/患者档案
export interface Senior {
  id: string;
  note: string;
  config: MedConfig[];
  history: HistoryRecord;
}

// --- 【补全】缺失的类型定义 ---

// 6. 监督者概览数据项 (DashboardItem)
export interface DashboardItem {
  id: string;
  name: string;
  total: number;
  taken: number;
  isAllDone: boolean;
}

// 7. 页面标签 (Tab)
export type Tab = 
  | 'HOME'        // 概览 / 患者主页
  | 'SETTINGS'    // 设置
  | 'TASKS'       // 专注模式：任务
  | 'FOCUS_HISTORY' // 专注模式：历史
  | 'FOCUS_TRENDS'  // 专注模式：趋势
  | 'FOCUS_IMPORTANT_RECORDS' // 专注模式：重要记录
  | 'ADD_MED' 
  | 'LANGUAGE'
  | 'TRENDS'      // 患者模式趋势
  | 'HISTORY'     // 患者模式历史
  | 'IMPORTANT_RECORDS'; // 重要记录页面

// 8. 应用模式 (AppMode)
export type AppMode = 'LANDING' | 'USER' | 'SUPERVISOR';