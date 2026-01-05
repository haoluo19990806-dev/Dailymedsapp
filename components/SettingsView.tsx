import {
    Bell,
    Globe,
    LogOut,
    Pill, PlusCircle, ShieldCheck,
    User,
    UserCog
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { SettingsGroup, SettingsItem } from '@/components/SettingsShared';
import { AppMode, Tab } from '@/types';

interface SettingsViewProps {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  setActiveTab: (tab: Tab) => void; // 这里类型稍微精确一点
  incomingRequests: any[];
  supervisorCode: string;
  setShowRequestModal: (show: boolean) => void;
  setShowAddSeniorModal: (show: boolean) => void;
  setShowSeniorListModal: (show: boolean) => void;
  setIsSelectingForMedMgmt: (isSelecting: boolean) => void;
  handleLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  appMode,
  setAppMode,
  setActiveTab,
  incomingRequests,
  supervisorCode,
  setShowRequestModal,
  setShowAddSeniorModal,
  setShowSeniorListModal,
  setIsSelectingForMedMgmt,
  handleLogout
}) => {
  const { t } = useTranslation();

  return (
    <ScrollView className="flex-1 w-full px-4 pt-4 bg-bg-warm" contentContainerStyle={{ paddingBottom: 100 }}>
      <Text className="text-3xl font-bold text-slate-800 mb-6 px-2">{t('settings.title')}</Text>

      {/* 消息通知 - 仅患者模式 */}
      {appMode === 'USER' && incomingRequests.length > 0 && (
        <TouchableOpacity onPress={() => setShowRequestModal(true)} className="mx-2 mb-4 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex-row items-center gap-3">
          <View className="bg-orange-100 p-2 rounded-full"><Bell size={20} color="#f97316" /></View>
          <View className="flex-1">
            <Text className="text-orange-700 font-bold text-base">有 {incomingRequests.length} 条新的监督申请</Text>
            <Text className="text-orange-400 text-xs">点击查看并处理</Text>
          </View>
          <View className="w-2 h-2 bg-red-500 rounded-full" />
        </TouchableOpacity>
      )}

      {/* 核心设置组 */}
      <SettingsGroup>
        {appMode === 'USER' ? (
          <SettingsItem 
            label={t('settings.my_code')} 
            icon={<ShieldCheck size={22} color="#f59e0b" />} 
            rightText={supervisorCode} 
          />
        ) : (
          <SettingsItem 
            label="解除绑定管理" 
            icon={<UserCog size={22} color="#3b82f6" />} 
            rightText="管理列表" 
            onPress={() => { setIsSelectingForMedMgmt(false); setShowSeniorListModal(true); }} 
          />
        )}
        
        {appMode === 'SUPERVISOR' && (
          <SettingsItem 
            label={t('settings.add_patient')} 
            icon={<PlusCircle size={22} color="#3b82f6" />} 
            onPress={() => setShowAddSeniorModal(true)} 
          />
        )}
        
        {/* 【修复】新增语言设置入口 */}
        <SettingsItem 
          label={t('lang.title')} 
          icon={<Globe size={22} color="#64748b" />} 
          onPress={() => setActiveTab('LANGUAGE')} 
        />
        
        <SettingsItem 
          label={t('header.switch_identity')} 
          icon={<User size={22} color="#64748b" />} 
          rightText={appMode === 'USER' ? t('header.mode_patient') : t('header.mode_supervisor')} 
          onPress={() => setAppMode('LANDING')} 
          isLast={true} 
        />
      </SettingsGroup>

      {/* 药物管理入口 - 监督者 */}
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

      {/* 药物管理入口 - 患者 */}
      {appMode === 'USER' && (
         <>
          <Text className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider mt-4">{t('settings.section_general')}</Text>
          <SettingsGroup>
            <SettingsItem 
              label={t('settings.med_mgmt')} 
              icon={<Pill size={22} color="#10b981" />} 
              rightText={t('settings.med_action')} 
              onPress={() => setActiveTab('ADD_MED')} 
            />
          </SettingsGroup>
         </>
      )}

      {/* 退出登录 */}
      <View className="mt-8 px-4 pb-12">
        <TouchableOpacity onPress={handleLogout} className="flex-row items-center justify-center bg-red-50 py-4 rounded-2xl active:bg-red-100 border border-red-100">
          <LogOut size={20} color="#ef4444" className="mr-2" />
          <Text className="text-red-500 font-bold text-lg ml-2">退出登录</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};