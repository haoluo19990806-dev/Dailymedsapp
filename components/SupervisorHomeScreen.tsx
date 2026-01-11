import { MedConfig, Senior, TimelineEvent } from '@/types';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';
import { CheckCircle, ChevronRight, Clock, User } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

// 定义概览数据类型
export interface DashboardItem {
  id: string;
  name: string;
  total: number;
  taken: number;
  isAllDone: boolean;
}

interface SupervisorHomeScreenProps {
  currentSeniorId: string | null;
  seniorList: Senior[];
  todaysMeds: MedConfig[];
  todayRecord: TimelineEvent[];
  dashboardData: DashboardItem[];
  onSelectSenior: (id: string) => void;
}

export const SupervisorHomeScreen: React.FC<SupervisorHomeScreenProps> = ({ 
  currentSeniorId, 
  seniorList, 
  todaysMeds, 
  todayRecord,
  dashboardData,
  onSelectSenior,
}) => {
  const { t } = useTranslation();

  // ======================================================
  // 🟢 模式一：监护概览 (Overview) - 没选中人时显示列表
  // ======================================================
  if (!currentSeniorId) {
    return (
      <ScrollView className="flex-1 w-full px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 副标题 */}
        <Text className="text-base font-bold text-slate-400 mb-4 px-2">{t('supervisor.all_patients_progress')}</Text>

        {dashboardData.length === 0 ? (
          <View className="items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
            <Text className="text-slate-400 text-lg">{t('supervisor.no_patients')}</Text>
            <Text className="text-slate-300 text-sm mt-2">{t('supervisor.add_code_tip')}</Text>
          </View>
        ) : (
          <View className="gap-4">
            {dashboardData.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => onSelectSenior(item.id)}
                activeOpacity={0.7}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-4">
                  <View className={`w-14 h-14 rounded-full items-center justify-center ${item.isAllDone ? 'bg-emerald-100' : 'bg-blue-50'}`}>
                    <User size={28} color={item.isAllDone ? '#10b981' : '#3b82f6'} />
                  </View>
                  <View>
                    <Text className="text-lg font-bold text-slate-700">{item.name}</Text>
                    <Text className={`text-sm font-bold ${item.isAllDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {item.isAllDone ? t('supervisor.all_tasks_done') : `${t('supervisor.progress')}: ${item.taken} / ${item.total}`}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  {item.isAllDone ? (
                    <CheckCircle size={28} color="#10b981" fill="#ecfdf5" />
                  ) : (
                    <View className="w-8 h-8 rounded-full border-4 border-slate-100" />
                  )}
                  <ChevronRight size={20} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // ======================================================
  // 🔵 模式二：任务详情 (Tasks Detail) - 选中人后显示
  // ======================================================
  // 此时只显示"任务列表"，历史和趋势由 index.tsx 的底部 Tab 接管
  return (
    <ScrollView className="flex-1 w-full px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* 副标题 */}
      <Text className="text-base font-bold text-slate-400 mb-4 px-2">{t('home.today_tasks')}</Text>

      {todaysMeds.length === 0 ? (
        <View className="items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
          <Text className="text-slate-400 text-lg">{t('home.no_tasks')}</Text>
        </View>
      ) : (
        <View className="gap-4">
          {todaysMeds.map(med => {
            const isTaken = todayRecord.some(event => event.medId === med.id);
            const styles = getMedStyles(med.iconType);

            return (
              <View 
                key={med.id} 
                className={`flex-row items-center justify-between p-5 rounded-3xl border-2 shadow-sm ${
                  isTaken ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'
                }`}
              >
                <View className="flex-row items-center gap-4 flex-1">
                  <View className={`w-14 h-14 rounded-2xl ${isTaken ? 'bg-emerald-300' : styles.bg} items-center justify-center`}>
                    {med.name ? (
                      <Text className={`font-bold text-xs text-center px-1 ${isTaken ? 'text-emerald-900' : 'text-white'}`} numberOfLines={2}>{med.name}</Text>
                    ) : (
                      renderMedIcon(med.iconType, 32, isTaken ? "#065f46" : "white")
                    )}
                  </View>
                  <View className="flex-1">
                    {/* 药物名称 - 已完成时更突出 */}
                    {med.name && (
                      <Text className={`font-bold mb-1 ${isTaken ? 'text-emerald-800 text-base' : 'text-slate-700 text-sm'}`} numberOfLines={1}>
                        {med.name}
                      </Text>
                    )}
                    <View className="flex-row items-center gap-2 mb-1">
                       <Clock size={14} color={isTaken ? "#10b981" : "#94a3b8"} />
                       <View className="flex-row gap-1">{renderTimeIcon(med.timeOfDay, 18, isTaken ? "#10b981" : "#94a3b8")}</View>
                    </View>
                    <Text className={`font-bold text-sm ${isTaken ? 'text-emerald-600' : 'text-slate-700'}`}>
                       {isTaken ? t('home.completed') : t('home.pending')}
                    </Text>
                  </View>
                </View>
                <View className="ml-2">
                   {isTaken ? (
                     <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center">
                       <View className="w-4 h-4 rounded-full bg-white" />
                     </View>
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

