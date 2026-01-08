import '@/utils/i18n';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ClipboardList } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, LogBox, Text,
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
import { offlineStorage } from '@/lib/offlineStorage';
import { supabase } from '@/lib/supabase';
import { syncQueue } from '@/lib/syncQueue';
import { AppMode, HistoryRecord, Senior, Tab, TimelineEvent } from '@/types';
import { StorageKeys, loadData, saveData } from '@/utils/storage';

LogBox.ignoreLogs(['Expo AV has been deprecated', 'No route named "index"']);

export default function App() {
  const { t, i18n } = useTranslation(); 
  const soundRef = useRef<Audio.Sound | null>(null);

  // --- 状态管理 ---
  const [isLoading, setIsLoading] = useState(false); // 改为 false，不显示加载
  const [appMode, setAppMode] = useState<AppMode>('LANDING');
  const [activeTabState, setActiveTabState] = useState<Tab>('HOME');
  const [prevTab, setPrevTab] = useState<Tab>('HOME'); // 用于判断导航方向
  const [isReturningFromFocus, setIsReturningFromFocus] = useState(false); // 标记是否正在从专注模式返回
  const [currentDateKey, setCurrentDateKey] = useState<string>("");
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState<number>(1);
  const [supervisorCode, setSupervisorCode] = useState<string>(t('app.loading'));

  // 主Tab列表（用于判断是否为Tab切换）
  const mainTabs: Tab[] = ['HOME', 'TRENDS', 'HISTORY', 'SETTINGS'];
  
  // 专注模式Tab列表（详情页内的tab切换，应该直接切换无动画）
  const focusTabs: Tab[] = ['TASKS', 'FOCUS_HISTORY', 'FOCUS_TRENDS'];
  
  // 子页面列表（用于判断是否为前进/后退）
  const subPages: Tab[] = ['ADD_MED', 'LANGUAGE'];

  // 智能Tab切换函数（追踪导航方向）
  const setActiveTab = (newTab: Tab) => {
    const currentTab = activeTabState;
    
    // 更新prevTab
    setPrevTab(currentTab);
    
    // 更新activeTab
    setActiveTabState(newTab);
  };

  // 获取转场类型（根据导航方向）
  const getTransitionType = (targetTab: Tab): 'fade' | 'push' | 'pop' => {
    // 主Tab之间的切换：使用fade（直接切换）
    if (mainTabs.includes(prevTab) && mainTabs.includes(targetTab)) {
      return 'fade';
    }
    
    // 专注模式Tab之间的切换：使用fade（直接切换，无动画）
    if (focusTabs.includes(prevTab) && focusTabs.includes(targetTab)) {
      return 'fade';
    }
    
    // 从主Tab进入专注模式：使用push（前进，从右侧滑入）
    if (mainTabs.includes(prevTab) && focusTabs.includes(targetTab)) {
      return 'push';
    }
    
    // 从专注模式返回主Tab：使用pop（后退，主Tab从左滑入）
    if (focusTabs.includes(prevTab) && mainTabs.includes(targetTab)) {
      return 'pop';
    }
    
    // 从主Tab进入子页面：使用push（前进）
    if (mainTabs.includes(prevTab) && subPages.includes(targetTab)) {
      return 'push';
    }
    
    // 从子页面返回主Tab：使用pop（后退）
    if (subPages.includes(prevTab) && mainTabs.includes(targetTab)) {
      return 'pop';
    }
    
    // 从子页面进入另一个子页面：使用push（前进）
    if (subPages.includes(prevTab) && subPages.includes(targetTab)) {
      return 'push';
    }
    
    // 默认使用fade
    return 'fade';
  };

  // 使用activeTab作为别名，保持代码兼容性
  const activeTab = activeTabState;
  
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

  // --- 初始化（静默加载：先加载本地数据，后台同步云端）---
  useEffect(() => {
    const initApp = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        setCurrentDateKey(`${year}-${month}-${day}`);
        // 重要：JavaScript getDay() 返回 0-6 (0=Sunday, 1=Monday, ..., 6=Saturday)
        // 转换为 1-7 (1=Monday, 2=Tuesday, ..., 7=Sunday) 以匹配 med.days 数组
        let dayNum = now.getDay();
        if (dayNum === 0) dayNum = 7; // Sunday (0) -> 7, 不是 1！
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

        // 【静默加载】先加载本地历史数据（立即显示，不等待网络）
        const localHistory = await offlineStorage.loadHistory();
        setHistory(localHistory);

        // 【静默加载】后台同步云端数据（不阻塞UI）
        setTimeout(() => {
          fetchCloudData(undefined, false); // showLoading = false，不显示加载
        }, 100);

        // 启动后台自动同步队列
        const stopAutoSync = syncQueue.startAutoSync();
        
        return () => { 
          if (soundRef.current) soundRef.current.unloadAsync();
          stopAutoSync(); // 清理自动同步
        };
      } catch (e) {
        console.error("初始化失败", e);
      }
    };
    initApp();
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

  // --- 数据同步总控（静默后台同步，不阻塞UI）---
  const fetchCloudData = async (targetSeniorId?: string, showLoading: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // 静默获取监督码（后台执行）
    Promise.resolve(supabase.from('profiles').select('invite_code').eq('id', user.id).single())
      .then(({ data: profile }) => {
        if (profile?.invite_code) setSupervisorCode(profile.invite_code);
      })
      .catch(() => {}); // 静默失败，不显示错误
    
    let fetchTargetId = undefined; 
    if (appMode === 'SUPERVISOR') {
        const idToUse = targetSeniorId || currentSeniorId;
        if (idToUse) {
            fetchTargetId = idToUse; 
        } else if (activeTab === 'HOME' && !currentSeniorId) {
            // 静默刷新 Dashboard（后台执行）
            fetchDashboardStatus().catch((e: any) => console.error('刷新Dashboard失败', e));
            setConfig([]); 
            return; 
        }
    }
    
    // 【静默加载】后台同步数据，不阻塞UI
    try {
        // 先加载本地数据（立即显示）
        const localHistory = await offlineStorage.loadHistory();
        setHistory(localHistory);
        
        // 后台同步云端数据（静默执行）
        Promise.all([
            fetchMeds(fetchTargetId).catch(e => console.error('获取药物失败', e)),
            historyService.syncFromCloud(fetchTargetId).catch(e => console.error('同步历史失败', e))
        ]).then(([meds, hist]) => {
           if (hist) setHistory(hist);
        });
    } catch (e) {
        console.error('同步数据出错', e);
    }
  };

  const handleToggleMed = async (medId: string) => {
    if (appMode === 'SUPERVISOR') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const todayRecord = history[currentDateKey] || [];
    const existingEvent = todayRecord.find(event => event.medId === medId);
    
    if (existingEvent) {
      // 删除操作（立即更新UI，后台同步）
      if (existingEvent.id) {
        await historyService.deleteEvent(existingEvent.id);
      }
      const newRecord = todayRecord.filter(e => e.id !== existingEvent.id);
      setHistory(prev => ({ ...prev, [currentDateKey]: newRecord }));
    } else {
      // 添加操作（立即更新UI，后台同步）
      const medConfig = config.find(c => c.id === medId);
      const newEventBase: TimelineEvent = {
        id: '', // 让 historyService 自动生成
        type: 'MEDICATION',
        timestamp: Date.now(),
        dateKey: currentDateKey,
        medId: medId,
        medName: medConfig?.name,
        isTaken: true
      };
      
      // 【离线优先】立即保存本地，后台同步云端
      const dbRecord = await historyService.addEvent(newEventBase);
      if (dbRecord) {
        const newEvent = { ...newEventBase, id: dbRecord.id || newEventBase.id };
        const newRecord = [...todayRecord, newEvent];
        setHistory(prev => ({ ...prev, [currentDateKey]: newRecord }));
        
        // 播放音效
        if (soundRef.current) {
          soundRef.current.replayAsync().catch(e => console.error('播放音效失败', e));
        }
        
        // 检查是否全部完成
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
    // 【离线优先】立即保存本地，后台同步云端
    const dbRecord = await historyService.addEvent(newEvent, targetId);
    if (dbRecord) {
      const savedEvent = { ...newEvent, id: dbRecord.id || newEvent.id };
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
    // 标记正在返回，让详情页立即消失，不显示滑出动画
    setIsReturningFromFocus(true);
    // 先更新prevTab，确保返回时使用pop动画
    setPrevTab(activeTabState);
    setActiveTabState('HOME');
    // 重置返回标记（在下一个渲染周期）
    setTimeout(() => setIsReturningFromFocus(false), 300);
    fetchCloudData(undefined, true);
  };

  const handleWrapperEnterFocus = (seniorId: string) => {
    enterPatientFocus(seniorId);
    // 确保从监护概览进入今日任务时使用push动画
    setPrevTab(activeTabState); // 记录当前tab（HOME）
    setActiveTabState('TASKS'); // 切换到TASKS
    fetchCloudData(seniorId, true);
  };

  const handleSeniorSelect = (seniorId: string) => {
    if (isSelectingForMedMgmt) {
        exitPatientFocus();
        enterPatientFocus(seniorId);
        setActiveTab('ADD_MED'); // 使用智能切换函数
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
    Alert.alert(t('app.logout_title'), t('app.logout_message'), [
      { text: t('app.logout_cancel'), style: "cancel" },
      { text: t('app.logout_confirm'), style: "destructive", onPress: async () => { await supabase.auth.signOut(); }}
    ]);
  };

  const todaysMeds = getTodaysMeds(currentDateKey);
  const todayRecord = history[currentDateKey] || [];

  // 【静默加载】移除加载状态显示，直接显示内容
  // if (isLoading) {
  //   return <View className="flex-1 items-center justify-center bg-bg-warm"><ActivityIndicator size="large" color="#10b981" /><Text className="mt-4 text-slate-400">正在同步数据...</Text></View>;
  // }

  // --- 视图渲染 ---
  if (appMode === 'LANDING') {
    return (
      <View className="flex-1 bg-bg-warm">
        <SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
          <View className="flex-1">
            {/* 患者卡片 - 占满上半部分屏幕，米白色背景 */}
            <TouchableOpacity 
              onPress={() => switchMode('USER')} 
              className="flex-1 justify-center items-center px-6 bg-stone-50 rounded-b-3xl shadow-sm" 
              activeOpacity={0.9}
            >
              <View className="items-center">
                <View className="w-20 h-20 bg-orange-100 rounded-full items-center justify-center mb-4">
                  <UserIcon size={40} color="#f97316" />
                </View>
                <Text className="text-2xl font-bold text-slate-800 mb-2">{t('landing.patient')}</Text>
                <Text className="text-slate-500 text-base">{t('landing.patient_desc')}</Text>
              </View>
            </TouchableOpacity>
            
            {/* 监督者卡片 - 占满下半部分屏幕，浅灰色背景 */}
            <TouchableOpacity 
              onPress={() => switchMode('SUPERVISOR')} 
              className="flex-1 justify-center items-center px-6 bg-slate-100 rounded-t-3xl shadow-sm" 
              activeOpacity={0.9}
            >
              <View className="items-center">
                <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
                  <CaregiverIcon size={40} color="#3b82f6" />
                </View>
                <Text className="text-2xl font-bold text-slate-800 mb-2">{t('landing.supervisor')}</Text>
                <Text className="text-slate-500 text-base">{t('landing.supervisor_desc')}</Text>
              </View>
            </TouchableOpacity>
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
                 <Text className="text-slate-600 font-bold ml-1">{t('supervisor.back_to_overview')}</Text>
              </TouchableOpacity>
           </View>
        )}

        <View className="flex-1 relative">
          
          {/* 主Tab页面 */}
          {activeTab === 'TRENDS' && (
            <AnimatedPage type="fade">
              <TrendsScreen history={history} onDelete={handleDeleteHistoryItem} />
            </AnimatedPage>
          )}
          
          {activeTab === 'HOME' && appMode === 'USER' && (
            <AnimatedPage type="fade">
              <UserHomeScreen todaysMeds={todaysMeds} todayRecord={todayRecord} currentDayOfWeek={currentDayOfWeek} onToggleMed={handleToggleMed} />
            </AnimatedPage>
          )}
          
          {/* 监护概览页：从今日任务返回时使用pop（从左侧滑入），其他情况使用fade */}
          {/* 确保从今日任务（TASKS）返回时使用pop动画，与药物管理页面一致 */}
          {activeTab === 'HOME' && appMode === 'SUPERVISOR' && (
             <AnimatedPage type={focusTabs.includes(prevTab) ? 'pop' : 'fade'}>
                <SupervisorHomeScreen currentSeniorId={null} seniorList={seniorList} todaysMeds={[]} todayRecord={[]} dashboardData={dashboardData} onSelectSenior={handleWrapperEnterFocus} />
             </AnimatedPage>
          )}

          {/* 专注模式Tab：从概览进入时使用push（从右侧滑入），详情页内tab切换无动画 */}
          {/* 确保从监护概览（HOME）进入时使用push动画，与药物管理页面一致 */}
          {activeTab === 'TASKS' && appMode === 'SUPERVISOR' && !isReturningFromFocus && (
             <AnimatedPage type={mainTabs.includes(prevTab) ? 'push' : getTransitionType('TASKS')}>
               <SupervisorHomeScreen
                 currentSeniorId={currentSeniorId}
                 seniorList={seniorList}
                 todaysMeds={todaysMeds}
                 todayRecord={todayRecord}
                 dashboardData={[]}
                 onSelectSenior={() => {}}
               />
             </AnimatedPage>
          )}
          
          {/* 专注模式历史页：详情页内tab切换，直接切换，无动画 */}
          {activeTab === 'FOCUS_HISTORY' && !isReturningFromFocus && (
               <HistoryScreen
                 history={history}
                 config={config}
                 isSupervisor={appMode === 'SUPERVISOR'}
               />
          )}
          
          {/* 专注模式趋势页：详情页内tab切换，直接切换，无动画 */}
          {activeTab === 'FOCUS_TRENDS' && !isReturningFromFocus && (
               <TrendsScreen
                 history={history}
                 onDelete={handleDeleteHistoryItem}
               />
          )}
          
          {/* 主Tab历史页 */}
          {activeTab === 'HISTORY' && (
             <AnimatedPage type="fade">
               <HistoryScreen history={history} config={config} isSupervisor={appMode === 'SUPERVISOR'} />
             </AnimatedPage>
          )}
          
          {/* 设置页：根据来源判断（从主Tab进入用push，从子页返回用pop） */}
          {activeTab === 'SETTINGS' && (
             <AnimatedPage type={getTransitionType('SETTINGS')}>
               <SettingsView appMode={appMode} setAppMode={setAppMode} setActiveTab={setActiveTab} incomingRequests={incomingRequests} supervisorCode={supervisorCode} setShowRequestModal={setShowRequestModal} setShowAddSeniorModal={setShowAddSeniorModal} setShowSeniorListModal={setShowSeniorListModal} setIsSelectingForMedMgmt={setIsSelectingForMedMgmt} handleLogout={handleLogout} />
             </AnimatedPage>
          )}
          
          {/* 子页面：使用 push（前进，从右侧滑入） */}
          {activeTab === 'ADD_MED' && (
             <AnimatedPage type={getTransitionType('ADD_MED')}>
               <AddMedView appMode={appMode} seniorList={seniorList} currentSeniorId={currentSeniorId} config={config} setActiveTab={setActiveTab} onSaveMed={handleSaveMedWrapper} onRemoveMed={removeMed} />
             </AnimatedPage>
          )}
          
          {activeTab === 'LANGUAGE' && (
             <AnimatedPage type={getTransitionType('LANGUAGE')}>
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
                  <TouchableOpacity onPress={() => setActiveTab('TASKS')} className="items-center justify-center flex-1"><ClipboardList size={32} color={activeTab === 'TASKS' ? '#3b82f6' : '#cbd5e1'} /><Text style={{ fontSize: 10, color: activeTab === 'TASKS' ? "#3b82f6" : "#cbd5e1", marginTop: 4 }}>{t('home.today_tasks')}</Text></TouchableOpacity>
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