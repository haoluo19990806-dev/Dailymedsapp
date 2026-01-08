import { Check, ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsGroup } from '@/components/SettingsShared';
import { Tab } from '@/types';
import { saveData } from '@/utils/storage';

interface LanguageViewProps {
  setActiveTab: (tab: Tab) => void;
}

export const LanguageView: React.FC<LanguageViewProps> = ({ setActiveTab }) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await saveData('APP_LANGUAGE', lang);
    setActiveTab('SETTINGS'); // 切换语言后自动跳回设置页
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-warm" edges={['bottom']}>
      {/* 顶部导航栏 */}
      <View className="flex-row items-center px-4 py-3 bg-bg-warm border-b border-slate-100/50">
        <TouchableOpacity 
          onPress={() => setActiveTab('SETTINGS')} 
          className="p-2 mr-2 bg-white rounded-full border border-slate-100 shadow-sm"
        >
          <ChevronLeft size={24} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-700">{t('lang.title')}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <SettingsGroup>
          <TouchableOpacity 
            onPress={() => changeLanguage('zh')} 
            className="flex-row items-center justify-between py-4 px-4 bg-white border-b border-slate-50"
          >
            <Text className="text-base font-medium text-slate-700">{t('lang.zh')}</Text>
            {i18n.language === 'zh' && <Check size={20} color="#10b981" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => changeLanguage('en')} 
            className="flex-row items-center justify-between py-4 px-4 bg-white"
          >
            <Text className="text-base font-medium text-slate-700">{t('lang.en')}</Text>
            {i18n.language === 'en' && <Check size={20} color="#10b981" />}
          </TouchableOpacity>
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
};