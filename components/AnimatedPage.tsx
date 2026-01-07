import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInRight, 
  SlideInLeft,
  SlideOutLeft, 
  SlideOutRight,
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
      case 'fade':
      default:
        // Tab切换：直接显示，无动画
        return undefined;
    }
  };

  // 定义离场动画
  const getExitingAnim = () => {
    const config = {
      duration,
      easing: Easing.in(Easing.cubic), // 缓入
    };

    switch (type) {
      case 'push':
        // 前进时，当前页面向左滑出
        return SlideOutLeft.duration(config.duration).easing(config.easing);
      case 'pop':
        // 后退时，当前页面向右滑出（但这里我们希望立即消失，不显示滑出）
        // 为了实现"子菜单被主菜单盖住"的效果，pop类型的exiting也使用fade（立即消失）
        return undefined; // 立即消失，不显示滑出动画
      case 'fade':
      default:
        // Tab切换：直接隐藏，无动画
        return undefined;
    }
  };

  const enteringAnim = getEnteringAnim();
  const exitingAnim = getExitingAnim();

  // 如果是fade类型（无动画），直接返回普通View
  if (type === 'fade') {
    return (
      <Animated.View style={[{ flex: 1 }, style]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[{ flex: 1 }, style]} 
      entering={enteringAnim} 
      exiting={exitingAnim}
    >
      {children}
    </Animated.View>
  );
};