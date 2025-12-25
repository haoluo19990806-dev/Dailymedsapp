import { ClockIcon } from '@/components/Icons';
import { HealthDataType, TimelineEvent } from '@/types';
import { getHealthTypeInfo } from '@/utils/uiHelpers';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface HealthRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (event: TimelineEvent) => void;
  currentDateKey: string;
}

export const HealthRecordModal: React.FC<HealthRecordModalProps> = ({ 
  visible, 
  onClose, 
  onSave, 
  currentDateKey 
}) => {
  const { t, i18n } = useTranslation();
  const [selectedType, setSelectedType] = useState<HealthDataType>(HealthDataType.BLOOD_PRESSURE);
  const [value1, setValue1] = useState<string>("");
  const [value2, setValue2] = useState<string>(""); 
  const [note, setNote] = useState<string>("");
  const [recordDate, setRecordDate] = useState<Date>(new Date());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

  useEffect(() => {
    if (visible) {
      const now = new Date();
      const [year, month, day] = currentDateKey.split('-').map(Number);
      const newDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes());
      setRecordDate(newDate);
      setValue1("");
      setValue2("");
      setNote("");
    }
  }, [visible, currentDateKey]);

  const handleSave = () => {
    if (!value1 && selectedType !== HealthDataType.OTHER) {
      Alert.alert(t('alert.tip'), t('alert.input_value'));
      return;
    }
    if (selectedType === HealthDataType.OTHER && !value1 && !note) {
      Alert.alert(t('alert.tip'), t('alert.input_custom'));
      return;
    }

    const info = selectedType === HealthDataType.OTHER 
      ? { unit: '' } 
      : getHealthTypeInfo(selectedType);
    
    const newEvent: TimelineEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'HEALTH_RECORD',
      timestamp: recordDate.getTime(), 
      dateKey: formatDateKey(recordDate), 
      healthType: selectedType,
      healthValue: {
        value1: parseFloat(value1) || 0,
        value2: selectedType === HealthDataType.BLOOD_PRESSURE ? parseFloat(value2) : undefined,
        unit: info.unit
      },
      note: note.trim() || undefined
    };

    onSave(newEvent);
    onClose();
  };

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDisplayDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'zh-CN');
  };

  const getDisplayTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours < 12 ? t('record.am') : t('record.pm');
    const displayHours = hours % 12 || 12;
    return `${period} ${displayHours}:${minutes}`;
  };

  const handleConfirmDate = (date: Date) => {
    const newDate = new Date(recordDate);
    newDate.setFullYear(date.getFullYear());
    newDate.setMonth(date.getMonth());
    newDate.setDate(date.getDate());
    setRecordDate(newDate);
    setDatePickerVisibility(false);
  };

  const handleConfirmTime = (date: Date) => {
    const newDate = new Date(recordDate);
    newDate.setHours(date.getHours());
    newDate.setMinutes(date.getMinutes());
    setRecordDate(newDate);
    setTimePickerVisibility(false);
  };

  const getTypeLabel = (type: HealthDataType) => {
    if (type === HealthDataType.OTHER) return t('record.custom');
    switch (type) {
      case HealthDataType.BLOOD_PRESSURE: return t('trends.types.bp');
      case HealthDataType.BLOOD_SUGAR: return t('trends.types.sugar');
      case HealthDataType.TEMPERATURE: return t('trends.types.temp');
      case HealthDataType.WEIGHT: return t('trends.types.weight');
      case HealthDataType.HEART_RATE: return t('trends.types.heart');
      case HealthDataType.SPO2: return t('trends.types.spo2');
      default: return "";
    }
  };

  const typeInfo = selectedType === HealthDataType.OTHER 
    ? { unit: '', color: 'bg-[#f97316]' } 
    : getHealthTypeInfo(selectedType);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="absolute inset-0 bg-black/50" />
        </TouchableWithoutFeedback>

        <View className="bg-slate-100 w-full h-[85%] rounded-t-3xl flex-col overflow-hidden shadow-2xl">
          <View className="flex-row justify-between items-center px-4 py-4 bg-white border-b border-slate-200 z-10">
            <TouchableOpacity onPress={onClose} className="px-5 py-2.5 rounded-full bg-red-50">
              <Text className="text-red-500 font-bold text-base">{t('record.cancel')}</Text>
            </TouchableOpacity>
            
            <Text className="text-lg font-bold text-slate-800">{t('record.title')}</Text>
            
            <TouchableOpacity onPress={handleSave} className="px-5 py-2.5 rounded-full bg-[#f97316]">
              <Text className="text-white font-bold text-base">{t('record.save')}</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            className="flex-1 px-4 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            extraScrollHeight={100} 
            enableOnAndroid={true}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
              <View className="bg-white rounded-2xl p-4 mb-4">
                <Text className="text-slate-400 font-bold mb-3 ml-1 text-xs uppercase">{t('record.select_type')}</Text>
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {[
                    HealthDataType.BLOOD_PRESSURE, HealthDataType.BLOOD_SUGAR, HealthDataType.TEMPERATURE, 
                    HealthDataType.WEIGHT, HealthDataType.HEART_RATE, HealthDataType.SPO2, HealthDataType.OTHER, 
                  ].map(type => {
                    const label = getTypeLabel(type);
                    const isSelected = selectedType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setSelectedType(type)}
                        className={`w-[48%] h-12 rounded-xl items-center justify-center border ${
                          isSelected ? 'bg-[#f97316] border-[#f97316]' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <Text className={`font-bold text-base ${isSelected ? "text-white" : "text-slate-500"}`}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <View className="w-[48%]" /> 
                </View>
              </View>

              <View className="bg-white rounded-2xl p-4 mb-4">
                <Text className="text-slate-400 font-bold mb-3 ml-1 text-xs uppercase">
                  {selectedType === HealthDataType.OTHER ? t('record.value_optional') : `${t('record.value_label')} (${typeInfo.unit})`}
                </Text>
                
                {selectedType === HealthDataType.BLOOD_PRESSURE ? (
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-slate-400 text-xs mb-2 ml-1 text-center">{t('record.systolic')}</Text>
                      <TextInput
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 font-bold text-2xl text-center"
                        placeholder="-"  // 🔥 [修改] 统一为 "-"
                        placeholderTextColor="#94a3b8" 
                        keyboardType="numeric"
                        value={value1}
                        onChangeText={setValue1}
                      />
                    </View>
                    <View className="items-center justify-end pb-4">
                      <Text className="text-slate-300 font-bold text-xl">/</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-400 text-xs mb-2 ml-1 text-center">{t('record.diastolic')}</Text>
                      <TextInput
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 font-bold text-2xl text-center"
                        placeholder="-"  // 🔥 [修改] 统一为 "-"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={value2}
                        onChangeText={setValue2}
                      />
                    </View>
                  </View>
                ) : (
                  <View className="w-full relative">
                    <TextInput
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 font-bold text-3xl text-center"
                      placeholder="-"  // 🔥 [修改] 统一为 "-"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={value1}
                      onChangeText={setValue1}
                    />
                    {selectedType !== HealthDataType.OTHER && (
                      <Text className="absolute right-4 top-5 text-slate-400 font-bold text-sm">{typeInfo.unit}</Text>
                    )}
                  </View>
                )}
              </View>

              <View className="bg-white rounded-2xl px-4 py-2 mb-4">
                 <View className="flex-row items-center justify-between py-3 border-b border-slate-100">
                    <View className="flex-row items-center gap-2">
                       <View className="bg-blue-100 p-1.5 rounded-lg">
                          <ClockIcon size={18} color="#3b82f6" />
                       </View>
                       <Text className="text-slate-700 font-bold text-base">{t('record.date')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setDatePickerVisibility(true)} className="bg-slate-100 px-4 py-2 rounded-xl">
                      <Text className="text-slate-800 font-bold text-base">{getDisplayDate(recordDate)}</Text>
                    </TouchableOpacity>
                 </View>

                 <View className="flex-row items-center justify-between py-3">
                    <View className="flex-row items-center gap-2">
                       <View className="bg-blue-100 p-1.5 rounded-lg">
                          <ClockIcon size={18} color="#3b82f6" />
                       </View>
                       <Text className="text-slate-700 font-bold text-base">{t('record.time')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setTimePickerVisibility(true)} className="bg-slate-100 px-4 py-2 rounded-xl">
                      <Text className="text-slate-800 font-bold text-base">{getDisplayTime(recordDate)}</Text>
                    </TouchableOpacity>
                 </View>
              </View>

              <View className="bg-white rounded-2xl p-4 mb-8">
                 <Text className="text-slate-400 font-bold mb-2 ml-1 text-xs uppercase">
                  {selectedType === HealthDataType.OTHER ? t('record.content_label') : t('record.note_label')}
                 </Text>
                 <TextInput
                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-base"
                    placeholder={t('record.note_placeholder')}
                    placeholderTextColor="#cbd5e1"
                    value={note}
                    onChangeText={setNote}
                    style={{ minHeight: 80 }} 
                    multiline
                    textAlignVertical="top" 
                  />
              </View>

              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={recordDate}
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisibility(false)}
                confirmTextIOS={t('record.confirm')}
                cancelTextIOS={t('record.cancel')}
                display="inline" 
                locale={i18n.language === 'zh' ? 'zh-CN' : 'en-US'}
              />

              <DateTimePickerModal
                isVisible={isTimePickerVisible}
                mode="time"
                date={recordDate}
                onConfirm={handleConfirmTime}
                onCancel={() => setTimePickerVisibility(false)}
                confirmTextIOS={t('record.confirm')}
                cancelTextIOS={t('record.cancel')}
                display="spinner"
                locale={i18n.language === 'zh' ? 'zh-CN' : 'en-US'}
              />
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
};