import { MedConfig } from '@/types';
import { supabase } from './supabase';

const mapDbToApp = (item: any): MedConfig => ({
  id: item.id,
  name: item.name || '',
  iconType: item.icon_type,
  timeOfDay: item.time_of_day,
  colorClass: item.color_class || 'bg-blue-100',
  shadowClass: item.shadow_class || 'shadow-blue-200',
  frequencyType: item.frequency_type,
  days: item.days || [],
  startDate: item.start_date,
  interval: item.interval
});

export const medService = {
  // 1. 获取药物 (支持查别人的)
  fetchMedications: async (targetUserId?: string): Promise<MedConfig[]> => {
    // 如果传了 targetUserId 就用它，否则获取当前登录用户 ID
    let userId = targetUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId) // 查指定 ID 的药
      .order('created_at', { ascending: true });

    if (error) {
      console.error('获取药物失败:', error);
      return [];
    }
    return data.map(mapDbToApp);
  },

  // 2. 添加药物 (支持给别人加)
  addMedication: async (med: MedConfig, targetUserId?: string) => {
    let userId = targetUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');
      userId = user.id;
    }

    const dbPayload = {
      user_id: userId, // 存入指定 ID
      name: med.name,
      icon_type: med.iconType,
      time_of_day: med.timeOfDay,
      color_class: med.colorClass,
      shadow_class: med.shadowClass,
      frequency_type: med.frequencyType,
      days: med.days,
      start_date: med.startDate,
      interval: med.interval,
    };

    const { data, error } = await supabase
      .from('medications')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;
    return mapDbToApp(data);
  },

  // 3. 删除药物
  deleteMedication: async (medId: string) => {
    const { error } = await supabase.from('medications').delete().eq('id', medId);
    if (error) throw error;
  }
};