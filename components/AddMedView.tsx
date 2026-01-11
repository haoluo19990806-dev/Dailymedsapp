import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// 引入依赖组件和工具
import { ConfigBuilder } from '@/components/ConfigBuilder';
import { TrashIcon } from '@/components/Icons';
import { AppMode, MedConfig, Senior, Tab } from '@/types';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';

interface AddMedViewProps {
  appMode: AppMode;
  seniorList: Senior[];
  currentSeniorId: string | null;
  config: MedConfig[];
  setActiveTab: (tab: Tab) => void;
  onSaveMed: (newMed: MedConfig) => Promise<void>;
  onRemoveMed: (id: string) => Promise<void>;
  onBack?: () => void; // 自定义返回处理
}

export const AddMedView: React.FC<AddMedViewProps> = ({
  appMode,
  seniorList,
  currentSeniorId,
  config,
  setActiveTab,
  onSaveMed,
  onRemoveMed,
  onBack
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // 计算当前显示的标题
  const targetName = seniorList.find(s => s.id === currentSeniorId)?.note || '';
  const title = appMode === 'SUPERVISOR' 
    ? t('med_mgmt.managing', { name: targetName })
    : t('med_mgmt.title');

  return (
    <View className="flex-1 bg-bg-warm">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {/* 统一导航栏 - 固定高度56px，标题居中，与主页完全一致 */}
      <View className="bg-bg-warm border-b border-slate-100/50" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-4" style={{ height: 56 }}>
          {/* 左侧返回按钮 - zIndex确保可点击 */}
          <TouchableOpacity 
            onPress={() => onBack ? onBack() : setActiveTab('SETTINGS')} 
            className="items-center justify-center bg-white rounded-full border border-slate-100 shadow-sm"
            style={{ width: 44, height: 44, zIndex: 10 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#334155" />
          </TouchableOpacity>
          {/* 居中标题 - pointerEvents none 避免阻挡点击 */}
          <View className="absolute left-0 right-0" style={{ pointerEvents: 'none' }}>
            <Text className="text-xl font-bold text-slate-800 text-center" style={{ fontSize: 20 }}>
              {title}
            </Text>
          </View>
          {/* 右侧占位保持对称 */}
          <View style={{ width: 44 }} />
        </View>
      </View>
      <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>

      {/* 内容滚动区 */}
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 药物配置器组件 */}
        <ConfigBuilder 
          isSupervisor={appMode === 'SUPERVISOR'} 
          targetName={targetName} 
          onSave={onSaveMed} 
        />

        {/* 已添加药物列表标题 */}
        <View className="mt-8 mb-4 flex-row items-center justify-between px-2">
          <Text className="text-lg font-bold text-slate-700">{t('med_mgmt.section_added')}</Text>
          <Text className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{config.length}</Text>
        </View>

        {/* 药物卡片列表 */}
        <View className="gap-3">
          {config.map(med => {
            const styles = getMedStyles(med.iconType);
            
            return (
              <View key={med.id} className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <View className="flex-row items-center gap-4 flex-1">
                  {/* 图标 */}
                  <View className={`w-12 h-12 rounded-xl ${styles.bg} items-center justify-center`}>
                    {renderMedIcon(med.iconType, 36, "white")}
                  </View>
                  {/* 信息 */}
                  <View className="flex-1 justify-center">
                    <View className="flex-row gap-2">
                      {renderTimeIcon(med.timeOfDay)}
                    </View>
                  </View>
                </View>

                {/* 删除按钮 */}
                <TouchableOpacity 
                  onPress={() => onRemoveMed(med.id)} 
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
  );
};