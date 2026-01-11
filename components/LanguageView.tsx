import { Check, ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsGroup } from '@/components/SettingsShared';
import { Tab } from '@/types';
import { saveData } from '@/utils/storage';

interface LanguageViewProps {
  setActiveTab: (tab: Tab) => void;
}

export const LanguageView: React.FC<LanguageViewProps> = ({ setActiveTab }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await saveData('APP_LANGUAGE', lang);
    setActiveTab('SETTINGS'); // 切换语言后自动跳回设置页
  };

  return (
    <View className="flex-1 bg-bg-warm">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* 统一导航栏 - 固定高度56px，标题居中，与主页完全一致 */}
      <View className="bg-bg-warm border-b border-slate-100/50" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-4" style={{ height: 56 }}>
          {/* 左侧返回按钮 - zIndex确保可点击 */}
          <TouchableOpacity 
            onPress={() => setActiveTab('SETTINGS')} 
            className="items-center justify-center bg-white rounded-full border border-slate-100 shadow-sm"
            style={{ width: 44, height: 44, zIndex: 10 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#334155" />
          </TouchableOpacity>
          {/* 居中标题 - pointerEvents none 避免阻挡点击 */}
          <View className="absolute left-0 right-0" style={{ pointerEvents: 'none' }}>
            <Text className="text-xl font-bold text-slate-800 text-center" style={{ fontSize: 20 }}>
              {t('lang.title')}
            </Text>
          </View>
          {/* 右侧占位保持对称 */}
          <View style={{ width: 44 }} />
        </View>
      </View>
      <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>

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
    </View>
  );
};