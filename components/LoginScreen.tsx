import { ChevronDown, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../lib/authService';

// 云函数 API 地址
const API_ENDPOINTS = {
  SEND_EMAIL_OTP: 'https://functions2.memfiredb.com/d56cv4gg91htqli404e0/sendemailotp',
  VERIFY_AND_SIGNUP: 'https://functions2.memfiredb.com/d56cv4gg91htqli404e0/verifyandsignup',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 水彩风格配色 - 极淡、柔和、空灵
const COLORS = {
  bgWarm: '#FFF9F3',              // 温暖米色背景
  white: '#FFFFFF',
  brandGreen: '#10b981',
  brandGreenLight: '#d1fae5',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  placeholder: '#cbd5e1',
  border: '#f1f5f9',
  iconMuted: '#94a3b8',
  // 水彩装饰色 - 极低对比度、高透明度
  watercolorYellow: 'rgba(253, 224, 71, 0.12)',    // 柔和暖黄（更淡）
  watercolorYellowGlow: 'rgba(253, 224, 71, 0.05)', // 黄色光晕（更淡）
  watercolorSage: 'rgba(134, 239, 172, 0.12)',     // 淡鼠尾草绿
  watercolorSageLight: 'rgba(187, 247, 208, 0.10)', // 极淡绿
  watercolorCream: 'rgba(254, 243, 199, 0.15)',    // 奶油色
  watercolorBeige: 'rgba(245, 208, 178, 0.08)',    // 淡米色
};

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 验证码倒计时
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 清理倒计时
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async () => {
    // 验证邮箱格式
    if (!email || !email.includes('@')) {
      return Alert.alert('提示', '请输入有效的邮箱地址');
    }
    
    setSendingCode(true);
    try {
      console.log('[DEBUG] 发送验证码请求:', { email, url: API_ENDPOINTS.SEND_EMAIL_OTP });
      
      // 调用云函数发送验证码
      const response = await fetch(API_ENDPOINTS.SEND_EMAIL_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      console.log('[DEBUG] 响应状态:', response.status, response.statusText);
      
      // 检查响应状态
      if (!response.ok) {
        // 获取错误详情
        const errorText = await response.text();
        console.error('[DEBUG] 错误响应:', errorText);
        Alert.alert(
          `发送失败 (${response.status})`, 
          errorText || `HTTP Error: ${response.statusText}`
        );
        return;
      }
      
      // 解析成功响应
      const data = await response.json();
      console.log('[DEBUG] 响应数据:', data);
      
      if (data?.success) {
        Alert.alert('发送成功', '验证码已发送到您的邮箱');
        setCountdown(60); // 开始60秒倒计时
      } else {
        // 后端返回的业务错误
        Alert.alert('发送失败', data?.error || data?.message || '未知错误');
      }
    } catch (err: any) {
      // 网络错误或解析错误
      console.error('[DEBUG] 请求异常:', err);
      Alert.alert(
        '请求失败', 
        `${err?.message || '网络错误'}\n\n请检查网络连接或稍后重试`
      );
    } finally {
      setSendingCode(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('提示', '请填写完整信息');
    }
    if (password.length < 6) {
      return Alert.alert('提示', '密码长度至少为6位');
    }
    
    setLoading(true);
    try {
      const { success, error } = await authService.signIn(email, password);
      if (!success) {
        Alert.alert('登录失败', error?.message || '请检查网络或账号密码');
      }
    } catch (err) {
      Alert.alert('错误', '系统响应异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 注册（调用后端云函数验证并创建用户）
  const handleSignUp = async () => {
    // 表单验证
    if (!email || !password || !confirmPassword || !verificationCode) {
      return Alert.alert('提示', '请填写完整信息');
    }
    if (!email.includes('@')) {
      return Alert.alert('提示', '请输入有效的邮箱地址');
    }
    if (password.length < 6) {
      return Alert.alert('提示', '密码长度至少为6位');
    }
    if (password !== confirmPassword) {
      return Alert.alert('提示', '两次输入的密码不一致');
    }
    if (verificationCode.length !== 6) {
      return Alert.alert('提示', '请输入6位验证码');
    }
    
    setLoading(true);
    try {
      console.log('[DEBUG] 注册请求:', { 
        email, 
        code: verificationCode, 
        url: API_ENDPOINTS.VERIFY_AND_SIGNUP 
      });
      
      // 调用后端云函数：验证验证码并创建用户
      const response = await fetch(API_ENDPOINTS.VERIFY_AND_SIGNUP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          code: verificationCode 
        }),
      });
      
      console.log('[DEBUG] 响应状态:', response.status, response.statusText);
      
      // 检查响应状态
      if (!response.ok) {
        // 获取错误详情
        const errorText = await response.text();
        console.error('[DEBUG] 错误响应:', errorText);
        Alert.alert(
          `注册失败 (${response.status})`, 
          errorText || `HTTP Error: ${response.statusText}`
        );
        return;
      }
      
      // 解析成功响应
      const data = await response.json();
      console.log('[DEBUG] 响应数据:', data);
      
      if (data?.success) {
        Alert.alert('注册成功', '账号创建成功，正在自动登录...');
        // 注册成功后自动登录
        const { success: loginSuccess } = await authService.signIn(email, password);
        if (loginSuccess) {
          setShowSignUp(false);
        } else {
          // 如果自动登录失败，提示用户手动登录
          Alert.alert('提示', '请使用新账号登录');
          setShowSignUp(false);
        }
      } else {
        // 后端返回的业务错误
        Alert.alert('注册失败', data?.error || data?.message || '未知错误');
      }
    } catch (err: any) {
      // 网络错误或解析错误
      console.error('[DEBUG] 请求异常:', err);
      Alert.alert(
        '请求失败', 
        `${err?.message || '网络错误'}\n\n请检查网络连接或稍后重试`
      );
    } finally {
      setLoading(false);
    }
  };

  const openSignUp = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCountdown(0);
    setShowSignUp(true);
  };

  const closeSignUp = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCountdown(0);
    setShowSignUp(false);
  };

  // ==================== 登录页 ====================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* ========== 水彩风格装饰背景 ========== */}
      
      {/* 右上角 - 太阳光晕（最外层，最淡） */}
      <View style={styles.sunGlowOuter} />
      {/* 右上角 - 太阳光晕（中层） */}
      <View style={styles.sunGlowMiddle} />
      {/* 右上角 - 太阳核心（温暖发光） */}
      <View style={styles.sunCore} />
      
      {/* 顶部 - 流动的有机形状（鼠尾草绿） */}
      <View style={styles.organicShapeTop} />
      
      {/* 左侧 - 柔和的绿色水彩晕染 */}
      <View style={styles.watercolorWashLeft} />
      
      {/* 右侧中部 - 奶油色有机形状 */}
      <View style={styles.organicShapeMid} />
      
      {/* 底部 - 植物轮廓暗示（左下） */}
      <View style={styles.botanicalLeft} />
      <View style={styles.botanicalLeftInner} />
      
      {/* 底部 - 植物轮廓暗示（右下） */}
      <View style={styles.botanicalRight} />
      <View style={styles.botanicalRightInner} />
      
      {/* 底部 - 流动的水彩波浪 */}
      <View style={styles.watercolorWaveBottom} />
      <View style={styles.watercolorWaveBottomLight} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.loginContent, { paddingTop: insets.top + 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 标题区域 */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>欢迎回来</Text>
            <Text style={styles.subtitle}>登录以继续使用</Text>
          </View>

          {/* 表单区域 */}
          <View style={styles.formSection}>
            {/* 邮箱输入框 */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputBox}>
                <Mail size={22} color={COLORS.iconMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="请输入邮箱"
                  placeholderTextColor={COLORS.placeholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* 密码输入框 */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputBox}>
                <Lock size={22} color={COLORS.iconMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="请输入密码"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={22} color={COLORS.iconMuted} />
                  ) : (
                    <Eye size={22} color={COLORS.iconMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* 登录按钮 */}
            <TouchableOpacity 
              onPress={handleLogin}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>登录</Text>
              )}
            </TouchableOpacity>

            {/* 切换到注册 */}
            <TouchableOpacity 
              onPress={openSignUp} 
              style={styles.switchButton}
              activeOpacity={0.7}
            >
              <Text style={styles.switchText}>
                没有账号？<Text style={styles.switchLink}>去注册</Text>
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* 底部留白 */}
          <View style={{ height: insets.bottom + 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ==================== 注册页（模态窗口）==================== */}
      <Modal
        visible={showSignUp}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSignUp}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <StatusBar barStyle="dark-content" />
          
          {/* 顶部栏 */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={closeSignUp}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <ChevronDown size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>创建账号</Text>
            <View style={styles.closeButton} />
          </View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.signUpContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 邮箱输入框 */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputBox}>
                  <Mail size={22} color={COLORS.iconMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="请输入邮箱"
                    placeholderTextColor={COLORS.placeholder}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* 验证码输入框（带发送按钮） */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputBoxWithButton}>
                  <KeyRound size={22} color={COLORS.iconMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithButton}
                    placeholder="请输入6位验证码"
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                  />
                  <TouchableOpacity 
                    onPress={handleSendCode}
                    disabled={sendingCode || countdown > 0}
                    style={[
                      styles.sendCodeButton,
                      (sendingCode || countdown > 0) && styles.sendCodeButtonDisabled
                    ]}
                    activeOpacity={0.7}
                  >
                    {sendingCode ? (
                      <ActivityIndicator color={COLORS.brandGreen} size="small" />
                    ) : (
                      <Text style={[
                        styles.sendCodeText,
                        (countdown > 0) && styles.sendCodeTextDisabled
                      ]}>
                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 密码输入框 */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputBox}>
                  <Lock size={22} color={COLORS.iconMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="请输入密码（至少6位）"
                    placeholderTextColor={COLORS.placeholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    activeOpacity={0.7}
                  >
                    {showPassword ? (
                      <EyeOff size={22} color={COLORS.iconMuted} />
                    ) : (
                      <Eye size={22} color={COLORS.iconMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 确认密码输入框 */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputBox}>
                  <Lock size={22} color={COLORS.iconMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="请再次输入密码"
                    placeholderTextColor={COLORS.placeholder}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                    activeOpacity={0.7}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={22} color={COLORS.iconMuted} />
                    ) : (
                      <Eye size={22} color={COLORS.iconMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 注册按钮 */}
              <TouchableOpacity 
                onPress={handleSignUp}
                disabled={loading}
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>注册</Text>
                )}
              </TouchableOpacity>

              {/* 底部留白 */}
              <View style={{ height: insets.bottom + 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // ==================== 容器 ====================
  container: {
    flex: 1,
    backgroundColor: COLORS.bgWarm,
  },
  keyboardView: {
    flex: 1,
  },
  loginContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },

  // ==================== 水彩风格装饰背景 ====================
  
  // 太阳 - 三层光晕，模拟模糊发光效果
  sunGlowOuter: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.08,
    right: -SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: COLORS.watercolorYellowGlow,
  },
  sunGlowMiddle: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.02,
    right: SCREEN_WIDTH * 0.02,
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.2,
    backgroundColor: COLORS.watercolorYellow,
  },
  sunCore: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.06,
    right: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.22,
    height: SCREEN_WIDTH * 0.22,
    borderRadius: SCREEN_WIDTH * 0.11,
    backgroundColor: 'rgba(253, 224, 71, 0.18)', // 更淡的核心
  },
  
  // 顶部有机形状 - 鼠尾草绿
  organicShapeTop: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.12,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 1.1,
    height: SCREEN_HEIGHT * 0.32,
    borderRadius: SCREEN_WIDTH * 0.55,
    backgroundColor: COLORS.watercolorSageLight,
    transform: [{ rotate: '-8deg' }],
  },
  
  // 左侧水彩晕染
  watercolorWashLeft: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.25,
    left: -SCREEN_WIDTH * 0.4,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_HEIGHT * 0.3,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: COLORS.watercolorSage,
    transform: [{ rotate: '15deg' }],
  },
  
  // 右侧中部有机形状
  organicShapeMid: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.35,
    right: -SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_HEIGHT * 0.2,
    borderRadius: SCREEN_WIDTH * 0.3,
    backgroundColor: COLORS.watercolorCream,
    transform: [{ rotate: '-20deg' }],
  },
  
  // 底部植物轮廓暗示 - 左下
  botanicalLeft: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.02,
    left: -SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_HEIGHT * 0.18,
    borderTopRightRadius: SCREEN_WIDTH * 0.5,
    borderTopLeftRadius: SCREEN_WIDTH * 0.15,
    backgroundColor: COLORS.watercolorSage,
    transform: [{ rotate: '5deg' }],
  },
  botanicalLeftInner: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.05,
    left: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_HEIGHT * 0.12,
    borderTopRightRadius: SCREEN_WIDTH * 0.3,
    borderTopLeftRadius: SCREEN_WIDTH * 0.1,
    backgroundColor: COLORS.watercolorSageLight,
    transform: [{ rotate: '-8deg' }],
  },
  
  // 底部植物轮廓暗示 - 右下
  botanicalRight: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT * 0.02,
    right: -SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_HEIGHT * 0.15,
    borderTopLeftRadius: SCREEN_WIDTH * 0.45,
    borderTopRightRadius: SCREEN_WIDTH * 0.1,
    backgroundColor: COLORS.watercolorCream,
    transform: [{ rotate: '-10deg' }],
  },
  botanicalRightInner: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.02,
    right: SCREEN_WIDTH * 0.08,
    width: SCREEN_WIDTH * 0.25,
    height: SCREEN_HEIGHT * 0.1,
    borderTopLeftRadius: SCREEN_WIDTH * 0.25,
    borderTopRightRadius: SCREEN_WIDTH * 0.08,
    backgroundColor: COLORS.watercolorBeige,
    transform: [{ rotate: '5deg' }],
  },
  
  // 底部水彩波浪
  watercolorWaveBottom: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT * 0.1,
    left: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 1.4,
    height: SCREEN_HEIGHT * 0.2,
    borderRadius: SCREEN_WIDTH * 0.7,
    backgroundColor: COLORS.watercolorSageLight,
  },
  watercolorWaveBottomLight: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT * 0.15,
    right: -SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_HEIGHT * 0.22,
    borderRadius: SCREEN_WIDTH * 0.6,
    backgroundColor: COLORS.watercolorCream,
  },

  // ==================== 标题区域 ====================
  titleSection: {
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: COLORS.textSecondary,
  },

  // ==================== 表单区域 ====================
  formSection: {
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    // 柔和阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputBoxWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 6,
    // 柔和阴影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  inputWithButton: {
    flex: 1,
    fontSize: 17,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 8,
    marginRight: -8,
  },

  // ==================== 验证码按钮 ====================
  sendCodeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.brandGreenLight,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCodeButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  sendCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.brandGreen,
  },
  sendCodeTextDisabled: {
    color: COLORS.textMuted,
  },

  // ==================== 按钮 ====================
  primaryButton: {
    height: 56,
    backgroundColor: COLORS.brandGreen,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    // 柔和阴影
    shadowColor: COLORS.brandGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.brandGreenLight,
    shadowOpacity: 0.1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  switchButton: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  switchLink: {
    color: COLORS.brandGreen,
    fontWeight: '700',
  },

  // ==================== 模态窗口（注册页）====================
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bgWarm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  signUpContent: {
    paddingHorizontal: 28,
    paddingTop: 32,
  },
});
