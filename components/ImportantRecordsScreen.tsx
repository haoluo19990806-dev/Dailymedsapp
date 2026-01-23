import { LogList } from '@/components/LogList';
import { historyService } from '@/lib/historyService';
import { HistoryRecord, MedConfig, TimelineEvent } from '@/types';
import { ChevronLeft, Star } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImportantRecordsScreenProps {
  config: MedConfig[];
  isSupervisor: boolean;
  onBack: () => void;
  onToggleImportant?: (eventId: string, isImportant: boolean) => void;
  onDeleteEvent?: (eventId: string) => void;
  targetUserId?: string;
}

export const ImportantRecordsScreen: React.FC<ImportantRecordsScreenProps> = ({
  config,
  isSupervisor,
  onBack,
  onToggleImportant,
  onDeleteEvent,
  targetUserId,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  // 当前选中的年月
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  
  // 重要记录数据
  const [importantRecords, setImportantRecords] = useState<HistoryRecord>({});
  const [isLoading, setIsLoading] = useState(true);

  // 生成最近12个月的列表
  const months = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `${d.getMonth() + 1}${t('history.month_suffix')}`,
        isCurrentMonth: i === 0,
      });
    }
    return list;
  }, [t]);

  // 获取重要记录
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await historyService.fetchImportantRecords(
        selectedYear,
        selectedMonth,
        targetUserId
      );
      setImportantRecords(records);
    } catch (e) {
      console.error('获取重要记录失败:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedMonth, targetUserId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 处理月份选择
  const handleMonthSelect = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  // 乐观更新：切换重要标记（取消标记后从列表移除）
  const handleToggleImportant = useCallback((eventId: string, isImportant: boolean) => {
    // 立即更新本地状态
    if (!isImportant) {
      // 取消重要标记，从列表中移除
      const updatedRecords = { ...importantRecords };
      for (const dateKey in updatedRecords) {
        const index = updatedRecords[dateKey].findIndex(e => e.id === eventId);
        if (index >= 0) {
          updatedRecords[dateKey] = updatedRecords[dateKey].filter(e => e.id !== eventId);
          if (updatedRecords[dateKey].length === 0) {
            delete updatedRecords[dateKey];
          }
          break;
        }
      }
      setImportantRecords(updatedRecords);
    }
    
    // 调用父组件同步
    if (onToggleImportant) {
      onToggleImportant(eventId, isImportant);
    }
  }, [importantRecords, onToggleImportant]);

  // 乐观更新：删除记录
  const handleDeleteEvent = useCallback((eventId: string) => {
    // 立即更新本地状态
    const updatedRecords = { ...importantRecords };
    for (const dateKey in updatedRecords) {
      const index = updatedRecords[dateKey].findIndex(e => e.id === eventId);
      if (index >= 0) {
        updatedRecords[dateKey] = updatedRecords[dateKey].filter(e => e.id !== eventId);
        if (updatedRecords[dateKey].length === 0) {
          delete updatedRecords[dateKey];
        }
        break;
      }
    }
    setImportantRecords(updatedRecords);
    
    // 调用父组件同步
    if (onDeleteEvent) {
      onDeleteEvent(eventId);
    }
  }, [importantRecords, onDeleteEvent]);

  // 获取药物配置
  const getMedConfig = (medId: string) => config.find(c => c.id === medId);

  // 计算总记录数
  const totalRecords = useMemo(() => {
    let count = 0;
    for (const dateKey in importantRecords) {
      count += importantRecords[dateKey].length;
    }
    return count;
  }, [importantRecords]);

  // 按日期分组的记录列表
  const groupedRecords = useMemo(() => {
    const groups: { dateKey: string; events: TimelineEvent[] }[] = [];
    const sortedDates = Object.keys(importantRecords).sort((a, b) => b.localeCompare(a));
    for (const dateKey of sortedDates) {
      groups.push({ dateKey, events: importantRecords[dateKey] });
    }
    return groups;
  }, [importantRecords]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 自定义导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onBack} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={28} color="#334155" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Star size={20} color="#f59e0b" fill="#f59e0b" />
          <Text style={styles.title}>{t('history.important_records')}</Text>
        </View>
        
        <View style={styles.placeholder} />
      </View>

      {/* 月份选择器 */}
      <View style={styles.monthSelectorContainer}>
        <FlatList
          data={months}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthListContent}
          keyExtractor={(item) => `${item.year}-${item.month}`}
          renderItem={({ item }) => {
            const isSelected = item.year === selectedYear && item.month === selectedMonth;
            return (
              <TouchableOpacity
                onPress={() => handleMonthSelect(item.year, item.month)}
                style={[
                  styles.monthCard,
                  isSelected && styles.monthCardSelected,
                ]}
              >
                <Text style={[
                  styles.monthText,
                  isSelected && styles.monthTextSelected,
                ]}>
                  {item.label}
                </Text>
                {item.isCurrentMonth && (
                  <Text style={[
                    styles.currentMonthHint,
                    isSelected && styles.currentMonthHintSelected,
                  ]}>
                    {t('trends.date_fmt.today').replace('天', '月')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 内容区域 */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
          </View>
        ) : totalRecords === 0 ? (
          <View style={styles.emptyContainer}>
            <Star size={64} color="#e2e8f0" />
            <Text style={styles.emptyTitle}>{t('history.no_important_records')}</Text>
            <Text style={styles.emptyHint}>{t('history.no_important_records_hint')}</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.recordsList}
            showsVerticalScrollIndicator={false}
          >
            {groupedRecords.map(({ dateKey, events }) => (
              <View key={dateKey} style={styles.dateGroup}>
                {/* 日期标题 */}
                <View style={styles.dateHeader}>
                  <Text style={styles.dateText}>{dateKey}</Text>
                  <Text style={styles.recordCount}>
                    {t('history.total_records', { count: events.length })}
                  </Text>
                </View>
                
                {/* 该日期下的记录 */}
                <LogList
                  events={events}
                  getMedConfig={getMedConfig}
                  isSupervisor={isSupervisor}
                  onToggleImportant={handleToggleImportant}
                  onDeleteEvent={handleDeleteEvent}
                />
              </View>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241, 245, 249, 0.5)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  placeholder: {
    width: 44,
  },
  monthSelectorContainer: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241, 245, 249, 0.5)',
  },
  monthListContent: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
    height: '100%',
  },
  monthCard: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  monthCardSelected: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  monthTextSelected: {
    color: '#ffffff',
  },
  currentMonthHint: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  currentMonthHintSelected: {
    color: '#94a3b8',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  recordsList: {
    flex: 1,
  },
  dateGroup: {
    marginTop: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
  },
  recordCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
});
