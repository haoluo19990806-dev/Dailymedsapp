import React, { useEffect } from 'react';
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withDelay,
    withTiming
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

// 创建一个可动画的 Path 组件
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedCheckMarkProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const AnimatedCheckMark: React.FC<AnimatedCheckMarkProps> = ({ 
  size = 40, 
  color = "white", 
  strokeWidth = 4 
}) => {
  // 动画进度值：0 = 未开始，1 = 完成
  const progress = useSharedValue(0);

  useEffect(() => {
    // 每次组件挂载时，重置进度并开始动画
    progress.value = 0;
    progress.value = withDelay(100, withTiming(1, {
      duration: 400, // 动画时长 400ms，灵动快速
      easing: Easing.out(Easing.back(1.5)), // 带一点回弹效果，更有活力
    }));
  }, []);

  // Check 图标的 SVG 路径数据 (对应 Lucide 图标的形状)
  // M20 6 L9 17 L4 12
  // 路径总长度大约是 22 (根据勾股定理估算：5^2+5^2=50 -> 7 + 11^2+11^2=242 -> 15.5. Total ~23)
  // 这里直接设一个足够大的值来做遮罩动画
  const pathLength = 30; 

  const animatedProps = useAnimatedProps(() => ({
    // 原理：通过控制虚线的偏移量来实现“描绘”效果
    strokeDashoffset: pathLength * (1 - progress.value),
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedPath
        d="M20 6 L9 17 L4 12" // 对勾的形状
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength} // 虚线总长
        animatedProps={animatedProps}
      />
    </Svg>
  );
};