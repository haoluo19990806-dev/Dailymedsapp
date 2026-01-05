import { MedConfig, TimelineEvent, TimeOfDay } from '@/types';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
// 引入我们要用的新动画组件
import { AnimatedCheckMark } from '@/components/AnimatedCheckMark';

interface UserHomeScreenProps {
  todaysMeds: MedConfig[];
  todayRecord: TimelineEvent[];
  currentDayOfWeek: number;
  onToggleMed: (medId: string) => void;
}

export const UserHomeScreen: React.FC<UserHomeScreenProps> = ({
  todaysMeds,
  todayRecord,
  currentDayOfWeek,
  onToggleMed,
}) => {
  const sections = [TimeOfDay.MORNING, TimeOfDay.NOON, TimeOfDay.EVENING];

  const handlePress = (medId: string) => {
    // 震动反馈
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleMed(medId);
  };

  return (
    <View className="flex-1 relative bg-slate-50">
      <ScrollView className="flex-1 w-full px-2" contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* 星期几显示 */}
        <View className="flex-row justify-center gap-2 mb-6 mt-4">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <View 
              key={day}
              className={`w-10 h-10 rounded-full items-center justify-center shadow-sm ${day === currentDayOfWeek ? 'bg-slate-800' : 'bg-white'}`}
            >
              <Text className={`font-bold ${day === currentDayOfWeek ? 'text-white' : 'text-slate-300'}`}>{day}</Text>
            </View>
          ))}
        </View>

        {/* 药物列表区块 */}
        {sections.map(time => {
          const meds = todaysMeds.filter(c => c.timeOfDay === time);
          if (meds.length === 0) return null;
          
          return (
            <View key={time} className="mb-6 w-full">
              {/* 分割线 */}
              <View className="flex-row items-center justify-center gap-4 mb-4 opacity-80">
                <View className="h-[2px] flex-1 bg-slate-200 ml-4" />
                <View className={`p-2 rounded-full border border-slate-100 shadow-sm ${time === TimeOfDay.MORNING ? 'bg-orange-100' : time === TimeOfDay.NOON ? 'bg-yellow-100' : 'bg-indigo-100'}`}>
                  {renderTimeIcon(time, 24, "#475569")}
                </View>
                <View className="h-[2px] flex-1 bg-slate-200 mr-4" />
              </View>

              {/* 按钮网格 */}
              <View className="flex-row flex-wrap justify-center gap-3 px-2">
                {meds.map(med => {
                  const styles = getMedStyles(med.iconType);
                  const isTaken = todayRecord.some(event => event.medId === med.id);
                  
                  return (
                    <TouchableOpacity
                      key={med.id}
                      activeOpacity={0.6}
                      onPress={() => handlePress(med.id)}
                      className={`
                        min-w-[96px] min-h-[96px] p-3
                        items-center justify-center rounded-2xl
                        border-slate-900/10 
                        ${isTaken 
                            ? 'bg-[#4ADE80] border-b-0 mt-[4px]' // 【修改点】bg-[#4ADE80] 是清新的浅绿色 (Tailwind green-400)
                            : `${styles.bg} border-b-4 shadow-sm`
                        }
                      `}
                    >
                      {/* Ghost Text (隐形文字) - 保持布局不塌陷 */}
                      <View className="relative items-center justify-center">
                        {med.name ? (
                            <Text 
                              className="font-bold text-center drop-shadow-md"
                              style={{ 
                                fontSize: med.name.length > 8 ? 16 : 20,
                                lineHeight: med.name.length > 8 ? 20 : 24,
                                color: isTaken ? 'transparent' : 'white', // 已完成时文字变透明
                              }}
                            >
                              {med.name}
                            </Text>
                        ) : (
                            <View style={{ opacity: isTaken ? 0 : 1 }}>
                                {renderMedIcon(med.iconType, 42, "white")}
                            </View>
                        )}

                        {/* 动画对勾层 - 绝对定位覆盖在中间 */}
                        {isTaken && (
                            <View className="absolute inset-0 items-center justify-center">
                                <AnimatedCheckMark size={42} color="white" strokeWidth={4} />
                            </View>
                        )}
                      </View>

                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {todaysMeds.length === 0 && (
          <View className="items-center mt-20 opacity-40">
            <Text className="text-2xl text-slate-500 font-bold">今天没有药要吃</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};