import { HealthDataType, MedConfig, TimelineEvent } from '@/types';
import { getMedStyles, renderMedIcon } from '@/utils/uiHelpers';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

interface LogListProps {
  events: TimelineEvent[];
  getMedConfig: (id: string) => MedConfig | undefined;
  isSupervisor?: boolean; 
}

export const LogList: React.FC<LogListProps> = ({ events, getMedConfig, isSupervisor = false }) => {
  const { t, i18n } = useTranslation();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'zh-CN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getHealthTypeName = (type: HealthDataType) => {
    switch (type) {
      case HealthDataType.BLOOD_PRESSURE: return t('trends.types.bp');
      case HealthDataType.BLOOD_SUGAR: return t('trends.types.sugar');
      case HealthDataType.TEMPERATURE: return t('trends.types.temp');
      case HealthDataType.WEIGHT: return t('trends.types.weight');
      case HealthDataType.HEART_RATE: return t('trends.types.heart');
      case HealthDataType.SPO2: return t('trends.types.spo2');
      default: return t('trends.types.other');
    }
  };

  return (
    <ScrollView 
      className="flex-1 px-6 pt-2" 
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {events.slice().reverse().map((event) => { 
        const timeStr = formatTime(event.timestamp);

        // --- 渲染药物记录 ---
        if (event.type === 'MEDICATION' && event.medId) {
          const medConfig = getMedConfig(event.medId);
          if (!medConfig) return null;
          const styles = getMedStyles(medConfig.iconType);
          
          return (
            <View key={event.id} className="flex-row items-center py-5 border-b border-slate-100">
              {/* 1. 时间 (左侧固定) */}
              <Text className="text-slate-400 font-bold w-20 text-right mr-3 shrink-0 text-sm">{timeStr}</Text>
              
              {/* 2. 内容区域 (流式布局) */}
              <View className="flex-1 flex-row items-center flex-wrap gap-2">
                {/* 文本: [患者]服用了 */}
                <Text className="text-slate-600 text-base font-medium">
                  {isSupervisor ? t('log.patient_took') : t('log.you_took')}
                </Text>

                {/* 3. 互斥显示逻辑 */}
                {medConfig.name ? (
                  // 情况 A: 显示高亮药名
                  <View className={`px-2 py-1 rounded-lg ${styles.bg}`}>
                    <Text className="text-white font-bold text-sm">
                      {medConfig.name}
                    </Text>
                  </View>
                ) : (
                  // 情况 B: 显示大图标 (无文字)
                  // 🔥 [修改] 容器保持 52px，加 overflow-hidden，图标放大至 46 以接近充满
                  <View className={`w-[52px] h-[52px] ${styles.bg} rounded-full items-center justify-center overflow-hidden`}>
                    {renderMedIcon(medConfig.iconType, 46, "white")}
                  </View>
                )}
              </View>
            </View>
          );
        }

        // --- 渲染健康记录 ---
        if (event.type === 'HEALTH_RECORD' && event.healthType && event.healthValue) {
          const typeName = getHealthTypeName(event.healthType);
          const { value1, value2, unit } = event.healthValue;
          
          const valueStr = event.healthType === HealthDataType.BLOOD_PRESSURE && value2
            ? `${value1}/${value2}`
            : `${value1}`;
          
          return (
            <View key={event.id} className="flex-col py-5 border-b border-slate-100">
               <View className="flex-row items-baseline mb-1">
                  <Text className="text-slate-400 font-bold w-20 text-right mr-3 text-sm">{timeStr}</Text>
                  
                  <Text className="text-slate-600 text-base flex-1 flex-wrap font-medium">
                     {isSupervisor ? t('log.patient_health_prefix') : t('log.your_health_prefix')}
                     {typeName} {t('log.is')} <Text className="font-bold text-slate-800 text-lg">{valueStr}</Text> 
                     <Text className="text-xs text-slate-400 ml-1"> {unit}</Text>
                  </Text>
               </View>
               
               {event.note && (
                 <View className="pl-24 mt-2">
                    <Text className="text-slate-400 text-sm italic bg-slate-50 p-2 rounded-lg overflow-hidden">
                      "{event.note}"
                    </Text>
                 </View>
               )}
            </View>
          );
        }

        return null;
      })}
      
      <View className="h-20" />
    </ScrollView>
  );
};