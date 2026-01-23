import { LogList } from '@/components/LogList';
import { HistoryRecord, MedConfig } from '@/types';
import { Star } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HistoryScreenProps {
  history: HistoryRecord;
  config: MedConfig[];
  isSupervisor: boolean;
  onToggleImportant?: (eventId: string, isImportant: boolean) => void;
  onDeleteEvent?: (eventId: string) => void;
  onHistoryUpdate?: (updatedHistory: HistoryRecord) => void;
  onNavigateToImportant?: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ 
  history, 
  config, 
  isSupervisor,
  onToggleImportant,
  onDeleteEvent,
  onHistoryUpdate,
  onNavigateToImportant,
}) => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // 乐观更新：切换重要标记
  const handleToggleImportant = useCallback((eventId: string, isImportant: boolean) => {
    // 立即更新本地状态
    const updatedHistory = { ...history };
    for (const dateKey in updatedHistory) {
      const index = updatedHistory[dateKey].findIndex(e => e.id === eventId);
      if (index >= 0) {
        updatedHistory[dateKey] = [...updatedHistory[dateKey]];
        updatedHistory[dateKey][index] = {
          ...updatedHistory[dateKey][index],
          isImportant
        };
        break;
      }
    }
    
    // 通知父组件更新
    if (onHistoryUpdate) {
      onHistoryUpdate(updatedHistory);
    }
    
    // 调用后端同步
    if (onToggleImportant) {
      onToggleImportant(eventId, isImportant);
    }
  }, [history, onHistoryUpdate, onToggleImportant]);

  // 乐观更新：删除记录
  const handleDeleteEvent = useCallback((eventId: string) => {
    // 立即更新本地状态
    const updatedHistory = { ...history };
    for (const dateKey in updatedHistory) {
      const index = updatedHistory[dateKey].findIndex(e => e.id === eventId);
      if (index >= 0) {
        updatedHistory[dateKey] = updatedHistory[dateKey].filter(e => e.id !== eventId);
        if (updatedHistory[dateKey].length === 0) {
          delete updatedHistory[dateKey];
        }
        break;
      }
    }
    
    // 通知父组件更新
    if (onHistoryUpdate) {
      onHistoryUpdate(updatedHistory);
    }
    
    // 调用后端同步
    if (onDeleteEvent) {
      onDeleteEvent(eventId);
    }
  }, [history, onHistoryUpdate, onDeleteEvent]);

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
      {/* 悬浮入口按钮 - 重要记录（患者模式和监督者专注模式都显示） */}
      {onNavigateToImportant && (
        <TouchableOpacity
          onPress={onNavigateToImportant}
          style={styles.fab}
          activeOpacity={0.8}
        >
          <Star size={28} color="#ffffff" fill="#ffffff" />
        </TouchableOpacity>
      )}
      
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
        
        <LogList 
          events={dayEvents} 
          getMedConfig={getMedConfig} 
          isSupervisor={isSupervisor}
          onToggleImportant={handleToggleImportant}
          onDeleteEvent={handleDeleteEvent}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fb923c', // 浅橙色
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  },
});
