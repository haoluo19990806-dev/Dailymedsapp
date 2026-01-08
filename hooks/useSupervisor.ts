import { historyService } from '@/lib/historyService';
import { linkService } from '@/lib/linkService';
import { medService } from '@/lib/medService';
import { DashboardItem, FrequencyType, MedConfig, Senior } from '@/types';
import { saveData } from '@/utils/storage';
import { useCallback, useState } from 'react';

// 【优化】移到组件外部，避免每次渲染都重新创建，性能更好
const shouldTakeMed = (med: MedConfig, targetDateStr: string): boolean => {
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
};

export function useSupervisor(currentDateKey: string) {
  const [seniorList, setSeniorList] = useState<Senior[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [currentSeniorId, setCurrentSeniorId] = useState<string | null>(null);
  
  // 【修复 1】确保 loading 状态被正确管理
  const [isLoading, setIsLoading] = useState(false);

  // 1. 获取老人列表
  const fetchSeniors = useCallback(async () => {
    setIsLoading(true); // 开始加载
    try {
      const list = await linkService.fetchLinkedSeniors();
      setSeniorList(list);
      await saveData('SENIOR_LIST', list);
      return list;
    } catch (e) {
      console.error("Fetch seniors failed", e);
      return [];
    } finally {
      setIsLoading(false); // 结束加载
    }
  }, []);

  // 2. 获取请求
  const fetchRequests = useCallback(async () => {
    try {
      const reqs = await linkService.fetchIncomingRequests();
      setIncomingRequests(reqs || []);
    } catch (e) {
      console.error("Fetch requests failed", e);
    }
  }, []);

  // 3. 计算概览数据 (Dashboard)
  const fetchDashboardStatus = useCallback(async () => {
    if (seniorList.length === 0) {
      setDashboardData([]);
      return;
    }
    // 这里的 loading 我们可以选择不阻塞 UI（静默刷新），或者也加上
    // 考虑到用户体验，概览刷新通常是静默的，这里我们只在 console 报错
    try {
      const statusList = await Promise.all(seniorList.map(async (senior) => {
        const meds = await medService.fetchMedications(senior.id);
        const historyMap = await historyService.fetchHistory(senior.id);
        const todayEvents = historyMap[currentDateKey] || [];
        
        const medsToTake = meds.filter(m => shouldTakeMed(m, currentDateKey));
        const total = medsToTake.length;
        
        const takenIds = new Set(todayEvents.filter(e => e.type === 'MEDICATION' && e.medId).map(e => e.medId));
        const actualTakenCount = medsToTake.filter(m => takenIds.has(m.id)).length;
        
        return {
          id: senior.id,
          name: senior.note,
          total: total,
          taken: actualTakenCount,
          isAllDone: total > 0 && actualTakenCount >= total
        };
      }));
      setDashboardData(statusList);
    } catch (e) {
      console.error("Dashboard sync failed", e);
    }
  }, [seniorList, currentDateKey]);

  // 4. 处理请求（同意/拒绝）
  const handleRequest = async (id: string, accept: boolean) => {
    await linkService.respondToRequest(id, accept);
    setIncomingRequests(prev => prev.filter(r => r.id !== id));
  };

  // 5. 专注模式控制
  const enterPatientFocus = (id: string) => setCurrentSeniorId(id);
  const exitPatientFocus = () => setCurrentSeniorId(null);

  return {
    seniorList,
    setSeniorList,
    dashboardData,
    incomingRequests,
    setIncomingRequests,
    currentSeniorId,
    setCurrentSeniorId,
    isLoading, // 暴露 loading 状态
    
    fetchSeniors,
    fetchRequests,
    fetchDashboardStatus,
    handleRequest,
    
    enterPatientFocus,
    exitPatientFocus
  };
}