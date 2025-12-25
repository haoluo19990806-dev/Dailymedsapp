import React from 'react';
import { Image, View } from 'react-native';
// 确保 Svg 是默认导入，其他组件是命名导入
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

const DEFAULT_SIZE = 24;
const DEFAULT_COLOR = "#64748b"; 

// --- 核心药物形状图标 (图片版) ---
// 【关键修改】为您上传的所有图片图标添加了 tintColor 属性，使其能响应颜色变化

// 1. 糖果图标
export const CandyIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Image 
      source={require('../assets/images/candy.png')} 
      // 添加 tintColor
      style={{ width: '100%', height: '100%', resizeMode: 'contain', tintColor: color }} 
    />
  </View>
);

// 2. 鸭子图标 (DropIcon)
export const DropIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Image 
      source={require('../assets/images/duck.png')} 
      // 添加 tintColor
      style={{ width: '100%', height: '100%', resizeMode: 'contain', tintColor: color }} 
    />
  </View>
);

// 3. 针头图标
export const NeedleIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Image 
      source={require('../assets/images/needle.png')} 
      // 添加 tintColor
      style={{ width: '100%', height: '100%', resizeMode: 'contain', tintColor: color }} 
    />
  </View>
);

// --- 新增药物形状图标 (图片版) ---

// 4. 胶囊
export const CapsuleIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Image 
      source={require('../assets/images/Capsule.png')} 
      // 添加 tintColor
      style={{ width: '100%', height: '100%', resizeMode: 'contain', tintColor: color }} 
    />
  </View>
);

// 5. 药片
export const PillIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Image 
      source={require('../assets/images/Pill.png')} 
      // 添加 tintColor
      style={{ width: '100%', height: '100%', resizeMode: 'contain', tintColor: color }} 
    />
  </View>
);

// 6. 药盒
export const BoxIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Image 
      source={require('../assets/images/Box.png')} 
      // 添加 tintColor
      style={{ width: '100%', height: '100%', resizeMode: 'contain', tintColor: color }} 
    />
  </View>
);

// --- 状态与功能图标 ---

export const CheckMarkIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = "white" }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path 
      d="M25 50 L45 70 L75 30" 
      stroke={color} 
      strokeWidth="12" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      fill="none" 
    />
  </Svg>
);

export const CelebrationIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path d="M50 5 L63 35 L95 38 L71 59 L78 90 L50 73 L22 90 L29 59 L5 38 L37 35 Z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="3" strokeLinejoin="round"/>
    <Circle cx="38" cy="50" r="4" fill="#4B5563"/>
    <Circle cx="62" cy="50" r="4" fill="#4B5563"/>
    <Path d="M35 65 Q50 75 65 65" stroke="#4B5563" strokeWidth="3" strokeLinecap="round"/>
    <Circle cx="32" cy="58" r="3" fill="#F87171" opacity="0.6"/>
    <Circle cx="68" cy="58" r="3" fill="#F87171" opacity="0.6"/>
  </Svg>
);

// --- 常用 UI 图标 ---

export const AlertIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <Line x1="12" y1="9" x2="12" y2="13" />
    <Line x1="12" y1="17" x2="12.01" y2="17" />
  </Svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const MinusIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

export const CaregiverIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <Circle cx="8.5" cy="7" r="4" />
    <Path d="M20 8v6" strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M23 11h-6" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

export const WeeklyIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="3" y1="10" x2="21" y2="10" />
    <Path d="M10 16 L14 16" stroke={color} />
  </Svg>
);

export const LoopIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 21a9 9 0 1 0-9-9c0 1.488.36 2.89 1 4.127L4 16" />
    <Path d="M4 21v-5h5" />
  </Svg>
);

export const MorningIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17 18H7" strokeWidth="3"/>
    <Path d="M12 14V8" />
    <Path d="M12 4V2" />
    <Path d="M4.22 10.22l1.42 1.42" />
    <Path d="M1 14h2" />
    <Path d="M21 14h2" />
    <Path d="M18.36 11.64l1.42-1.42" />
    <Path d="M8 14a4 4 0 0 1 8 0" fill={color} fillOpacity="0.2" />
  </Svg>
);

export const NoonIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="5" fill={color} fillOpacity="0.2" />
    <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </Svg>
);

export const EveningIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={color} fillOpacity="0.1" />
    <Path d="M18 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill={color} stroke="none" />
  </Svg>
);

export const HomeIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

export const HistoryIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="3" y1="10" x2="21" y2="10" />
  </Svg>
);

// 保持您提供的正确 SVG 路径不变
export const SettingsIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);
// ... (保留原有的导入)

// ... (在文件末尾，SettingsIcon 之后添加)

export const ChartIcon: React.FC<IconProps> = ({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="18" y1="20" x2="18" y2="10" />
    <Line x1="12" y1="20" x2="12" y2="4" />
    <Line x1="6" y1="20" x2="6" y2="14" />
  </Svg>
);

