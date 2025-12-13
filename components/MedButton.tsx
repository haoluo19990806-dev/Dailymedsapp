import React, { useEffect, useState } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import { CheckMarkIcon } from './Icons';

interface MedButtonProps {
  isTaken: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  baseColorClass: string; 
  shadowColorClass: string; 
  ariaLabel: string;
  size?: 'large' | 'medium';
}

export const MedButton: React.FC<MedButtonProps> = ({ 
  isTaken, 
  onClick, 
  icon, 
  baseColorClass, 
  shadowColorClass,
  ariaLabel,
  size = 'large'
}) => {
  const [scaleAnim] = useState(new Animated.Value(1));
  const [opacityAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isTaken) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true })
      ]).start();
      Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [isTaken]);

  // 【关键修改 1】: 缩小容器尺寸
  // large: 160px -> 120px (75%)
  // 圆角: 35px -> 26px (约 75%)
  const buttonSizeClass = size === 'large' ? 'w-[120px] h-[120px] rounded-[26px]' : 'w-[100px] h-[100px] rounded-[20px]';
  
  // 【关键修改 2】: 缩小对勾图标尺寸
  // 80 -> 60 (75%)
  const checkMarkSize = size === 'large' ? 60 : 50;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        onPress={onClick}
        activeOpacity={0.8}
        // 【关键修改 3 - 解决居中】
        // 这里使用了 items-center 和 justify-center，确保内部元素绝对居中
        className={`
          relative ${buttonSizeClass} items-center justify-center m-2
          ${isTaken ? 'bg-success' : baseColorClass}
        `}
        style={!isTaken ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 5
        } : {}}
      >
        {/* 移除了之前多余的 w-3/5 h-3/5 内部容器，直接让图标在父容器中居中 */}
        
        {/* 原始图标 */}
        <Animated.View style={{ opacity: opacityAnim, position: 'absolute' }}>
          {icon}
        </Animated.View>

        {/* 对钩图标 */}
        {isTaken && (
          <View className="absolute inset-0 items-center justify-center">
            <CheckMarkIcon size={checkMarkSize} color="white" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};