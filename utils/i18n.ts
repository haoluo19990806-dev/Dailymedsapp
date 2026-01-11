import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      // --- 底部导航 ---
      "tabs.trends": "趋势",
      "tabs.home": "主页",
      "tabs.history": "历史",
      "tabs.settings": "设置",

      // --- 引导页 ---
      "landing.subtitle": "您的智能服药助手",
      "landing.patient": "我是患者",
      "landing.patient_desc": "记录每日服药",
      "landing.supervisor": "我是监督者",
      "landing.supervisor_desc": "查看记录与设置",

      // --- 顶部栏 ---
      "header.switch_identity": "切换身份",
      "header.mode_patient": "长辈模式",
      "header.mode_supervisor": "监督模式",

      // --- 主页 (Home) ---
      "home.select_patient_tip": "请先在设置页选择一位患者",
      "home.today_tasks": "今日任务",
      "home.today_checkin": "今日打卡",
      "home.completed": "已完成",
      "home.pending": "待完成",
      "home.no_tasks": "今日暂无任务",

      // --- 监督者模式 ---
      "supervisor.overview": "监护概览",
      "supervisor.all_patients_progress": "今日所有患者服药进度",
      "supervisor.viewing": "正在查看",
      "supervisor.all_tasks_done": "今日任务已完成",
      "supervisor.progress": "进度",
      "supervisor.no_patients": "暂无绑定患者",
      "supervisor.add_code_tip": "请去\"设置\"添加监督码",
      "supervisor.back_to_overview": "返回概览",

      // --- 设置页 ---
      "settings.title": "设置",
      "settings.section_account": "账户与绑定",
      "settings.my_code": "我的监督码",
      "settings.current_patient": "当前管理患者",
      "settings.click_switch": "点击切换",
      "settings.add_patient": "添加新患者",
      "settings.section_general": "常规设置",
      "settings.med_mgmt": "药物管理",
      "settings.med_action": "添加/删除",
      "settings.language": "更改语言",
      "settings.not_selected": "未选择",
      "settings.no_patient_tip": "请先选择或添加患者",
      "settings.enable_more": "以启用更多设置项",
      "settings.unnamed": "未命名",
      "settings.unbind_management": "解除绑定管理",
      "settings.management_list": "管理列表",
      "settings.select_patient_to_manage": "选择患者以管理",
      "settings.new_requests": "有 {{count}} 条新的监督申请",
      "settings.click_to_view": "点击查看并处理",

      // --- 药物管理 ---
      "med_mgmt.title": "药物管理",
      "med_mgmt.managing": "{{name}}的药物",
      "med_mgmt.section_added": "已添加药物",
      "med_mgmt.patient_meds": "该患者的药物",
      "med_mgmt.empty": "暂无药物",
      "med_mgmt.empty_tip": "请使用上方表单添加",
      "med_mgmt.task_measure": "测量任务",
      "med_mgmt.task_take": "服药任务",
      
      // --- ConfigBuilder (添加药物) ---
      "config.editing": "正在修改: {{name}}",
      "config.add_new": "添加新药物",
      "config.select_icon": "选择图标",
      "config.select_time": "选择时间",
      "config.med_name": "药物名称 (选填)",
      "config.med_name_placeholder": "例如: 降压药 (不填显示图标)",
      "config.save": "保存设置",

      // --- 趋势页 (Trends) ---
      "trends.title": "健康趋势",
      "trends.no_data": "暂无健康数据",
      "trends.no_data_desc": "该时间段暂无数据",
      "trends.detail_title": "详细记录",
      "trends.types.bp": "血压",
      "trends.types.sugar": "血糖",
      "trends.types.temp": "体温",
      "trends.types.weight": "体重",
      "trends.types.heart": "心率",
      "trends.types.spo2": "血氧",
      "trends.types.other": "其他",
      "trends.ranges.1d": "日",
      "trends.ranges.1w": "周",
      "trends.ranges.1m": "月",
      "trends.ranges.6m": "6个月",
      "trends.ranges.1y": "年",
      "trends.axis.1d_labels": ["上午12时", "6时", "下午12时", "6时"],
      "trends.axis.1w_labels": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      "trends.axis.1m_labels": ["1日", "7日", "14日", "21日", "28日"],
      "trends.axis.6m_labels_1": ["1月", "2月", "3月", "4月", "5月", "6月"],
      "trends.axis.6m_labels_2": ["7月", "8月", "9月", "10月", "11月", "12月"],
      "trends.axis.1y_labels": ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
      "trends.date_fmt.today": "今天",
      "trends.date_fmt.week_prefix": "", // 🔥 [修改] 设为空，防止出现 "周周一"

      // --- 健康记录弹窗 (Record Modal) ---
      "record.title": "新的记录",
      "record.cancel": "取消",
      "record.save": "保存",
      "record.select_type": "选择类型",
      "record.value_label": "数值",
      "record.value_optional": "数值 (选填)",
      "record.systolic": "收缩压",
      "record.diastolic": "舒张压",
      "record.date": "日期",
      "record.time": "时间",
      "record.note_label": "备注 (选填)",
      "record.content_label": "内容/备注",
      "record.note_placeholder": "添加备注...",
      "record.custom": "自定义",
      "record.am": "上午",
      "record.pm": "下午",
      "record.confirm": "确定",

      // --- 历史页 (History) ---
      "history.title": "历史记录",
      "history.my_title": "我的历史记录",
      "history.patient_title": "患者历史记录",
      "history.details": "详情",
      "history.total_records": "共 {{count}} 条记录",
      "history.month_suffix": "月",
      "history.week_prefix": "", // 🔥 [修改] 设为空，因为 label 本身已经是 "周X"

      // --- 日志列表 (LogList) ---
      "log.patient_took": "患者服用了",
      "log.you_took": "服用了",
      "log.patient_health_prefix": "患者的",
      "log.your_health_prefix": "您的", 
      "log.is": "为",

      // --- 通用弹窗与提示 ---
      "alert.success": "成功",
      "alert.added": "新药物已添加",
      "alert.confirm_delete": "确认删除",
      "alert.delete_med_confirm": "确定不再提醒该药物吗？",
      "alert.delete": "删除",
      "alert.cancel": "取消",
      "alert.remove": "移除",
      "alert.confirm_remove_patient": "您确定要移除这位患者吗？",
      "alert.confirm_delete_record": "您确定要删除这条记录吗？",
      "alert.record_saved": "记录成功",
      "alert.body_data_saved": "身体数据已保存",
      "alert.tip": "提示",
      "alert.input_value": "请输入数值",
      "alert.input_custom": "自定义记录请填写数值或备注",
      "alert.enter_code": "请输入监督码",
      "alert.add_success": "添加成功",
      "alert.added_patient": "已添加：{{name}}",

      // --- 模态框 ---
      "modal.add_patient_title": "添加患者",
      "modal.code_label": "监督码",
      "modal.code_placeholder": "例如: 12345",
      "modal.note_label": "备注名称 (选填)",
      "modal.note_placeholder": "例如: 外婆",
      "modal.btn_cancel": "取消",
      "modal.btn_confirm": "确认添加",
      "modal.patient_list_title": "已添加患者",
      "modal.list_empty": "暂无已添加的患者",
      "modal.close": "关闭",
      "modal.good_night": "晚安",
      "modal.all_done": "今日任务全部完成，好好休息",
      
      // --- 语言页 ---
      "lang.title": "语言",
      "lang.zh": "简体中文",
      "lang.en": "English",

      // --- 通用 ---
      "app.loading": "加载中...",
      "app.logout_title": "退出登录",
      "app.logout_message": "确定要退出吗？",
      "app.logout_cancel": "取消",
      "app.logout_confirm": "退出"
    }
  },
  en: {
    translation: {
      "tabs.trends": "Trends",
      "tabs.home": "Home",
      "tabs.history": "History",
      "tabs.settings": "Settings",

      "landing.subtitle": "Your Smart Med Assistant",
      "landing.patient": "I'm a Patient",
      "landing.patient_desc": "Log daily meds",
      "landing.supervisor": "I'm a Supervisor",
      "landing.supervisor_desc": "View records & settings",

      "header.switch_identity": "Switch ID",
      "header.mode_patient": "Senior Mode",
      "header.mode_supervisor": "Supervisor Mode",

      "home.select_patient_tip": "Please select a patient in Settings first",
      "home.today_tasks": "Tasks",
      "home.today_checkin": "Daily Check-in",
      "home.completed": "Done",
      "home.pending": "Pending",
      "home.no_tasks": "No tasks for today",

      // --- Supervisor Mode ---
      "supervisor.overview": "Supervisor Overview",
      "supervisor.all_patients_progress": "Today's progress",
      "supervisor.viewing": "Currently Viewing",
      "supervisor.all_tasks_done": "All tasks completed",
      "supervisor.progress": "Progress",
      "supervisor.no_patients": "No patients bound",
      "supervisor.add_code_tip": "Go to Settings to add supervisor code",
      "supervisor.back_to_overview": "Back to Overview",

      "settings.title": "Settings",
      "settings.section_account": "Account & Binding",
      "settings.my_code": "My Code",
      "settings.current_patient": "Current Patient",
      "settings.click_switch": "Tap to Switch",
      "settings.add_patient": "Add Patient",
      "settings.section_general": "General",
      "settings.med_mgmt": "Medications",
      "settings.med_action": "Add/Edit",
      "settings.language": "Language",
      "settings.not_selected": "Not Selected",
      "settings.no_patient_tip": "Select or add a patient",
      "settings.enable_more": "to enable more settings",
      "settings.unnamed": "Unnamed",
      "settings.unbind_management": "Unbind Management",
      "settings.management_list": "",
      "settings.select_patient_to_manage": "",
      "settings.new_requests": "{{count}} new supervisor requests",
      "settings.click_to_view": "Tap to view",

      "med_mgmt.title": "Medications",
      "med_mgmt.managing": "{{name}}'s Meds",
      "med_mgmt.section_added": "Added Meds",
      "med_mgmt.patient_meds": "Patient's Meds",
      "med_mgmt.empty": "No Medications",
      "med_mgmt.empty_tip": "Use the form above to add",
      "med_mgmt.task_measure": "Measure",
      "med_mgmt.task_take": "Take Meds",

      "config.editing": "Editing: {{name}}",
      "config.add_new": "Add New Medication",
      "config.select_icon": "Select Icon",
      "config.select_time": "Select Time",
      "config.med_name": "Med Name (Optional)",
      "config.med_name_placeholder": "Ex: Aspirin (Empty for icon only)",
      "config.save": "Save Settings",

      "trends.title": "Health Trends",
      "trends.no_data": "No Health Data",
      "trends.no_data_desc": "No data for this period",
      "trends.detail_title": "Details",
      "trends.types.bp": "Blood Pressure",
      "trends.types.sugar": "Blood Sugar",
      "trends.types.temp": "Temperature",
      "trends.types.weight": "Weight",
      "trends.types.heart": "Heart Rate",
      "trends.types.spo2": "SpO2",
      "trends.types.other": "Other",
      "trends.ranges.1d": "D",
      "trends.ranges.1w": "W",
      "trends.ranges.1m": "M",
      "trends.ranges.6m": "6M",
      "trends.ranges.1y": "Y",
      "trends.axis.1d_labels": ["12 AM", "6 AM", "12 PM", "6 PM"],
      "trends.axis.1w_labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "trends.axis.1m_labels": ["1st", "7th", "14th", "21st", "28th"],
      "trends.axis.6m_labels_1": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      "trends.axis.6m_labels_2": ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      "trends.axis.1y_labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      "trends.date_fmt.today": "Today",
      "trends.date_fmt.week_prefix": "", 

      "record.title": "New Record",
      "record.cancel": "Cancel",
      "record.save": "Save",
      "record.select_type": "Select Type",
      "record.value_label": "Value",
      "record.value_optional": "Value (Optional)",
      "record.systolic": "Systolic",
      "record.diastolic": "Diastolic",
      "record.date": "Date",
      "record.time": "Time",
      "record.note_label": "Note (Optional)",
      "record.content_label": "Content/Note",
      "record.note_placeholder": "Add a note...",
      "record.custom": "Custom",
      "record.am": "AM",
      "record.pm": "PM",
      "record.confirm": "Confirm",

      "history.title": "History",
      "history.my_title": "My History",
      "history.patient_title": "Patient History",
      "history.details": "Details",
      "history.total_records": "{{count}} records",
      "history.month_suffix": "", 
      "history.week_prefix": "",

      "log.patient_took": "Patient took",
      "log.you_took": "Took",
      "log.patient_health_prefix": "Patient's ",
      "log.your_health_prefix": "",
      "log.is": "is",

      "alert.success": "Success",
      "alert.added": "Medication added",
      "alert.confirm_delete": "Confirm Delete",
      "alert.delete_med_confirm": "Stop reminding for this med?",
      "alert.delete": "Delete",
      "alert.cancel": "Cancel",
      "alert.remove": "Remove",
      "alert.confirm_remove_patient": "Remove this patient?",
      "alert.confirm_delete_record": "Delete this record?",
      "alert.record_saved": "Saved",
      "alert.body_data_saved": "Health data saved",
      "alert.tip": "Tip",
      "alert.input_value": "Please enter a value",
      "alert.input_custom": "Enter value or note",
      "alert.enter_code": "Enter supervisor code",
      "alert.add_success": "Success",
      "alert.added_patient": "Added: {{name}}",

      "modal.add_patient_title": "Add Patient",
      "modal.code_label": "Supervisor Code",
      "modal.code_placeholder": "Ex: 12345",
      "modal.note_label": "Nickname (Optional)",
      "modal.note_placeholder": "Ex: Grandma",
      "modal.btn_cancel": "Cancel",
      "modal.btn_confirm": "Confirm",
      "modal.patient_list_title": "My Patients",
      "modal.list_empty": "No patients added yet",
      "modal.close": "Close",
      "modal.good_night": "Good Night",
      "modal.all_done": "All tasks done, rest well",

      "lang.title": "Language",
      "lang.zh": "Chinese",
      "lang.en": "English",

      // --- General ---
      "app.loading": "Loading...",
      "app.logout_title": "Logout",
      "app.logout_message": "Are you sure you want to logout?",
      "app.logout_cancel": "Cancel",
      "app.logout_confirm": "Logout"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "zh", 
    fallbackLng: "zh",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;