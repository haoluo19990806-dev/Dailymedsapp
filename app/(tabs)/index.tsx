import '@/utils/i18n';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert, Image, LogBox, Modal, ScrollView, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 图标组件
import {
  CaregiverIcon, ChartIcon, HistoryIcon, HomeIcon, SettingsIcon, TrashIcon, UserIcon
} from '@/components/Icons';
import {
  Bell,
  Check, ChevronLeft, ChevronRight,
  ClipboardList,
  LogOut,
  Pill, PlusCircle, ShieldCheck, UserCog
} from 'lucide-react-native';

// 功能组件
import { ConfigBuilder } from '@/components/ConfigBuilder';
import { HealthRecordModal } from '@/components/HealthRecordModal';
import { HistoryScreen } from '@/components/HistoryScreen';
import { DashboardItem, SupervisorHomeScreen } from '@/components/SupervisorHomeScreen';
import { TrendsScreen } from '@/components/TrendsScreen';
import { UserHomeScreen } from '@/components/UserHomeScreen';

// 类型与工具
import { FrequencyType, HistoryRecord, MedConfig, Senior, TimelineEvent } from '@/types';
import { StorageKeys, loadData, saveData } from '@/utils/storage';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';

// 云端服务
import { historyService } from '@/lib/historyService';
import { linkService } from '@/lib/linkService';
import { medService } from '@/lib/medService';
import { supabase } from '@/lib/supabase';

LogBox.ignoreLogs(['Expo AV has been deprecated', 'No route named "index"']);

// Tab 类型定义
type Tab = 
  | 'HOME'        // 概览 / 患者主页
  | 'SETTINGS'    // 设置
  | 'TASKS'       // 专注模式：任务
  | 'FOCUS_HISTORY' // 专注模式：历史
  | 'FOCUS_TRENDS'  // 专注模式：趋势
  | 'ADD_MED' 
  | 'LANGUAGE'
  | 'TRENDS'      // 患者模式趋势
  | 'HISTORY';    // 患者模式历史

type AppMode = 'LANDING' | 'USER' | 'SUPERVISOR';

const SettingsItem = ({ label, icon, rightText, onPress, isLast = false, color = "#334155" }: any) => (
  <TouchableOpacity 
    onPress={onPress} 
    activeOpacity={0.7} 
    className={`flex-row items-center justify-between py-4 px-4 bg-white ${!isLast ? 'border-b border-slate-50' : ''}`}
  >
    <View className="flex-row items-center">
      <View className="w-8 items-center justify-center mr-3">{icon}</View>
      <Text className="text-base font-medium" style={{ color: color }}>{label}</Text>
    </View>
    <View className="flex-row items-center gap-1">
      {rightText && <Text className="text-slate-400 text-sm mr-1">{rightText}</Text>}
      {onPress && <ChevronRight size={20} color="#cbd5e1" />}
    </View>
  </TouchableOpacity>
);

const SettingsGroup = ({ children }: { children: React.ReactNode }) => (
  <View className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm border border-slate-100">{children}</View>
);

