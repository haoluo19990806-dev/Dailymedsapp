import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, LogBox, Modal, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CaregiverIcon,
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
import { UserHomeScreen } from '@/components/UserHomeScreen';

import { FrequencyType, HistoryRecord, MedConfig, MedIconType, Senior, TimeOfDay, TimelineEvent } from '@/types';
import { StorageKeys, loadData, migrateHistoryData, saveData } from '@/utils/storage';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';

LogBox.ignoreLogs([
  'Expo AV has been deprecated', 
  'No route named "index"',
]);

type Tab = 'HOME' | 'HISTORY' | 'SETTINGS';
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

export default function App() {
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

  // --- 初始化与音效 ---

  useEffect(() => {
    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/pop.mp3'),
          { shouldPlay: false }
        );
        soundRef.current = sound;
        console.log("Sound loaded successfully from local assets");

      } catch (error) {
        console.log('Error loading local sound (will use Haptics only):', error);
      }
    };
    loadSound();
    
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
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
    };
    initApp();
  }, []);

  const playSuccessSound = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log("Haptics not supported");
    }

    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      } else {
        console.log("Local sound not loaded, skipping audio.");
      }
    } catch (error) {
      console.log('Sound playback error', error);
    }
  };

  const switchMode = (mode: AppMode) => {
    setAppMode(mode);
    saveData(StorageKeys.APP_MODE, mode);
  };

  // --- 业务逻辑处理 ---

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
    
    if (appMode === 'SUPERVISOR' && currentSeniorId) {
       updateSeniorData(currentSeniorId, { history: newHistory });
    }

    if (shouldPlaySound) {
      playSuccessSound();
      const takenMedIds = new Set(newRecord.map(e => e.medId).filter(id => id !== undefined));
      const finishedCount = todaysMeds.filter(m => takenMedIds.has(m.id)).length;
      
      if (todaysMeds.length > 0 && finishedCount === todaysMeds.length) {
        setTimeout(() => setShowMoonModal(true), 300);
      }
    }
  };

  const handleSaveHealthRecord = async (newEvent: TimelineEvent) => {
    const newRecord = [...todayRecord, newEvent];
    const newHistory = { ...history, [currentDateKey]: newRecord };
    
    setHistory(newHistory);
    saveData(StorageKeys.MED_HISTORY, newHistory);

    if (appMode === 'SUPERVISOR' && currentSeniorId) {
      updateSeniorData(currentSeniorId, { history: newHistory });
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("记录成功", "身体数据已保存");
  };

  const saveNewMedication = async (newMed: MedConfig) => {
    const newConfig = [...config, newMed];
    setConfig(newConfig);
    await saveData(StorageKeys.MED_CONFIG, newConfig);
    
    if (appMode === 'SUPERVISOR' && currentSeniorId) {
      updateSeniorData(currentSeniorId, { config: newConfig });
    }

    if(appMode === 'USER') setActiveTab('HOME');
    Alert.alert("成功", "新药物已添加");
  };

  const removeMedication = async (id: string) => {
    const newConfig = config.filter(c => c.id !== id);
    setConfig(newConfig);
    await saveData(StorageKeys.MED_CONFIG, newConfig);
    
    if (appMode === 'SUPERVISOR' && currentSeniorId) {
      updateSeniorData(currentSeniorId, { config: newConfig });
    }
  };

  const handleAddSenior = () => {
    if (!newSeniorCode.trim()) {
      Alert.alert("提示", "请输入监督码");
      return;
    }
    const newSenior: Senior = {
      id: newSeniorCode,
      note: newSeniorNote || `患者 ${newSeniorCode}`,
      config: [],
      history: {}
    };
    const newList = [...seniorList, newSenior];
    setSeniorList(newList);
    Alert.alert("添加成功", `已添加：${newSenior.note}`);
    setShowAddSeniorModal(false);
    setNewSeniorCode("");
    setNewSeniorNote("");
    switchToSenior(newSenior);
  };

  const handleDeleteSenior = (id: string) => {
    Alert.alert("确认移除", "您确定要移除这位患者吗？", [
      { text: "取消", style: "cancel" },
      { 
        text: "移除", 
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

  // --- 5. 渲染部分 ---

  const renderSettings = () => (
    <ScrollView className="flex-1 w-full px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
       <View className="flex-row justify-between items-center mb-8 mt-4">
          {appMode === 'USER' ? (
            <Text className="text-4xl font-bold text-slate-700">设置</Text>
          ) : (
            <TouchableOpacity 
              onPress={() => setShowSeniorListModal(true)}
              className="bg-white border-2 border-slate-100 rounded-xl px-4 py-2"
            >
              <Text className="text-slate-600 font-bold text-sm">已添加患者</Text>
            </TouchableOpacity>
          )}
          
          {appMode === 'USER' ? (
            <View className="bg-white border-2 border-slate-100 rounded-xl px-4 py-2 items-center">
              <Text className="text-xs text-slate-400 font-bold uppercase mb-1">监督码</Text>
              <Text className="text-xl font-bold text-slate-600 tracking-widest">{supervisorCode}</Text>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={() => setShowAddSeniorModal(true)}
              className="bg-blue-100 rounded-xl px-4 py-3"
            >
              <Text className="text-blue-600 font-bold text-sm">添加患者</Text>
            </TouchableOpacity>
          )}
      </View>
      
      {(appMode === 'USER' || currentSeniorId) && (
        <>
          <ConfigBuilder 
            isSupervisor={appMode === 'SUPERVISOR'} 
            targetName={currentSeniorId ? seniorList.find(s=>s.id===currentSeniorId)?.note || '' : '未选择'}
            onSave={saveNewMedication}
          />

          <Text className="text-xl font-bold text-slate-500 mb-4 px-2">
            {appMode === 'SUPERVISOR' && currentSeniorId ? '该患者的药物' : '已添加药物'}
          </Text>
          <View className="gap-4">
            {config.map(med => (
              <View key={med.id} className="flex-row items-center justify-between bg-white p-4 rounded-3xl shadow-sm">
                  <View className="flex-row items-center gap-4">
                    <View className={`w-14 h-14 rounded-2xl ${getMedStyles(med.iconType).bg} items-center justify-center`}>
                      {med.name ? (
                        <Text className="text-white font-bold text-xs text-center px-1" numberOfLines={2}>
                          {med.name}
                        </Text>
                      ) : (
                        renderMedIcon(med.iconType, 32, "white")
                      )}
                    </View>
                    <View>
                      <View className="flex-row gap-2">{renderTimeIcon(med.timeOfDay)}</View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeMedication(med.id)} className="p-3 bg-red-50 rounded-full">
                    <TrashIcon size={24} color="#f87171" />
                  </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
      
      {appMode === 'SUPERVISOR' && !currentSeniorId && (
        <View className="bg-slate-50 rounded-3xl p-8 items-center mb-8">
           <Text className="text-slate-400 text-lg text-center">请点击右上角“添加患者”</Text>
           <Text className="text-slate-300 text-sm text-center mt-2">或点击左上角选择已添加的患者</Text>
        </View>
      )}
    </ScrollView>
  );

  // --- 6. 引导页与主布局 ---

  if (appMode === 'LANDING') {
    return (
      <View className="flex-1 bg-bg-warm">
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="items-center mb-12">
             <Text className="text-4xl font-bold text-slate-800">Daily Meds</Text>
             <Text className="text-slate-400 text-lg mt-2">您的智能服药助手</Text>
          </View>
          
          <View className="w-full bg-white rounded-3xl overflow-hidden shadow-sm">
            <TouchableOpacity 
              onPress={() => switchMode('USER')}
              className="w-full p-6 flex-row items-center gap-6 border-b border-slate-100"
              activeOpacity={0.7}
            >
              <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center">
                 <UserIcon size={32} color="#f97316" />
              </View>
              <View>
                <Text className="text-xl font-bold text-slate-700">我是患者</Text>
                <Text className="text-slate-400">记录每日服药</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => switchMode('SUPERVISOR')}
              className="w-full p-6 flex-row items-center gap-6"
              activeOpacity={0.7}
            >
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center">
                 <CaregiverIcon size={32} color="#3b82f6" />
              </View>
              <View>
                <Text className="text-xl font-bold text-slate-700">我是监督者</Text>
                <Text className="text-slate-400">查看记录与设置</Text>
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
        {/* 顶部栏 */}
        <View className="flex-row justify-between items-center px-6 py-2">
           <TouchableOpacity onPress={() => setAppMode('LANDING')}>
             <Text className="text-sm font-bold text-slate-300">切换身份</Text>
           </TouchableOpacity>
           <View className="px-2 py-1 bg-slate-100 rounded-full">
              <Text className="text-xs font-bold text-slate-300">{appMode === 'USER' ? '长辈模式' : '监督模式'}</Text>
           </View>
        </View>

        <View className="flex-1 relative">
          {activeTab === 'HOME' && appMode === 'USER' && (
            <UserHomeScreen 
              todaysMeds={todaysMeds} 
              todayRecord={todayRecord}
              currentDayOfWeek={currentDayOfWeek}
              onToggleMed={handleToggleMed}
            />
          )}
          
          {activeTab === 'HOME' && appMode === 'SUPERVISOR' && (
            <SupervisorHomeScreen 
              currentSeniorId={currentSeniorId}
              seniorList={seniorList}
              todaysMeds={todaysMeds}
              todayRecord={todayRecord}
            />
          )}

          {activeTab === 'HISTORY' && (
            <HistoryScreen 
              history={history} 
              config={config} 
              isSupervisor={appMode === 'SUPERVISOR'} 
            />
          )}

          {activeTab === 'SETTINGS' && renderSettings()}

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

      <View className="bg-white border-t border-slate-100">
        <SafeAreaView edges={['bottom']} className="flex-row justify-around items-center h-20 px-4">
            <TouchableOpacity onPress={() => setActiveTab('HISTORY')} style={{ width: 64, height: 64 }} className="items-center justify-center">
              <HistoryIcon size={32} color={activeTab === 'HISTORY' ? "#3b82f6" : "#cbd5e1"} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setActiveTab('HOME')} 
              style={{ width: 64, height: 64 }}
              className="items-center justify-center"
            >
              <HomeIcon size={32} color={activeTab === 'HOME' ? '#4ADE80' : '#cbd5e1'} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} style={{ width: 64, height: 64 }} className="items-center justify-center">
              <SettingsIcon size={32} color={activeTab === 'SETTINGS' ? "#f97316" : "#cbd5e1"} />
            </TouchableOpacity>
        </SafeAreaView>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showAddSeniorModal}
        onRequestClose={() => setShowAddSeniorModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white w-full max-w-xs rounded-3xl p-6">
            <Text className="text-xl font-bold text-slate-700 mb-4 text-center">添加患者</Text>
            
            <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">监督码</Text>
            <TextInput
              className="w-full bg-slate-50 p-3 rounded-xl text-slate-700 text-lg border border-slate-100 mb-4 font-mono"
              placeholder="例如: 12345"
              placeholderTextColor="#cbd5e1"
              keyboardType="number-pad"
              value={newSeniorCode}
              onChangeText={setNewSeniorCode}
              maxLength={5}
            />
            
            <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">备注名称 (选填)</Text>
            <TextInput
              className="w-full bg-slate-50 p-3 rounded-xl text-slate-700 text-lg border border-slate-100 mb-6"
              placeholder="例如: 外婆"
              placeholderTextColor="#cbd5e1"
              value={newSeniorNote}
              onChangeText={setNewSeniorNote}
            />
            
            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setShowAddSeniorModal(false)}
                className="flex-1 py-3 bg-slate-100 rounded-xl items-center"
              >
                <Text className="text-slate-500 font-bold">取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleAddSenior}
                className="flex-1 py-3 bg-blue-500 rounded-xl items-center"
              >
                <Text className="text-white font-bold">确认添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showSeniorListModal}
        onRequestClose={() => setShowSeniorListModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white w-full rounded-t-3xl p-6 h-1/2">
            <Text className="text-xl font-bold text-slate-700 mb-6 text-center">已添加患者</Text>
            
            <ScrollView className="flex-1">
              {seniorList.length === 0 ? (
                <Text className="text-center text-slate-400 mt-10">暂无已添加的患者</Text>
              ) : (
                seniorList.map(senior => (
                  <View key={senior.id} className="flex-row items-center mb-3 gap-2">
                    <TouchableOpacity 
                      onPress={() => switchToSenior(senior)}
                      className={`flex-1 p-4 rounded-2xl border-2 ${currentSeniorId === senior.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}
                    >
                      <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-bold text-slate-700">{senior.note}</Text>
                        <Text className="text-slate-400 font-mono">ID: {senior.id}</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => handleDeleteSenior(senior.id)}
                      className="p-4 bg-red-50 rounded-2xl justify-center items-center"
                    >
                      <TrashIcon size={24} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            
            <TouchableOpacity 
              onPress={() => setShowSeniorListModal(false)}
              className="mt-4 py-4 bg-slate-100 rounded-2xl items-center"
            >
              <Text className="text-slate-500 font-bold">关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 修改后的月亮弹窗：点击任意处退出 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showMoonModal}
        onRequestClose={() => setShowMoonModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMoonModal(false)}>
          <View 
            style={{
              flex: 1, 
              backgroundColor: 'rgba(0, 0, 0, 0.7)', 
              justifyContent: 'center', 
              alignItems: 'center'
            }}
          >
            <View className="items-center">
                <View className="mb-8">
                  <Image 
                    source={require('@/assets/images/moon.png')} 
                    style={{ width: 200, height: 200, resizeMode: 'contain' }} 
                  />
                </View>
                
                <Text className="text-3xl font-bold text-white mb-2">晚安</Text>
                <Text className="text-lg text-white opacity-80 mb-12 font-medium">
                  今日任务全部完成，好好休息
                </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <HealthRecordModal
        visible={showHealthRecordModal}
        onClose={() => setShowHealthRecordModal(false)}
        onSave={handleSaveHealthRecord}
        currentDateKey={currentDateKey}
      />
    </View>
  );
}