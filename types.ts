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

// 【新增】身体数据类型
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

// 1. 药物配置 (MedConfig) - 保持不变，但增加可选字段以便扩展
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

// 2. 【新增】身体数据记录值结构
export interface HealthValue {
  value1: number;       // 主数值 (如血糖值、高压、体温)
  value2?: number;      // 副数值 (如低压，仅血压需要)
  unit: string;         // 单位 (如 mmHg, mmol/L, kg)
}

// 3. 【升级】时间线事件类型 (TimelineEvent)
// 这是一个联合类型，用于在历史页面混合展示
export type EventType = 'MEDICATION' | 'HEALTH_RECORD';

export interface TimelineEvent {
  id: string;           // 事件唯一ID (UUID)
  type: EventType;      // 事件类型: 吃药 或 测数据
  timestamp: number;    // 精确时间戳 (Date.now())
  dateKey: string;      // 日期键 "YYYY-MM-DD" (方便索引)
  
  // --- 如果是“吃药”事件 ---
  medId?: string;       // 关联的药物配置ID
  medName?: string;     // 冗余存储药物名称 (防止配置被删后无法显示)
  isTaken?: boolean;    // 是否已服 (通常为true)

  // --- 如果是“身体数据”事件 ---
  healthType?: HealthDataType; // 数据类型 (血压/血糖等)
  healthValue?: HealthValue;   // 数值对象
  note?: string;               // 备注 (如 "饭后", "感觉头晕")
}

// 4. 【重构】历史记录存储结构
// 旧结构: { "2023-10-01": ["med_id_1", "med_id_2"] }
// 新结构: { "2023-10-01": [TimelineEvent, TimelineEvent...] }
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