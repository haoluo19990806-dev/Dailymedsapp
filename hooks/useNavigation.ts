import { useCallback, useRef, useState } from 'react';
import { Tab } from '@/types';

/**
 * 导航追踪 Hook - 用于判断转场方向（前进/后退）
 */
export function useNavigation() {
  const [activeTab, setActiveTabState] = useState<Tab>('HOME');
  const prevTabRef = useRef<Tab>('HOME');
  const navigationStackRef = useRef<Tab[]>(['HOME']);

  /**
   * 判断是否为前进操作
   */
  const isPush = useCallback((fromTab: Tab, toTab: Tab): boolean => {
    // Tab切换不算前进（HOME, TRENDS, HISTORY, SETTINGS 之间切换）
    const mainTabs: Tab[] = ['HOME', 'TRENDS', 'HISTORY', 'SETTINGS'];
    if (mainTabs.includes(fromTab) && mainTabs.includes(toTab)) {
      return false;
    }

    // 从主Tab进入子页面 = 前进
    if (mainTabs.includes(fromTab) && !mainTabs.includes(toTab)) {
      return true;
    }

    // 从子页面进入更深层 = 前进
    if (!mainTabs.includes(fromTab) && !mainTabs.includes(toTab)) {
      return navigationStackRef.current.length > 0;
    }

    return false;
  }, []);

  /**
   * 判断是否为后退操作
   */
  const isPop = useCallback((fromTab: Tab, toTab: Tab): boolean => {
    // 返回主Tab = 后退
    const mainTabs: Tab[] = ['HOME', 'TRENDS', 'HISTORY', 'SETTINGS'];
    if (!mainTabs.includes(fromTab) && mainTabs.includes(toTab)) {
      return true;
    }

    // 从深层返回浅层 = 后退
    if (!mainTabs.includes(fromTab) && !mainTabs.includes(toTab)) {
      return navigationStackRef.current.length > 1;
    }

    return false;
  }, []);

  /**
   * 设置当前Tab（带导航追踪）
   */
  const setActiveTab = useCallback((newTab: Tab) => {
    const currentTab = activeTab;
    
    // 更新导航栈
    if (isPush(currentTab, newTab)) {
      navigationStackRef.current.push(newTab);
    } else if (isPop(currentTab, newTab)) {
      navigationStackRef.current.pop();
    } else {
      // Tab切换，更新栈顶
      const mainTabs: Tab[] = ['HOME', 'TRENDS', 'HISTORY', 'SETTINGS'];
      if (mainTabs.includes(newTab)) {
        navigationStackRef.current = [newTab];
      }
    }

    prevTabRef.current = currentTab;
    setActiveTabState(newTab);
  }, [activeTab, isPush, isPop]);

  /**
   * 获取转场类型
   */
  const getTransitionType = useCallback((targetTab: Tab): 'fade' | 'push' | 'pop' => {
    const currentTab = activeTab;
    
    if (isPush(currentTab, targetTab)) {
      return 'push';
    } else if (isPop(currentTab, targetTab)) {
      return 'pop';
    } else {
      return 'fade';
    }
  }, [activeTab, isPush, isPop]);

  return {
    activeTab,
    prevTab: prevTabRef.current,
    setActiveTab,
    getTransitionType,
    navigationDepth: navigationStackRef.current.length,
  };
}
