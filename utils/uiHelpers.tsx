import {
  BoxIcon,
  CandyIcon,
  CapsuleIcon,
  DropIcon,
  EveningIcon,
  NeedleIcon,
  NoonIcon,
  PillIcon
} from '@/components/Icons';
import { HealthDataType, MedIconType, TimeOfDay } from '@/types';
import React from 'react';
import { View } from 'react-native';

// 1. 获取药物对应的颜色样式
export const getMedStyles = (type: MedIconType) => {
  switch (type) {
    case MedIconType.CANDY: return { bg: 'bg-sugar-pending' };
    case MedIconType.DROP: return { bg: 'bg-pressure-pending' };
    case MedIconType.NEEDLE: return { bg: 'bg-insulin-pending' };
    case MedIconType.CAPSULE: return { bg: 'bg-capsule-pending' };
    case MedIconType.PILL: return { bg: 'bg-pill-pending' };
    case MedIconType.PATCH: return { bg: 'bg-patch-pending' };
    default: return { bg: 'bg-slate-400' };
  }
};

// 2. 渲染药物图标
export const renderMedIcon = (type: MedIconType, size = 32, color = "white") => {
  switch (type) {
    case MedIconType.CANDY: return <CandyIcon size={size} color={color} />;
    case MedIconType.DROP: return <DropIcon size={size} color={color} />;
    case MedIconType.NEEDLE: return <NeedleIcon size={size} color={color} />;
    case MedIconType.CAPSULE: return <CapsuleIcon size={size} color={color} />;
    case MedIconType.PILL: return <PillIcon size={size} color={color} />;
    case MedIconType.PATCH: return <BoxIcon size={size} color={color} />;
    default: return <CandyIcon size={size} color={color} />;
  }
};

// 3. 渲染时间图标 (优化版：早晨显示为地平线升起的半个太阳)
export const renderTimeIcon = (time: TimeOfDay, size = 24, color = "#94a3b8") => {
  switch(time) {
    case TimeOfDay.MORNING:
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {/* 裁剪下半部分，模拟日出 */}
          <View style={{ width: size, height: size * 0.6, overflow: 'hidden', alignItems: 'center' }}>
            <NoonIcon size={size} color={color} />
          </View>
          {/* 底部加一条地平线 */}
          <View style={{ width: size, height: 2, backgroundColor: color, marginTop: 1, opacity: 0.5 }} />
        </View>
      );
    case TimeOfDay.NOON: 
      return <NoonIcon size={size} color={color} />;
    case TimeOfDay.EVENING: 
      return <EveningIcon size={size} color={color} />;
    default: 
      return null;
  }
};

// 4. 渲染健康数据图标
export const renderHealthIcon = (type: HealthDataType, size = 24, color = "white") => {
  switch (type) {
    case HealthDataType.BLOOD_PRESSURE: return <DropIcon size={size} color={color} />;
    case HealthDataType.BLOOD_SUGAR: return <CandyIcon size={size} color={color} />;
    case HealthDataType.TEMPERATURE: return <NeedleIcon size={size} color={color} />;
    case HealthDataType.WEIGHT: return <BoxIcon size={size} color={color} />;
    case HealthDataType.HEART_RATE: return <DropIcon size={size} color={color} />;
    case HealthDataType.SPO2: return <DropIcon size={size} color={color} />;
    default: return <BoxIcon size={size} color={color} />;
  }
};

// 5. 获取健康数据类型的显示名称和单位
export const getHealthTypeInfo = (type: HealthDataType) => {
  switch (type) {
    case HealthDataType.BLOOD_PRESSURE: return { label: "血压", unit: "mmHg", color: "bg-red-400" };
    case HealthDataType.BLOOD_SUGAR: return { label: "血糖", unit: "mmol/L", color: "bg-orange-400" };
    case HealthDataType.TEMPERATURE: return { label: "体温", unit: "°C", color: "bg-blue-400" };
    case HealthDataType.WEIGHT: return { label: "体重", unit: "kg", color: "bg-green-400" };
    case HealthDataType.HEART_RATE: return { label: "心率", unit: "bpm", color: "bg-rose-500" };
    case HealthDataType.SPO2: return { label: "血氧", unit: "%", color: "bg-sky-500" };
    default: return { label: "其他", unit: "", color: "bg-slate-400" };
  }
};