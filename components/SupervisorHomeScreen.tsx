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
        <View className="mb-6 px-2">
          <Text className="text-3xl font-bold text-slate-800">监护概览</Text>
          <Text className="text-slate-400 text-base">今日所有患者服药进度</Text>
        </View>

        {dashboardData.length === 0 ? (
          <View className="items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
            <Text className="text-slate-400 text-lg">暂无绑定患者</Text>
            <Text className="text-slate-300 text-sm mt-2">请去“设置”添加监督码</Text>
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
                      {item.isAllDone ? '今日任务已完成' : `进度: ${item.taken} / ${item.total}`}
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
  // 此时只显示“任务列表”，历史和趋势由 index.tsx 的底部 Tab 接管
  const currentSenior = seniorList.find(s => s.id === currentSeniorId);

  return (
    <ScrollView className="flex-1 w-full px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* 这里的标题栏也可以简化，因为 index.tsx 会有统一的 Header */}
      <View className="mb-6 px-2">
         <Text className="text-3xl font-bold text-slate-800">今日任务</Text>
         {currentSenior && <Text className="text-slate-400 font-bold mt-1">正在查看: {currentSenior.note}</Text>}
      </View>

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
                  isTaken ? 'bg-emerald-50 border-emerald-100 opacity-80' : 'bg-white border-slate-100'
                }`}
              >
                <View className="flex-row items-center gap-4">
                  <View className={`w-14 h-14 rounded-2xl ${isTaken ? 'bg-emerald-200' : styles.bg} items-center justify-center`}>
                    {med.name ? (
                      <Text className="text-white font-bold text-xs text-center px-1" numberOfLines={2}>{med.name}</Text>
                    ) : (
                      renderMedIcon(med.iconType, 32, "white")
                    )}
                  </View>
                  <View>
                    <View className="flex-row items-center gap-2 mb-1">
                       <Clock size={14} color={isTaken ? "#10b981" : "#94a3b8"} />
                       <View className="flex-row gap-1">{renderTimeIcon(med.timeOfDay)}</View>
                    </View>
                    <Text className={`font-bold text-lg ${isTaken ? 'text-emerald-700' : 'text-slate-700'}`}>
                       {isTaken ? t('home.completed') : t('home.pending')}
                    </Text>
                  </View>
                </View>
                <View>
                   {isTaken ? <CheckCircle size={32} color="#10b981" fill="#10b981" /> : <View className="w-8 h-8 rounded-full border-4 border-slate-100" />}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};