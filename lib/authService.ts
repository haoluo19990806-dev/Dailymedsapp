import { supabase } from './supabase';

/**
 * 邮箱登录服务
 */
export const authService = {
  // 1. 注册新用户
  signUp: async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: pass,
    });
    
    if (error) return { success: false, error };

    // 注册成功后初始化 Profile
    if (data.user) {
      await authService.initializeProfile(data.user.id, email);
    }
    return { success: true, user: data.user };
  },

  // 2. 登录已存在用户
  signIn: async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: pass,
    });
    return { success: !error, error, user: data?.user };
  },

  // 3. 初始化用户信息 (生成监督码)
  initializeProfile: async (userId: string, email: string) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existing) {
      // 生成 6 位随机监督码
      const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { error } = await supabase.from('profiles').insert({
        id: userId,
        phone_number: email, // 暂时存邮箱
        invite_code: inviteCode,
        user_mode: 'PATIENT',
        display_name: `用户_${email.split('@')[0]}`
      });
      
      if (error) console.error('初始化档案失败:', error);
    }
  }
};