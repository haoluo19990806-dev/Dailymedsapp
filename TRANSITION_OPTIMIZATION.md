# 转场动画优化方案 - 微信风格

## 📋 当前问题分析

### 1. 转场逻辑不统一
- ❌ HOME/TRENDS/HISTORY 用 `fade`，SETTINGS/ADD_MED/LANGUAGE 用 `slide`
- ❌ 没有明确规则说明什么时候用什么动画
- ✅ **优化**：建立清晰的转场规则

### 2. 缺少导航方向概念
- ❌ 不知道是"前进"还是"后退"
- ❌ 所有 slide 都是右滑入，没有区分方向
- ✅ **优化**：添加导航方向追踪

### 3. 动画时长不一致
- ❌ fade: 200ms，slide: 300ms
- ✅ **优化**：统一为 250ms（微信风格）

### 4. Tab切换没有优化
- ⚠️ Tab切换应该用更轻量的动画
- ✅ **优化**：Tab切换用 fade，子页面用 slide

## 🎯 微信转场特点

### 核心原则
1. **前进（Push）**：新页面从右侧滑入，当前页面向左滑出
2. **后退（Pop）**：当前页面向右滑出，上一页从左侧滑入
3. **同级切换（Tab）**：淡入淡出，快速响应
4. **Modal**：从底部向上滑入，带背景遮罩

### 动画参数
- **时长**：200-250ms（快速响应）
- **缓动函数**：ease-out（开始快，结束慢）
- **性能**：使用原生动画，60fps流畅

## ✨ 优化方案

### 转场规则表

| 场景 | 动画类型 | 方向 | 时长 | 说明 |
|------|---------|------|------|------|
| Tab切换 | `fade` | - | 250ms | HOME ↔ TRENDS ↔ HISTORY ↔ SETTINGS |
| 进入子页 | `push` | 右→左 | 250ms | SETTINGS → ADD_MED/LANGUAGE |
| 返回主页 | `pop` | 左→右 | 250ms | ADD_MED/LANGUAGE → SETTINGS |
| 进入专注模式 | `push` | 右→左 | 250ms | HOME → TASKS |
| 退出专注模式 | `pop` | 左→右 | 250ms | TASKS → HOME |

### 页面层级定义

```
主Tab层（fade切换）
├─ HOME
├─ TRENDS  
├─ HISTORY
└─ SETTINGS
    └─ 子页面层（push/pop）
        ├─ ADD_MED
        ├─ LANGUAGE
        └─ 其他设置子页

专注模式（push/pop）
└─ TASKS (从HOME进入)
```

## 🔧 实施步骤

### 步骤1：更新 AnimatedPage 组件 ✅
- 已更新，支持 `fade`、`push`、`pop` 三种类型
- 统一时长为 250ms
- 使用微信风格的缓动函数

### 步骤2：更新主组件转场规则

需要修改的地方：

1. **Tab切换页面**（使用 `fade`）
   ```tsx
   <AnimatedPage type="fade">
     <HomeScreen />
   </AnimatedPage>
   ```

2. **进入子页面**（使用 `push`）
   ```tsx
   <AnimatedPage type="push">
     <AddMedView />
   </AnimatedPage>
   ```

3. **返回主页面**（使用 `pop`）
   - 需要追踪导航方向
   - 从子页返回时自动使用 `pop`

### 步骤3：添加导航方向追踪

创建 `useNavigation` hook 来追踪导航方向：
- 记录上一个Tab
- 判断是前进还是后退
- 自动选择合适的转场类型

## 📝 具体代码修改

### 修改1：更新主组件中的转场类型

```tsx
// Tab切换：使用 fade
{activeTab === 'HOME' && (
  <AnimatedPage type="fade">
    <UserHomeScreen />
  </AnimatedPage>
)}

{activeTab === 'TRENDS' && (
  <AnimatedPage type="fade">
    <TrendsScreen />
  </AnimatedPage>
)}

// 进入子页面：使用 push
{activeTab === 'SETTINGS' && (
  <AnimatedPage type={prevTab === 'HOME' ? 'push' : 'fade'}>
    <SettingsView />
  </AnimatedPage>
)}

{activeTab === 'ADD_MED' && (
  <AnimatedPage type="push">
    <AddMedView />
  </AnimatedPage>
)}

// 进入专注模式：使用 push
{activeTab === 'TASKS' && (
  <AnimatedPage type="push">
    <SupervisorHomeScreen />
  </AnimatedPage>
)}
```

### 修改2：更新Tab切换时的prevTab追踪

```tsx
const handleTabChange = (newTab: Tab) => {
  setPrevTab(activeTab);
  setActiveTab(newTab);
};
```

## 🎨 视觉效果对比

### 优化前
- ❌ Tab切换用fade，子页面用slide，不一致
- ❌ 所有slide都是右滑入，没有后退动画
- ❌ 动画时长不统一（200ms vs 300ms）

### 优化后
- ✅ Tab切换统一用fade，流畅自然
- ✅ 前进用右滑入，后退用左滑入，符合直觉
- ✅ 统一时长250ms，快速响应
- ✅ 使用微信风格的缓动函数，更流畅

## 🚀 下一步优化建议

1. **Modal转场优化**
   - 从底部滑入（需要自定义动画）
   - 背景遮罩淡入

2. **手势支持**
   - 支持右滑返回（iOS风格）
   - 支持左滑前进（Android风格）

3. **性能优化**
   - 使用原生动画驱动
   - 减少重绘和重排

## ✅ 完成清单

- [x] 更新 AnimatedPage 组件，支持 push/pop/fade
- [x] 统一动画时长为 250ms
- [x] 添加微信风格的缓动函数
- [ ] 更新主组件，应用新的转场规则
- [ ] 添加导航方向追踪
- [ ] 测试所有转场场景
