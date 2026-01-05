import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Image, Modal, Text, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg'; // 星星还需要用到 SVG

const { width, height } = Dimensions.get('window');

// 1. 闪烁的星星组件 (保留这个增加氛围)
const TwinklingStar = ({ x, y, size, delay }: { x: number, y: number, size: number, delay: number }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1, true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: interpolate(opacity.value, [0.3, 1], [0.8, 1.2]) }]
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="white">
        <Path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
      </Svg>
    </Animated.View>
  );
};

// 2. 主模态框组件
interface MoonModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MoonModal: React.FC<MoonModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  
  const moonY = useSharedValue(-height);
  const textOpacity = useSharedValue(0);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      bgOpacity.value = withTiming(1, { duration: 500 });
      moonY.value = withSpring(0, { damping: 12, stiffness: 90, mass: 1 });
      textOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
    } else {
      moonY.value = -height;
      textOpacity.value = 0;
      bgOpacity.value = 0;
    }
  }, [visible]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: moonY.value },
      // 上下悬浮动画
      { translateY: withRepeat(withSequence(withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })), -1, true) }
    ]
  }));

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [20, 0]) }]
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 items-center justify-center">
          
          {/* 背景层 */}
          <Animated.View style={[{ position: 'absolute', width, height, backgroundColor: '#0f172a' }, bgStyle]} />

          {/* 星星层 */}
          <TwinklingStar x={width * 0.2} y={height * 0.3} size={20} delay={0} />
          <TwinklingStar x={width * 0.8} y={height * 0.25} size={15} delay={500} />
          <TwinklingStar x={width * 0.15} y={height * 0.6} size={12} delay={1000} />
          <TwinklingStar x={width * 0.85} y={height * 0.7} size={24} delay={200} />

          {/* 内容层 */}
          <View className="items-center">
            {/* 动画容器：控制下落和悬浮 */}
            <Animated.View style={[{ marginBottom: 40 }, floatStyle]}>
              {/* 【核心修改】替换为图片 */}
              <Image 
                source={require('@/assets/images/moon.png')} 
                style={{ width: 200, height: 200 }} 
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.View style={[{ alignItems: 'center' }, textStyle]}>
              <Text className="text-4xl font-bold text-white mb-3 text-center" style={{ textShadowColor: 'rgba(255,255,255,0.5)', textShadowRadius: 10 }}>
                {t('modal.good_night')}
              </Text>
              <Text className="text-lg text-blue-100 font-medium text-center opacity-90">
                {t('modal.all_done')}
              </Text>
              <Text className="text-sm text-slate-500 mt-12">(点击任意处关闭)</Text>
            </Animated.View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};