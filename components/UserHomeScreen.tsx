import { MedButton } from '@/components/MedButton';
import { MedConfig, TimelineEvent, TimeOfDay } from '@/types';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

interface UserHomeScreenProps {
  todaysMeds: MedConfig[];
  todayRecord: TimelineEvent[]; // 【修改】类型更新为 TimelineEvent[]
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

  return (
    <View className="flex-1 relative">
      <ScrollView className="flex-1 w-full px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 星期几的显示栏 */}
        <View className="flex-row justify-center gap-2 mb-8 mt-4">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <View 
              key={day}
              className={`w-10 h-10 rounded-full items-center justify-center ${day === currentDayOfWeek ? 'bg-slate-800' : 'bg-white'}`}
            >
              <Text className={`font-bold ${day === currentDayOfWeek ? 'text-white' : 'text-slate-300'}`}>{day}</Text>
            </View>
          ))}
        </View>

        {/* 早中晚三个时间段的药物列表 */}
        {sections.map(time => {
          const meds = todaysMeds.filter(c => c.timeOfDay === time);
          if (meds.length === 0) return null;
          
          return (
            <View key={time} className="mb-8 w-full">
              {/* 分割线和时间图标 */}
              <View className="flex-row items-center justify-center gap-4 mb-4 opacity-80">
                <View className="h-[2px] flex-1 bg-slate-200" />
                <View className={`p-2 rounded-full ${time === TimeOfDay.MORNING ? 'bg-orange-100' : time === TimeOfDay.NOON ? 'bg-yellow-100' : 'bg-indigo-100'}`}>
                  {renderTimeIcon(time, 24, "#475569")}
                </View>
                <View className="h-[2px] flex-1 bg-slate-200" />
              </View>

              {/* 药物按钮网格 */}
              <View className="flex-row flex-wrap justify-center">
                {meds.map(med => {
                  const styles = getMedStyles(med.iconType);
                  
                  // 【修改】判断逻辑更新：在对象数组中查找是否存在该药物ID
                  const isTaken = todayRecord.some(event => event.medId === med.id);

                  const buttonContent = med.name ? (
                    <View className="w-full h-full items-center justify-center px-1">
                      <Text 
                        className="text-white font-bold text-center" 
                        style={{ 
                          fontSize: med.name.length > 3 ? 18 : 24,
                          lineHeight: med.name.length > 3 ? 22 : 28 
                        }}
                        numberOfLines={2}
                      >
                        {med.name}
                      </Text>
                    </View>
                  ) : (
                    renderMedIcon(med.iconType, 87, "white")
                  );

                  return (
                    <MedButton
                      key={med.id}
                      isTaken={isTaken}
                      onClick={() => onToggleMed(med.id)}
                      icon={buttonContent}
                      baseColorClass={styles.bg}
                      shadowColorClass="" 
                      ariaLabel={`Take ${med.timeOfDay} medication`}
                      size="large"
                    />
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