import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

// iOS设计规范：导航栏内容高度
const HEADER_CONTENT_HEIGHT = 44;

export interface CustomHeaderProps {
  /**
   * 标题文本
   */
  title?: string;
  /**
   * 是否显示返回按钮
   */
  showBack?: boolean;
  /**
   * 返回按钮点击事件
   */
  onBack?: () => void;
  /**
   * 右侧自定义内容
   */
  rightContent?: React.ReactNode;
  /**
   * 背景颜色
   */
  backgroundColor?: string;
  /**
   * 标题位置：'center' | 'left'
   */
  titleAlign?: 'center' | 'left';
  /**
   * 是否显示底部边框
   */
  showBorder?: boolean;
  /**
   * 自定义容器样式
   */
  containerStyle?: ViewStyle;
  /**
   * 自定义内容容器样式
   */
  contentStyle?: ViewStyle;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightContent,
  backgroundColor = '#FFF8F0', // bg-bg-warm
  titleAlign = 'left',
  showBorder = true,
  containerStyle,
  contentStyle,
}) => {
  const insets = useSafeAreaInsets();
  
  // 总高度 = 状态栏高度 + 内容高度（44px）
  const totalHeight = insets.top + HEADER_CONTENT_HEIGHT;

  return (
    <View
      style={[
        styles.container,
        {
          height: totalHeight,
          paddingTop: insets.top,
          backgroundColor,
          borderBottomWidth: showBorder ? StyleSheet.hairlineWidth : 0,
        },
        containerStyle,
      ]}
    >
      {/* 内容区域：固定44px高度，垂直居中 */}
      <View
        style={[
          styles.content,
          {
            height: HEADER_CONTENT_HEIGHT,
            justifyContent: titleAlign === 'center' ? 'space-between' : 'flex-start',
          },
          contentStyle,
        ]}
      >
        {/* 左侧：返回按钮或占位 */}
        <View style={styles.leftSection}>
          {showBack && onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color="#334155" />
            </TouchableOpacity>
          )}
        </View>

        {/* 中间：标题 */}
        {title && (
          <View
            style={[
              styles.titleSection,
              titleAlign === 'center' && styles.titleSectionCenter,
            ]}
          >
            <Text
              style={[
                styles.title,
                titleAlign === 'center' && styles.titleCenter,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        )}

        {/* 右侧：自定义内容或占位 */}
        <View style={styles.rightSection}>
          {rightContent}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomColor: 'rgba(148, 163, 184, 0.2)', // border-slate-100/50
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, // px-4
  },
  leftSection: {
    width: 40, // 固定宽度，确保标题居中时对称
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 9999, // rounded-full
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 1)', // border-slate-100
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleSectionCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b', // text-slate-700
    lineHeight: 24,
  },
  titleCenter: {
    textAlign: 'center',
  },
  rightSection: {
    width: 40, // 固定宽度，确保标题居中时对称
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
