import '@/utils/i18n';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ClipboardList } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert, LogBox, Text,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- 图标组件 ---
import { CaregiverIcon, ChartIcon, HistoryIcon, HomeIcon, SettingsIcon, UserIcon } from '@/components/Icons';

// --- 页面与功能组件 ---
import { AddMedView } from '@/components/AddMedView';
import { HealthRecordModal } from '@/components/HealthRecordModal';
import { HistoryScreen } from '@/components/HistoryScreen';
import { LanguageView } from '@/components/LanguageView';
import { SettingsView } from '@/components/SettingsView';
import { SupervisorHomeScreen } from '@/components/SupervisorHomeScreen';
import { TrendsScreen } from '@/components/TrendsScreen';
import { UserHomeScreen } from '@/components/UserHomeScreen';

// --- 弹窗组件 ---
import { AddPatientModal } from '@/components/modals/AddPatientModal';
import { MoonModal } from '@/components/modals/MoonModal';
import { PatientListModal, RequestModal } from '@/components/modals/SupervisorModals';

// --- 动画组件 ---
import { AnimatedPage } from '@/components/AnimatedPage';

// --- 逻辑 Hooks ---
import { useMedications } from '@/hooks/useMedications';
import { useSupervisor } from '@/hooks/useSupervisor';

// --- 类型与服务 ---
import { historyService } from '@/lib/historyService';
import { supabase } from '@/lib/supabase';
import { AppMode, HistoryRecord, Senior, Tab, TimelineEvent } from '@/types';
import { StorageKeys, loadData, saveData } from '@/utils/storage';

LogBox.ignoreLogs(['Expo AV has been deprecated', 'No route named "index"']);

