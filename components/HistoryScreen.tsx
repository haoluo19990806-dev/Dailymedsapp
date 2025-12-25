import { LogList } from '@/components/LogList';
import { HistoryRecord, MedConfig } from '@/types';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

interface HistoryScreenProps {
  history: HistoryRecord;
  config: MedConfig[];
  isSupervisor: boolean;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, config, isSupervisor }) => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const dates = useMemo(() => {
    const list = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;
      
      const dayNum = d.getDay(); 
      
      list.push({ 
        dateKey, 
        dayLabel: day, 
        dayNum,
        month: d.getMonth() + 1
      });
    }
    return list;
  }, []); 

  const dayEvents = history[selectedDate] || [];
  const getMedConfig = (medId: string) => config.find(c => c.id === medId);

  const getWeekLabel = (dayNum: number) => {
    const weeks = t('trends.axis.1w_labels', { returnObjects: true }) as string[];
    let index = dayNum - 1; 
    if (index < 0) index = 6;
    return weeks[index];
  };

  return (
    <View className="flex-1 w-full bg-white pt-4">
      <Text className="text-3xl font-bold text-slate-700 mb-6 px-6">
        {isSupervisor ? t('history.patient_title') : t('history.my_title')}
      </Text>

      <View className="h-28 mb-2">
        <FlatList
          data={dates}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
          keyExtractor={item => item.dateKey}
          renderItem={({ item }) => {
            const isSelected = item.dateKey === selectedDate;
            return (
              <TouchableOpacity
                onPress={() => setSelectedDate(item.dateKey)}
                className={`w-16 h-24 rounded-2xl items-center justify-center border-2 ${
                  isSelected 
                    ? 'bg-slate-800 border-slate-800' 
                    : 'bg-white border-slate-100'
                }`}
              >
                <Text className={`text-[10px] font-bold ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                  {item.month}{t('history.month_suffix')}
                </Text>
                
                <Text className={`text-xl font-bold my-1 ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                  {item.dayLabel}
                </Text>
                
                <Text className={`text-xs font-bold ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                  {t('history.week_prefix')}{getWeekLabel(item.dayNum)}
                </Text>
                
                {isSelected && <View className="w-1 h-1 bg-orange-400 rounded-full mt-1" />}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View className="flex-1">
        <View className="px-6 mb-2 flex-row justify-between items-end">
           <Text className="text-lg font-bold text-slate-500">
             {selectedDate} {t('history.details')}
           </Text>
           <Text className="text-xs font-bold text-slate-400 mb-1">
             {t('history.total_records', {count: dayEvents.length})}
           </Text>
        </View>
        
        {/* 🔥 修复点：将 isSupervisor 传递给 LogList */}
        <LogList 
          events={dayEvents} 
          getMedConfig={getMedConfig} 
          isSupervisor={isSupervisor}
        />
      </View>
    </View>
  );
};