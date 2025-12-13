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
        'sugar-pending': '#FF8FA3',    // 糖果粉
        'pressure-pending': '#64C7FF', // 水滴蓝
        // 【新增】补充缺失的药物颜色定义
        'insulin-pending': '#FCD34D',  // 针管黄
        'capsule-pending': '#A78BFA',  // 胶囊紫
        'pill-pending': '#FCA5A5',     // 药片红
        'patch-pending': '#86EFAC',    // 药盒绿 (Patch/Box)
        
        'success': '#4ADE80',          // 成功绿
        'success-dark': '#22C55E',     // 深绿
        'bg-warm': '#FFF8F0',          // 暖白背景
      },
    },
  },
  plugins: [],
}