export default function App() {
  const { t, i18n } = useTranslation(); 
  const soundRef = useRef<Audio.Sound | null>(null);

  // --- 状态管理 ---
  const [isLoading, setIsLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>('LANDING');
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [currentDateKey, setCurrentDateKey] = useState<string>("");
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState<number>(1);
  const [supervisorCode, setSupervisorCode] = useState<string>("加载中...");
  
  // Modal 可见性
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAddSeniorModal, setShowAddSeniorModal] = useState<boolean>(false);
  const [showSeniorListModal, setShowSeniorListModal] = useState<boolean>(false); 
  const [showMoonModal, setShowMoonModal] = useState<boolean>(false);
  const [showHealthRecordModal, setShowHealthRecordModal] = useState<boolean>(false);
  const [isSelectingForMedMgmt, setIsSelectingForMedMgmt] = useState(false);

  // 历史数据
  const [history, setHistory] = useState<HistoryRecord>({}); 

  // --- Hook 1: 药物管理 ---
  const { 
    config, setConfig, fetchMeds, addMed, removeMed, getTodaysMeds 
  } = useMedications();

  // --- Hook 2: 监督者逻辑 ---
  const {
    seniorList, setSeniorList, dashboardData, incomingRequests, currentSeniorId,
    fetchSeniors, fetchRequests, fetchDashboardStatus, handleRequest,
    enterPatientFocus, exitPatientFocus
  } = useSupervisor(currentDateKey);

  // --- 初始化 ---
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
        setIsLoading(false); 
      }
    };
    initApp();
    return () => { if (soundRef.current) soundRef.current.unloadAsync(); };
  }, []);

  // 监听模式切换
  useEffect(() => {
    const checkUpdates = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        if (appMode === 'USER') {
            fetchRequests(); 
        } else if (appMode === 'SUPERVISOR') {
            fetchSeniors();
        }
    };
    if (!isLoading) {
        checkUpdates();
        fetchCloudData(undefined, false);
    }
  }, [appMode]); 

  // 【核心修复】监听 Tab 切换：每次切回主页时，强制刷新老人列表
  // 解决了“在设置页添加完老人，回主页不显示”的 Bug
  useEffect(() => {
    if (appMode === 'SUPERVISOR' && activeTab === 'HOME' && !currentSeniorId) {
      fetchSeniors(); 
    }
  }, [activeTab, appMode, currentSeniorId]);

  // 监听列表变化刷新 Dashboard
  useEffect(() => {
    if (appMode === 'SUPERVISOR' && activeTab === 'HOME' && !currentSeniorId) {
        fetchDashboardStatus();
    }
  }, [seniorList]);

  // --- 数据同步总控 ---
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
        await Promise.all([
            fetchMeds(fetchTargetId),
            historyService.fetchHistory(fetchTargetId)
        ]).then(([_, hist]) => {
           setHistory(hist);
        });
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
        
        const todaysMeds = getTodaysMeds(currentDateKey);
        const targetMedIds = todaysMeds.map(m => m.id);
        const takenMedIdsSet = new Set(newRecord.filter(e => e.type === 'MEDICATION' && e.medId).map(e => e.medId!));
        const isAllDone = targetMedIds.length > 0 && targetMedIds.every(id => takenMedIdsSet.has(id));
        if (isAllDone) setTimeout(() => setShowMoonModal(true), 500);
      }
    }
  };

  const handleSaveMedWrapper = async (newMed: any) => {
     await addMed(newMed, (appMode === 'SUPERVISOR' && currentSeniorId) ? currentSeniorId : undefined);
  };

  const handleSaveHealthRecord = async (newEvent: TimelineEvent) => {
    let targetId = undefined;
    if (appMode === 'SUPERVISOR') {
        if (currentSeniorId) { targetId = currentSeniorId; } else { return; }
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

  const handleWrapperExitFocus = () => {
    exitPatientFocus();
    setActiveTab('HOME');
    fetchCloudData(undefined, true);
  };

  const handleWrapperEnterFocus = (seniorId: string) => {
    enterPatientFocus(seniorId);
    setActiveTab('TASKS');
    fetchCloudData(seniorId, true);
  };

  const handleSeniorSelect = (seniorId: string) => {
    if (isSelectingForMedMgmt) {
        exitPatientFocus();
        enterPatientFocus(seniorId);
        setActiveTab('ADD_MED');
        setIsSelectingForMedMgmt(false);
        fetchCloudData(seniorId, true);
    } else {
        handleWrapperEnterFocus(seniorId);
    }
    setShowSeniorListModal(false);
  };

  const handleSeniorListUpdate = (newList: Senior[]) => {
      setSeniorList(newList);
      if (currentSeniorId && !newList.find(s => s.id === currentSeniorId)) {
          handleWrapperExitFocus();
      } else {
          fetchDashboardStatus();
      }
  };
  
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

  const todaysMeds = getTodaysMeds(currentDateKey);
  const todayRecord = history[currentDateKey] || [];

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-bg-warm"><ActivityIndicator size="large" color="#10b981" /><Text className="mt-4 text-slate-400">正在同步数据...</Text></View>;
  }

  // --- 视图渲染 ---
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
        {/* 顶部状态栏：模式显示 */}
        {activeTab !== 'SETTINGS' && activeTab !== 'ADD_MED' && activeTab !== 'LANGUAGE' && !currentSeniorId && (
          <View className="flex-row justify-end items-center px-6 py-2"><View className="px-2 py-1 bg-slate-100 rounded-full"><Text className="text-xs font-bold text-slate-300">{appMode === 'USER' ? t('header.mode_patient') : t('header.mode_supervisor')}</Text></View></View>
        )}
        
        {/* 顶部状态栏：返回按钮 (专注模式) */}
        {currentSeniorId && appMode === 'SUPERVISOR' && activeTab !== 'ADD_MED' && (
           <View className="flex-row items-center px-4 py-2 border-b border-slate-100/50 bg-bg-warm">
              <TouchableOpacity onPress={handleWrapperExitFocus} className="flex-row items-center p-2 rounded-xl bg-white border border-slate-100">
                 <ChevronLeft size={20} color="#64748b"/>
                 <Text className="text-slate-600 font-bold ml-1">返回概览</Text>
              </TouchableOpacity>
           </View>
        )}

        <View className="flex-1 relative">
          
          {(activeTab === 'TRENDS' || activeTab === 'FOCUS_TRENDS') && (
            <AnimatedPage>
              <TrendsScreen history={history} onDelete={handleDeleteHistoryItem} />
            </AnimatedPage>
          )}
          
          {activeTab === 'HOME' && appMode === 'USER' && (
            <AnimatedPage>
              <UserHomeScreen todaysMeds={todaysMeds} todayRecord={todayRecord} currentDayOfWeek={currentDayOfWeek} onToggleMed={handleToggleMed} />
            </AnimatedPage>
          )}
          
          {activeTab === 'HOME' && appMode === 'SUPERVISOR' && (
             <AnimatedPage>
                <SupervisorHomeScreen currentSeniorId={null} seniorList={seniorList} todaysMeds={[]} todayRecord={[]} dashboardData={dashboardData} onSelectSenior={handleWrapperEnterFocus} />
             </AnimatedPage>
          )}

          {activeTab === 'TASKS' && appMode === 'SUPERVISOR' && (
             <AnimatedPage type="slide">
                <SupervisorHomeScreen currentSeniorId={currentSeniorId} seniorList={seniorList} todaysMeds={todaysMeds} todayRecord={todayRecord} dashboardData={[]} onSelectSenior={() => {}} />
             </AnimatedPage>
          )}
          
          {(activeTab === 'HISTORY' || activeTab === 'FOCUS_HISTORY') && (
             <AnimatedPage>
               <HistoryScreen history={history} config={config} isSupervisor={appMode === 'SUPERVISOR'} />
             </AnimatedPage>
          )}
          
          {activeTab === 'SETTINGS' && (
             <AnimatedPage type="slide">
               <SettingsView appMode={appMode} setAppMode={setAppMode} setActiveTab={setActiveTab} incomingRequests={incomingRequests} supervisorCode={supervisorCode} setShowRequestModal={setShowRequestModal} setShowAddSeniorModal={setShowAddSeniorModal} setShowSeniorListModal={setShowSeniorListModal} setIsSelectingForMedMgmt={setIsSelectingForMedMgmt} handleLogout={handleLogout} />
             </AnimatedPage>
          )}
          
          {activeTab === 'ADD_MED' && (
             <AnimatedPage type="slide">
               <AddMedView appMode={appMode} seniorList={seniorList} currentSeniorId={currentSeniorId} config={config} setActiveTab={setActiveTab} onSaveMed={handleSaveMedWrapper} onRemoveMed={removeMed} />
             </AnimatedPage>
          )}
          
          {activeTab === 'LANGUAGE' && (
             <AnimatedPage type="slide">
                <LanguageView setActiveTab={setActiveTab} />
             </AnimatedPage>
          )}
          
          {((activeTab === 'HOME' && appMode === 'USER') || (activeTab === 'TASKS' && appMode === 'SUPERVISOR')) && (
            <TouchableOpacity onPress={() => setShowHealthRecordModal(true)} className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-lg z-50" style={{ elevation: 5 }}><Text className="text-white text-4xl font-light pb-1">+</Text></TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <View className="bg-white border-t border-slate-100">
          <SafeAreaView edges={['bottom']} className="flex-row justify-around items-center h-20 px-4">
              {appMode === 'USER' && (
                <>
                  <TouchableOpacity onPress={() => setActiveTab('TRENDS')} style={{ width: 64, height: 64 }} className="items-center justify-center"><ChartIcon size={32} color={activeTab === 'TRENDS' ? "#8B5CF6" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'TRENDS' ? "#8B5CF6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.trends')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('HOME')} style={{ width: 64, height: 64 }} className="items-center justify-center"><HomeIcon size={32} color={activeTab === 'HOME' ? '#4ADE80' : '#cbd5e1'} /><Text style={{ fontSize: 10, color: activeTab === 'HOME' ? "#4ADE80" : "#cbd5e1", marginTop: 4 }}>{t('tabs.home')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('HISTORY')} style={{ width: 64, height: 64 }} className="items-center justify-center"><HistoryIcon size={32} color={activeTab === 'HISTORY' ? "#3b82f6" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'HISTORY' ? "#3b82f6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.history')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} style={{ width: 64, height: 64 }} className="items-center justify-center"><SettingsIcon size={32} color={activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1", marginTop: 4 }}>{t('tabs.settings')}</Text></TouchableOpacity>
                </>
              )}
              {appMode === 'SUPERVISOR' && !currentSeniorId && (
                <>
                  <TouchableOpacity onPress={() => setActiveTab('HOME')} className="items-center justify-center flex-1"><HomeIcon size={32} color={activeTab === 'HOME' ? '#4ADE80' : '#cbd5e1'} /><Text style={{ fontSize: 10, color: activeTab === 'HOME' ? "#4ADE80" : "#cbd5e1", marginTop: 4 }}>{t('tabs.home')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} className="items-center justify-center flex-1"><SettingsIcon size={32} color={activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1", marginTop: 4 }}>{t('tabs.settings')}</Text></TouchableOpacity>
                </>
              )}
              {appMode === 'SUPERVISOR' && currentSeniorId && (
                <>
                  <TouchableOpacity onPress={() => setActiveTab('TASKS')} className="items-center justify-center flex-1"><ClipboardList size={32} color={activeTab === 'TASKS' ? '#3b82f6' : '#cbd5e1'} /><Text style={{ fontSize: 10, color: activeTab === 'TASKS' ? "#3b82f6" : "#cbd5e1", marginTop: 4 }}>任务</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('FOCUS_HISTORY')} className="items-center justify-center flex-1"><HistoryIcon size={32} color={activeTab === 'FOCUS_HISTORY' ? "#3b82f6" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'FOCUS_HISTORY' ? "#3b82f6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.history')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveTab('FOCUS_TRENDS')} className="items-center justify-center flex-1"><ChartIcon size={32} color={activeTab === 'FOCUS_TRENDS' ? "#8B5CF6" : "#cbd5e1"} /><Text style={{ fontSize: 10, color: activeTab === 'FOCUS_TRENDS' ? "#8B5CF6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.trends')}</Text></TouchableOpacity>
                </>
              )}
          </SafeAreaView>
      </View>

      <AddPatientModal visible={showAddSeniorModal} onClose={() => setShowAddSeniorModal(false)} onSuccess={(newList) => { setSeniorList(newList); fetchDashboardStatus(); }} />
      <RequestModal visible={showRequestModal} requests={incomingRequests} onClose={() => setShowRequestModal(false)} onRequestHandled={(id) => handleRequest(id, true)} />
      <PatientListModal visible={showSeniorListModal} seniorList={seniorList} currentSeniorId={currentSeniorId} isSelectionMode={isSelectingForMedMgmt} onClose={() => setShowSeniorListModal(false)} onSelect={handleSeniorSelect} onListUpdate={handleSeniorListUpdate} />
      
      {/* 4. 沉浸式晚安弹窗 (已更新为图片版) */}
      <MoonModal 
        visible={showMoonModal} 
        onClose={() => setShowMoonModal(false)} 
      />

      <HealthRecordModal visible={showHealthRecordModal} onClose={() => setShowHealthRecordModal(false)} onSave={handleSaveHealthRecord} currentDateKey={currentDateKey} />
    </View>
  );
}