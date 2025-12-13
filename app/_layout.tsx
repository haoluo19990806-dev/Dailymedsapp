import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // 1. 隐藏顶部的系统标题栏 (header)
        headerShown: false,
        // 2. 隐藏底部的系统 Tab 栏 (因为你自己写了一个更好看的)
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
    </Tabs>
  );
}

