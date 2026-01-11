import '@/utils/i18n';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ClipboardList } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, LogBox, ScrollView, StatusBar, Text,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// --- 图标组件 ---
import { CaregiverIcon, ChartIcon, HistoryIcon, HomeIcon, SettingsIcon, TrashIcon, UserIcon } from '@/components/Icons';

// --- 页面与功能组件 ---
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
import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { SwipeBackContainer, SwipeBackContainerRef } from '@/components/SwipeBackContainer';

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
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';

// --- 页面内组件 ---
import { ConfigBuilder } from '@/components/ConfigBuilder';

LogBox.ignoreLogs(['Expo AV has been deprecated', 'No route named "index"']);

export default function App() {
  const { t, i18n } = useTranslation(); 
  const insets = useSafeAreaInsets(); // 获取安全区域，确保一致性
  const soundRef = useRef<Audio.Sound | null>(null);
  const swipeBackRef = useRef<SwipeBackContainerRef>(null);

  // --- 状态管理 ---
  const [isLoading, setIsLoading] = useState(false); // 改为 false，不显示加载
  const [appMode, setAppMode] = useState<AppMode>('LANDING');
  const [activeTabState, setActiveTabState] = useState<Tab>('HOME');
  const [prevTab, setPrevTab] = useState<Tab>('HOME'); // 用于判断导航方向
  const [isReturningFromFocus, setIsReturningFromFocus] = useState(false); // 标记是否正在从专注模式返回
  const [isReturningFromAddMed, setIsReturningFromAddMed] = useState(false); // 标记是否正在从药物管理页面返回
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
    
    // 进入药物管理页面时重置返回标记
    if (newTab === 'ADD_MED') {
      setIsReturningFromAddMed(false);
    }
    
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

  /**
   * 静默返回（无动画）- 由 SwipeBackContainer 动画完成后调用
   * 此时手势动画已完成，只需更新状态
   */
  const handleSilentExitFocus = () => {
    // 标记正在返回，防止重复渲染
    setIsReturningFromFocus(true);
    // 清除患者焦点和切换 tab（React 会批量处理这些状态更新）
    exitPatientFocus();
    setPrevTab(activeTabState);
    setActiveTabState('HOME');
    fetchCloudData(undefined, true);
  };

  /**
   * 通过按钮触发返回 - 调用 SwipeBackContainer 的动画
   * 确保按钮和手势返回行为一致
   */
  const handleSwipeBack = () => {
    if (swipeBackRef.current) {
      // 触发滑出动画，动画完成后会自动调用 handleSilentExitFocus
      swipeBackRef.current.animateBack();
    } else {
      // 降级处理：直接返回
      handleSilentExitFocus();
    }
  };

  // 药物管理页面的滑动返回
  const addMedSwipeBackRef = useRef<SwipeBackContainerRef>(null);
  
  /**
   * 药物管理页面静默返回
   */
  const handleAddMedSilentBack = () => {
    // 标记正在从药物管理页面返回，防止设置页面重复播放入场动画
    setIsReturningFromAddMed(true);
    // 从药物管理返回时，如果是监督者模式且设置了患者ID，需要清除
    if (appMode === 'SUPERVISOR' && currentSeniorId) {
      exitPatientFocus();
    }
    setPrevTab(activeTabState);
    setActiveTabState('SETTINGS');
  };

  /**
   * 药物管理页面按钮触发返回
   */
  const handleAddMedSwipeBack = () => {
    if (addMedSwipeBackRef.current) {
      addMedSwipeBackRef.current.animateBack();
    } else {
      handleAddMedSilentBack();
    }
  };

  const handleWrapperEnterFocus = (seniorId: string) => {
    // 重置返回标记
    setIsReturningFromFocus(false);
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
          // 当前查看的患者被删除时，直接静默返回（不需要动画）
          handleSilentExitFocus();
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

  // Tab栏固定高度（总高度90px，适配iOS Safe Area）
  // 注意：这些必须在任何条件返回之前定义，以遵守 React Hooks 规则
  const TAB_BAR_CONTENT_HEIGHT = 60; // 内容区域高度
  const TAB_BAR_TOTAL_HEIGHT = 90; // 总高度（包含底部安全区域）
  const tabBarPaddingBottom = Math.max(insets.bottom, TAB_BAR_TOTAL_HEIGHT - TAB_BAR_CONTENT_HEIGHT - insets.bottom);
  
  // Tab 配置
  const userModeTabs = useMemo(() => [
    { key: 'TRENDS', icon: ChartIcon, label: t('tabs.trends'), activeColor: '#8B5CF6' },
    { key: 'HOME', icon: HomeIcon, label: t('tabs.home'), activeColor: '#4ADE80' },
    { key: 'HISTORY', icon: HistoryIcon, label: t('tabs.history'), activeColor: '#3b82f6' },
    { key: 'SETTINGS', icon: SettingsIcon, label: t('tabs.settings'), activeColor: '#f97316' },
  ], [t]);
  
  const supervisorOverviewTabs = useMemo(() => [
    { key: 'HOME', icon: HomeIcon, label: t('tabs.home'), activeColor: '#4ADE80' },
    { key: 'SETTINGS', icon: SettingsIcon, label: t('tabs.settings'), activeColor: '#f97316' },
  ], [t]);
  
  const focusModeTabs = useMemo(() => [
    { key: 'TASKS', icon: ClipboardList, label: t('home.today_tasks'), activeColor: '#3b82f6' },
    { key: 'FOCUS_HISTORY', icon: HistoryIcon, label: t('tabs.history'), activeColor: '#3b82f6' },
    { key: 'FOCUS_TRENDS', icon: ChartIcon, label: t('tabs.trends'), activeColor: '#8B5CF6' },
  ], [t]);

  // 专注模式Tab栏组件（用于 SwipeBackContainer 内部）- 使用 AnimatedTabBar
  const FocusModeTabBar = useMemo(() => (
    <AnimatedTabBar
      tabs={focusModeTabs}
      activeTab={activeTab}
      onTabPress={(key) => setActiveTab(key as Tab)}
      height={TAB_BAR_CONTENT_HEIGHT}
      paddingBottom={insets.bottom}
    />
  ), [activeTab, focusModeTabs, insets.bottom]);

  // 监护概览页Tab栏组件（用于 previousPage）- 静态版本，HOME 始终激活
  const OverviewTabBar = useMemo(() => (
    <View style={{ backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: insets.bottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: TAB_BAR_CONTENT_HEIGHT, paddingHorizontal: 8, paddingBottom: 4 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
          <HomeIcon size={28} color="#4ADE80" />
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#4ADE80', marginTop: 4 }}>{t('tabs.home')}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
          <SettingsIcon size={28} color="#cbd5e1" />
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#cbd5e1', marginTop: 4 }}>{t('tabs.settings')}</Text>
        </View>
      </View>
    </View>
  ), [insets.bottom, t]);

  // --- 视图渲染 ---
  if (appMode === 'LANDING') {
    return (
      <View className="flex-1 bg-bg-warm">
        {/* 状态栏：浅色背景需要深色图标 */}
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
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

  // 专注模式：整页滑动返回（包含 header + content + tab bar）
  if (appMode === 'SUPERVISOR' && currentSeniorId && focusTabs.includes(activeTab) && !isReturningFromFocus) {
    return (
      <View className="flex-1 bg-bg-warm">
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <AnimatedPage type={mainTabs.includes(prevTab) ? 'push' : 'fade'}>
          <SwipeBackContainer
            ref={swipeBackRef}
            onBack={handleSilentExitFocus}
            previousPage={
              <View className="flex-1 bg-bg-warm">
                {/* 导航栏 - 固定高度56px，标题居中 */}
                <View className="bg-bg-warm border-b border-slate-100/50" style={{ paddingTop: insets.top }}>
                  <View className="flex-row items-center justify-center px-4" style={{ height: 56 }}>
                    <Text className="text-xl font-bold text-slate-800" style={{ fontSize: 20 }}>{t('supervisor.overview')}</Text>
                  </View>
                </View>
                <SafeAreaView className="flex-1" edges={['left', 'right']}>
                  <View className="flex-1 relative">
                    <View style={{ flex: 1 }}>
                      <SupervisorHomeScreen currentSeniorId={null} seniorList={seniorList} todaysMeds={[]} todayRecord={[]} dashboardData={dashboardData} onSelectSenior={() => {}} />
                    </View>
                  </View>
                </SafeAreaView>
                {OverviewTabBar}
              </View>
            }
          >
            <View className="flex-1">
              {/* Header延伸到状态栏区域 - 沉浸式效果（固定高度56px），标题居中 */}
              <View className="bg-bg-warm border-b border-slate-100/50" style={{ paddingTop: insets.top }}>
                <View className="flex-row items-center px-4" style={{ height: 56 }}>
                  {/* 左侧返回按钮 - zIndex确保可点击 */}
                  <TouchableOpacity 
                    onPress={handleSwipeBack} 
                    className="items-center justify-center bg-white rounded-full border border-slate-100 shadow-sm"
                    style={{ width: 44, height: 44, zIndex: 10 }}
                    activeOpacity={0.7}
                  >
                    <ChevronLeft size={24} color="#334155" />
                  </TouchableOpacity>
                  {/* 居中标题 - pointerEvents none 避免阻挡点击 */}
                  <View className="absolute left-0 right-0" style={{ pointerEvents: 'none' }}>
                    <Text className="text-xl font-bold text-slate-800 text-center" style={{ fontSize: 20 }}>
                      {activeTab === 'TASKS' ? seniorList.find(s => s.id === currentSeniorId)?.note || '' : 
                       activeTab === 'FOCUS_HISTORY' ? t('history.title') : 
                       activeTab === 'FOCUS_TRENDS' ? t('trends.title') : ''}
                    </Text>
                  </View>
                  {/* 右侧占位保持对称 */}
                  <View style={{ width: 44 }} />
                </View>
              </View>
              <SafeAreaView className="flex-1" edges={['left', 'right']}>
                
                {/* 内容区域 */}
                <View className="flex-1 relative">
                  {activeTab === 'TASKS' && (
                    <SupervisorHomeScreen currentSeniorId={currentSeniorId} seniorList={seniorList} todaysMeds={todaysMeds} todayRecord={todayRecord} dashboardData={[]} onSelectSenior={() => {}} />
                  )}
                  {activeTab === 'FOCUS_HISTORY' && (
                    <HistoryScreen history={history} config={config} isSupervisor={true} />
                  )}
                  {activeTab === 'FOCUS_TRENDS' && (
                    <TrendsScreen history={history} onDelete={handleDeleteHistoryItem} />
                  )}
                  
                  {activeTab === 'TASKS' && (
                    <TouchableOpacity onPress={() => setShowHealthRecordModal(true)} className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-lg z-50" style={{ elevation: 5 }}><Text className="text-white text-4xl font-light pb-1">+</Text></TouchableOpacity>
                  )}
                </View>
              </SafeAreaView>
              
              {/* Tab栏也在 SwipeBackContainer 内部 */}
              {FocusModeTabBar}
            </View>
          </SwipeBackContainer>
        </AnimatedPage>

        {/* Modals */}
        <AddPatientModal visible={showAddSeniorModal} onClose={() => setShowAddSeniorModal(false)} onSuccess={(newList) => { setSeniorList(newList); fetchDashboardStatus(); }} />
        <RequestModal visible={showRequestModal} requests={incomingRequests} onClose={() => setShowRequestModal(false)} onRequestHandled={(id) => handleRequest(id, true)} />
        <PatientListModal visible={showSeniorListModal} seniorList={seniorList} currentSeniorId={currentSeniorId} isSelectionMode={isSelectingForMedMgmt} onClose={() => setShowSeniorListModal(false)} onSelect={handleSeniorSelect} onListUpdate={handleSeniorListUpdate} />
        <MoonModal visible={showMoonModal} onClose={() => setShowMoonModal(false)} />
        <HealthRecordModal visible={showHealthRecordModal} onClose={() => setShowHealthRecordModal(false)} onSave={handleSaveHealthRecord} currentDateKey={currentDateKey} />
      </View>
    );
  }

  // 药物管理页面：整页滑动返回
  if (activeTab === 'ADD_MED') {
    // 计算当前显示的标题
    const targetName = seniorList.find(s => s.id === currentSeniorId)?.note || '';
    const addMedTitle = appMode === 'SUPERVISOR' 
      ? t('med_mgmt.managing', { name: targetName })
      : t('med_mgmt.title');
    
    return (
      <View className="flex-1 bg-bg-warm">
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <AnimatedPage type="push">
          <SwipeBackContainer
            ref={addMedSwipeBackRef}
            onBack={handleAddMedSilentBack}
            previousPage={
              <View className="flex-1 bg-bg-warm">
                {/* 设置页导航栏 - 与正常渲染完全一致 */}
                <View className="bg-bg-warm border-b border-slate-100/50" style={{ paddingTop: insets.top }}>
                  <View className="flex-row items-center justify-center px-4" style={{ height: 56 }}>
                    <Text className="text-xl font-bold text-slate-800" style={{ fontSize: 20 }}>{t('settings.title')}</Text>
                  </View>
                </View>
                <SafeAreaView className="flex-1" edges={['left', 'right']}>
                  <View className="flex-1">
                    <SettingsView appMode={appMode} setAppMode={setAppMode} setActiveTab={setActiveTab} incomingRequests={incomingRequests} supervisorCode={supervisorCode} setShowRequestModal={setShowRequestModal} setShowAddSeniorModal={setShowAddSeniorModal} setShowSeniorListModal={setShowSeniorListModal} setIsSelectingForMedMgmt={setIsSelectingForMedMgmt} handleLogout={handleLogout} />
                  </View>
                </SafeAreaView>
                {/* Tab 栏 */}
                {appMode === 'USER' ? (
                  <AnimatedTabBar
                    tabs={userModeTabs}
                    activeTab="SETTINGS"
                    onTabPress={() => {}}
                    height={TAB_BAR_CONTENT_HEIGHT}
                    paddingBottom={insets.bottom}
                  />
                ) : (
                  <AnimatedTabBar
                    tabs={supervisorOverviewTabs}
                    activeTab="SETTINGS"
                    onTabPress={() => {}}
                    height={TAB_BAR_CONTENT_HEIGHT}
                    paddingBottom={insets.bottom}
                  />
                )}
              </View>
            }
          >
            <View className="flex-1">
              {/* 药物管理页导航栏 */}
              <View className="bg-bg-warm border-b border-slate-100/50" style={{ paddingTop: insets.top }}>
                <View className="flex-row items-center px-4" style={{ height: 56 }}>
                  {/* 左侧返回按钮 */}
                  <TouchableOpacity 
                    onPress={handleAddMedSwipeBack} 
                    className="items-center justify-center bg-white rounded-full border border-slate-100 shadow-sm"
                    style={{ width: 44, height: 44, zIndex: 10 }}
                    activeOpacity={0.7}
                  >
                    <ChevronLeft size={24} color="#334155" />
                  </TouchableOpacity>
                  {/* 居中标题 */}
                  <View className="absolute left-0 right-0" style={{ pointerEvents: 'none' }}>
                    <Text className="text-xl font-bold text-slate-800 text-center" style={{ fontSize: 20 }}>
                      {addMedTitle}
                    </Text>
                  </View>
                  <View style={{ width: 44 }} />
                </View>
              </View>
              <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
                {/* 内容滚动区 */}
                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
                  <ConfigBuilder 
                    isSupervisor={appMode === 'SUPERVISOR'} 
                    targetName={targetName} 
                    onSave={handleSaveMedWrapper} 
                  />
                  <View className="mt-8 mb-4 flex-row items-center justify-between px-2">
                    <Text className="text-lg font-bold text-slate-700">{t('med_mgmt.section_added')}</Text>
                    <Text className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{config.length}</Text>
                  </View>
                  <View className="gap-3">
                    {config.map(med => {
                      const styles = getMedStyles(med.iconType);
                      return (
                        <View key={med.id} className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                          <View className="flex-row items-center gap-4 flex-1">
                            <View className={`w-12 h-12 rounded-xl ${styles.bg} items-center justify-center`}>
                              {renderMedIcon(med.iconType, 36, "white")}
                            </View>
                            <View className="flex-1 justify-center">
                              <View className="flex-row gap-2">
                                {renderTimeIcon(med.timeOfDay)}
                              </View>
                            </View>
                          </View>
                          <TouchableOpacity 
                            onPress={() => removeMed(med.id)} 
                            className="p-3 bg-red-50 rounded-full ml-2"
                          >
                            <TrashIcon size={20} color="#f87171" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </SafeAreaView>
            </View>
          </SwipeBackContainer>
        </AnimatedPage>
      </View>
    );
  }

  // 非专注模式：正常渲染
  // 获取当前页面标题
  const getPageTitle = () => {
    if (activeTab === 'SETTINGS') return t('settings.title');
    if (activeTab === 'HISTORY') return appMode === 'SUPERVISOR' ? t('history.patient_title') : t('history.my_title');
    if (activeTab === 'TRENDS') return t('trends.title');
    if (activeTab === 'HOME' && appMode === 'SUPERVISOR') return t('supervisor.overview');
    if (activeTab === 'HOME' && appMode === 'USER') return t('home.today_checkin');
    return null;
  };
  
  const pageTitle = getPageTitle();
  // ADD_MED 已在前面提前返回，这里只需检查 LANGUAGE
  const showHeader = activeTab !== 'LANGUAGE' && !currentSeniorId;
  // LANGUAGE 页面有自己的导航栏，不需要外层处理顶部安全区域
  const hasOwnHeader = activeTab === 'LANGUAGE';
  
  return (
    <View className="flex-1 bg-bg-warm">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* 统一导航栏 - 固定高度56px，标题居中 */}
      {showHeader && (
        <View className="bg-bg-warm border-b border-slate-100/50" style={{ paddingTop: insets.top }}>
          <View className="flex-row items-center justify-center px-4" style={{ height: 56 }}>
            {/* 居中标题 */}
            {pageTitle && (
              <Text className="text-xl font-bold text-slate-800" style={{ fontSize: 20 }}>{pageTitle}</Text>
            )}
          </View>
        </View>
      )}
      <SafeAreaView className="flex-1" edges={hasOwnHeader ? ['left', 'right'] : (showHeader ? ['left', 'right'] : ['top', 'left', 'right'])}>

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
          
          {/* 监护概览页 - 无动画，直接渲染以确保与 previousPage 结构完全一致 */}
          {activeTab === 'HOME' && appMode === 'SUPERVISOR' && (
             <View style={{ flex: 1 }}>
                <SupervisorHomeScreen currentSeniorId={null} seniorList={seniorList} todaysMeds={[]} todayRecord={[]} dashboardData={dashboardData} onSelectSenior={handleWrapperEnterFocus} />
             </View>
          )}
          
          {/* 主Tab历史页 */}
          {activeTab === 'HISTORY' && (
             <AnimatedPage type="fade">
               <HistoryScreen history={history} config={config} isSupervisor={appMode === 'SUPERVISOR'} />
             </AnimatedPage>
          )}
          
          {/* 设置页 - 从药物管理返回时不播放动画（SwipeBackContainer已处理） */}
          {activeTab === 'SETTINGS' && (
             <AnimatedPage type={isReturningFromAddMed ? 'fade' : getTransitionType('SETTINGS')}>
               <SettingsView appMode={appMode} setAppMode={setAppMode} setActiveTab={setActiveTab} incomingRequests={incomingRequests} supervisorCode={supervisorCode} setShowRequestModal={setShowRequestModal} setShowAddSeniorModal={setShowAddSeniorModal} setShowSeniorListModal={setShowSeniorListModal} setIsSelectingForMedMgmt={setIsSelectingForMedMgmt} handleLogout={handleLogout} />
             </AnimatedPage>
          )}
          
          {/* 子页面 - ADD_MED 已移至独立渲染（带滑动返回） */}
          {activeTab === 'LANGUAGE' && (
             <AnimatedPage type={getTransitionType('LANGUAGE')}>
               <LanguageView setActiveTab={setActiveTab} />
             </AnimatedPage>
          )}
          
          {activeTab === 'HOME' && appMode === 'USER' && (
            <TouchableOpacity onPress={() => setShowHealthRecordModal(true)} className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-lg z-50" style={{ elevation: 5 }}><Text className="text-white text-4xl font-light pb-1">+</Text></TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* 子页面（LANGUAGE）时隐藏 Tab 栏，ADD_MED 已在前面提前返回 */}
      {activeTab !== 'LANGUAGE' && (
        appMode === 'USER' ? (
          <AnimatedTabBar
            tabs={userModeTabs}
            activeTab={activeTab}
            onTabPress={(key) => setActiveTab(key as Tab)}
            height={TAB_BAR_CONTENT_HEIGHT}
            paddingBottom={insets.bottom}
          />
        ) : appMode === 'SUPERVISOR' && !currentSeniorId ? (
          <AnimatedTabBar
            tabs={supervisorOverviewTabs}
            activeTab={activeTab}
            onTabPress={(key) => setActiveTab(key as Tab)}
            height={TAB_BAR_CONTENT_HEIGHT}
            paddingBottom={insets.bottom}
          />
        ) : null
      )}

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