import React, { useEffect, useRef } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  Easing,
} from 'react-native-reanimated';

export type TransitionType = 'push' | 'pop' | 'fade' | 'modal';

interface SmartTransitionProps {
  children: React.ReactNode;
  style?: ViewStyle;
  type?: TransitionType;
  duration?: number;
}

// 导航历史栈（用于判断前进/后退）
const navigationStack: string[] = [];

export const SmartTransition: React.FC<SmartTransitionProps> = ({
  children,
  style,
  type,
  duration = 250, // 统一时长，像微信一样快速响应
}) => {
  const componentId = useRef(Math.random().toString(36)).current;
  const prevType = useRef<TransitionType | undefined>(type);

  useEffect(() => {
    // 记录导航历史
    if (type === 'push') {
      navigationStack.push(componentId);
    } else if (type === 'pop') {
      navigationStack.pop();
    }
  }, [type, componentId]);

  // 自动判断转场类型
  const getTransitionType = (): TransitionType => {
    if (type) return type;
    
    // 如果没有指定，根据导航栈自动判断
    const isPush = navigationStack.length > 0 && navigationStack[navigationStack.length - 1] === componentId;
    return isPush ? 'push' : 'fade';
  };

  const transitionType = getTransitionType();

  // 定义进场动画（微信风格：快速、流畅）
  const getEnteringAnimation = () => {
    const config = {
      duration,
      easing: Easing.out(Easing.cubic), // 缓出，像微信一样
    };

    switch (transitionType) {
      case 'push':
        // 前进：从右侧滑入
        return SlideInRight.duration(config.duration).easing(config.easing);
      case 'pop':
        // 后退：从左侧滑入（上一页）
        return SlideInLeft.duration(config.duration).easing(config.easing);
      case 'modal':
        // Modal：从底部滑入（需要自定义，这里先用fade）
        return FadeIn.duration(config.duration).easing(config.easing);
      case 'fade':
      default:
        // Tab切换或同级切换：淡入
        return FadeIn.duration(config.duration).easing(config.easing);
    }
  };

  // 定义离场动画
  const getExitingAnimation = () => {
    const config = {
      duration,
      easing: Easing.in(Easing.cubic), // 缓入
    };

    switch (transitionType) {
      case 'push':
        // 前进时，当前页面向左滑出
        return SlideOutLeft.duration(config.duration).easing(config.easing);
      case 'pop':
        // 后退时，当前页面向右滑出
        return SlideOutRight.duration(config.duration).easing(config.easing);
      case 'modal':
        // Modal关闭：淡出
        return FadeOut.duration(config.duration).easing(config.easing);
      case 'fade':
      default:
        // Tab切换：淡出
        return FadeOut.duration(config.duration).easing(config.easing);
    }
  };

  return (
    <Animated.View
      style={[{ flex: 1 }, style]}
      entering={getEnteringAnimation()}
      exiting={getExitingAnimation()}
    >
      {children}
    </Animated.View>
  );
};

/**
 * 导航方向追踪工具
 */
export const NavigationTracker = {
  /**
   * 记录前进操作
   */
  push: (pageId: string) => {
    navigationStack.push(pageId);
  },

  /**
   * 记录后退操作
   */
  pop: () => {
    navigationStack.pop();
  },

  /**
   * 清空导航栈
   */
  clear: () => {
    navigationStack.length = 0;
  },

  /**
   * 获取当前导航深度
   */
  getDepth: () => navigationStack.length,
};
