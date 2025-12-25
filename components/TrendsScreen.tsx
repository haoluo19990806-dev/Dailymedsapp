import { HealthDataType, HistoryRecord, TimelineEvent } from '@/types';
import { Trash2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next'; // 🔥
import { Dimensions, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32; 
const CHART_HEIGHT = 220; 

interface TrendsScreenProps {
  history: HistoryRecord;
  onDelete: (item: TimelineEvent) => void; 
}

const COLORS = {
  bg: '#000000',        
  cardBg: '#1C1C1E',    
  textMain: '#FFFFFF',  
  textSub: '#8E8E93',   
  grid: '#333333',      
  bpHigh: '#FFFFFF',    
  bpLow: '#FF4D6D',     
  deleteBg: '#FF3B30', 
};

// --- 辅助函数 ---
const getTimeWindow = (range: string) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now); 

  if (range === '1D') {
    start.setHours(0, 0, 0, 0); 
  } 
  else if (range === '1W') {
    const day = start.getDay(); 
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
  } 
  else if (range === '1M') {
    start.setDate(1); 
    start.setHours(0, 0, 0, 0);
  } 
  else if (range === '6M') {
    const month = start.getMonth();
    if (month >= 6) start.setMonth(6, 1); 
    else start.setMonth(0, 1); 
    start.setHours(0, 0, 0, 0);
  } 
  else if (range === '1Y') {
    start.setMonth(0, 1); 
    start.setHours(0, 0, 0, 0);
  }
  
  return { startTime: start.getTime(), endTime: end.getTime() };
};

const calculatePercentX = (ts: number, range: string) => {
  const { startTime } = getTimeWindow(range);
  const durationMap: Record<string, number> = {
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000 - 1, 
    '1M': 30 * 24 * 60 * 60 * 1000, 
  };

  if (range === '6M' || range === '1Y') return 0; 

  const duration = durationMap[range] || 24 * 60 * 60 * 1000;
  const percent = (ts - startTime) / duration;
  
  return Math.max(0, Math.min(1, percent)); 
};

interface ProcessedDataItem {
  id: number;
  label: string;
  displayDate: string;
  value1: number;
  value1Min: number;
  value2: number;
  value2Min: number;
  isRange: boolean;
  percentX?: number; 
}

