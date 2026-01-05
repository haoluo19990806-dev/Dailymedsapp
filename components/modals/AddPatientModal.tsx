import { linkService } from '@/lib/linkService';
import { Senior } from '@/types';
import { saveData } from '@/utils/storage';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddPatientModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (updatedList: Senior[]) => void; // 添加成功后通知父组件刷新
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({ visible, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = async () => {
    if (!code.trim()) {
      Alert.alert(t('alert.tip'), t('alert.enter_code'));
      return;
    }
    setIsLoading(true);
    try {
      const result = await linkService.sendRequest(code, note);
      if (result.status === 'approved') {
        Alert.alert("成功", "已绑定您自己的账户！");
        // 重新拉取列表
        const updatedList = await linkService.fetchLinkedSeniors();
        await saveData('SENIOR_LIST', updatedList);
        onSuccess(updatedList); // 告诉父组件更新数据
      } else {
        Alert.alert("申请已发送", "请通知该用户在 App 设置页中点击【新请求】进行同意。");
      }
      // 清空并关闭
      setCode('');
      setNote('');
      onClose();
    } catch (e: any) {
      Alert.alert("操作失败", e.message || "请检查网络");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white w-full max-w-xs rounded-3xl p-6">
          <Text className="text-xl font-bold text-slate-700 mb-4 text-center">{t('modal.add_patient_title')}</Text>
          
          <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">{t('modal.code_label')}</Text>
          <TextInput 
            className="w-full bg-slate-50 p-3 rounded-xl text-slate-700 text-lg border border-slate-100 mb-4 font-mono" 
            placeholder={t('modal.code_placeholder')} 
            placeholderTextColor="#cbd5e1" 
            keyboardType="number-pad" 
            value={code} 
            onChangeText={setCode} 
            maxLength={6} 
          />
          
          <Text className="text-sm font-bold text-slate-400 mb-2 ml-1">{t('modal.note_label')}</Text>
          <TextInput 
            className="w-full bg-slate-50 p-3 rounded-xl text-slate-700 text-lg border border-slate-100 mb-6" 
            placeholder={t('modal.note_placeholder')} 
            placeholderTextColor="#cbd5e1" 
            value={note} 
            onChangeText={setNote} 
          />
          
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 bg-slate-100 rounded-xl items-center">
              <Text className="text-slate-500 font-bold">{t('modal.btn_cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleAdd} disabled={isLoading} className={`flex-1 py-3 rounded-xl items-center ${isLoading ? 'bg-blue-300' : 'bg-blue-500'}`}>
              {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">{t('modal.btn_confirm')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};