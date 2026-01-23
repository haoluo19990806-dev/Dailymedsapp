import { HealthDataType, MedConfig, TimelineEvent } from '@/types';
import { getMedStyles, renderMedIcon } from '@/utils/uiHelpers';
import { Star, Trash2 } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated as RNAnimated, ScrollView, Text, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView, RectButton, Swipeable } from 'react-native-gesture-handler';

interface LogListProps {
  events: TimelineEvent[];
  getMedConfig: (id: string) => MedConfig | undefined;
  isSupervisor?: boolean;
  onToggleImportant?: (eventId: string, isImportant: boolean) => void;
  onDeleteEvent?: (eventId: string) => void;
}

// 单独的星星按钮组件（只变色，无跳动动画）
const StarButton: React.FC<{
  isImportant: boolean;
  onPress: () => void;
}> = ({ isImportant, onPress }) => {
  const [showYellow, setShowYellow] = useState(isImportant);

  const handlePress = () => {
    if (!isImportant) {
      // 标记为重要：变黄（无动画）
      setShowYellow(true);
    } else {
      // 取消重要：变白
      setShowYellow(false);
    }
    onPress();
  };

  // 同步 props 变化
  React.useEffect(() => {
    setShowYellow(isImportant);
  }, [isImportant]);

  return (
    <RectButton
      style={styles.actionButton}
      onPress={handlePress}
    >
      <Star 
        size={28} 
        color={showYellow ? '#FCD34D' : 'white'}
        fill={showYellow ? '#FCD34D' : 'transparent'}
        strokeWidth={2}
      />
    </RectButton>
  );
};