// ==========================================
// A. 血压图表
// ==========================================
const BloodPressureChart = ({ rawData, timeRange, xAxisLabels, getDisplayDate }: any) => {
  const processedData = useMemo<ProcessedDataItem[]>(() => {
    const aggregate = (keyFn: (d:number)=>string) => {
        const grouped: Record<string, {v1: number[], v2: number[], ts: number}> = {};
        rawData.forEach((item: TimelineEvent) => {
            const k = keyFn(item.timestamp);
            if (!grouped[k]) grouped[k] = {v1:[], v2:[], ts: item.timestamp};
            if (item.healthValue) {
                grouped[k].v1.push(item.healthValue.value1);
                if (item.healthValue.value2) grouped[k].v2.push(item.healthValue.value2);
            }
        });
        return Object.keys(grouped).map((k, i) => ({
            id: i, label: k,
            displayDate: getDisplayDate(grouped[k].ts, timeRange),
            value1: Math.max(...grouped[k].v1), 
            value1Min: Math.min(...grouped[k].v1), 
            value2: Math.max(...grouped[k].v2), 
            value2Min: Math.min(...grouped[k].v2), 
            isRange: true
        }));
    };

    if (timeRange === '1W') {
        const days = xAxisLabels; // Use localized labels
        return aggregate(ts => {
            let day = new Date(ts).getDay();
            if (day === 0) day = 7;
            return days[day-1];
        });
    }
    if (timeRange === '1M') return aggregate(ts => `${new Date(ts).getDate()}`); // 简化显示
    if (timeRange === '6M' || timeRange === '1Y') return aggregate(ts => `${new Date(ts).getMonth()+1}`); 
    
    return rawData.map((d: TimelineEvent, i: number) => ({
        id: i, label: '', 
        displayDate: getDisplayDate(d.timestamp, timeRange),
        value1: d.healthValue?.value1||0, value1Min: d.healthValue?.value1||0,
        value2: d.healthValue?.value2||0, value2Min: d.healthValue?.value2||0,
        isRange: true, percentX: calculatePercentX(d.timestamp, timeRange)
    }));
  }, [rawData, timeRange, xAxisLabels]);

  const [selected, setSelected] = useState<ProcessedDataItem | null>(null);

  useEffect(() => {
    if (processedData.length > 0) {
      const lastItem = processedData[processedData.length - 1];
      if (selected?.id !== lastItem.id) setSelected(lastItem);
    } else {
      setSelected(null);
    }
  }, [processedData]);
  
  const Y_MAX = 200; 
  const Y_MIN = 40;
  const getY = (v: number) => CHART_HEIGHT - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_HEIGHT;

  return (
    <View>
      <View style={{marginBottom: 20, marginTop: 10, paddingLeft: 10}}>
          <View style={{flexDirection:'row', alignItems:'baseline'}}>
            <Text style={{fontSize: 32, fontWeight:'bold', color: COLORS.textMain, fontVariant:['tabular-nums']}}>
                {selected ? (selected.value1 === selected.value1Min ? selected.value1 : `${selected.value1Min}-${selected.value1}`) : '--'}
            </Text>
            <Text style={{fontSize: 18, color: COLORS.textSub, marginHorizontal: 8}}>/</Text>
            <Text style={{fontSize: 32, fontWeight:'bold', color: COLORS.textMain, fontVariant:['tabular-nums']}}>
                {selected ? (selected.value2 === selected.value2Min ? selected.value2 : `${selected.value2Min}-${selected.value2}`) : '--'}
            </Text>
            <Text style={{color: COLORS.textSub, marginLeft: 6}}>mmHg</Text>
          </View>
          <Text style={{color: COLORS.textSub, marginTop: 4, fontSize: 13}}>
            {selected ? selected.displayDate : ''}
          </Text>
      </View>

      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 40}>
        {[60, 90, 120, 150, 180].map(val => (
           <G key={val}>
             <Line x1="0" y1={getY(val)} x2={CHART_WIDTH} y2={getY(val)} stroke={COLORS.grid} strokeDasharray="4 4" />
             <SvgText x={CHART_WIDTH} y={getY(val)+4} fill={COLORS.textSub} fontSize="10" textAnchor="end">{val}</SvgText>
           </G>
        ))}
        {xAxisLabels.map((l: string, i: number) => {
            const x = (i / (xAxisLabels.length - 1)) * (CHART_WIDTH - 40) + 10;
            const anchor = i === 0 ? 'start' : i === xAxisLabels.length - 1 ? 'end' : 'middle';
            return <SvgText key={`${l}-${i}`} x={x} y={CHART_HEIGHT + 25} fill={COLORS.textSub} fontSize="10" textAnchor={anchor}>{l}</SvgText>
        })}
        {processedData.map((d, i) => {
            let x = 0;
            if (timeRange === '1D') x = (d.percentX||0) * (CHART_WIDTH-40) + 10;
            else if (timeRange === '1M') { const day = parseInt(d.label); x = ((day-1)/29)*(CHART_WIDTH-40)+10; }
            else { const idx = xAxisLabels.indexOf(d.label); if(idx===-1) return null; x = (idx/(xAxisLabels.length-1))*(CHART_WIDTH-40)+10; }

            const hTop = getY(d.value1); const hBot = getY(d.value1Min);
            const lTop = getY(d.value2); const lBot = getY(d.value2Min);
            const isSelected = selected?.id === d.id;
            
            return (
                <G key={i} onPress={() => setSelected(d)}>
                    <Rect x={x-10} y={0} width={20} height={CHART_HEIGHT} fill="transparent" />
                    {isSelected && <Line x1={x} y1={0} x2={x} y2={CHART_HEIGHT} stroke={COLORS.grid} strokeWidth="1" strokeDasharray="2 2" />}
                    <Rect x={x-3} y={hTop} width={6} height={Math.max(hBot-hTop, 6)} rx={3} fill={COLORS.bpHigh} opacity={isSelected ? 1 : 0.7} />
                    {d.value1 !== d.value1Min && <Rect x={x-3} y={hTop} width={6} height={6} rx={3} fill="#FFF" />}
                    <Rect x={x-3} y={lTop} width={6} height={Math.max(lBot-lTop, 6)} rx={3} fill={COLORS.bpLow} opacity={isSelected ? 1 : 0.7} />
                </G>
            )
        })}
      </Svg>
    </View>
  )
};

