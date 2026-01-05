import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export const SettingsItem = ({ label, icon, rightText, onPress, isLast = false, color = "#334155" }: any) => (
  <TouchableOpacity 
    onPress={onPress} 
    activeOpacity={0.7} 
    className={`flex-row items-center justify-between py-4 px-4 bg-white ${!isLast ? 'border-b border-slate-50' : ''}`}
  >
    <View className="flex-row items-center">
      <View className="w-8 items-center justify-center mr-3">{icon}</View>
      <Text className="text-base font-medium" style={{ color: color }}>{label}</Text>
    </View>
    <View className="flex-row items-center gap-1">
      {rightText && <Text className="text-slate-400 text-sm mr-1">{rightText}</Text>}
      {onPress && <ChevronRight size={20} color="#cbd5e1" />}
    </View>
  </TouchableOpacity>
);

export const SettingsGroup = ({ children }: { children: React.ReactNode }) => (
  <View className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm border border-slate-100">{children}</View>
);