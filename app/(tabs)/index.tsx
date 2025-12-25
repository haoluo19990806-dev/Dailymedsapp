import '@/utils/i18n';
import { useTranslation } from 'react-i18next';

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, LogBox, Modal, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CaregiverIcon,
  ChartIcon,
  HistoryIcon,
  HomeIcon,
  SettingsIcon,
  TrashIcon,
  UserIcon
} from '@/components/Icons';

import { ConfigBuilder } from '@/components/ConfigBuilder';
import { HealthRecordModal } from '@/components/HealthRecordModal';
import { HistoryScreen } from '@/components/HistoryScreen';
import { SupervisorHomeScreen } from '@/components/SupervisorHomeScreen';
import { TrendsScreen } from '@/components/TrendsScreen';
import { UserHomeScreen } from '@/components/UserHomeScreen';

import { FrequencyType, HistoryRecord, MedConfig, MedIconType, Senior, TimeOfDay, TimelineEvent } from '@/types';
import { StorageKeys, loadData, migrateHistoryData, saveData } from '@/utils/storage';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';

import { Check, ChevronLeft, ChevronRight, Globe, Pill, PlusCircle, ShieldCheck, UserCog } from 'lucide-react-native';

LogBox.ignoreLogs([
  'Expo AV has been deprecated', 
  'No route named "index"',
]);

type Tab = 'TRENDS' | 'HOME' | 'HISTORY' | 'SETTINGS' | 'ADD_MED' | 'LANGUAGE';
type AppMode = 'LANDING' | 'USER' | 'SUPERVISOR';

const INITIAL_CONFIG: MedConfig[] = [
  { 
    id: '1', 
    iconType: MedIconType.CANDY, 
    timeOfDay: TimeOfDay.MORNING, 
    colorClass: 'bg-sugar-pending', 
    shadowClass: 'shadow-rose-200', 
    frequencyType: FrequencyType.WEEKLY,
    days: [1,2,3,4,5,6,7] 
  },
  { 
    id: '2', 
    iconType: MedIconType.DROP, 
    timeOfDay: TimeOfDay.MORNING, 
    colorClass: 'bg-pressure-pending', 
    shadowClass: 'shadow-sky-200', 
    frequencyType: FrequencyType.WEEKLY,
    days: [1,2,3,4,5,6,7] 
  },
];

// --- 辅助组件：设置列表项 ---
const SettingsItem = ({ 
  label, 
  icon, 
  rightText, 
  onPress, 
  isLast = false,
  color = "#334155" 
}: { 
  label: string, 
  icon?: React.ReactNode, 
  rightText?: string, 
  onPress?: () => void, 
  isLast?: boolean,
  color?: string
}) => (
  <TouchableOpacity 
    onPress={onPress} 
    activeOpacity={0.7}
    className={`flex-row items-center justify-between py-4 px-4 bg-white ${!isLast ? 'border-b border-slate-50' : ''}`}
  >
    <View className="flex-row items-center">
      <View className="w-8 items-center justify-center mr-3">
        {icon}
      </View>
      <Text className="text-base font-medium" style={{ color: color }}>{label}</Text>
    </View>
    <View className="flex-row items-center gap-1">
      {rightText && <Text className="text-slate-400 text-sm mr-1">{rightText}</Text>}
      {onPress && <ChevronRight size={20} color="#cbd5e1" />}
    </View>
  </TouchableOpacity>
);

const SettingsGroup = ({ children }: { children: React.ReactNode }) => (
  <View className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm border border-slate-100">
    {children}
  </View>
);

