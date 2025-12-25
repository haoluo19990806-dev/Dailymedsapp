import { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- 1. 样式常量定义 (严格匹配截图) ---
const COLORS = {
  bg: '#000000',            // 纯黑背景
  cardBg: '#1C1C1E',        // 稍微亮一点的深灰 (用于卡片或背景容器)
  textWhite: '#FFFFFF',
  textGray: '#8E8E93',      // 辅助文字灰
  highColor: '#FFFFFF',     // 高压 (白)
  lowColor: '#FF4D6D',      // 低压 (粉红/红)
  selectorBg: '#2C2C2E',    // 选择器槽位背景
  selectorActive: '#636366',// 选择器选中态背景
};

const SCREEN_WIDTH = Dimensions.get('window').width;

// --- 2. 模拟数据 (用于第一步展示逻辑) ---
// 这里的结构是为了后续几步画图做准备
const MOCK_DATA = {
  '1D': { label: '今天', high: '118', low: '78', range: '115-120 / 75-80' },
  '1W': { label: '本周', high: '115-130', low: '75-85', range: '115-130 / 75-85' },
  '1M': { label: '2025年12月', high: '110-140', low: '70-90', range: '110-140 / 70-90' },
  '6M': { label: '2025年下半年', high: '110-150', low: '70-95', range: '110-150 / 70-95' },
  '1Y': { label: '2025年', high: '105-160', low: '65-100', range: '105-160 / 65-100' },
};

const BloodPressureScreen = () => {
  const [activeRange, setActiveRange] = useState('1M'); // 默认选中 '月'
  
  // 当前展示的数据
  const currentData = MOCK_DATA[activeRange];

  // 时间维度选项
  const ranges = [
    { key: '1D', label: '日' },
    { key: '1W', label: '周' },
    { key: '1M', label: '月' },
    { key: '6M', label: '6个月' },
    { key: '1Y', label: '年' },
  ];

  return (
    <View style={styles.container}>
      
      {/* --- A. 顶部时间选择器 (已置顶) --- */}
      <View style={styles.selectorContainer}>
        {ranges.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeRange === tab.key && styles.tabBtnActive
            ]}
            onPress={() => setActiveRange(tab.key)}
          >
            <Text style={[
                styles.tabText,
                activeRange === tab.key && styles.tabTextActive
            ]}>
                {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- B. 数据读数面板 (复刻截图) --- */}
      <View style={styles.infoPanel}>
        {/* 标签行: 收缩压 & 舒张压 */}
        <View style={styles.labelRow}>
          <View style={styles.legendGroup}>
            <View style={[styles.dot, { backgroundColor: COLORS.highColor }]} />
            <Text style={styles.legendText}>收缩压</Text>
          </View>
          <View style={styles.legendGroup}>
            <View style={[styles.dot, { backgroundColor: COLORS.lowColor }]} />
            <Text style={styles.legendText}>舒张压</Text>
          </View>
        </View>

        {/* 核心数值大字行 */}
        <View style={styles.valueRow}>
          {/* 这里我们按照截图：显示范围或者单值 */}
          {/* 为了简化，这里先拆分显示，后续根据点击柱状图动态更新 */}
          <Text style={styles.bigValueText}>
             {currentData.high}
          </Text>
          <View style={{ width: 15 }} />
          <Text style={styles.bigValueText}>
             {currentData.low}
          </Text>
          
          <Text style={styles.unitText}>毫米汞柱</Text>

          {/* 右侧 'i' 图标 */}
          <TouchableOpacity style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </TouchableOpacity>
        </View>

        {/* 日期/时间描述 */}
        <Text style={styles.dateText}>{currentData.label}</Text>
      </View>

      {/* --- C. 占位区域 (下一步我们将在这里画图) --- */}
      <View style={styles.chartPlaceholder}>
        <Text style={{color: '#333'}}>图表区域 (Step 2)</Text>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 10, // 顶部留白
  },
  // --- 选择器样式 ---
  selectorContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.selectorBg,
    borderRadius: 8,
    padding: 2,
    height: 32,
    marginBottom: 20, // 与下方内容的间距
  },
  tabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: COLORS.selectorActive, // 选中背景变亮
  },
  tabText: {
    color: COLORS.textGray,
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.textWhite, // 选中文字变白
    fontWeight: '600',
  },
  // --- 信息面板样式 ---
  infoPanel: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  legendGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: COLORS.textGray,
    fontSize: 12,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline', // 文字底部对齐
    marginBottom: 6,
  },
  bigValueText: {
    color: COLORS.textWhite,
    fontSize: 32,
    fontWeight: '600',
    fontVariant: ['tabular-nums'], // 等宽数字
  },
  unitText: {
    color: COLORS.textGray,
    fontSize: 14,
    marginLeft: 8,
  },
  infoIcon: {
    marginLeft: 'auto', // 推到最右侧
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIconText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  dateText: {
    color: COLORS.textGray,
    fontSize: 13,
  },
  // --- 占位符 ---
  chartPlaceholder: {
    height: 250,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#222',
    borderStyle: 'dashed'
  }
});

export default BloodPressureScreen;