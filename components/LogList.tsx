import { HealthDataType, MedIconType, TimelineEvent } from '@/types';
import { getHealthTypeInfo, getMedStyles, renderMedIcon } from '@/utils/uiHelpers';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

interface LogListProps {
  events: TimelineEvent[];
  getMedConfig: (medId: string) => any;
}

export const LogList: React.FC<LogListProps> = ({ events, getMedConfig }) => {
  // 按时间戳正序排列
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (sortedEvents.length === 0) {
    return (
      <View className="flex-1 bg-slate-100 rounded-t-3xl p-8 items-center justify-center">
        <Text className="text-slate-400 text-lg font-bold">暂无记录</Text>
        <Text className="text-slate-300 text-sm mt-2">点击首页按钮开始记录</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-100 rounded-t-3xl overflow-hidden">
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {sortedEvents.map((event, index) => {
          const timeStr = formatTime(event.timestamp);
          const isLast = index === sortedEvents.length - 1;

          // --- 类型 A: 吃药记录 ---
          if (event.type === 'MEDICATION') {
            const medConfig = event.medId ? getMedConfig(event.medId) : null;
            const iconType = medConfig ? medConfig.iconType : MedIconType.CANDY;
            const styles = medConfig ? getMedStyles(iconType) : { bg: 'bg-slate-300' };

            return (
              <View key={event.id} className={`flex-row items-center flex-wrap mb-4 ${!isLast ? 'border-b border-slate-200 pb-4' : ''}`}>
                <Text className="text-slate-500 text-base leading-9">
                  <Text className="font-bold text-slate-700">{timeStr}</Text> 患者服用了
                </Text>
                
                {/* 【修改】图标变大约 30%：w-8(32px) -> w-11(44px) */}
                <View className={`mx-2 w-11 h-11 rounded-full ${styles.bg} items-center justify-center inline-flex`} style={{ transform: [{ translateY: 8 }] }}>
                   {renderMedIcon(iconType, 22, "white")}
                </View>
              </View>
            );
          }

          // --- 类型 B: 身体数据记录 ---
          if (event.type === 'HEALTH_RECORD' && event.healthType) {
            const val = event.healthValue;
            const info = getHealthTypeInfo(event.healthType);
            const label = event.healthType === HealthDataType.OTHER ? '自定义数据' : info.label;
            
            let valueStr = '';
            if (event.healthType === HealthDataType.BLOOD_PRESSURE) {
              valueStr = `${val?.value1}/${val?.value2} ${val?.unit}`;
            } else if (event.healthType === HealthDataType.OTHER) {
               valueStr = val?.value1 ? `${val.value1}` : '';
            } else {
              valueStr = `${val?.value1} ${val?.unit}`;
            }

            const hasNote = event.note && event.note.trim().length > 0;

            return (
              <View key={event.id} className={`mb-4 ${!isLast ? 'border-b border-slate-200 pb-4' : ''}`}>
                <View className="flex-row flex-wrap items-center">
                  <Text className="text-slate-500 text-base leading-7">
                    <Text className="font-bold text-slate-700">{timeStr}</Text> 患者的{label}
                    {valueStr ? `为 ` : ''}
                    {valueStr ? <Text className="font-bold text-slate-800">{valueStr}</Text> : ''}
                  </Text>
                </View>
                
                {hasNote && (
                  <Text className="text-slate-500 text-base mt-2 ml-0 bg-white p-2 rounded-lg overflow-hidden border border-slate-200">
                    备注：{event.note}
                  </Text>
                )}
              </View>
            );
          }

          return null;
        })}
      </ScrollView>
    </View>
  );
};