export default function App() {
  const { t, i18n } = useTranslation(); 

  const [appMode, setAppMode] = useState<AppMode>('LANDING');
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [currentDateKey, setCurrentDateKey] = useState<string>("");
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState<number>(1);
  
  const [supervisorCode, setSupervisorCode] = useState<string>("");
  const [config, setConfig] = useState<MedConfig[]>(INITIAL_CONFIG);
  const [history, setHistory] = useState<HistoryRecord>({});
  const [seniorList, setSeniorList] = useState<Senior[]>([]); 
  const [currentSeniorId, setCurrentSeniorId] = useState<string | null>(null); 
  const [showAddSeniorModal, setShowAddSeniorModal] = useState<boolean>(false);
  const [showSeniorListModal, setShowSeniorListModal] = useState<boolean>(false); 
  const [newSeniorCode, setNewSeniorCode] = useState<string>("");
  const [newSeniorNote, setNewSeniorNote] = useState<string>("");
  const [showMoonModal, setShowMoonModal] = useState<boolean>(false);
  const [lastActionMedId, setLastActionMedId] = useState<string | null>(null);
  const [showHealthRecordModal, setShowHealthRecordModal] = useState<boolean>(false);
  
  const soundRef = useRef<Audio.Sound | null>(null);

  const shouldTakeMed = (med: MedConfig, targetDateStr: string): boolean => {
    if (med.frequencyType === FrequencyType.WEEKLY) {
      const date = new Date(targetDateStr);
      let dayNum = date.getDay();
      if (dayNum === 0) dayNum = 7;
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

  const todayRecord = history[currentDateKey] || [];
  const todaysMeds = config.filter(med => shouldTakeMed(med, currentDateKey));

  useEffect(() => {
    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(require('@/assets/sounds/pop.mp3'), { shouldPlay: false });
        soundRef.current = sound;
      } catch (error) { console.log('Error loading local sound', error); }
    };
    loadSound();
    return () => { if (soundRef.current) soundRef.current.unloadAsync(); };
  }, []);

  useEffect(() => {
    const initApp = async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setCurrentDateKey(`${year}-${month}-${day}`);
      let dayNum = now.getDay();
      if (dayNum === 0) dayNum = 7;
      setCurrentDayOfWeek(dayNum);

      const savedConfig = await loadData(StorageKeys.MED_CONFIG);
      if (savedConfig) setConfig(savedConfig);

      const savedHistory = await loadData(StorageKeys.MED_HISTORY);
      const migratedHistory = migrateHistoryData(savedHistory);
      if (migratedHistory) setHistory(migratedHistory);

      let code = await loadData(StorageKeys.SUPERVISOR_CODE);
      if (!code) {
        code = Math.floor(10000 + Math.random() * 90000).toString();
        await saveData(StorageKeys.SUPERVISOR_CODE, code);
      }
      setSupervisorCode(code);

      const savedMode = await loadData(StorageKeys.APP_MODE);
      if (savedMode === 'USER' || savedMode === 'SUPERVISOR') {
        setAppMode(savedMode);
      }

      const savedLang = await loadData('APP_LANGUAGE');
      if (savedLang) {
        i18n.changeLanguage(savedLang);
      }
    };
    initApp();
  }, []);

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await saveData('APP_LANGUAGE', lang); 
    setActiveTab('SETTINGS');
  };

  const playSuccessSound = async () => {
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
    try { if (soundRef.current) await soundRef.current.replayAsync(); } catch (error) {}
  };

  const switchMode = (mode: AppMode) => {
    setAppMode(mode);
    saveData(StorageKeys.APP_MODE, mode);
  };

  const handleToggleMed = async (medId: string) => {
    const existingEventIndex = todayRecord.findIndex(event => event.medId === medId);
    const isTaken = existingEventIndex !== -1;
    let newRecord: TimelineEvent[];
    let shouldPlaySound = false; 

    if (isTaken) {
      newRecord = [...todayRecord];
      newRecord.splice(existingEventIndex, 1);
      setShowMoonModal(false); 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      const medConfig = config.find(c => c.id === medId);
      const newEvent: TimelineEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'MEDICATION',
        timestamp: Date.now(),
        dateKey: currentDateKey,
        medId: medId,
        medName: medConfig?.name,
        isTaken: true
      };
      newRecord = [...todayRecord, newEvent];
      shouldPlaySound = true; 
      setLastActionMedId(medId);
    }

    const newHistory = { ...history, [currentDateKey]: newRecord };
    setHistory(newHistory);
    saveData(StorageKeys.MED_HISTORY, newHistory);
    if (appMode === 'SUPERVISOR' && currentSeniorId) updateSeniorData(currentSeniorId, { history: newHistory });
    if (shouldPlaySound) {
      playSuccessSound();
      const takenMedIds = new Set(newRecord.map(e => e.medId).filter(id => id !== undefined));
      const finishedCount = todaysMeds.filter(m => takenMedIds.has(m.id)).length;
      if (todaysMeds.length > 0 && finishedCount === todaysMeds.length) setTimeout(() => setShowMoonModal(true), 300);
    }
  };

  const handleSaveHealthRecord = async (newEvent: TimelineEvent) => {
    const newRecord = [...todayRecord, newEvent];
    const newHistory = { ...history, [currentDateKey]: newRecord };
    setHistory(newHistory);
    saveData(StorageKeys.MED_HISTORY, newHistory);
    if (appMode === 'SUPERVISOR' && currentSeniorId) updateSeniorData(currentSeniorId, { history: newHistory });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t('alert.record_saved'), t('alert.body_data_saved'));
  };

  const handleDeleteHistoryItem = async (itemToDelete: TimelineEvent) => {
    Alert.alert(t('alert.confirm_delete'), t('alert.confirm_delete_record'), [
      { text: t('alert.cancel'), style: "cancel" },
      { 
        text: t('alert.delete'), 
        style: "destructive",
        onPress: async () => {
          const newHistory = { ...history };
          let deleted = false;
          Object.keys(newHistory).forEach(dateKey => {
            const originalLength = newHistory[dateKey].length;
            newHistory[dateKey] = newHistory[dateKey].filter(item => item.id !== itemToDelete.id);
            if (newHistory[dateKey].length < originalLength) deleted = true;
            if (newHistory[dateKey].length === 0) delete newHistory[dateKey];
          });

          if (deleted) {
            setHistory(newHistory);
            await saveData(StorageKeys.MED_HISTORY, newHistory);
            if (appMode === 'SUPERVISOR' && currentSeniorId) {
              updateSeniorData(currentSeniorId, { history: newHistory });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    ]);
  };

  const saveNewMedication = async (newMed: MedConfig) => {
    const newConfig = [...config, newMed];
    setConfig(newConfig);
    await saveData(StorageKeys.MED_CONFIG, newConfig);
    if (appMode === 'SUPERVISOR' && currentSeniorId) updateSeniorData(currentSeniorId, { config: newConfig });
    Alert.alert(t('alert.success'), t('alert.added'));
  };

  const removeMedication = async (id: string) => {
    Alert.alert(t('alert.confirm_delete'), t('alert.delete_med_confirm'), [
        { text: t('alert.cancel'), style: "cancel" },
        {
            text: t('alert.delete'), style: "destructive", onPress: async () => {
                const newConfig = config.filter(c => c.id !== id);
                setConfig(newConfig);
                await saveData(StorageKeys.MED_CONFIG, newConfig);
                if (appMode === 'SUPERVISOR' && currentSeniorId) updateSeniorData(currentSeniorId, { config: newConfig });
            }
        }
    ]);
  };

  const handleAddSenior = () => {
    if (!newSeniorCode.trim()) { Alert.alert(t('alert.tip'), t('alert.enter_code')); return; }
    const newSenior: Senior = {
      id: newSeniorCode,
      note: newSeniorNote || `User ${newSeniorCode}`,
      config: [],
      history: {}
    };
    const newList = [...seniorList, newSenior];
    setSeniorList(newList);
    Alert.alert(t('alert.add_success'), t('alert.added_patient', { name: newSenior.note }));
    setShowAddSeniorModal(false);
    setNewSeniorCode("");
    setNewSeniorNote("");
    switchToSenior(newSenior);
  };

  const handleDeleteSenior = (id: string) => {
    Alert.alert(t('alert.confirm_remove'), t('alert.confirm_remove_patient'), [
      { text: t('alert.cancel'), style: "cancel" },
      { 
        text: t('alert.remove'), 
        style: "destructive",
        onPress: () => {
          const newList = seniorList.filter(s => s.id !== id);
          setSeniorList(newList);
          if (currentSeniorId === id) {
            setCurrentSeniorId(null);
            setConfig([]);
            setHistory({});
          }
        }
      }
    ]);
  };

  const switchToSenior = (senior: Senior) => {
    setCurrentSeniorId(senior.id);
    setConfig(senior.config);
    setHistory(senior.history);
    setShowSeniorListModal(false);
  };

  const updateSeniorData = (id: string, data: Partial<Senior>) => {
    const newList = seniorList.map(s => s.id === id ? { ...s, ...data } : s);
    setSeniorList(newList);
  };

  const renderAddMedicationPage = () => {
    return (
      <View className="flex-1 bg-bg-warm">
        <View className="flex-row items-center px-4 py-3 bg-bg-warm border-b border-slate-100/50">
          <TouchableOpacity 
            onPress={() => setActiveTab('SETTINGS')} 
            className="p-2 mr-2 bg-white rounded-full border border-slate-100 shadow-sm"
          >
            <ChevronLeft size={24} color="#334155" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-700">{t('med_mgmt.title')}</Text>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
           <ConfigBuilder 
              isSupervisor={appMode === 'SUPERVISOR'} 
              targetName={currentSeniorId ? seniorList.find(s=>s.id===currentSeniorId)?.note || '' : t('settings.not_selected')} 
              onSave={saveNewMedication} 
            />

           <View className="mt-8 mb-4 flex-row items-center justify-between px-2">
              <Text className="text-lg font-bold text-slate-700">
                {appMode === 'SUPERVISOR' && currentSeniorId ? t('med_mgmt.patient_meds') : t('med_mgmt.section_added')}
              </Text>
              <Text className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{config.length}</Text>
           </View>

           {config.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center border border-slate-200 border-dashed">
                <Text className="text-slate-400 text-center">{t('med_mgmt.empty')}{'\n'}{t('med_mgmt.empty_tip')}</Text>
              </View>
            ) : (
              <View className="gap-3">
                {config.map(med => (
                  <View key={med.id} className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <View className="flex-row items-center gap-4 flex-1">
                        {/* 🔥 [修改] 图标容器保持 w-12 h-12，图标尺寸增大至 36，始终显示图标，不显示文字 */}
                        <View className={`w-12 h-12 rounded-xl ${getMedStyles(med.iconType).bg} items-center justify-center`}>
                          {renderMedIcon(med.iconType, 36, "white")}
                        </View>
                        
                        {/* 🔥 [修改] 右侧只保留时间图标，删除文字描述 */}
                        <View className="flex-1 justify-center">
                          <View className="flex-row gap-2">
                             {renderTimeIcon(med.timeOfDay)}
                          </View>
                        </View>
                      </View>
                      
                      <TouchableOpacity onPress={() => removeMedication(med.id)} className="p-3 bg-red-50 rounded-full ml-2">
                        <TrashIcon size={20} color="#f87171" />
                      </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
        </ScrollView>
      </View>
    );
  };

  const renderLanguagePage = () => {
    const currentLang = i18n.language;
    return (
      <View className="flex-1 bg-bg-warm">
        <View className="flex-row items-center px-4 py-3 bg-bg-warm border-b border-slate-100/50">
          <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} className="p-2 mr-2 bg-white rounded-full border border-slate-100 shadow-sm">
            <ChevronLeft size={24} color="#334155" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-700">{t('lang.title')}</Text>
        </View>
        <ScrollView className="flex-1 px-4 pt-4">
           <SettingsGroup>
              <TouchableOpacity onPress={() => changeLanguage('zh')} className="flex-row items-center justify-between py-4 px-4 bg-white border-b border-slate-50">
                 <Text className="text-base font-medium text-slate-700">{t('lang.zh')}</Text>
                 {currentLang === 'zh' && <Check size={20} color="#10b981" />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeLanguage('en')} className="flex-row items-center justify-between py-4 px-4 bg-white">
                 <Text className="text-base font-medium text-slate-700">{t('lang.en')}</Text>
                 {currentLang === 'en' && <Check size={20} color="#10b981" />}
              </TouchableOpacity>
           </SettingsGroup>
        </ScrollView>
      </View>
    );
  };

  const renderSettings = () => {
    const currentSeniorName = currentSeniorId ? seniorList.find(s=>s.id===currentSeniorId)?.note || t('settings.unnamed') : null;

    return (
      <ScrollView className="flex-1 w-full px-4 pt-4 bg-bg-warm" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-3xl font-bold text-slate-800 mb-6 px-2">{t('settings.title')}</Text>

        <Text className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider">{t('settings.section_account')}</Text>
        <SettingsGroup>
          {appMode === 'USER' ? (
            <SettingsItem 
              label={t('settings.my_code')}
              icon={<ShieldCheck size={22} color="#f59e0b" />}
              rightText={supervisorCode}
              isLast={false}
            />
          ) : (
            <SettingsItem 
              label={t('settings.current_patient')}
              icon={<UserCog size={22} color="#3b82f6" />}
              rightText={currentSeniorName || t('settings.click_switch')}
              onPress={() => setShowSeniorListModal(true)}
              isLast={false}
            />
          )}
          
          {appMode === 'SUPERVISOR' && (
             <SettingsItem 
               label={t('settings.add_patient')}
               icon={<PlusCircle size={22} color="#3b82f6" />}
               onPress={() => setShowAddSeniorModal(true)}
               isLast={false}
             />
          )}

          <SettingsItem 
            label={t('header.switch_identity')}
            icon={<UserIcon size={22} color="#64748b" />}
            rightText={appMode === 'USER' ? t('header.mode_patient') : t('header.mode_supervisor')}
            onPress={() => setAppMode('LANDING')}
            isLast={true}
          />
        </SettingsGroup>

        <Text className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider mt-4">{t('settings.section_general')}</Text>
        <SettingsGroup>
          {(appMode === 'USER' || (appMode === 'SUPERVISOR' && currentSeniorId)) && (
            <SettingsItem 
              label={t('settings.med_mgmt')}
              icon={<Pill size={22} color="#10b981" />} 
              rightText={t('settings.med_action')}
              onPress={() => setActiveTab('ADD_MED')} 
              isLast={false}
            />
          )}
          <SettingsItem 
              label={t('settings.language')}
              icon={<Globe size={22} color="#8b5cf6" />} 
              rightText={i18n.language === 'en' ? 'English' : '中文'}
              onPress={() => setActiveTab('LANGUAGE')} 
              isLast={true}
          />
        </SettingsGroup>

        {appMode === 'SUPERVISOR' && !currentSeniorId && (
          <View className="bg-slate-50 rounded-3xl p-8 items-center mb-8 border border-slate-200 border-dashed mt-4">
             <Text className="text-slate-400 text-lg text-center">{t('settings.no_patient_tip')}</Text>
             <Text className="text-slate-300 text-sm text-center mt-1">{t('settings.enable_more')}</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  if (appMode === 'LANDING') {
    return (
      <View className="flex-1 bg-bg-warm">
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="items-center mb-12"><Text className="text-4xl font-bold text-slate-800">Daily Meds</Text><Text className="text-slate-400 text-lg mt-2">{t('landing.subtitle')}</Text></View>
          <View className="w-full bg-white rounded-3xl overflow-hidden shadow-sm">
            <TouchableOpacity onPress={() => switchMode('USER')} className="w-full p-6 flex-row items-center gap-6 border-b border-slate-100" activeOpacity={0.7}>
              <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center"><UserIcon size={32} color="#f97316" /></View>
              <View><Text className="text-xl font-bold text-slate-700">{t('landing.patient')}</Text><Text className="text-slate-400">{t('landing.patient_desc')}</Text></View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchMode('SUPERVISOR')} className="w-full p-6 flex-row items-center gap-6" activeOpacity={0.7}>
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center"><CaregiverIcon size={32} color="#3b82f6" /></View>
              <View><Text className="text-xl font-bold text-slate-700">{t('landing.supervisor')}</Text><Text className="text-slate-400">{t('landing.supervisor_desc')}</Text></View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-warm">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        {/* 顶部栏 */}
        {activeTab !== 'SETTINGS' && activeTab !== 'ADD_MED' && activeTab !== 'LANGUAGE' && (
          <View className="flex-row justify-end items-center px-6 py-2">
             <View className="px-2 py-1 bg-slate-100 rounded-full">
                <Text className="text-xs font-bold text-slate-300">{appMode === 'USER' ? t('header.mode_patient') : t('header.mode_supervisor')}</Text>
             </View>
          </View>
        )}

        <View className="flex-1 relative">
          
          {activeTab === 'TRENDS' && (
            <TrendsScreen history={history} onDelete={handleDeleteHistoryItem} />
          )}

          {activeTab === 'HOME' && appMode === 'USER' && (
            <UserHomeScreen todaysMeds={todaysMeds} todayRecord={todayRecord} currentDayOfWeek={currentDayOfWeek} onToggleMed={handleToggleMed} />
          )}
          
          {activeTab === 'HOME' && appMode === 'SUPERVISOR' && (
            <SupervisorHomeScreen currentSeniorId={currentSeniorId} seniorList={seniorList} todaysMeds={todaysMeds} todayRecord={todayRecord} />
          )}

          {activeTab === 'HISTORY' && (
            <HistoryScreen history={history} config={config} isSupervisor={appMode === 'SUPERVISOR'} />
          )}

          {activeTab === 'SETTINGS' && renderSettings()}

          {activeTab === 'ADD_MED' && renderAddMedicationPage()}

          {activeTab === 'LANGUAGE' && renderLanguagePage()}

          {/* 悬浮按钮 */}
          {activeTab === 'HOME' && (appMode === 'USER' || (appMode === 'SUPERVISOR' && currentSeniorId)) && (
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
              <TouchableOpacity 
                onPress={() => setActiveTab('TRENDS')} 
                style={{ width: 64, height: 64 }} 
                className="items-center justify-center"
              >
                <ChartIcon size={32} color={activeTab === 'TRENDS' ? "#8B5CF6" : "#cbd5e1"} />
                <Text style={{ fontSize: 10, color: activeTab === 'TRENDS' ? "#8B5CF6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.trends')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setActiveTab('HOME')} 
                style={{ width: 64, height: 64 }}
                className="items-center justify-center"
              >
                <HomeIcon size={32} color={activeTab === 'HOME' ? '#4ADE80' : '#cbd5e1'} />
                <Text style={{ fontSize: 10, color: activeTab === 'HOME' ? "#4ADE80" : "#cbd5e1", marginTop: 4 }}>{t('tabs.home')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setActiveTab('HISTORY')} 
                style={{ width: 64, height: 64 }} 
                className="items-center justify-center"
              >
                <HistoryIcon size={32} color={activeTab === 'HISTORY' ? "#3b82f6" : "#cbd5e1"} />
                <Text style={{ fontSize: 10, color: activeTab === 'HISTORY' ? "#3b82f6" : "#cbd5e1", marginTop: 4 }}>{t('tabs.history')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} style={{ width: 64, height: 64 }} className="items-center justify-center">
                <SettingsIcon size={32} color={activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1"} />
                <Text style={{ fontSize: 10, color: activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1", marginTop: 4 }}>{t('tabs.settings')}</Text>
              </TouchableOpacity>
          </SafeAreaView>
        </View>
      )}

      <Modal animationType="fade" transparent={true} visible={showAddSeniorModal} onRequestClose={() => setShowAddSeniorModal(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white w-full max-w-xs rounded-3xl p-6">
            <Text className="text-xl font-bold text-slate-700 mb-4 text-center">{t('modal.add_patient_title')}</Text>
            <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">{t('modal.code_label')}</Text>
            <TextInput className="w-full bg-slate-50 p-3 rounded-xl text-slate-700 text-lg border border-slate-100 mb-4 font-mono" placeholder={t('modal.code_placeholder')} placeholderTextColor="#cbd5e1" keyboardType="number-pad" value={newSeniorCode} onChangeText={setNewSeniorCode} maxLength={5} />
            <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">{t('modal.note_label')}</Text>
            <TextInput className="w-full bg-slate-50 p-3 rounded-xl text-slate-700 text-lg border border-slate-100 mb-6" placeholder={t('modal.note_placeholder')} placeholderTextColor="#cbd5e1" value={newSeniorNote} onChangeText={setNewSeniorNote} />
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setShowAddSeniorModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl items-center"><Text className="text-slate-500 font-bold">{t('modal.btn_cancel')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddSenior} className="flex-1 py-3 bg-blue-500 rounded-xl items-center"><Text className="text-white font-bold">{t('modal.btn_confirm')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={showSeniorListModal} onRequestClose={() => setShowSeniorListModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white w-full rounded-t-3xl p-6 h-1/2">
            <Text className="text-xl font-bold text-slate-700 mb-6 text-center">{t('modal.patient_list_title')}</Text>
            <ScrollView className="flex-1">
              {seniorList.length === 0 ? <Text className="text-center text-slate-400 mt-10">{t('modal.list_empty')}</Text> : seniorList.map(senior => (
                  <View key={senior.id} className="flex-row items-center mb-3 gap-2">
                    <TouchableOpacity onPress={() => switchToSenior(senior)} className={`flex-1 p-4 rounded-2xl border-2 ${currentSeniorId === senior.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}>
                      <View className="flex-row justify-between items-center"><Text className="text-lg font-bold text-slate-700">{senior.note}</Text><Text className="text-slate-400 font-mono">ID: {senior.id}</Text></View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteSenior(senior.id)} className="p-4 bg-red-50 rounded-2xl justify-center items-center"><TrashIcon size={24} color="#f87171" /></TouchableOpacity>
                  </View>
                ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowSeniorListModal(false)} className="mt-4 py-4 bg-slate-100 rounded-2xl items-center"><Text className="text-slate-500 font-bold">{t('modal.close')}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={showMoonModal} onRequestClose={() => setShowMoonModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMoonModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' }}>
            <View className="items-center">
                <View className="mb-8"><Image source={require('@/assets/images/moon.png')} style={{ width: 200, height: 200, resizeMode: 'contain' }} /></View>
                <Text className="text-3xl font-bold text-white mb-2">{t('modal.good_night')}</Text>
                <Text className="text-lg text-white opacity-80 mb-12 font-medium">{t('modal.all_done')}</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <HealthRecordModal visible={showHealthRecordModal} onClose={() => setShowHealthRecordModal(false)} onSave={handleSaveHealthRecord} currentDateKey={currentDateKey} />
    </View>
  );
}