import {
  AlertIcon,
  CaregiverIcon,
  CelebrationIcon,
} from '@/components/Icons';
import { MedConfig, Senior, TimeOfDay, TimelineEvent } from '@/types';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

interface SupervisorHomeScreenProps {
  currentSeniorId: string | null;
  seniorList: Senior[];
  todaysMeds: MedConfig[];
  todayRecord: TimelineEvent[]; // 【修改】类型更新为 TimelineEvent[]
}

export const SupervisorHomeScreen: React.FC<SupervisorHomeScreenProps> = ({
  currentSeniorId,
  seniorList,
  todaysMeds,
  todayRecord,
}) => {
  if (!currentSeniorId) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <CaregiverIcon size={64} color="#cbd5e1" />
        <Text className="text-xl font-bold text-slate-400 mt-4">请先在设置页选择一位患者</Text>
      </View>
    );
  }

  // 【修改】逻辑更新：筛选出未找到对应打卡记录的药物
  const missedMeds = todaysMeds.filter(med => 
    !todayRecord.some(event => event.medId === med.id)
  );
  
  const isSupervisorAllTaken = todaysMeds.length > 0 && missedMeds.length === 0;
  const currentSeniorNote = seniorList.find(s => s.id === currentSeniorId)?.note || "未知";

  const missedByTime: Record<string, MedConfig[]> = {
    [TimeOfDay.MORNING]: [], [TimeOfDay.NOON]: [], [TimeOfDay.EVENING]: []
  };
  missedMeds.forEach(med => missedByTime[med.timeOfDay]?.push(med));

  return (
    <ScrollView className="flex-1 w-full px-4" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* 顶部状态栏 */}
      <View className="flex-row justify-between items-center mb-6 mt-4">
         <Text className="text-2xl font-bold text-slate-700">{currentSeniorNote} 今日情况</Text>
         <View className="px-3 py-1 bg-blue-50 rounded-lg">
            <Text className="text-blue-500 font-bold font-mono">ID: {currentSeniorId}</Text>
         </View>
      </View>

      {/* 状态卡片 */}
      {todaysMeds.length === 0 ? (
        <View className="bg-slate-100 rounded-3xl p-8 items-center mb-8">
          <Text className="text-slate-400 font-bold text-lg">今日无用药安排</Text>
        </View>
      ) : isSupervisorAllTaken ? (
        <View className="bg-success rounded-3xl p-6 mb-8 shadow-sm flex-row items-center gap-4">
          <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center">
             <CelebrationIcon size={40} color="white" />
          </View>
          <View>
             <Text className="text-2xl font-bold text-white">一切正常</Text>
             <Text className="text-white opacity-90">今日药物已全部服用</Text>
          </View>
        </View>
      ) : (
        <View className="bg-orange-500 rounded-3xl p-6 mb-8 shadow-sm">
          <View className="flex-row items-center gap-3 mb-4">
            <AlertIcon size={32} color="white" />
            <Text className="text-xl font-bold text-white">还有 {missedMeds.length} 种药未吃</Text>
          </View>
          <View className="gap-2">
             {Object.entries(missedByTime).map(([time, meds]) => {
               if (meds.length === 0) return null;
               const timeLabel = time === TimeOfDay.MORNING ? '早上' : time === TimeOfDay.NOON ? '中午' : '晚上';
               return (
                 <View key={time} className="flex-row items-center gap-2 bg-white/20 px-3 py-2 rounded-xl">
                    {renderTimeIcon(time as TimeOfDay, 20, "white")}
                    <Text className="font-medium text-white text-sm">
                      {timeLabel}有 {meds.length} 种药未打卡
                    </Text>
                 </View>
               )
             })}
          </View>
        </View>
      )}

      {/* 药物详情列表 */}
      <Text className="text-lg font-bold text-slate-500 mb-4 px-2">今日药单详情</Text>
      <View className="gap-3">
        {todaysMeds.map(med => {
          // 【修改】逻辑更新
          const isTaken = todayRecord.some(event => event.medId === med.id);
          const styles = getMedStyles(med.iconType);
          return (
            <View 
              key={med.id} 
              className={`flex-row items-center justify-between p-4 rounded-2xl border-2 ${isTaken ? 'bg-white border-slate-100 opacity-50' : 'bg-white border-orange-100'}`}
            >
               <View className="flex-row items-center gap-4">
                 <View className={`w-12 h-12 rounded-xl ${styles.bg} items-center justify-center`}>
                    {med.name ? (
                      <Text className="text-white font-bold text-xs text-center px-1" numberOfLines={2}>
                        {med.name}
                      </Text>
                    ) : (
                      renderMedIcon(med.iconType, 32, "white")
                    )}
                 </View>
                 <View>
                    <View>{renderTimeIcon(med.timeOfDay, 20)}</View>
                 </View>
               </View>
               
               <View className={`px-4 py-2 rounded-xl ${isTaken ? 'bg-green-100' : 'bg-orange-100'}`}>
                  <Text className={`font-bold text-sm ${isTaken ? 'text-green-600' : 'text-orange-500'}`}>
                    {isTaken ? '已服' : '未服'}
                  </Text>
               </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};