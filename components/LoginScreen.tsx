import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { authService } from '../lib/authService';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // 切换登录或注册

  const handleAuth = async () => {
    if (!email || !password) {
      return Alert.alert('提示', '请填写完整信息');
    }
    if (password.length < 6) {
      return Alert.alert('提示', '密码长度至少为6位');
    }
    
    setLoading(true);
    try {
      const { success, error } = isSignUp 
        ? await authService.signUp(email, password)
        : await authService.signIn(email, password);

      if (!success) {
        Alert.alert('操作失败', error?.message || '请检查网络或账号密码');
      } else if (isSignUp) {
        Alert.alert('成功', '账号创建成功并已自动登录');
      }
    } catch (err) {
      Alert.alert('错误', '系统响应异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>DailyMeds</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? '创建一个新账号，开启用药提醒' : '欢迎回来，请登录您的账号'}
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>电子邮箱</Text>
          <TextInput
            style={styles.input}
            placeholder="例如: yourname@example.com"
            placeholderTextColor="#999" // 确保占位文字可见
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>密码</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入至少6位密码"
            placeholderTextColor="#999" // 确保占位文字可见
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          onPress={handleAuth}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? '立即注册' : '登录'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setIsSignUp(!isSignUp)} 
          style={styles.switchContainer}
        >
          <Text style={styles.switchText}>
            {isSignUp ? '已有账号？' : '没有账号？'}
            <Text style={styles.switchLink}>{isSignUp ? '去登录' : '去注册'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    // 阴影效果
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333', // 输入后的文字颜色
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#10b981',
    height: 55,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a7f3d0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#666',
  },
  switchLink: {
    color: '#10b981',
    fontWeight: 'bold',
  },
});