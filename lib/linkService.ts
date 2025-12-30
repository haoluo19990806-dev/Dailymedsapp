import { Senior } from '@/types';
import { supabase } from './supabase';

export interface LinkRequest {
  id: string;
  supervisor_id: string;
  patient_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  supervisor_email?: string; 
}

export const linkService = {
  /**
   * 1. 发起绑定请求 (智能版：支持更新备注，防止重复报错)
   */
  sendRequest: async (inviteCode: string, note?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未登录');

    // A. 找到目标患者
    const { data: patient, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (findError || !patient) throw new Error('未找到该监督码');

    // B. 绑定自己 (使用 upsert 防止冲突)
    if (patient.id === user.id) {
      const { data, error } = await supabase
        .from('supervisor_links')
        .upsert(
          [{ 
            supervisor_id: user.id, 
            patient_id: patient.id, 
            status: 'approved',
            supervisor_note: note 
          }],
          { onConflict: 'supervisor_id, patient_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return { status: 'approved', seniorId: patient.id };
    }

    // C. 绑定他人
    // 先检查是否已经存在记录
    const { data: existing } = await supabase
      .from('supervisor_links')
      .select('*')
      .eq('supervisor_id', user.id)
      .eq('patient_id', patient.id)
      .single();

    if (existing) {
      // 如果关系已存在，直接更新备注，而不是报错
      const { error: updateError } = await supabase
        .from('supervisor_links')
        .update({ supervisor_note: note })
        .eq('id', existing.id);

      if (updateError) throw updateError;
      
      return { status: existing.status, seniorId: patient.id, isUpdate: true };
    }

    // 如果不存在，才插入新请求
    const { error: insertError } = await supabase
      .from('supervisor_links')
      .insert([{ 
        supervisor_id: user.id, 
        patient_id: patient.id, 
        status: 'pending',
        supervisor_note: note 
      }]);

    if (insertError) throw insertError;
    return { status: 'pending', seniorId: patient.id };
  },

  /**
   * 2. 获取所有已绑定的长辈列表 (优先显示备注名)
   */
  fetchLinkedSeniors: async (): Promise<Senior[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('supervisor_links')
      .select(`
        patient_id,
        status,
        supervisor_note, 
        profiles:patient_id ( invite_code, display_name )
      `)
      .eq('supervisor_id', user.id)
      .eq('status', 'approved');

    if (error) {
      console.error('获取长辈列表失败', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.patient_id,
      // 优先显示备注 -> 其次显示昵称 -> 最后显示邀请码
      note: item.supervisor_note || item.profiles?.display_name || `用户 ${item.profiles?.invite_code || ''}`,
      config: [],
      history: {}
    }));
  },

  /**
   * 3. 患者查看收到的请求
   */
  fetchIncomingRequests: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('supervisor_links')
      .select('*')
      .eq('patient_id', user.id)
      .eq('status', 'pending');

    if (error) return [];
    return data;
  },

  /**
   * 4. 患者处理请求
   */
  respondToRequest: async (linkId: string, accept: boolean) => {
    const { error } = await supabase
      .from('supervisor_links')
      .update({ status: accept ? 'approved' : 'rejected' })
      .eq('id', linkId);
    
    if (error) throw error;
    if (!accept) {
        await supabase.from('supervisor_links').delete().eq('id', linkId);
    }
  },

  /**
   * 5. 解除绑定 (彻底物理删除，防止重新绑定报错)
   */
  unbindSenior: async (patientId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未登录');

    const { error } = await supabase
      .from('supervisor_links')
      .delete()
      .eq('supervisor_id', user.id)
      .eq('patient_id', patientId);

    if (error) throw error;
  }
};