// ==========================================
// B. 通用折线图
// ==========================================
const GeneralLineChart = ({ rawData, timeRange, config, xAxisLabels, getDisplayDate }: any) => {
  const chartData = useMemo(() => {
    return rawData.map((item: TimelineEvent, index: number) => {
       let percentX = 0;
       
       if (timeRange === '6M' || timeRange === '1Y') {
           // 简单匹配
           const m = new Date(item.timestamp).getMonth();
           // 根据标签数量粗略估算
           percentX = m / 11; 
       } else {
           percentX = calculatePercentX(item.timestamp, timeRange);
       }

       return { 
           id: index, 
           val: item.healthValue?.value1 || 0,
           displayDate: getDisplayDate(item.timestamp, timeRange),
           percentX 
       };
    });
  }, [rawData, timeRange, xAxisLabels]); 

  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (chartData.length > 0) {
        const lastItem = chartData[chartData.length - 1];
        if (selected?.id !== lastItem.id) setSelected(lastItem);
    } else {
        setSelected(null);
    }
  }, [chartData]); 

  const vals = chartData.map((d: any) => d.val);
  const minVal = vals.length ? Math.min(...vals) : 0;
  const maxVal = vals.length ? Math.max(...vals) : 100;
  const padding = (maxVal - minVal) || 10;
  const Y_MAX = maxVal + padding * 0.5; 
  const Y_MIN = Math.max(0, minVal - padding * 0.5); 
  
  const getY = (v: number) => CHART_HEIGHT - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_HEIGHT;
  const getX = (p: number) => p * (CHART_WIDTH - 40) + 10;

  const linePath = useMemo(() => {
      if (chartData.length === 0) return '';
      const sorted = [...chartData].sort((a: any,b: any) => a.percentX - b.percentX);
      return sorted.map((d: any, i: number) => `${i===0 ? 'M' : 'L'} ${getX(d.percentX)} ${getY(d.val)}`).join(' ');
  }, [chartData, Y_MAX, Y_MIN]);

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(t => Y_MIN + t * (Y_MAX - Y_MIN));

  return (
    <View>
      <View style={{marginBottom: 20, marginTop: 10, paddingLeft: 10}}>
          <View style={{flexDirection:'row', alignItems:'baseline'}}>
            <Text style={{fontSize: 32, fontWeight:'bold', color: COLORS.textMain, fontVariant:['tabular-nums']}}>
                {selected ? selected.val : '--'}
            </Text>
            <Text style={{color: COLORS.textSub, marginLeft: 6}}>{config.unit}</Text>
          </View>
          <Text style={{color: COLORS.textSub, marginTop: 4, fontSize: 13}}>
            {selected ? selected.displayDate : ''}
          </Text>
      </View>

      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 40}>
         {gridLines.map((val, i) => (
             <G key={i}>
                 <Line x1="0" y1={getY(val)} x2={CHART_WIDTH} y2={getY(val)} stroke={COLORS.grid} strokeDasharray="4 4" />
                 <SvgText x={CHART_WIDTH} y={getY(val)+4} fill={COLORS.textSub} fontSize="10" textAnchor="end">
                     {val.toFixed(0)}
                 </SvgText>
             </G>
         ))}
         {xAxisLabels.map((l: string, i: number) => {
            const x = (i / (xAxisLabels.length - 1)) * (CHART_WIDTH - 40) + 10;
            const anchor = i === 0 ? 'start' : i === xAxisLabels.length - 1 ? 'end' : 'middle';
            return <SvgText key={`${l}-${i}`} x={x} y={CHART_HEIGHT + 25} fill={COLORS.textSub} fontSize="10" textAnchor={anchor}>{l}</SvgText>
        })}
        <Path d={linePath} stroke={config.color} strokeWidth="3" fill="none" />
        {chartData.map((d: any, i: number) => {
            const isSelected = selected?.id === d.id;
            return (
                <G key={i} onPress={() => setSelected(d)}>
                    <Circle cx={getX(d.percentX)} cy={getY(d.val)} r="15" fill="transparent" />
                    <Circle 
                        cx={getX(d.percentX)} cy={getY(d.val)} 
                        r={isSelected ? "6" : "4"} 
                        fill={config.color} stroke={COLORS.bg} strokeWidth={isSelected ? "3" : "2"} 
                    />
                </G>
            )
        })}
      </Svg>
    </View>
  )
}

