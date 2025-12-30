import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// 您的 MemFire Cloud 配置信息
const SUPABASE_URL = 'https://d56cv4gg91htqli404e0.baseapi.memfiredb.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0MzQ0MTU1NCwiaWF0IjoxNzY2NjQxNTU0LCJpc3MiOiJzdXBhYmFzZSJ9.K9WpksqYARIzr7oamrC8lgOnfoH_6-K66LIHOHenK7Y';

// 初始化 Supabase 客户端
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // 使用 AsyncStorage 来持久化存储用户的登录状态
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});