import React, { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

// Tab 配置类型
interface TabConfig {
  key: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  activeColor: string;
}

interface AnimatedTabBarProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
  height?: number;
  paddingBottom?: number;
}

// 单个 Tab 项组件（带动画）
const AnimatedTabItem: React.FC<{
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
}> = ({ tab, isActive, onPress }) => {
  const scale = useSharedValue(1);
  const colorProgress = useSharedValue(isActive ? 1 : 0);

  // 当激活状态改变时触发动画
  useEffect(() => {
    if (isActive) {
      // 弹跳缩放动画：1.0 -> 1.2 -> 1.1
      scale.value = withSpring(1.15, { 
        damping: 8, 
        stiffness: 300,
        mass: 0.5,
      }, () => {
        scale.value = withSpring(1.08, { damping: 10, stiffness: 200 });
      });
      // 颜色过渡
      colorProgress.value = withTiming(1, { duration: 200 });
    } else {
      // 恢复原始大小
      scale.value = withSpring(1, { damping: 10, stiffness: 200 });
      colorProgress.value = withTiming(0, { duration: 200 });
    }
  }, [isActive]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // 计算当前颜色
  const currentColor = isActive ? tab.activeColor : '#cbd5e1';

  const IconComponent = tab.icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
      }}
    >
      <Animated.View style={animatedIconStyle}>
        <IconComponent size={28} color={currentColor} />
      </Animated.View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: currentColor,
          marginTop: 4,
        }}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
};

// 主 Tab Bar 组件
export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  height = 60,
  paddingBottom = 0,
}) => {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0', // slate-200
        paddingBottom: paddingBottom,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: height,
          paddingHorizontal: 8,
          // 整体略微向上偏移，留出底部呼吸空间
          paddingBottom: 4,
        }}
      >
        {tabs.map((tab) => (
          <AnimatedTabItem
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => onTabPress(tab.key)}
          />
        ))}
      </View>
    </View>
  );
};

export default AnimatedTabBar;
