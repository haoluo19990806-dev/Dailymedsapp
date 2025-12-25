import { MedConfig, Senior, TimelineEvent } from '@/types';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
// 🔥 [修复] 引入 CheckCircle
import { CheckCircle, Clock, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface SupervisorHomeScreenProps {
  currentSeniorId: string | null;
  seniorList: Senior[];
  todaysMeds: MedConfig[];
  todayRecord: TimelineEvent[];
}

export const SupervisorHomeScreen: React.FC<SupervisorHomeScreenProps> = ({ 
  currentSeniorId, 
  seniorList, 
  todaysMeds, 
  todayRecord 
}) => {
  const { t } = useTranslation();

  // 1. 如果没有选择患者，显示空状态
  if (!currentSeniorId) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-warm">
         <View className="opacity-20 mb-4">
            <UserPlus size={80} color="#334155" />
         </View>
         <Text className="text-slate-400 font-bold text-lg">{t('home.select_patient_tip')}</Text>
      </View>
    );
  }

  // 获取当前患者对象
  const currentSenior = seniorList.find(s => s.id === currentSeniorId);

  return (
    <ScrollView className="flex-1 w-full px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* 标题 */}
      <View className="flex-row items-baseline mb-6 px-2">
        <Text className="text-3xl font-bold text-slate-800 mr-2">{t('home.today_tasks')}</Text>
        {currentSenior && (
           <Text className="text-slate-400 font-bold">({currentSenior.note})</Text>
        )}
      </View>

      {/* 任务列表 */}
      {todaysMeds.length === 0 ? (
        <View className="items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
          <Text className="text-slate-400 text-lg">{t('home.no_tasks')}</Text>
        </View>
      ) : (
        <View className="gap-4">
          {todaysMeds.map(med => {
            // 检查该药物是否已完成
            const isTaken = todayRecord.some(event => event.medId === med.id);
            const styles = getMedStyles(med.iconType);

            return (
              <View 
                key={med.id} 
                className={`flex-row items-center justify-between p-5 rounded-3xl border-2 shadow-sm ${
                  isTaken 
                    ? 'bg-emerald-50 border-emerald-100 opacity-80' 
                    : 'bg-white border-slate-100'
                }`}
              >
                <View className="flex-row items-center gap-4">
                  {/* 图标 */}
                  <View className={`w-14 h-14 rounded-2xl ${isTaken ? 'bg-emerald-200' : styles.bg} items-center justify-center`}>
                    {med.name ? (
                      <Text className="text-white font-bold text-xs text-center px-1" numberOfLines={2}>
                        {med.name}
                      </Text>
                    ) : (
                      renderMedIcon(med.iconType, 32, "white")
                    )}
                  </View>

                  {/* 信息 */}
                  <View>
                    <View className="flex-row items-center gap-2 mb-1">
                       <Clock size={14} color={isTaken ? "#10b981" : "#94a3b8"} />
                       <View className="flex-row gap-1">
                          {renderTimeIcon(med.timeOfDay)}
                       </View>
                    </View>
                    <Text className={`font-bold text-lg ${isTaken ? 'text-emerald-700' : 'text-slate-700'}`}>
                       {isTaken ? t('home.completed') : t('home.pending')}
                    </Text>
                  </View>
                </View>

                {/* 状态图标 */}
                <View>
                   {isTaken ? (
                      // 🔥 [修复] 这里的 CheckCircle 现在可以被正确找到了
                      // 注意：lucide-react-native 的 fill 属性用于填充颜色，weight 属性可能不被支持，已移除 weight 以防万一
                      <CheckCircle size={32} color="#10b981" fill="#10b981" />
                   ) : (
                      <View className="w-8 h-8 rounded-full border-4 border-slate-100" />
                   )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};