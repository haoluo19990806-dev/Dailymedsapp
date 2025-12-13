import { ClockIcon } from '@/components/Icons'; // 假设 Icons 里有 CalendarIcon，如果没有可以复用 ClockIcon 或用文字代替
import { HealthDataType, TimelineEvent } from '@/types';
import { getHealthTypeInfo } from '@/utils/uiHelpers';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
// 1. 引入第三方日期时间选择库
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
  // 核心状态
  const [selectedType, setSelectedType] = useState<HealthDataType>(HealthDataType.BLOOD_PRESSURE);
  const [value1, setValue1] = useState<string>("");
  const [value2, setValue2] = useState<string>(""); 
  const [note, setNote] = useState<string>("");
  
  // 2. 新增日期和时间相关的状态
  // 使用 Date 对象统一管理，比纯字符串更方便计算
  const [recordDate, setRecordDate] = useState<Date>(new Date());
  
  // 控制选择器的显示/隐藏
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);

  // 初始化：当弹窗打开时，根据传入的 currentDateKey 和当前时间设置初始值
  useEffect(() => {
    if (visible) {
      const now = new Date();
      // 解析 currentDateKey (例如 "2025-12-11")
      const [year, month, day] = currentDateKey.split('-').map(Number);
      
      // 创建一个新的日期对象，使用选中的日期 + 当前的时间
      const newDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes());
      setRecordDate(newDate);

      setValue1("");
      setValue2("");
      setNote("");
    }
  }, [visible, currentDateKey]);

  // 保存逻辑
  const handleSave = () => {
    if (!value1 && selectedType !== HealthDataType.OTHER) {
      Alert.alert("提示", "请输入数值");
      return;
    }
    if (selectedType === HealthDataType.OTHER && !value1 && !note) {
      Alert.alert("提示", "自定义记录请填写数值或备注");
      return;
    }

    const info = selectedType === HealthDataType.OTHER 
      ? { unit: '' } 
      : getHealthTypeInfo(selectedType);
    
    // 生成新的事件对象
    const newEvent: TimelineEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'HEALTH_RECORD',
      timestamp: recordDate.getTime(), // 直接使用 Date 对象的时间戳
      dateKey: formatDateKey(recordDate), // 更新为实际选择的日期Key
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

  // 辅助函数：将 Date 转为 YYYY-MM-DD 格式
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 辅助函数：格式化显示日期 (2025年12月11日)
  const getDisplayDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  // 辅助函数：格式化显示时间 (手动控制上午/下午)
  const getDisplayTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    // 手动判断上午/下午
    const period = hours < 12 ? '上午' : '下午';
    // 转换为12小时制显示 (0点显示为12, 13点显示为1)
    const displayHours = hours % 12 || 12;
    return `${period} ${displayHours}:${minutes}`;
  };

  // 日期选择器回调
  const handleConfirmDate = (date: Date) => {
    // 保持原来的时间，只改变日期
    const newDate = new Date(recordDate);
    newDate.setFullYear(date.getFullYear());
    newDate.setMonth(date.getMonth());
    newDate.setDate(date.getDate());
    
    setRecordDate(newDate);
    setDatePickerVisibility(false);
  };

  // 时间选择器回调
  const handleConfirmTime = (date: Date) => {
    // 保持原来的日期，只改变时间
    const newDate = new Date(recordDate);
    newDate.setHours(date.getHours());
    newDate.setMinutes(date.getMinutes());
    
    setRecordDate(newDate);
    setTimePickerVisibility(false);
  };

  const getTypeLabel = (type: HealthDataType) => {
    if (type === HealthDataType.OTHER) return "自定义";
    return getHealthTypeInfo(type).label;
  };

  const typeInfo = selectedType === HealthDataType.OTHER 
    ? { unit: '', color: 'bg-[#f97316]' } 
    : getHealthTypeInfo(selectedType);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        
        {/* 背景遮罩 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="absolute inset-0 bg-black/50" />
        </TouchableWithoutFeedback>

        {/* 弹窗卡片主体 */}
        <View className="bg-slate-100 w-full h-[85%] rounded-t-3xl flex-col overflow-hidden shadow-2xl">
          
          {/* 顶部导航栏 */}
          <View className="flex-row justify-between items-center px-4 py-4 bg-white border-b border-slate-200 z-10">
            {/* 增大 Cancel 按钮：px-4->px-5, py-2->py-2.5, text-sm->text-base */}
            <TouchableOpacity onPress={onClose} className="px-5 py-2.5 rounded-full bg-red-50">
              <Text className="text-red-500 font-bold text-base">取消</Text>
            </TouchableOpacity>
            
            <Text className="text-lg font-bold text-slate-800">新的记录</Text>
            
            {/* 增大 Save 按钮：px-4->px-5, py-2->py-2.5, text-sm->text-base */}
            <TouchableOpacity onPress={handleSave} className="px-5 py-2.5 rounded-full bg-[#f97316]">
              <Text className="text-white font-bold text-base">保存</Text>
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
              
              {/* 模块 1: 类型选择 */}
              <View className="bg-white rounded-2xl p-4 mb-4">
                <Text className="text-slate-400 font-bold mb-3 ml-1 text-xs uppercase">选择类型</Text>
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {[
                    HealthDataType.BLOOD_PRESSURE, 
                    HealthDataType.BLOOD_SUGAR, 
                    HealthDataType.TEMPERATURE, 
                    HealthDataType.WEIGHT, 
                    HealthDataType.HEART_RATE, 
                    HealthDataType.SPO2, 
                    HealthDataType.OTHER, 
                  ].map(type => {
                    const label = getTypeLabel(type);
                    const isSelected = selectedType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setSelectedType(type)}
                        className={`w-[48%] h-12 rounded-xl items-center justify-center border ${
                          isSelected 
                            ? 'bg-[#f97316] border-[#f97316]' 
                            : 'bg-slate-50 border-slate-100'
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

              {/* 模块 2: 数值输入 */}
              <View className="bg-white rounded-2xl p-4 mb-4">
                <Text className="text-slate-400 font-bold mb-3 ml-1 text-xs uppercase">
                  {selectedType === HealthDataType.OTHER ? '数值 (选填)' : `数值 (${typeInfo.unit})`}
                </Text>
                
                {selectedType === HealthDataType.BLOOD_PRESSURE ? (
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-slate-400 text-xs mb-2 ml-1 text-center">收缩压</Text>
                      <TextInput
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 font-bold text-2xl text-center"
                        placeholder="120"
                        keyboardType="numeric"
                        value={value1}
                        onChangeText={setValue1}
                      />
                    </View>
                    <View className="items-center justify-end pb-4">
                      <Text className="text-slate-300 font-bold text-xl">/</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-400 text-xs mb-2 ml-1 text-center">舒张压</Text>
                      <TextInput
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-slate-800 font-bold text-2xl text-center"
                        placeholder="80"
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
                      placeholder={selectedType === HealthDataType.OTHER ? "-" : "0"}
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

              {/* 模块 3: 时间选择 (仿视频样式 - 已修改配色) */}
              <View className="bg-white rounded-2xl px-4 py-2 mb-4">
                 
                 {/* 3.1 日期行 */}
                 <View className="flex-row items-center justify-between py-3 border-b border-slate-100">
                    <View className="flex-row items-center gap-2">
                       <View className="bg-blue-100 p-1.5 rounded-lg">
                         {/* 复用 ClockIcon，如果有 CalendarIcon 更好 */}
                          <ClockIcon size={18} color="#3b82f6" />
                       </View>
                       <Text className="text-slate-700 font-bold text-base">日期</Text>
                    </View>
                    
                    {/* 点击触发日期选择器 - 修改为浅灰底黑灰字 */}
                    <TouchableOpacity 
                      onPress={() => setDatePickerVisibility(true)}
                      className="bg-slate-100 px-4 py-2 rounded-xl"
                    >
                      <Text className="text-slate-800 font-bold text-base">
                        {getDisplayDate(recordDate)}
                      </Text>
                    </TouchableOpacity>
                 </View>

                 {/* 3.2 时间行 */}
                 <View className="flex-row items-center justify-between py-3">
                    <View className="flex-row items-center gap-2">
                       {/* 统一图标颜色为蓝色 */}
                       <View className="bg-blue-100 p-1.5 rounded-lg">
                          <ClockIcon size={18} color="#3b82f6" />
                       </View>
                       <Text className="text-slate-700 font-bold text-base">时间</Text>
                    </View>
                    
                    {/* 点击触发时间选择器 - 修改为浅灰底黑灰字 */}
                    <TouchableOpacity 
                      onPress={() => setTimePickerVisibility(true)}
                      className="bg-slate-100 px-4 py-2 rounded-xl"
                    >
                      <Text className="text-slate-800 font-bold text-base">
                        {getDisplayTime(recordDate)}
                      </Text>
                    </TouchableOpacity>
                 </View>
              </View>

              {/* 模块 4: 备注 */}
              <View className="bg-white rounded-2xl p-4 mb-8">
                 <Text className="text-slate-400 font-bold mb-2 ml-1 text-xs uppercase">
                  {selectedType === HealthDataType.OTHER ? '内容/备注' : '备注 (选填)'}
                 </Text>
                 <TextInput
                    className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-base"
                    placeholder="添加备注..."
                    placeholderTextColor="#cbd5e1"
                    value={note}
                    onChangeText={setNote}
                    style={{ minHeight: 80 }} 
                    multiline
                    textAlignVertical="top" 
                  />
              </View>

              {/* 隐藏的组件：日期选择器 */}
              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={recordDate}
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisibility(false)}
                confirmTextIOS="确定"
                cancelTextIOS="取消"
                display="inline" 
                // 添加中文本地化 (如果编辑器报错，请忽略，这对运行时是有效的)
                locale="zh-CN"
              />

              {/* 隐藏的组件：时间选择器 */}
              <DateTimePickerModal
                isVisible={isTimePickerVisible}
                mode="time"
                date={recordDate}
                onConfirm={handleConfirmTime}
                onCancel={() => setTimePickerVisibility(false)}
                confirmTextIOS="确定"
                cancelTextIOS="取消"
                display="spinner"
                // 添加中文本地化 (让选择器内的 AM/PM 尽量变成中文，具体取决于系统版本)
                locale="zh-CN"
              />
              
          </KeyboardAwareScrollView>

        </View>
      </View>
    </Modal>
  );
};