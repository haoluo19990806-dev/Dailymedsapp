import { HealthDataType, MedIconType, TimelineEvent } from '@/types';
import { getHealthTypeInfo, getMedStyles, renderHealthIcon, renderMedIcon } from '@/utils/uiHelpers';
import React from 'react';
import { Text, View } from 'react-native';

interface TimelineItemProps {
  event: TimelineEvent;
  // 传入查找函数，用于获取药物配置详情
  getMedConfig: (medId: string) => any;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ event, getMedConfig }) => {
  const date = new Date(event.timestamp);
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  // 左侧时间轴
  const renderLeft = () => (
    <View className="items-center mr-4 w-12">
      <Text className="text-slate-400 font-bold mb-1 text-xs">{timeStr}</Text>
      {/* 竖线 */}
      <View className="w-[2px] h-full bg-slate-100 relative items-center">
         {/* 圆点装饰 */}
         <View className={`absolute -top-1 w-3 h-3 rounded-full border-2 border-white ${event.type === 'MEDICATION' ? 'bg-orange-400' : 'bg-blue-400'}`} />
      </View>
    </View>
  );

  // 右侧内容卡片
  const renderContent = () => {
    // --- 情况 A: 吃药记录 ---
    if (event.type === 'MEDICATION') {
      const medConfig = event.medId ? getMedConfig(event.medId) : null;
      // 如果找不到配置（可能被删了），就用默认灰色
      const styles = medConfig ? getMedStyles(medConfig.iconType) : { bg: 'bg-slate-300' };
      const icon = medConfig ? medConfig.iconType : MedIconType.CANDY;
      
      return (
        <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex-row items-center gap-3 mb-4">
          <View className={`w-10 h-10 rounded-full ${styles.bg} items-center justify-center`}>
            {renderMedIcon(icon, 20, "white")}
          </View>
          <View>
            <Text className="font-bold text-slate-700 text-base">
              {event.medName || medConfig?.name || "未知药物"}
            </Text>
            <Text className="text-slate-400 text-xs">按时服用</Text>
          </View>
        </View>
      );
    } 
    
    // --- 情况 B: 身体数据记录 ---
    else if (event.type === 'HEALTH_RECORD' && event.healthType) {
      // 这里的颜色逻辑：如果是自定义(OTHER)，用橙色；否则用蓝色区分
      const isCustom = event.healthType === HealthDataType.OTHER;
      const info = getHealthTypeInfo(event.healthType);
      const val = event.healthValue;
      
      const iconBg = isCustom ? 'bg-orange-400' : 'bg-blue-400';
      const cardBg = isCustom ? 'bg-orange-50' : 'bg-blue-50';
      const borderColor = isCustom ? 'border-orange-100' : 'border-blue-100';

      return (
        <View className={`flex-1 p-4 rounded-2xl border flex-row items-center gap-3 mb-4 ${cardBg} ${borderColor}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center ${iconBg}`}>
            {renderHealthIcon(event.healthType, 20, "white")}
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-center">
              <Text className="font-bold text-slate-700 text-base">
                {event.healthType === HealthDataType.OTHER ? '自定义记录' : info.label}
              </Text>
              
              {/* 数值显示 (自定义类型不显示单位) */}
              <View className="flex-row items-end gap-1">
                <Text className="text-2xl font-bold text-slate-800">
                  {event.healthType === HealthDataType.BLOOD_PRESSURE 
                    ? `${val?.value1}/${val?.value2}` 
                    : (val?.value1 || '-')}
                </Text>
                {!isCustom && <Text className="text-slate-500 text-xs mb-1">{val?.unit}</Text>}
              </View>
            </View>
            
            {/* 备注 */}
            {event.note && (
              <View className="mt-2 bg-white/60 self-start px-2 py-1 rounded-lg">
                <Text className="text-slate-500 text-xs">
                  {event.note}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }
    
    return null;
  };

  return (
    <View className="flex-row">
      {renderLeft()}
      {renderContent()}
    </View>
  );
};