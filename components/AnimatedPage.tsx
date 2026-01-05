import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

interface AnimatedPageProps {
  children: React.ReactNode;
  style?: ViewStyle;
  // 可以选择动画类型，默认是淡入淡出
  type?: 'fade' | 'slide'; 
}

export const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, style, type = 'fade' }) => {
  // 定义进场动画
  const enteringAnim = type === 'slide' 
    ? SlideInRight.duration(300) 
    : FadeIn.duration(200);

  // 定义离场动画
  const exitingAnim = type === 'slide' 
    ? SlideOutLeft.duration(300) 
    : FadeOut.duration(200);

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