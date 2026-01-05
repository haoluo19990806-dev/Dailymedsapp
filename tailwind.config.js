/** @type {import('tailwindcss').Config} */
module.exports = {
  // 【关键修复】添加 "./utils/**/*.{js,jsx,ts,tsx}"，确保工具类中的样式被扫描到
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}", 
    "./utils/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
       'sugar-pending': '#FF8FA3',
        'pressure-pending': '#64C7FF',
        'insulin-pending': '#FCD34D',
        'capsule-pending': '#A78BFA',
        'pill-pending': '#FCA5A5',
        'patch-pending': '#86EFAC',
        'success': '#4ADE80',
        'success-dark': '#22C55E',
        'bg-warm': '#FFF8F0',
        
        // --- 新增以下标准色，方便组件统一调用 ---
        'primary': '#3b82f6',    // 主色调（蓝）
        'secondary': '#64748b',  // 次要色（灰）
        'danger': '#ef4444',     // 警告色（红）
        'warning': '#f59e0b',    // 提醒色（黄）
      },
    },
  },
  plugins: [],
}