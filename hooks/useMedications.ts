import { medService } from '@/lib/medService';
import { FrequencyType, MedConfig } from '@/types';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

export function useMedications() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<MedConfig[]>([]);

  // 核心算法：判断某天是否需要吃某个药
  const shouldTakeMed = useCallback((med: MedConfig, targetDateStr: string): boolean => {
    if (med.frequencyType === FrequencyType.WEEKLY) {
      const date = new Date(targetDateStr);
      // 重要：JavaScript getDay() 返回 0-6 (0=Sunday, ..., 6=Saturday)
      // 转换为 1-7 (1=Monday, ..., 7=Sunday) 以匹配 med.days 数组
      let dayNum = date.getDay();
      if (dayNum === 0) dayNum = 7; // Sunday (0) -> 7, 不是 1！
      return med.days.includes(dayNum);
    } else if (med.frequencyType === FrequencyType.INTERVAL && med.startDate && med.interval) {
      const start = new Date(med.startDate).setHours(0,0,0,0);
      const current = new Date(targetDateStr).setHours(0,0,0,0);
      const diffTime = current - start;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return false;
      return diffDays % med.interval === 0;
    }
    return false;
  }, []);

  // 辅助算法：给时间段计算权重（用于排序）
  const getTimeWeight = (times: any) => {
    if (!times) return 99;
    const str = (Array.isArray(times) ? times.join(',') : String(times || '')).toLowerCase();
    
    if (str.includes('morning') || str.includes('breakfast') || str.includes('am') || str.includes('dawn') || str.includes('sunrise')) return 1;
    if (str.includes('noon') || str.includes('lunch') || str.includes('pm')) return 2;
    if (str.includes('evening') || str.includes('night') || str.includes('dinner') || str.includes('bed') || str.includes('sleep')) return 3;
    return 4; 
  };

  // 1. 获取药物列表（支持指定老人ID）
  const fetchMeds = useCallback(async (targetSeniorId?: string) => {
    try {
      const data = await medService.fetchMedications(targetSeniorId);
      setConfig(data);
      return data;
    } catch (e) {
      console.error("Fetch meds failed", e);
      return [];
    }
  }, []);

  // 2. 添加药物
  const addMed = useCallback(async (newMed: MedConfig, targetSeniorId?: string | null) => {
    try {
      // 如果 targetSeniorId 是 null，转为 undefined 传给 service
      const targetId = targetSeniorId || undefined;
      const savedMed = await medService.addMedication(newMed, targetId);
      setConfig(prev => [...prev, savedMed]);
      Alert.alert(t('alert.success'), t('alert.added'));
      return true;
    } catch (e) {
      Alert.alert("保存失败", "请检查网络或权限");
      return false;
    }
  }, [t]);

  // 3. 删除药物
  const removeMed = useCallback(async (id: string) => {
    return new Promise<void>((resolve) => {
      Alert.alert(t('alert.confirm_delete'), t('alert.delete_med_confirm'), [
        { text: t('alert.cancel'), style: "cancel", onPress: () => resolve() },
        { text: t('alert.delete'), style: "destructive", onPress: async () => {
            await medService.deleteMedication(id);
            setConfig(prev => prev.filter(c => c.id !== id));
            resolve();
        }}
      ]);
    });
  }, [t]);

  // 4. 获取今日需服用的药物（经过筛选和排序）
  const getTodaysMeds = useCallback((dateKey: string) => {
    return config
      .filter(med => shouldTakeMed(med, dateKey))
      .sort((a, b) => {
        const timesA = (a.timeOfDay as unknown) as any;
        const timesB = (b.timeOfDay as unknown) as any;
        return getTimeWeight(timesA) - getTimeWeight(timesB);
      });
  }, [config, shouldTakeMed]);

  return {
    config,       // 原始配置列表
    setConfig,    // 暴露给外部以备不时之需（如清空）
    fetchMeds,    // 刷新数据方法
    addMed,       // 添加方法
    removeMed,    // 删除方法
    getTodaysMeds // 获取今日药单方法
  };
}