export default function App() {
  const { t, i18n } = useTranslation(); 
  const soundRef = useRef<Audio.Sound | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>('LANDING');
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  
  const [currentDateKey, setCurrentDateKey] = useState<string>("");
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState<number>(1);
  
  const [supervisorCode, setSupervisorCode] = useState<string>("加载中...");
  const [config, setConfig] = useState<MedConfig[]>([]); 
  const [history, setHistory] = useState<HistoryRecord>({}); 
  
  const [seniorList, setSeniorList] = useState<Senior[]>([]); 
  const [currentSeniorId, setCurrentSeniorId] = useState<string | null>(null); 
  const [dashboardData, setDashboardData] = useState<DashboardItem[]>([]);
  
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const [showAddSeniorModal, setShowAddSeniorModal] = useState<boolean>(false);
  const [showSeniorListModal, setShowSeniorListModal] = useState<boolean>(false); 
  const [newSeniorCode, setNewSeniorCode] = useState<string>("");
  const [newSeniorNote, setNewSeniorNote] = useState<string>("");
  const [showMoonModal, setShowMoonModal] = useState<boolean>(false);
  const [showHealthRecordModal, setShowHealthRecordModal] = useState<boolean>(false);

  const [isSelectingForMedMgmt, setIsSelectingForMedMgmt] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        setCurrentDateKey(`${year}-${month}-${day}`);
        let dayNum = now.getDay(); if (dayNum === 0) dayNum = 7;
        setCurrentDayOfWeek(dayNum);

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
        const { sound } = await Audio.Sound.createAsync(require('@/assets/sounds/pop.mp3'), { shouldPlay: false });
        soundRef.current = sound;

        const savedMode = await loadData(StorageKeys.APP_MODE);
        if (savedMode) setAppMode(savedMode);
        const savedLang = await loadData('APP_LANGUAGE');
        if (savedLang) i18n.changeLanguage(savedLang);
        
        const savedSeniors = await loadData('SENIOR_LIST');
        if (savedSeniors) setSeniorList(savedSeniors);

        setTimeout(() => fetchCloudData(undefined, true), 100);

      } catch (e) {
        console.error("初始化失败", e);
      } finally {
        setIsLoading(false); // 兜底防止一直转圈
      }
    };
    initApp();
    return () => { if (soundRef.current) soundRef.current.unloadAsync(); };
  }, []);

  // 1. 常规检查：新消息、同步列表
  useEffect(() => {
    const checkUpdates = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (appMode === 'USER') {
            const reqs = await linkService.fetchIncomingRequests();
            setIncomingRequests(reqs || []);
        } else if (appMode === 'SUPERVISOR') {
            const approvedSeniors = await linkService.fetchLinkedSeniors();
            setSeniorList(approvedSeniors);
            saveData('SENIOR_LIST', approvedSeniors);
        }
    };
    
    if (!isLoading) {
        checkUpdates();
        fetchCloudData(undefined, false);
    }
  }, [appMode]); 

  // 🔥 核心修复：一旦 seniorList 发生变化（比如从云端拉取到了新名单），立即刷新 Dashboard
  useEffect(() => {
    if (appMode === 'SUPERVISOR' && activeTab === 'HOME' && !currentSeniorId) {
        fetchDashboardStatus();
    }
  }, [seniorList]); // 👈 监听名单变化

  const fetchDashboardStatus = async () => {
    if (seniorList.length === 0) {
      setDashboardData([]);
      setIsLoading(false);
      return;
    }
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
      console.error("概览数据获取失败", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCloudData = async (targetSeniorId?: string, showLoading: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('invite_code').eq('id', user.id).single();
    if (profile?.invite_code) setSupervisorCode(profile.invite_code);

    let fetchTargetId = undefined; 
    
    if (appMode === 'SUPERVISOR') {
        const idToUse = targetSeniorId || currentSeniorId;
        if (idToUse) {
            fetchTargetId = idToUse; 
        } else if (activeTab === 'HOME' && !currentSeniorId) {
            if (showLoading) setIsLoading(true);
            await fetchDashboardStatus();
            setConfig([]); 
            setHistory({});
            return; 
        }
    }

    if (showLoading) setIsLoading(true);
    
    try {
        const [medsData, historyData] = await Promise.all([
            medService.fetchMedications(fetchTargetId),
            historyService.fetchHistory(fetchTargetId)
        ]);
        setConfig(medsData);
        setHistory(historyData);
    } catch (e) {
        console.error('同步数据出错', e);
    } finally {
        if (showLoading) setIsLoading(false);
    }
  };

  const handleToggleMed = async (medId: string) => {
    if (appMode === 'SUPERVISOR') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const todayRecord = history[currentDateKey] || [];
    const existingEvent = todayRecord.find(event => event.medId === medId);

    if (existingEvent) {
      if (existingEvent.id) await historyService.deleteEvent(existingEvent.id);
      const newRecord = todayRecord.filter(e => e.id !== existingEvent.id);
      setHistory(prev => ({ ...prev, [currentDateKey]: newRecord }));
    } else {
      const medConfig = config.find(c => c.id === medId);
      const newEventBase: TimelineEvent = {
        id: 'temp-id', type: 'MEDICATION', timestamp: Date.now(),
        dateKey: currentDateKey, medId: medId, medName: medConfig?.name, isTaken: true
      };

      const dbRecord = await historyService.addEvent(newEventBase);
      if (dbRecord) {
        const newEvent = { ...newEventBase, id: dbRecord.id };
        const newRecord = [...todayRecord, newEvent];
        setHistory(prev => ({ ...prev, [currentDateKey]: newRecord }));
        
        if (soundRef.current) await soundRef.current.replayAsync();

        const targetMedIds = config.filter(m => shouldTakeMed(m, currentDateKey)).map(m => m.id);
        const takenMedIdsSet = new Set(newRecord.filter(e => e.type === 'MEDICATION' && e.medId).map(e => e.medId!));
        const isAllDone = targetMedIds.length > 0 && targetMedIds.every(id => takenMedIdsSet.has(id));

        if (isAllDone) setTimeout(() => setShowMoonModal(true), 500);
      }
    }
  };

  const saveNewMedication = async (newMed: MedConfig) => {
    try {
      const targetId = (appMode === 'SUPERVISOR' && currentSeniorId) ? currentSeniorId : undefined;
      const savedMed = await medService.addMedication(newMed, targetId);
      setConfig(prev => [...prev, savedMed]);
      Alert.alert(t('alert.success'), t('alert.added'));
    } catch (e) {
      Alert.alert("保存失败", "请检查网络或权限");
    }
  };

  const removeMedication = async (id: string) => {
    Alert.alert(t('alert.confirm_delete'), t('alert.delete_med_confirm'), [
      { text: t('alert.cancel'), style: "cancel" },
      { text: t('alert.delete'), style: "destructive", onPress: async () => {
          await medService.deleteMedication(id);
          setConfig(prev => prev.filter(c => c.id !== id));
      }}
    ]);
  };

  const handleSaveHealthRecord = async (newEvent: TimelineEvent) => {
    let targetId = undefined;
    if (appMode === 'SUPERVISOR') {
        if (currentSeniorId) {
            targetId = currentSeniorId;
        } else {
            return;
        }
    }

    const dbRecord = await historyService.addEvent(newEvent, targetId);
    if (dbRecord) {
      const savedEvent = { ...newEvent, id: dbRecord.id };
      const newRecord = [...(history[currentDateKey] || []), savedEvent];
      setHistory(prev => ({ ...prev, [currentDateKey]: newRecord }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('alert.record_saved'), t('alert.body_data_saved'));
    }
  };

  const handleDeleteHistoryItem = async (itemToDelete: TimelineEvent) => {
    Alert.alert(t('alert.confirm_delete'), t('alert.confirm_delete_record'), [
      { text: t('alert.cancel'), style: "cancel" },
      { text: t('alert.delete'), style: "destructive", onPress: async () => {
          if (itemToDelete.id) {
            await historyService.deleteEvent(itemToDelete.id);
            const newRecord = (history[currentDateKey] || []).filter(i => i.id !== itemToDelete.id);
            setHistory(prev => ({ ...prev, [currentDateKey]: newRecord }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
      }}
    ]);
  };

  const handleAddSenior = async () => {
    if (!newSeniorCode.trim()) { Alert.alert(t('alert.tip'), t('alert.enter_code')); return; }
    setIsLoading(true);
    try {
        const result = await linkService.sendRequest(newSeniorCode, newSeniorNote);
        if (result.status === 'approved') {
            Alert.alert("成功", "已绑定您自己的账户！");
            const updatedList = await linkService.fetchLinkedSeniors();
            setSeniorList(updatedList);
            saveData('SENIOR_LIST', updatedList);
            fetchDashboardStatus(); 
        } else {
            Alert.alert("申请已发送", "请通知该用户在 App 设置页中点击【新请求】进行同意。");
        }
        setShowAddSeniorModal(false);
        setNewSeniorCode("");
        setNewSeniorNote("");
    } catch (e: any) {
        Alert.alert("操作失败", e.message || "请检查网络");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteSenior = async (id: string) => {
    Alert.alert(t('alert.confirm_remove'), t('alert.confirm_remove_patient'), [
      { text: t('alert.cancel'), style: "cancel" },
      { text: t('alert.remove'), style: "destructive", onPress: async () => {
          setIsLoading(true);
          try {
            await linkService.unbindSenior(id);
            const newList = seniorList.filter(s => s.id !== id);
            setSeniorList(newList);
            await saveData('SENIOR_LIST', newList);
            if (currentSeniorId === id) {
              handleExitPatientFocus();
            } else {
              fetchDashboardStatus();
            }
            Alert.alert("已解除", "绑定关系已彻底删除");
          } catch (e) {
             Alert.alert("删除失败", "请检查网络连接");
          } finally {
             setIsLoading(false);
          }
      }}
    ]);
  };

  const enterPatientFocus = (seniorId: string) => {
    setCurrentSeniorId(seniorId);
    setActiveTab('TASKS');
    fetchCloudData(seniorId, true);
  };

  const handleExitPatientFocus = () => {
    setCurrentSeniorId(null);
    setActiveTab('HOME');
    fetchCloudData(undefined, true);
  };

  const switchToSeniorForMed = (seniorId: string) => {
    setCurrentSeniorId(seniorId);
    setShowSeniorListModal(false);
    if (isSelectingForMedMgmt) {
        setActiveTab('ADD_MED');
        setIsSelectingForMedMgmt(false);
    }
    fetchCloudData(seniorId, true);
  };

  const shouldTakeMed = (med: MedConfig, targetDateStr: string): boolean => {
    if (med.frequencyType === FrequencyType.WEEKLY) {
      const date = new Date(targetDateStr);
      let dayNum = date.getDay(); if (dayNum === 0) dayNum = 7;
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
  
  const changeLanguage = async (lang: string) => { await i18n.changeLanguage(lang); await saveData('APP_LANGUAGE', lang); setActiveTab('SETTINGS'); };
  const switchMode = (mode: AppMode) => { 
      setAppMode(mode); 
      saveData(StorageKeys.APP_MODE, mode); 
      setTimeout(() => fetchCloudData(undefined, true), 50);
  };
  const handleLogout = async () => {
    Alert.alert("退出登录", "确定要退出吗？", [
      { text: "取消", style: "cancel" },
      { text: "退出", style: "destructive", onPress: async () => { await supabase.auth.signOut(); }}
    ]);
  };

  const todaysMeds = config
    .filter(med => shouldTakeMed(med, currentDateKey))
    .sort((a, b) => {
        const timesA = (a.timeOfDay as unknown) as any;
        const timesB = (b.timeOfDay as unknown) as any;

        const getWeight = (times: any) => {
            if (!times) return 99;
            const str = (Array.isArray(times) ? times.join(',') : String(times || '')).toLowerCase();
            
            if (str.includes('morning') || str.includes('breakfast') || str.includes('am') || str.includes('dawn') || str.includes('sunrise')) return 1;
            if (str.includes('noon') || str.includes('lunch') || str.includes('pm')) return 2;
            if (str.includes('evening') || str.includes('night') || str.includes('dinner') || str.includes('bed') || str.includes('sleep')) return 3;
            return 4; 
        };
        
        return getWeight(timesA) - getWeight(timesB);
    });

  const todayRecord = history[currentDateKey] || [];

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-bg-warm"><ActivityIndicator size="large" color="#10b981" /><Text className="mt-4 text-slate-400">正在同步数据...</Text></View>;
  }

  if (appMode === 'LANDING') {
    return (
      <View className="flex-1 bg-bg-warm">
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="items-center mb-12"><Text className="text-4xl font-bold text-slate-800">Daily Meds</Text><Text className="text-slate-400 text-lg mt-2">{t('landing.subtitle')}</Text></View>
          <View className="w-full bg-white rounded-3xl overflow-hidden shadow-sm">
            <TouchableOpacity onPress={() => switchMode('USER')} className="w-full p-6 flex-row items-center gap-6 border-b border-slate-100" activeOpacity={0.7}><View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center"><UserIcon size={32} color="#f97316" /></View><View><Text className="text-xl font-bold text-slate-700">{t('landing.patient')}</Text><Text className="text-slate-400">{t('landing.patient_desc')}</Text></View></TouchableOpacity>
            <TouchableOpacity onPress={() => switchMode('SUPERVISOR')} className="w-full p-6 flex-row items-center gap-6" activeOpacity={0.7}><View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center"><CaregiverIcon size={32} color="#3b82f6" /></View><View><Text className="text-xl font-bold text-slate-700">{t('landing.supervisor')}</Text><Text className="text-slate-400">{t('landing.supervisor_desc')}</Text></View></TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-warm">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        
        {/* 顶部状态栏 */}
        {activeTab !== 'SETTINGS' && activeTab !== 'ADD_MED' && activeTab !== 'LANGUAGE' && !currentSeniorId && (
          <View className="flex-row justify-end items-center px-6 py-2"><View className="px-2 py-1 bg-slate-100 rounded-full"><Text className="text-xs font-bold text-slate-300">{appMode === 'USER' ? t('header.mode_patient') : t('header.mode_supervisor')}</Text></View></View>
        )}

        {/* 专注模式导航栏 */}
        {currentSeniorId && appMode === 'SUPERVISOR' && activeTab !== 'ADD_MED' && (
           <View className="flex-row items-center px-4 py-2 border-b border-slate-100/50 bg-bg-warm">
              <TouchableOpacity onPress={handleExitPatientFocus} className="flex-row items-center p-2 rounded-xl bg-white border border-slate-100">
                 <ChevronLeft size={20} color="#64748b"/>
                 <Text className="text-slate-600 font-bold ml-1">返回概览</Text>
              </TouchableOpacity>
           </View>
        )}

        <View className="flex-1 relative">
          
          {(activeTab === 'TRENDS' || activeTab === 'FOCUS_TRENDS') && (
            <View className="flex-1">
               <TrendsScreen history={history} onDelete={handleDeleteHistoryItem} />
            </View>
          )}
          
          {activeTab === 'HOME' && appMode === 'USER' && <UserHomeScreen todaysMeds={todaysMeds} todayRecord={todayRecord} currentDayOfWeek={currentDayOfWeek} onToggleMed={handleToggleMed} />}
          
          {activeTab === 'HOME' && appMode === 'SUPERVISOR' && (
             <SupervisorHomeScreen 
               currentSeniorId={null}
               seniorList={seniorList} 
               todaysMeds={[]} 
               todayRecord={[]}
               dashboardData={dashboardData}
               onSelectSenior={enterPatientFocus} 
             />
          )}

          {activeTab === 'TASKS' && appMode === 'SUPERVISOR' && (
             <SupervisorHomeScreen 
               currentSeniorId={currentSeniorId} 
               seniorList={seniorList} 
               todaysMeds={todaysMeds} 
               todayRecord={todayRecord}
               dashboardData={[]}
               onSelectSenior={() => {}} 
             />
          )}
          
          {(activeTab === 'HISTORY' || activeTab === 'FOCUS_HISTORY') && (
             <View className="flex-1">
               <HistoryScreen history={history} config={config} isSupervisor={appMode === 'SUPERVISOR'} />
             </View>
          )}
          
          {activeTab === 'SETTINGS' && (
             <ScrollView className="flex-1 w-full px-4 pt-4 bg-bg-warm" contentContainerStyle={{ paddingBottom: 100 }}>
                <Text className="text-3xl font-bold text-slate-800 mb-6 px-2">{t('settings.title')}</Text>

                {appMode === 'USER' && incomingRequests.length > 0 && (
                  <TouchableOpacity onPress={() => setShowRequestModal(true)} className="mx-2 mb-4 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex-row items-center gap-3">
                    <View className="bg-orange-100 p-2 rounded-full"><Bell size={20} color="#f97316" /></View>
                    <View className="flex-1"><Text className="text-orange-700 font-bold text-base">有 {incomingRequests.length} 条新的监督申请</Text><Text className="text-orange-400 text-xs">点击查看并处理</Text></View><View className="w-2 h-2 bg-red-500 rounded-full" />
                  </TouchableOpacity>
                )}

                <SettingsGroup>
                  {appMode === 'USER' ? <SettingsItem label={t('settings.my_code')} icon={<ShieldCheck size={22} color="#f59e0b" />} rightText={supervisorCode} /> : 
                     <SettingsItem 
                        label="解除绑定管理" 
                        icon={<UserCog size={22} color="#3b82f6" />} 
                        rightText="管理列表" 
                        onPress={() => { setIsSelectingForMedMgmt(false); setShowSeniorListModal(true); }} 
                     />
                  }
                  {appMode === 'SUPERVISOR' && <SettingsItem label={t('settings.add_patient')} icon={<PlusCircle size={22} color="#3b82f6" />} onPress={() => setShowAddSeniorModal(true)} />}
                  <SettingsItem label={t('header.switch_identity')} icon={<UserIcon size={22} color="#64748b" />} rightText={appMode === 'USER' ? t('header.mode_patient') : t('header.mode_supervisor')} onPress={() => setAppMode('LANDING')} isLast={true} />
                </SettingsGroup>

                {appMode === 'SUPERVISOR' && (
                   <>
                    <Text className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider mt-4">{t('settings.section_general')}</Text>
                    <SettingsGroup>
                      <SettingsItem 
                        label={t('settings.med_mgmt')} 
                        icon={<Pill size={22} color="#10b981" />} 
                        rightText="选择患者以管理" 
                        onPress={() => { setIsSelectingForMedMgmt(true); setShowSeniorListModal(true); }} 
                      />
                    </SettingsGroup>
                   </>
                )}

                {appMode === 'USER' && (
                   <>
                    <Text className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider mt-4">{t('settings.section_general')}</Text>
                    <SettingsGroup><SettingsItem label={t('settings.med_mgmt')} icon={<Pill size={22} color="#10b981" />} rightText={t('settings.med_action')} onPress={() => setActiveTab('ADD_MED')} /></SettingsGroup>
                   </>
                )}

                <View className="mt-8 px-4 pb-12"><TouchableOpacity onPress={handleLogout} className="flex-row items-center justify-center bg-red-50 py-4 rounded-2xl active:bg-red-100 border border-red-100"><LogOut size={20} color="#ef4444" className="mr-2" /><Text className="text-red-500 font-bold text-lg ml-2">退出登录</Text></TouchableOpacity></View>
             </ScrollView>
          )}

          {activeTab === 'ADD_MED' && (
             <View className="flex-1 bg-bg-warm">
               <View className="flex-row items-center px-4 py-3 bg-bg-warm border-b border-slate-100/50">
                  <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} className="p-2 mr-2 bg-white rounded-full border border-slate-100 shadow-sm"><ChevronLeft size={24} color="#334155" /></TouchableOpacity>
                  <Text className="text-xl font-bold text-slate-700">
                    {appMode === 'SUPERVISOR' ? `正在管理: ${seniorList.find(s=>s.id===currentSeniorId)?.note}` : t('med_mgmt.title')}
                  </Text>
               </View>
               <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
                  <ConfigBuilder isSupervisor={appMode === 'SUPERVISOR'} targetName={seniorList.find(s=>s.id===currentSeniorId)?.note || ''} onSave={saveNewMedication} />
                  <View className="mt-8 mb-4 flex-row items-center justify-between px-2"><Text className="text-lg font-bold text-slate-700">{t('med_mgmt.section_added')}</Text><Text className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{config.length}</Text></View>
                  <View className="gap-3">{config.map(med => (<View key={med.id} className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"><View className="flex-row items-center gap-4 flex-1"><View className={`w-12 h-12 rounded-xl ${getMedStyles(med.iconType).bg} items-center justify-center`}>{renderMedIcon(med.iconType, 36, "white")}</View><View className="flex-1 justify-center"><View className="flex-row gap-2">{renderTimeIcon(med.timeOfDay)}</View></View></View><TouchableOpacity onPress={() => removeMedication(med.id)} className="p-3 bg-red-50 rounded-full ml-2"><TrashIcon size={20} color="#f87171" /></TouchableOpacity></View>))}</View>
               </ScrollView>
             </View>
          )}

          {activeTab === 'LANGUAGE' && <View className="flex-1 bg-bg-warm"><View className="flex-row items-center px-4 py-3 bg-bg-warm border-b border-slate-100/50"><TouchableOpacity onPress={() => setActiveTab('SETTINGS')} className="p-2 mr-2 bg-white rounded-full border border-slate-100 shadow-sm"><ChevronLeft size={24} color="#334155" /></TouchableOpacity><Text className="text-xl font-bold text-slate-700">{t('lang.title')}</Text></View><ScrollView className="flex-1 px-4 pt-4"><SettingsGroup><TouchableOpacity onPress={() => changeLanguage('zh')} className="flex-row items-center justify-between py-4 px-4 bg-white border-b border-slate-50"><Text className="text-base font-medium text-slate-700">{t('lang.zh')}</Text>{i18n.language === 'zh' && <Check size={20} color="#10b981" />}</TouchableOpacity><TouchableOpacity onPress={() => changeLanguage('en')} className="flex-row items-center justify-between py-4 px-4 bg-white"><Text className="text-base font-medium text-slate-700">{t('lang.en')}</Text>{i18n.language === 'en' && <Check size={20} color="#10b981" />}</TouchableOpacity></SettingsGroup></ScrollView></View>}
          
          {/* 蓝色悬浮球 */}
          {( (activeTab === 'HOME' && appMode === 'USER') || (activeTab === 'TASKS' && appMode === 'SUPERVISOR') ) && (
            <TouchableOpacity 
              onPress={() => setShowHealthRecordModal(true)} 
              className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-lg z-50" 
              style={{ elevation: 5 }}
            >
              <Text className="text-white text-4xl font-light pb-1">+</Text>
            </TouchableOpacity>
          )}

        </View>
      </SafeAreaView>

      {/* 底部导航栏 */}
      {activeTab !== 'ADD_MED' && activeTab !== 'LANGUAGE' && (
        <View className="bg-white border-t border-slate-100">
          <SafeAreaView edges={['bottom']} className="flex-row justify-around items-center h-20 px-4">
              
              {/* 场景1：患者模式 */}
              {appMode === 'USER' && (
                <>
                  <TouchableOpacity onPress={() => setActiveTab('TRENDS')} style={{ width: 64, height: 64 }} className="items-center justify-center"><ChartIcon size={32} color={activeTab === 'TRENDS' ? "#8B5CF6" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'TRENDS' ? "#8B5CF6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.trends')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('HOME')} style={{ width: 64, height: 64 }} className="items-center justify-center"><HomeIcon size={32} color={activeTab === 'HOME' ? '#4ADE80' : '#cbd5e1'} /><Text style={{ fontSize: 10, color: activeTab === 'HOME' ? "#4ADE80" : "#cbd5e1", marginTop: 4 }}>{t('tabs.home')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('HISTORY')} style={{ width: 64, height: 64 }} className="items-center justify-center"><HistoryIcon size={32} color={activeTab === 'HISTORY' ? "#3b82f6" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'HISTORY' ? "#3b82f6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.history')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} style={{ width: 64, height: 64 }} className="items-center justify-center"><SettingsIcon size={32} color={activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1", marginTop: 4 }}>{t('tabs.settings')}</Text></TouchableOpacity>
                </>
              )}

              {/* 场景2：监督者概览 */}
              {appMode === 'SUPERVISOR' && !currentSeniorId && (
                <>
                  <TouchableOpacity onPress={() => setActiveTab('HOME')} className="items-center justify-center flex-1"><HomeIcon size={32} color={activeTab === 'HOME' ? '#4ADE80' : '#cbd5e1'} /><Text style={{ fontSize: 10, color: activeTab === 'HOME' ? "#4ADE80" : "#cbd5e1", marginTop: 4 }}>{t('tabs.home')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} className="items-center justify-center flex-1"><SettingsIcon size={32} color={activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1", marginTop: 4 }}>{t('tabs.settings')}</Text></TouchableOpacity>
                </>
              )}

              {/* 场景3：监督者专注模式 */}
              {appMode === 'SUPERVISOR' && currentSeniorId && (
                <>
                  <TouchableOpacity onPress={() => setActiveTab('TASKS')} className="items-center justify-center flex-1"><ClipboardList size={32} color={activeTab === 'TASKS' ? '#3b82f6' : '#cbd5e1'} /><Text style={{ fontSize: 10, color: activeTab === 'TASKS' ? "#3b82f6" : "#cbd5e1", marginTop: 4 }}>任务</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('FOCUS_HISTORY')} className="items-center justify-center flex-1"><HistoryIcon size={32} color={activeTab === 'FOCUS_HISTORY' ? "#3b82f6" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'FOCUS_HISTORY' ? "#3b82f6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.history')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('FOCUS_TRENDS')} className="items-center justify-center flex-1"><ChartIcon size={32} color={activeTab === 'FOCUS_TRENDS' ? "#8B5CF6" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'FOCUS_TRENDS' ? "#8B5CF6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.trends')}</Text></TouchableOpacity>
                </>
              )}

          </SafeAreaView>
        </View>
      )}

      <Modal animationType="fade" transparent={true} visible={showAddSeniorModal} onRequestClose={() => setShowAddSeniorModal(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white w-full max-w-xs rounded-3xl p-6">
            <Text className="text-xl font-bold text-slate-700 mb-4 text-center">{t('modal.add_patient_title')}</Text>
            <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">{t('modal.code_label')}</Text>
            <TextInput className="w-full bg-slate-50 p-3 rounded-xl text-slate-700 text-lg border border-slate-100 mb-4 font-mono" placeholder={t('modal.code_placeholder')} placeholderTextColor="#cbd5e1" keyboardType="number-pad" value={newSeniorCode} onChangeText={setNewSeniorCode} maxLength={6} />
            <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">{t('modal.note_label')}</Text>
            <TextInput className="w-full bg-slate-50 p-3 rounded-xl text-slate-700 text-lg border border-slate-100 mb-6" placeholder={t('modal.note_placeholder')} placeholderTextColor="#cbd5e1" value={newSeniorNote} onChangeText={setNewSeniorNote} />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setShowAddSeniorModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl items-center"><Text className="text-slate-500 font-bold">{t('modal.btn_cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddSenior} className="flex-1 py-3 bg-blue-500 rounded-xl items-center"><Text className="text-white font-bold">{t('modal.btn_confirm')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={showRequestModal} onRequestClose={() => setShowRequestModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white w-full rounded-t-3xl p-6 h-1/2">
            <Text className="text-xl font-bold text-slate-700 mb-6 text-center">新的监督申请</Text>
            <ScrollView className="flex-1">
              {incomingRequests.map(req => (
                  <View key={req.id} className="flex-row items-center justify-between mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <View><Text className="font-bold text-slate-700 text-lg">新的监护人请求</Text><Text className="text-slate-400 text-xs mt-1">申请时间: {new Date(req.created_at).toLocaleDateString()}</Text></View>
                    <View className="flex-row gap-2">
                        <TouchableOpacity onPress={async () => { await linkService.respondToRequest(req.id, false); setIncomingRequests(prev => prev.filter(r => r.id !== req.id)); }} className="px-4 py-2 bg-slate-200 rounded-lg"><Text className="text-slate-500 font-bold">拒绝</Text></TouchableOpacity>
                        <TouchableOpacity onPress={async () => { await linkService.respondToRequest(req.id, true); Alert.alert("已授权", "该监督者现在可以管理您的药物了"); setIncomingRequests(prev => prev.filter(r => r.id !== req.id)); }} className="px-4 py-2 bg-blue-500 rounded-lg"><Text className="text-white font-bold">同意</Text></TouchableOpacity>
                    </View>
                  </View>
              ))}
              {incomingRequests.length === 0 && <Text className="text-center text-slate-400 mt-10">暂无待处理请求</Text>}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowRequestModal(false)} className="mt-4 py-4 bg-slate-100 rounded-2xl items-center"><Text className="text-slate-500 font-bold">关闭</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={showSeniorListModal} onRequestClose={() => setShowSeniorListModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white w-full rounded-t-3xl p-6 h-1/2">
            <Text className="text-xl font-bold text-slate-700 mb-6 text-center">{isSelectingForMedMgmt ? "选择患者以管理药物" : t('modal.patient_list_title')}</Text>
            <ScrollView className="flex-1">
              {seniorList.length === 0 ? <Text className="text-center text-slate-400 mt-10">{t('modal.list_empty')}</Text> : seniorList.map(senior => (
                  <View key={senior.id} className="flex-row items-center mb-3 gap-2">
                    <TouchableOpacity onPress={() => switchToSeniorForMed(senior.id)} className={`flex-1 p-4 rounded-2xl border-2 ${currentSeniorId === senior.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}>
                      <View className="flex-row justify-between items-center"><Text className="text-lg font-bold text-slate-700">{senior.note}</Text><Text className="text-slate-400 font-mono">ID: {senior.id.substring(0,4)}...</Text></View>
                    </TouchableOpacity>
                    {!isSelectingForMedMgmt && (
                        <TouchableOpacity onPress={() => handleDeleteSenior(senior.id)} className="p-4 bg-red-50 rounded-2xl justify-center items-center"><TrashIcon size={24} color="#f87171" /></TouchableOpacity>
                    )}
                  </View>
                ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowSeniorListModal(false)} className="mt-4 py-4 bg-slate-100 rounded-2xl items-center"><Text className="text-slate-500 font-bold">{t('modal.close')}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={showMoonModal} onRequestClose={() => setShowMoonModal(false)}><TouchableWithoutFeedback onPress={() => setShowMoonModal(false)}><View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' }}><View className="items-center"><View className="mb-8"><Image source={require('@/assets/images/moon.png')} style={{ width: 200, height: 200, resizeMode: 'contain' }} /></View><Text className="text-3xl font-bold text-white mb-2">{t('modal.good_night')}</Text><Text className="text-lg text-white opacity-80 mb-12 font-medium">{t('modal.all_done')}</Text></View></View></TouchableWithoutFeedback></Modal>
      <HealthRecordModal visible={showHealthRecordModal} onClose={() => setShowHealthRecordModal(false)} onSave={handleSaveHealthRecord} currentDateKey={currentDateKey} />
    </View>
  );
}