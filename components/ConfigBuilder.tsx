import { FrequencyType, MedConfig, MedIconType, TimeOfDay } from '@/types';
import { getMedStyles, renderMedIcon, renderTimeIcon } from '@/utils/uiHelpers';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ConfigBuilderProps {
  isSupervisor: boolean;
  targetName: string; // 显示正在编辑的对象，如 "未选择患者" 或 "外婆"
  onSave: (med: MedConfig) => void;
}

export const ConfigBuilder: React.FC<ConfigBuilderProps> = ({ isSupervisor, targetName, onSave }) => {
  const [selectedIcon, setSelectedIcon] = useState<MedIconType>(MedIconType.CANDY);
  const [selectedTime, setSelectedTime] = useState<TimeOfDay>(TimeOfDay.MORNING);
  const [medName, setMedName] = useState<string>("");

  const handleSave = () => {
    const styles = getMedStyles(selectedIcon);
    const newMed: MedConfig = {
      id: Date.now().toString(),
      iconType: selectedIcon,
      timeOfDay: selectedTime,
      colorClass: styles.bg,
      shadowClass: '',
      frequencyType: FrequencyType.WEEKLY, // 默认为每周
      days: [1,2,3,4,5,6,7], // 默认为每天
      startDate: new Date().toISOString().split('T')[0],
      name: medName.trim() || undefined
    };
    
    onSave(newMed);
    
    // 保存后重置表单
    setMedName("");
    setSelectedIcon(MedIconType.CANDY);
    setSelectedTime(TimeOfDay.MORNING);
  };

  return (
    <View className={`bg-white rounded-3xl p-4 mb-4 ${isSupervisor ? 'border-4 border-blue-100' : 'border-2 border-orange-100'}`}>
      <Text className="text-center font-bold text-slate-400 mb-2 uppercase text-xs">
        {isSupervisor ? `正在修改: ${targetName}` : '添加新药物'}
      </Text>

      {/* 图标选择器 */}
      <View className="mb-4 border-b border-slate-100 pb-4">
        <Text className="text-slate-400 font-bold mb-2 ml-1 text-xs">选择图标</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
          <View className="flex-row gap-3">
            {[
              MedIconType.CANDY, MedIconType.DROP, MedIconType.NEEDLE,
              MedIconType.CAPSULE, MedIconType.PILL, MedIconType.PATCH
            ].map(type => (
              <TouchableOpacity 
                key={type}
                onPress={() => setSelectedIcon(type)}
                className={`p-1 rounded-2xl items-center justify-center border-2 ${
                  selectedIcon === type 
                    ? 'bg-orange-400 border-orange-600' 
                    : 'bg-slate-200 border-transparent'
                }`}
                style={{ width: 70, height: 70 }}
              >
                {renderMedIcon(type, 50, selectedIcon === type ? "white" : "#333333")}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 时间选择器 */}
      <View className="mb-4 border-b border-slate-100 pb-4">
          <Text className="text-slate-400 font-bold mb-2 ml-1 text-xs">选择时间</Text>
          <View className="flex-row justify-around">
            {[TimeOfDay.MORNING, TimeOfDay.NOON, TimeOfDay.EVENING].map(time => (
              <TouchableOpacity
              key={time}
              onPress={() => setSelectedTime(time)}
              className={`rounded-2xl border-2 items-center justify-center ${
                selectedTime === time 
                  ? 'bg-blue-400 border-blue-600' 
                  : 'bg-slate-200 border-transparent'
              }`}
              style={{ width: 60, height: 60 }}
              >
                 {renderTimeIcon(time, 30, selectedTime === time ? "white" : "#475569")}
              </TouchableOpacity>
            ))}
          </View>
      </View>

      {/* 名称输入框 */}
      <View className="mb-4">
        <Text className="text-slate-400 font-bold mb-1 ml-1 text-sm">药物名称 (选填)</Text>
        <TextInput
          className="w-full bg-slate-50 p-3 rounded-2xl text-slate-700 font-bold text-lg border border-slate-100"
          placeholder="例如: 降压药 (不填显示图标)"
          placeholderTextColor="#cbd5e1"
          value={medName}
          onChangeText={setMedName}
        />
      </View>

      <TouchableOpacity 
        onPress={handleSave}
        className="w-full py-3 bg-success-dark rounded-3xl items-center shadow-sm"
      >
        <Text className="text-white text-xl font-bold">保存设置</Text>
      </TouchableOpacity>
    </View>
  );
};