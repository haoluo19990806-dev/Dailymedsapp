import React from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { 
  SlideInRight, 
  SlideInLeft,
  Easing 
} from 'react-native-reanimated';

export type TransitionType = 'fade' | 'push' | 'pop';

interface AnimatedPageProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * 转场类型：
   * - 'fade': 淡入淡出（用于Tab切换、同级页面）
   * - 'push': 前进（从右侧滑入，用于进入子页面）
   * - 'pop': 后退（从左侧滑入，用于返回上一页）
   */
  type?: TransitionType;
  /**
   * 动画时长（毫秒），默认250ms（微信风格：快速响应）
   */
  duration?: number;
}

export const AnimatedPage: React.FC<AnimatedPageProps> = ({ 
  children, 
  style, 
  type = 'fade',
  duration = 250 // 统一时长，像微信一样
}) => {
  // 如果是fade类型（无动画），使用普通 View 避免布局抖动
  if (type === 'fade') {
    return (
      <View style={[{ flex: 1 }, style]}>
        {children}
      </View>
    );
  }

  // 定义进场动画（微信风格：快速、流畅）
  const getEnteringAnim = () => {
    const config = {
      duration,
      easing: Easing.out(Easing.cubic), // 缓出，像微信一样
    };

    switch (type) {
      case 'push':
        // 前进：从右侧滑入
        return SlideInRight.duration(config.duration).easing(config.easing);
      case 'pop':
        // 后退：从左侧滑入
        return SlideInLeft.duration(config.duration).easing(config.easing);
      default:
        return undefined;
    }
  };

  return (
    <Animated.View 
      style={[{ flex: 1 }, style]} 
      entering={getEnteringAnim()} 
    >
      {children}
    </Animated.View>
  );
};