// ==========================================
// 主屏幕组件
// ==========================================
export const TrendsScreen: React.FC<TrendsScreenProps> = ({ history, onDelete }) => {
  const { t } = useTranslation(); // 🔥
  const [selectedType, setSelectedType] = useState<HealthDataType | null>(null);
  const [timeRange, setTimeRange] = useState('1W'); 

  const TIME_RANGES = [
    { key: '1D', label: t('trends.ranges.1d') },
    { key: '1W', label: t('trends.ranges.1w') },
    { key: '1M', label: t('trends.ranges.1m') },
    { key: '6M', label: t('trends.ranges.6m') },
    { key: '1Y', label: t('trends.ranges.1y') },
  ];

  // 动态获取 X 轴标签
  const getXAxisLabels = () => {
    switch (timeRange) {
      case '1D': return t('trends.axis.1d_labels', { returnObjects: true });
      case '1W': return t('trends.axis.1w_labels', { returnObjects: true });
      case '1M': return t('trends.axis.1m_labels', { returnObjects: true });
      case '6M': 
        const now = new Date();
        return now.getMonth() < 6 ? t('trends.axis.6m_labels_1', { returnObjects: true }) : t('trends.axis.6m_labels_2', { returnObjects: true });
      case '1Y': return t('trends.axis.1y_labels', { returnObjects: true });
      default: return [];
    }
  };

  // 动态日期格式化
  const getDisplayDate = (ts: number, range: string) => {
    const date = new Date(ts);
    if (range === '1D') return `${t('trends.date_fmt.today')} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    if (range === '1W') {
        const days = t('trends.axis.1w_labels', { returnObjects: true }) as string[];
        let dayIndex = date.getDay() - 1; if(dayIndex<0) dayIndex=6;
        return `${t('trends.date_fmt.week_prefix')}${days[dayIndex]} ${date.getMonth()+1}/${date.getDate()}`;
    }
    return `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
  };

  const getTypeConfig = (type: HealthDataType) => {
    switch (type) {
      case HealthDataType.BLOOD_PRESSURE: return { label: t('trends.types.bp'), unit: 'mmHg', color: '#EF4444' };
      case HealthDataType.BLOOD_SUGAR: return { label: t('trends.types.sugar'), unit: 'mmol/L', color: '#F59E0B' };
      case HealthDataType.TEMPERATURE: return { label: t('trends.types.temp'), unit: '°C', color: '#3B82F6' };
      case HealthDataType.WEIGHT: return { label: t('trends.types.weight'), unit: 'kg', color: '#10B981' };
      case HealthDataType.HEART_RATE: return { label: t('trends.types.heart'), unit: 'bpm', color: '#EC4899' };
      case HealthDataType.SPO2: return { label: t('trends.types.spo2'), unit: '%', color: '#8B5CF6' };
      default: return { label: t('trends.types.other'), unit: '', color: '#94A3B8' };
    }
  };

  // 数据预处理
  const healthData = useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    Object.keys(history).forEach(dateKey => {
      const events = history[dateKey];
      events.forEach(event => {
        if (event.type === 'HEALTH_RECORD' && event.healthType && event.healthValue) {
          if (!grouped[event.healthType]) grouped[event.healthType] = [];
          grouped[event.healthType].push(event);
        }
      });
    });
    return grouped;
  }, [history]);

  const filteredData = useMemo(() => {
    const allData = healthData[selectedType as HealthDataType] || [];
    const { startTime } = getTimeWindow(timeRange);
    return allData.filter(item => item.timestamp >= startTime);
  }, [selectedType, timeRange, healthData]);

  const renderRightActions = (item: TimelineEvent) => {
    return (
      <TouchableOpacity
        style={{
          backgroundColor: COLORS.deleteBg,
          justifyContent: 'center',
          alignItems: 'center',
          width: 80,
          height: '100%',
        }}
        onPress={() => onDelete(item)}
      >
        <Trash2 color="#FFFFFF" size={24} />
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedType) return null;

    const isBP = selectedType === HealthDataType.BLOOD_PRESSURE;
    const config = getTypeConfig(selectedType);
    const xAxisLabels = getXAxisLabels(); // 🔥

    return (
      <Modal animationType="slide" visible={!!selectedType} onRequestClose={() => setSelectedType(null)}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bg }}>
            
            <View className="flex-row justify-between items-center px-4 pt-12 pb-4">
               <Text className="text-xl font-bold text-white">{config.label}</Text>
               <TouchableOpacity onPress={() => setSelectedType(null)} className="p-2 bg-neutral-800 rounded-full">
                 <Text className="text-white font-bold px-2">{t('modal.close')}</Text>
               </TouchableOpacity>
            </View>

            <View className="px-4 mb-6">
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: 8, padding: 2 }}>
                    {TIME_RANGES.map((range) => {
                        const isActive = timeRange === range.key;
                        return (
                            <TouchableOpacity 
                                key={range.key} 
                                onPress={() => setTimeRange(range.key)}
                                style={{ flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6, backgroundColor: isActive ? '#636366' : 'transparent' }}
                            >
                                <Text style={{ color: isActive ? '#FFFFFF' : COLORS.textSub, fontSize: 13, fontWeight: '500' }}>
                                    {range.label}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>
            </View>

            <ScrollView className="flex-1">
               <View className="mb-8 px-4">
                   {isBP ? (
                       <BloodPressureChart 
                          rawData={filteredData} 
                          timeRange={timeRange} 
                          xAxisLabels={xAxisLabels} 
                          getDisplayDate={getDisplayDate}
                       />
                   ) : (
                       <GeneralLineChart 
                          rawData={filteredData} 
                          timeRange={timeRange} 
                          config={config} 
                          xAxisLabels={xAxisLabels}
                          getDisplayDate={getDisplayDate}
                       />
                   )}
               </View>

               <Text className="text-lg font-bold mb-4 text-white px-4">{t('trends.detail_title')}</Text>
               
               {filteredData.slice().reverse().map(item => (
                 <Swipeable
                    key={item.id}
                    renderRightActions={() => renderRightActions(item)}
                    containerStyle={{ backgroundColor: COLORS.bg }} 
                 >
                    <View style={{ paddingHorizontal: 16, backgroundColor: COLORS.bg }}>
                        <View className="flex-row justify-between items-center py-4 border-b border-neutral-800">
                            <View>
                            <Text className="font-bold text-lg text-white">
                                {item.healthValue?.value1} 
                                {isBP && item.healthValue?.value2 ? ` / ${item.healthValue.value2}` : ''}
                                <Text className="text-xs ml-1 text-neutral-400"> {config.unit}</Text>
                            </Text>
                            </View>
                            <View className="items-end">
                            <Text className="font-medium text-neutral-400">{new Date(item.timestamp).toLocaleDateString()}</Text>
                            <Text className="text-xs text-neutral-600">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                            </View>
                        </View>
                    </View>
                 </Swipeable>
               ))}
               <View className="h-20" /> 
            </ScrollView>
        </GestureHandlerRootView>
      </Modal>
    );
  };

  const renderCard = (type: HealthDataType) => {
    const dataList = healthData[type];
    if (!dataList || dataList.length === 0) return null;
    const latest = dataList[dataList.length - 1];
    const config = getTypeConfig(type);
    const { value1, value2 } = latest.healthValue || { value1: 0 };
    const displayValue = type === HealthDataType.BLOOD_PRESSURE && value2 ? `${value1}/${value2}` : `${value1}`;
    
    return (
      <TouchableOpacity 
        key={type}
        onPress={() => setSelectedType(type)}
        className="bg-white p-5 rounded-3xl mb-4 shadow-sm border border-slate-100 flex-row justify-between items-center"
      >
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View className="w-2 h-8 rounded-full mr-3" style={{ backgroundColor: config.color }} />
            <View>
              <Text className="text-slate-500 font-bold text-xs uppercase">{config.label}</Text>
              <Text className="text-3xl font-bold text-slate-800">
                {displayValue} <Text className="text-base font-normal text-slate-400">{config.unit}</Text>
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-xs pl-5">
             {new Date(latest.timestamp).toLocaleDateString()}
          </Text>
        </View>
        <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
            <Text className="text-slate-300 font-bold">{'>'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-slate-800 mb-6">{t('trends.title')}</Text>
        {Object.keys(healthData).length === 0 ? (
           <View className="items-center justify-center py-20">
             <Text className="text-slate-400 text-lg">{t('trends.no_data')}</Text>
           </View>
        ) : (
          (Object.keys(healthData) as HealthDataType[]).map(type => renderCard(type))
        )}
      </ScrollView>
      {renderDetailModal()}
    </View>
  );
};