import { TrashIcon } from '@/components/Icons';
import { linkService } from '@/lib/linkService';
import { Senior } from '@/types';
import { saveData } from '@/utils/storage';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

// --- 1. 请求处理弹窗 ---
interface RequestModalProps {
  visible: boolean;
  requests: any[];
  onClose: () => void;
  onRequestHandled: (id: string) => void; // 处理完回调
}

export const RequestModal: React.FC<RequestModalProps> = ({ visible, requests, onClose, onRequestHandled }) => {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white w-full rounded-t-3xl p-6 h-1/2">
          <Text className="text-xl font-bold text-slate-700 mb-6 text-center">新的监督申请</Text>
          <ScrollView className="flex-1">
            {requests.map(req => (
                <View key={req.id} className="flex-row items-center justify-between mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <View>
                    <Text className="font-bold text-slate-700 text-lg">新的监护人请求</Text>
                    <Text className="text-slate-400 text-xs mt-1">申请时间: {new Date(req.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View className="flex-row gap-2">
                      <TouchableOpacity onPress={async () => { await linkService.respondToRequest(req.id, false); onRequestHandled(req.id); }} className="px-4 py-2 bg-slate-200 rounded-lg">
                        <Text className="text-slate-500 font-bold">拒绝</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={async () => { await linkService.respondToRequest(req.id, true); Alert.alert("已授权", "该监督者现在可以管理您的药物了"); onRequestHandled(req.id); }} className="px-4 py-2 bg-blue-500 rounded-lg">
                        <Text className="text-white font-bold">同意</Text>
                      </TouchableOpacity>
                  </View>
                </View>
            ))}
            {requests.length === 0 && <Text className="text-center text-slate-400 mt-10">暂无待处理请求</Text>}
          </ScrollView>
          <TouchableOpacity onPress={onClose} className="mt-4 py-4 bg-slate-100 rounded-2xl items-center"><Text className="text-slate-500 font-bold">关闭</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- 2. 患者列表弹窗 ---
interface PatientListModalProps {
  visible: boolean;
  seniorList: Senior[];
  currentSeniorId: string | null;
  isSelectionMode: boolean; // 是为了管理药物选择，还是单纯查看列表
  onClose: () => void;
  onSelect: (id: string) => void;
  onListUpdate: (newList: Senior[]) => void; // 列表更新回调（删除后）
}

export const PatientListModal: React.FC<PatientListModalProps> = ({ 
  visible, seniorList, currentSeniorId, isSelectionMode, onClose, onSelect, onListUpdate 
}) => {
  const { t } = useTranslation();

  const handleDelete = async (id: string) => {
    Alert.alert(t('alert.confirm_remove'), t('alert.confirm_remove_patient'), [
      { text: t('alert.cancel'), style: "cancel" },
      { text: t('alert.remove'), style: "destructive", onPress: async () => {
          try {
            await linkService.unbindSenior(id);
            const newList = seniorList.filter(s => s.id !== id);
            await saveData('SENIOR_LIST', newList);
            onListUpdate(newList); // 通知父组件列表变了
            Alert.alert("已解除", "绑定关系已彻底删除");
          } catch (e) {
             Alert.alert("删除失败", "请检查网络连接");
          }
      }}
    ]);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white w-full rounded-t-3xl p-6 h-1/2">
          <Text className="text-xl font-bold text-slate-700 mb-6 text-center">
            {isSelectionMode ? "选择患者以管理药物" : t('modal.patient_list_title')}
          </Text>
          <ScrollView className="flex-1">
            {seniorList.length === 0 ? <Text className="text-center text-slate-400 mt-10">{t('modal.list_empty')}</Text> : seniorList.map(senior => (
                <View key={senior.id} className="flex-row items-center mb-3 gap-2">
                  <TouchableOpacity 
                    onPress={() => onSelect(senior.id)} 
                    className={`flex-1 p-4 rounded-2xl border-2 ${currentSeniorId === senior.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}
                  >
                    <View className="flex-row justify-between items-center">
                      <Text className="text-lg font-bold text-slate-700">{senior.note}</Text>
                      <Text className="text-slate-400 font-mono">ID: {senior.id.substring(0,4)}...</Text>
                    </View>
                  </TouchableOpacity>
                  {!isSelectionMode && (
                      <TouchableOpacity onPress={() => handleDelete(senior.id)} className="p-4 bg-red-50 rounded-2xl justify-center items-center">
                        <TrashIcon size={24} color="#f87171" />
                      </TouchableOpacity>
                  )}
                </View>
              ))}
          </ScrollView>
          <TouchableOpacity onPress={onClose} className="mt-4 py-4 bg-slate-100 rounded-2xl items-center"><Text className="text-slate-500 font-bold">{t('modal.close')}</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};