export const LogList: React.FC<LogListProps> = ({ 
  events, 
  getMedConfig, 
  isSupervisor = false,
  onToggleImportant,
  onDeleteEvent 
}) => {
  const { t, i18n } = useTranslation();
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

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

  const closeSwipeable = useCallback((eventId: string) => {
    const ref = swipeableRefs.current.get(eventId);
    if (ref) {
      ref.close();
    }
  }, []);

  const handleToggleImportant = useCallback((event: TimelineEvent) => {
    // 立即关闭侧滑
    setTimeout(() => closeSwipeable(event.id), 100);
    if (onToggleImportant) {
      onToggleImportant(event.id, !event.isImportant);
    }
  }, [onToggleImportant, closeSwipeable]);

  const handleDelete = useCallback((event: TimelineEvent) => {
    closeSwipeable(event.id);
    Alert.alert(
      t('alert.confirm_delete'),
      t('alert.confirm_delete_record'),
      [
        { text: t('alert.cancel'), style: 'cancel' },
        { 
          text: t('alert.delete'), 
          style: 'destructive',
          onPress: () => {
            if (onDeleteEvent) {
              onDeleteEvent(event.id);
            }
          }
        }
      ]
    );
  }, [onDeleteEvent, closeSwipeable, t]);

  // 渲染右侧滑出的操作按钮
  const renderRightActions = useCallback((
    progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>,
    event: TimelineEvent
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-136, 0],
      outputRange: [0, 136],
      extrapolate: 'clamp',
    });

    return (
      <RNAnimated.View 
        style={[
          styles.actionsContainer,
          { transform: [{ translateX }] }
        ]}
      >
        {/* 标记重要按钮 */}
        <View style={[styles.actionButtonWrapper, styles.starButton]}>
          <StarButton 
            isImportant={!!event.isImportant}
            onPress={() => handleToggleImportant(event)}
          />
        </View>

        {/* 删除按钮 */}
        <View style={[styles.actionButtonWrapper, styles.deleteButton]}>
          <RectButton
            style={styles.actionButton}
            onPress={() => handleDelete(event)}
          >
            <Trash2 size={28} color="white" strokeWidth={2} />
          </RectButton>
        </View>
      </RNAnimated.View>
    );
  }, [handleToggleImportant, handleDelete]);

  // 渲染药物记录
  const renderMedicationItem = (event: TimelineEvent, timeStr: string) => {
    const medConfig = getMedConfig(event.medId!);
    if (!medConfig) return null;
    const medStyles = getMedStyles(medConfig.iconType);
    
    return (
      <View style={styles.itemContent}>
        {/* 左侧区域：星星 + 时间（对齐） */}
        <View style={styles.leftSection}>
          {/* 星星占位（始终保留空间，保证对齐） */}
          <View style={styles.starContainer}>
            {event.isImportant && (
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
            )}
          </View>
          {/* 时间 */}
          <Text style={styles.timeText}>{timeStr}</Text>
        </View>
        
        {/* 内容区域 */}
        <View style={styles.contentArea}>
          <Text style={styles.actionText}>
            {isSupervisor ? t('log.patient_took') : t('log.you_took')}
          </Text>

          {medConfig.name ? (
            <View className={`px-2 py-1 rounded-lg ${medStyles.bg}`}>
              <Text style={styles.medNameText}>
                {medConfig.name}
              </Text>
            </View>
          ) : (
            <View className={`w-[52px] h-[52px] ${medStyles.bg} rounded-full items-center justify-center overflow-hidden`}>
              {renderMedIcon(medConfig.iconType, 46, "white")}
            </View>
          )}
        </View>
      </View>
    );
  };

  // 渲染健康记录
  const renderHealthItem = (event: TimelineEvent, timeStr: string) => {
    if (!event.healthType || !event.healthValue) return null;
    
    const typeName = getHealthTypeName(event.healthType);
    const { value1, value2, unit } = event.healthValue;
    
    // 判断是否为自定义类型且没有填入数值（value1 为 0 或空）
    const isCustomWithoutValue = event.healthType === HealthDataType.OTHER && (!value1 || value1 === 0);
    
    const valueStr = event.healthType === HealthDataType.BLOOD_PRESSURE && value2
      ? `${value1}/${value2}`
      : `${value1}`;
    
    // 自定义类型且无数值：只显示备注文字
    if (isCustomWithoutValue && event.note) {
      return (
        <View style={styles.healthItemContent}>
          <View style={styles.healthMainRow}>
            {/* 左侧区域：星星 + 时间（对齐） */}
            <View style={styles.leftSection}>
              <View style={styles.starContainer}>
                {event.isImportant && (
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                )}
              </View>
              <Text style={styles.timeText}>{timeStr}</Text>
            </View>
            
            {/* 只显示备注文字，黑色方便阅读 */}
            <Text style={styles.customNoteText}>
              {event.note}
            </Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.healthItemContent}>
        <View style={styles.healthMainRow}>
          {/* 左侧区域：星星 + 时间（对齐） */}
          <View style={styles.leftSection}>
            {/* 星星占位（始终保留空间，保证对齐） */}
            <View style={styles.starContainer}>
              {event.isImportant && (
                <Star size={14} color="#F59E0B" fill="#F59E0B" />
              )}
            </View>
            {/* 时间 */}
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
          
          <Text style={styles.healthText}>
            {isSupervisor ? t('log.patient_health_prefix') : t('log.your_health_prefix')}
            {typeName} {t('log.is')} <Text style={styles.healthValue}>{valueStr}</Text> 
            <Text style={styles.unitText}> {unit}</Text>
          </Text>
        </View>
        
        {event.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              "{event.note}"
            </Text>
          </View>
        )}
      </View>
    );
  };

  // 判断是否可以侧滑（只要有回调就启用，不再限制监督者模式）
  const canSwipe = onToggleImportant || onDeleteEvent;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {events.slice().reverse().map((event) => { 
          const timeStr = formatTime(event.timestamp);

          if (!canSwipe) {
            // 不可侧滑，直接渲染
            if (event.type === 'MEDICATION' && event.medId) {
              return (
                <View key={event.id} style={styles.cardWrapper}>
                  {renderMedicationItem(event, timeStr)}
                </View>
              );
            }
            if (event.type === 'HEALTH_RECORD') {
              return (
                <View key={event.id} style={styles.cardWrapper}>
                  {renderHealthItem(event, timeStr)}
                </View>
              );
            }
            return null;
          }

          // 可侧滑，包装 Swipeable
          return (
            <View key={event.id} style={{ marginBottom: 12 }}>
              <Swipeable
                ref={(ref) => swipeableRefs.current.set(event.id, ref)}
                renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, event)}
                friction={2}
                rightThreshold={40}
                overshootRight={false}
              >
                <View style={styles.swipeableCard}>
                  {event.type === 'MEDICATION' && event.medId && renderMedicationItem(event, timeStr)}
                  {event.type === 'HEALTH_RECORD' && renderHealthItem(event, timeStr)}
                </View>
              </Swipeable>
            </View>
          );
        })}
        
        <View style={{ height: 80 }} />
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  actionButtonWrapper: {
    width: 68,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starButton: {
    backgroundColor: '#F97316',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  cardWrapper: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  swipeableCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  starContainer: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  timeText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 13,
    minWidth: 68,
    textAlign: 'right',
  },
  contentArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '500',
  },
  medNameText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  healthItemContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  healthMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  healthText: {
    color: '#475569',
    fontSize: 15,
    flex: 1,
    flexWrap: 'wrap',
    fontWeight: '500',
  },
  customNoteText: {
    color: '#1e293b',
    fontSize: 15,
    flex: 1,
    flexWrap: 'wrap',
    fontWeight: '500',
  },
  healthValue: {
    fontWeight: '700',
    color: '#1e293b',
    fontSize: 18,
  },
  unitText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  noteContainer: {
    marginLeft: 102,
    marginTop: 8,
  },
  noteText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
