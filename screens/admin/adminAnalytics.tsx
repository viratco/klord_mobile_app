import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Animated, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triggerPressHaptic } from '../../utils/haptics';
import Svg, { Path, Circle, Rect, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';

const { width: screenWidth } = Dimensions.get('window');

type TimeFrame = 'monthly' | 'yearly';
type ChartRange = '1D' | '1W' | '4M' | '8M' | 'All';

interface BookingProgressData {
  x: number | string;
  y: number;
  label?: string;
  completionRate?: number;
}

// Utilities to aggregate leads into time-series
const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function computePercentFromLead(lead: any): number {
  if (lead?.certificateUrl) return 100;
  const steps = Array.isArray(lead?.steps) ? lead.steps : [];
  if (steps.length > 0) {
    const completed = steps.filter((s: any) => s.completed).length;
    return Math.round((completed / steps.length) * 100);
  }
  return 0;
}

function isSameYearMonth(d: Date, y: number, m: number) { return d.getFullYear() === y && d.getMonth() === m; }
function getBucketIndex(dateStr?: string | number | Date) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

function aggregateLeadsToSeries(leads: any[], timeFrame: TimeFrame) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (timeFrame === 'monthly') {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const buckets = days.map(() => ({ stepsSum: 0, stepsCount: 0, completedBookings: 0 }));
    let maxSteps = 0;
    for (const lead of leads) {
      const stamp = lead?.updatedAt || lead?.createdAt;
      const { year, month, day } = getBucketIndex(stamp);
      if (year !== currentYear || month !== currentMonth) continue;
      const idx = Math.min(Math.max(day - 1, 0), 30);
      const steps = Array.isArray(lead?.steps) ? lead.steps : [];
      const completed = steps.filter((s: any) => s.completed).length;
      buckets[idx].stepsSum += completed;
      buckets[idx].stepsCount += 1;
      if (computePercentFromLead(lead) >= 100) buckets[idx].completedBookings += 1;
      if (steps.length > maxSteps) maxSteps = steps.length;
    }
    const stepsAvgSeries: BookingProgressData[] = buckets.map((b, i) => ({ x: i + 1, y: b.stepsCount ? Math.round(b.stepsSum / b.stepsCount) : 0 }));
    const completedSeries: BookingProgressData[] = buckets.map((b, i) => ({ x: i + 1, y: b.completedBookings }));
    const completedMax = buckets.reduce((m, b) => Math.max(m, b.completedBookings), 0);
    return { stepsAvgSeries, completedSeries, maxSteps: Math.max(maxSteps, 8), completedMax };
  } else {
    const buckets = Array.from({ length: 12 }, () => ({ stepsSum: 0, stepsCount: 0, completedBookings: 0 }));
    let maxSteps = 0;
    for (const lead of leads) {
      const stamp = lead?.updatedAt || lead?.createdAt;
      const { year, month } = getBucketIndex(stamp);
      if (year !== currentYear) continue;
      const idx = Math.min(Math.max(month, 0), 11);
      const steps = Array.isArray(lead?.steps) ? lead.steps : [];
      const completed = steps.filter((s: any) => s.completed).length;
      buckets[idx].stepsSum += completed;
      buckets[idx].stepsCount += 1;
      if (computePercentFromLead(lead) >= 100) buckets[idx].completedBookings += 1;
      if (steps.length > maxSteps) maxSteps = steps.length;
    }
    const stepsAvgSeries: BookingProgressData[] = buckets.map((b, i) => ({ x: i + 1, y: b.stepsCount ? Math.round(b.stepsSum / b.stepsCount) : 0, label: monthLabels[i] }));
    const completedSeries: BookingProgressData[] = buckets.map((b, i) => ({ x: i + 1, y: b.completedBookings, label: monthLabels[i] }));
    const completedMax = buckets.reduce((m, b) => Math.max(m, b.completedBookings), 0);
    return { stepsAvgSeries, completedSeries, maxSteps: Math.max(maxSteps, 8), completedMax };
  }
}

// Custom Chart Components
interface ChartProps {
  data: BookingProgressData[];
  timeFrame: TimeFrame;
  width: number;
  height: number;
}

// Build a smooth cubic bezier path from points
function buildSmoothPath(points: {x:number;y:number}[]) {
  if (!points.length) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  const path: string[] = [];
  path.push(`M${points[0].x},${points[0].y}`);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    // Catmull-Rom to Bezier conversion
    const smooth = 0.18; // tension
    const c1x = p1.x + (p2.x - p0.x) * smooth;
    const c1y = p1.y + (p2.y - p0.y) * smooth;
    const c2x = p2.x - (p3.x - p1.x) * smooth;
    const c2y = p2.y - (p3.y - p1.y) * smooth;
    path.push(`C${c1x},${c1y},${c2x},${c2y},${p2.x},${p2.y}`);
  }
  return path.join(' ');
}

const CompletionPie: React.FC<{ completed: number; total: number }> = ({ completed, total }) => {
  const size = 120;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.min(Math.max(completed / total, 0), 1) : 0;

  return (
    <View style={styles.pieWrapper}>
      <View style={styles.pieChartShell}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1c1c1e"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F5CE57"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - ratio)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      </View>
    </View>
  );
};

// Yellow line chart card matching the provided design
const AdminYellowLineCard: React.FC<{
  loading: boolean;
  data: BookingProgressData[];
  timeFrame: TimeFrame;
  range: ChartRange;
  onChangeRange: (r: ChartRange) => void;
  width: number;
  height: number;
}> = ({ loading, data, timeFrame, range, onChangeRange, width, height }) => {
  const padding = { left: 26, right: 20, top: 16, bottom: 42 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Transform data based on timeframe
  const series = React.useMemo(() => {
    if (timeFrame === 'monthly') {
      // Expect x = day 1..31, aggregate into 10-day buckets
      const buckets = [
        { label: '1-10', sum: 0, count: 0 },
        { label: '11-20', sum: 0, count: 0 },
        { label: '21-31', sum: 0, count: 0 },
      ];
      data.forEach((d) => {
        const day = Number(d.x);
        if (!Number.isFinite(day)) return;
        const idx = day <= 10 ? 0 : day <= 20 ? 1 : 2;
        buckets[idx].sum += d.y;
        buckets[idx].count += 1;
      });
      const arr = buckets.map((b, i) => ({ x: i + 1, y: b.count ? b.sum / b.count : 0, label: b.label }));
      return arr;
    } else {
      // yearly: use 12 months as-is
      const arr = data.map((d, i) => ({ x: i + 1, y: d.y, label: d.label || monthLabels[i] }));
      return arr;
    }
  }, [data, timeFrame]);

  // Center line around baseline (average), symmetric positive/negative
  const avg = React.useMemo(() => (series.length ? series.reduce((s, d) => s + d.y, 0) / series.length : 0), [series]);
  const deviations = React.useMemo(() => series.map((d) => d.y - avg), [series, avg]);
  const maxAbs = React.useMemo(() => Math.max(1, Math.ceil(Math.max(...deviations.map((v) => Math.abs(v))) || 1)), [deviations]);
  const getX = (i: number) => (series.length <= 1 ? chartW / 2 : (i / (series.length - 1)) * chartW);
  const baselineY = chartH / 2; // middle of plot area
  const getYFromValue = (v: number) => {
    const dev = v - avg;
    const ratio = (dev + maxAbs) / (2 * maxAbs); // 0..1, 0=most negative, 1=most positive
    return (1 - ratio) * chartH; // invert so positive is up
  };

  const points = series.map((d, i) => ({ x: getX(i), y: getYFromValue(d.y) }));
  const path = buildSmoothPath(points);
  const activeIndex = Math.max(0, Math.min(series.length - 1, Math.floor(series.length / 2)));
  const activeX = getX(activeIndex);
  const activeY = getYFromValue(series[activeIndex]?.y ?? 0);
  return (
    <View style={[styles.card, styles.yellowCard]}> 
      <View style={styles.cardHeaderRow}>
        <View />
        <View style={styles.datePill}>
          <Ionicons name="calendar" size={14} color="#1c1c1e" />
          <Text style={styles.datePillText}>{new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}</Text>
        </View>
      </View>
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <ActivityIndicator size="small" color="#1c1c1e" />
        </View>
      ) : (
        <View style={{ paddingHorizontal: 0 }}>
          <Svg width={width} height={height}>
            {/* Grid lines and Y labels like screenshot */}
            {[0.25, 0.5, 0.75].map((p, idx) => {
              const y = padding.top + chartH * (1 - p);
              return (
                <Path key={`g-${idx}`} d={`M${padding.left},${y} L${width - padding.right},${y}`} stroke="rgba(28,28,30,0.2)" strokeWidth={1} />
              );
            })}

            {/* Y-axis level labels (symmetric around baseline) */}
            {([-maxAbs, -maxAbs/2, 0, maxAbs/2, maxAbs] as number[]).map((val, idx) => {
              const y = padding.top + getYFromValue(avg + val);
              return (
                <SvgText
                  key={`yl-${idx}`}
                  x={padding.left - 10}
                  y={y + 4}
                  fontSize={12}
                  fill="#1c1c1e"
                  textAnchor="end"
                >
                  {val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)}
                </SvgText>
              );
            })}

            {/* Baseline (center) */}
            <Path d={`M${padding.left},${padding.top + baselineY} L${width - padding.right},${padding.top + baselineY}`} stroke="rgba(28,28,30,0.2)" strokeWidth={1} />

            {/* Smooth line centered around baseline */}
            <Path d={path} stroke="#1c1c1e" strokeWidth={3} fill="none" transform={`translate(${padding.left}, ${padding.top})`} strokeLinecap="round" strokeLinejoin="round" />

            {/* Vertical highlight */}
            <Rect x={padding.left + activeX - 18} y={padding.top} width={36} height={chartH} rx={10} fill="#000" opacity={0.06} />

            {/* Dot */}
            <Circle cx={padding.left + activeX} cy={padding.top + activeY} r={6} fill="#1c1c1e" />

            {/* X labels */}
            {series.map((d, i) => (
              <SvgText key={`xl-${i}`} x={padding.left + getX(i)} y={height - 10} fontSize={12} fill="#1c1c1e" textAnchor="middle">{d.label || String(d.x)}</SvgText>
            ))}
          </Svg>
        </View>
      )}
    </View>
  );
};

const MiniBarChart: React.FC<{ data: { key: string; label: string; value: number; highlight?: boolean }[]; width: number; height?: number }> = ({ data, width, height = 200 }) => {
  const padding = { top: 18, bottom: 32, left: 32, right: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const spacingRatio = 0.22;
  const barWidth = chartWidth / (data.length + spacingRatio * (data.length - 1));
  const spacing = barWidth * spacingRatio;

  return (
    <View style={styles.barWrapper}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = padding.top + chartHeight * (1 - p);
          return (
            <Path
              key={`grid-${idx}`}
              d={`M${padding.left},${y} L${width - padding.right},${y}`}
              stroke="rgba(28,28,30,0.12)"
              strokeWidth="1"
            />
          );
        })}

        {data.map((entry, index) => {
          const barHeight = chartHeight * (entry.value / maxValue);
          const x = padding.left + index * (barWidth + spacing);
          const y = padding.top + (chartHeight - barHeight);
          const color = entry.highlight ? '#1c1c1e' : '#F5CE57';
          return (
            <Rect
              key={entry.key}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 4)}
              rx={6}
              fill={color}
            />
          );
        })}
        {data.map((entry, index) => {
          const x = padding.left + index * (barWidth + spacing) + barWidth / 2;
          return (
            <SvgText
              key={`label-${entry.key}`}
              x={x}
              y={height - padding.bottom + 18}
              fontSize="11"
              fill={entry.highlight ? '#1c1c1e' : 'rgba(28,28,30,0.7)'}
              fontWeight={entry.highlight ? '700' : '500'}
              textAnchor="middle"
            >
              {entry.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

const BookingProgressChart: React.FC<ChartProps> = ({ data, timeFrame, width, height }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const padding = { left: 36, right: 24, top: 20, bottom: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const avgValue = useMemo(() => {
    if (!data.length) return 0;
    const total = data.reduce((acc, cur) => acc + cur.y, 0);
    return total / data.length;
  }, [data]);

  const deviations = useMemo(() => data.map((d) => d.y - avgValue), [data, avgValue]);
  const maxAbs = useMemo(() => {
    const raw = Math.max(...deviations.map((v) => Math.abs(v)), 1);
    const nice = Math.ceil(raw / 10) * 10;
    return Math.max(10, nice);
  }, [deviations]);

  const ticks = useMemo(() => {
    const step = maxAbs / 2;
    return [-maxAbs, -step, 0, step, maxAbs];
  }, [maxAbs]);

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [data, timeFrame]);

  const verticalPadding = chartHeight * 0.12;
  const plotHeight = chartHeight - verticalPadding * 2;
  const baselineY = verticalPadding + plotHeight / 2;

  const getX = (index: number) => (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) => {
    if (!maxAbs) return baselineY;
    const deviation = value - avgValue;
    const clamped = Math.max(-maxAbs, Math.min(maxAbs, deviation));
    const ratio = (clamped + maxAbs) / (2 * maxAbs); // 0 to 1
    return verticalPadding + (1 - ratio) * plotHeight;
  };

  // Points and smooth path
  const pts = data.map((point, index) => ({ x: getX(index), y: getY(point.y) }));
  const linePath = buildSmoothPath(pts);

  // Path for area (not used for yellow theme; keeping computed if needed elsewhere)
  const areaPath = linePath + `L${getX(data.length - 1)},${baselineY}L${getX(0)},${baselineY}Z`;

  // Active index (center) for highlight bar & dot
  const activeIndex = Math.max(0, Math.min(data.length - 1, Math.floor(data.length / 2)));
  const activeX = getX(activeIndex);
  const activeY = getY(data[activeIndex]?.y ?? 0);

  return (
    <View style={styles.chartWrapper}>
      <Animated.View style={{ opacity: animatedValue }}>
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#F5B422" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#F5B422" stopOpacity="0.06" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Grid lines */}
          {ticks.map((value, idx) => {
            const y = padding.top + getY(value);
            return (
              <Path
                key={`grid-${idx}`}
                d={`M${padding.left},${y}L${width - padding.right},${y}`}
                stroke="rgba(28,28,30,0.12)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            );
          })}
          
          {/* Vertical highlight bar */}
          <Rect
            x={padding.left + activeX - 18}
            y={padding.top + verticalPadding}
            width={36}
            height={plotHeight}
            rx={10}
            fill="#F9E397"
            opacity={0.45}
          />

          {/* Smooth line */}
          <Path
            d={linePath}
            stroke="#1c1c1e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${padding.left}, ${padding.top})`}
          />
          
          {/* Active dot */}
          <Circle
            cx={padding.left + activeX}
            cy={padding.top + activeY}
            r={6}
            fill="#1c1c1e"
          />

          {/* Tooltip bubble */}
          <Rect
            x={padding.left + activeX - 42}
            y={padding.top + activeY - 46}
            width={84}
            height={28}
            rx={14}
            fill="#FFFFFF"
            stroke="#FFFFFF"
          />
          <Path
            d={`M${padding.left + activeX - 6},${padding.top + activeY - 18} L${padding.left + activeX + 6},${padding.top + activeY - 18} L${padding.left + activeX},${padding.top + activeY - 8} Z`}
            fill="#FFFFFF"
          />
          <SvgText
            x={padding.left + activeX}
            y={padding.top + activeY - 28}
            fontSize="12"
            fontWeight="700"
            fill="#1c1c1e"
            textAnchor="middle"
          >
            {`${data[activeIndex]?.y ?? 0}`}
          </SvgText>
          
          {/* Y-axis labels (symmetric) */}
          {ticks.map((value, idx) => (
            <SvgText
              key={`label-${idx}`}
              x={padding.left - 10}
              y={padding.top + getY(value + avgValue) + 4}
              fontSize="12"
              fill="#1c1c1e"
              textAnchor="end"
            >
              {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
            </SvgText>
          ))}

          {/* X-axis labels at bottom */}
          {data.map((p, i) => (
            <SvgText
              key={`x-${i}`}
              x={padding.left + getX(i)}
              y={height - 18}
              fontSize="12"
              fill="#1c1c1e"
              textAnchor="middle"
            >
              {typeof p.label === 'string' ? p.label : `${p.x}`}
            </SvgText>
          ))}
          
          {/* X-axis labels */}
          {data.map((point, index) => {
            if (timeFrame === 'yearly' || index % 5 === 0) {
              const label = timeFrame === 'yearly' 
                ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]
                : point.x.toString();
              return (
                <SvgText
                  key={index}
                  x={padding.left + getX(index)}
                  y={height - padding.bottom + 18}
                  fontSize="11"
                  fill="rgba(28,28,30,0.7)"
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              );
            }
            return null;
          })}

          {/* Tooltip and guideline */}
          {hoverIndex !== null && data[hoverIndex] && (
            <>
              <Path
                d={`M${padding.left + getX(hoverIndex)},${padding.top} L${padding.left + getX(hoverIndex)},${height - padding.bottom}`}
                stroke="rgba(28,28,30,0.25)"
                strokeDasharray="4,6"
                strokeWidth="1"
              />
              {/* Tooltip bubble */}
              <Defs />
              <SvgText
                x={Math.min(width - 60, Math.max(60, padding.left + getX(hoverIndex)))}
                y={padding.top + getY(data[hoverIndex].y) - 14}
                fontSize="12"
                fill="#1c1c1e"
                textAnchor="middle"
              >
                
              </SvgText>
            </>
          )}
        </Svg>
        {/* Touch overlay */}
        <View
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          pointerEvents="box-only"
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            const x = e.nativeEvent.locationX - padding.left;
            const idx = Math.round((x / chartWidth) * (data.length - 1));
            if (idx >= 0 && idx < data.length) setHoverIndex(idx);
          }}
          onResponderMove={(e) => {
            const x = e.nativeEvent.locationX - padding.left;
            const idx = Math.round((x / chartWidth) * (data.length - 1));
            if (idx >= 0 && idx < data.length) setHoverIndex(idx);
          }}
          onResponderRelease={() => setHoverIndex(null)}
        />
      </Animated.View>
    </View>
  );
};

const StepsCompletionChart: React.FC<ChartProps & { maxSteps: number }> = ({ data, timeFrame, width, height, maxSteps }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const padding = { left: 50, right: 30, top: 20, bottom: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [data, timeFrame]);

  const maxY = Math.max(1, maxSteps || 8);
  const minY = 0;

  const getX = (index: number) => (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) => chartHeight - (value / maxY) * chartHeight;

  const pts = data.map((point, index) => ({ x: getX(index), y: getY(point.y) }));
  const linePath = buildSmoothPath(pts);
  const areaPath = linePath + ` L${getX(data.length - 1)},${chartHeight} L${getX(0)},${chartHeight} Z`;

  return (
    <View style={styles.chartWrapper}>
      <Animated.View style={{ opacity: animatedValue }}>
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="stepsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#1c1c1e" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#1c1c1e" stopOpacity="0.05" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Grid lines */}
          {Array.from({ length: 5 }, (_, i) => Math.round((i * maxY) / 4)).map((value) => {
            const y = padding.top + getY(value);
            return (
              <Path
                key={value}
                d={`M${padding.left},${y}L${width - padding.right},${y}`}
                stroke="rgba(28,28,30,0.12)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            );
          })}
          
          {/* Area fill */}
          <Path
            d={areaPath}
            fill="url(#stepsGradient)"
            transform={`translate(${padding.left}, ${padding.top})`}
          />
          {/* Line */}
          <Path
            d={linePath}
            fill="none"
            stroke="#1c1c1e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${padding.left}, ${padding.top})`}
          />
          
          {/* No point markers per request */}
          
          {/* Y-axis labels */}
          {Array.from({ length: 5 }, (_, i) => Math.round((i * maxY) / 4)).map((value) => (
            <SvgText
              key={value}
              x={padding.left - 10}
              y={padding.top + getY(value) + 4}
              fontSize="12"
              fill="rgba(28,28,30,0.7)"
              textAnchor="end"
            >
              {value}
            </SvgText>
          ))}
          
          {/* X-axis labels */}
          {data.map((point, index) => {
            if (timeFrame === 'yearly' || index % 5 === 0) {
              const label = timeFrame === 'yearly' 
                ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]
                : point.x.toString();
              return (
                <SvgText
                  key={index}
                  x={padding.left + getX(index)}
                  y={height - padding.bottom + 20}
                  fontSize="12"
                  fill="#1c1c1e"
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              );
            }
            return null;
          })}
        </Svg>
      </Animated.View>
    </View>
  );
};

export default function AdminAnalytics({ onBack, onGoHome, onOpenBookings, onOpenStaff, onOpenSettings }: { onBack?: () => void; onGoHome?: () => void; onOpenBookings?: () => void; onOpenStaff?: () => void; onOpenSettings?: () => void }) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch leads from backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getAuthToken();
        const url = `${BASE_URL}/api/admin/leads`;
        const headers: any = { 'Content-Type': 'application/json', ...(token ? { Authorization: token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}` } : {}) };
        const resp = await fetch(url, { headers });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : Array.isArray((data as any)?.leads)
              ? (data as any).leads
              : Array.isArray((data as any)?.items)
                ? (data as any).items
                : [];
        if (mounted) setLeads(list);
      } catch (e) {
        if (mounted) setError((e as any)?.message || 'Failed to load leads');
        if (mounted) setLeads([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Aggregate into series
  const { stepsAvgSeries, completedSeries, maxSteps, completedMax } = useMemo(() => aggregateLeadsToSeries(leads, timeFrame), [leads, timeFrame]);
  // Map to existing vars used in render
  const bookingProgressData = stepsAvgSeries; // top chart: average steps completed over time
  const stepCompletionData = completedSeries; // bottom chart: completed bookings count over time

  // Helpers to filter leads in current timeframe
  const leadsInFrame = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return leads.filter((lead) => {
      const stamp = lead?.updatedAt || lead?.createdAt;
      const d = stamp ? new Date(stamp) : null;
      if (!d) return false;
      if (timeFrame === 'monthly') return d.getFullYear() === y && d.getMonth() === m;
      return d.getFullYear() === y;
    });
  }, [leads, timeFrame]);

  const totalBookings = leadsInFrame.length;
  const completedBookings = leadsInFrame.filter((l) => computePercentFromLead(l) >= 100).length;
  const averageSteps = useMemo(() => {
    const vals = bookingProgressData.map((d) => d.y);
    if (!vals.length) return 0;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg);
  }, [bookingProgressData]);

  const barChartData = useMemo(() => {
    if (!leadsInFrame.length) {
      return weekdayLabels.map((label, idx) => ({ key: `wd-${idx}`, label, value: 0, highlight: idx === new Date().getDay() }));
    }
    const counts = Array(7).fill(0);
    leadsInFrame.forEach((lead) => {
      const stamp = lead?.updatedAt || lead?.createdAt;
      const d = stamp ? new Date(stamp) : null;
      if (!d) return;
      counts[d.getDay()] += 1;
    });
    const peak = Math.max(...counts);
    const peakIndex = counts.indexOf(peak);
    return weekdayLabels.map((label, idx) => ({
      key: `wd-${idx}`,
      label,
      value: counts[idx],
      highlight: peak > 0 ? idx === peakIndex : idx === new Date().getDay(),
    }));
  }, [leadsInFrame]);

  // Optional: range chips UI state (visual only for now)
  const [chartRange, setChartRange] = useState<ChartRange>('1W');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[ '#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73' ]}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.backPill}>
              <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
            </Pressable>
            <Text style={styles.title}>Booking Analytics</Text>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
          >
            {/* Time Frame Selector */}
            <View style={styles.timeFrameContainer}>
              <Text style={styles.sectionTitle}>Time Frame</Text>
              <View style={styles.timeFrameRow}>
                <Pressable 
                  style={[styles.timeFramePill, timeFrame === 'monthly' && styles.timeFramePillActive]}
                  onPress={() => setTimeFrame('monthly')}
                >
                  <Ionicons name="calendar-outline" size={16} color={timeFrame === 'monthly' ? '#FFFFFF' : '#1c1c1e'} />
                  <Text style={[styles.timeFrameText, timeFrame === 'monthly' && styles.timeFrameTextActive]}>Monthly (1-31)</Text>
                </Pressable>
                <Pressable 
                  style={[styles.timeFramePill, timeFrame === 'yearly' && styles.timeFramePillActive]}
                  onPress={() => setTimeFrame('yearly')}
                >
                  <Ionicons name="calendar" size={16} color={timeFrame === 'yearly' ? '#FFFFFF' : '#1c1c1e'} />
                  <Text style={[styles.timeFrameText, timeFrame === 'yearly' && styles.timeFrameTextActive]}>Yearly (Jan-Dec)</Text>
                </Pressable>
              </View>
            </View>

            {/* Key Metrics */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.glassCard]}>
                <View style={styles.metricIcon}>
                  <Ionicons name="checkmark-circle" size={20} color="#F5B422" />
                </View>
                <Text style={styles.metricValue}>{completedBookings}</Text>
                <Text style={styles.metricLabel}>Completed</Text>
              </View>
              <View style={[styles.metricCard, styles.glassCard]}>
                <View style={styles.metricIcon}>
                  <Ionicons name="time-outline" size={20} color="#F5B422" />
                </View>
                <Text style={styles.metricValue}>{totalBookings - completedBookings}</Text>
                <Text style={styles.metricLabel}>In Progress</Text>
              </View>
              <View style={[styles.metricCard, styles.glassCard]}>
                <View style={styles.metricIcon}>
                  <Ionicons name="trending-up" size={20} color="#1c1c1e" />
                </View>
                <Text style={styles.metricValue}>{averageSteps}</Text>
                <Text style={styles.metricLabel}>Avg Steps</Text>
              </View>
            </View>

            <AdminYellowLineCard
              loading={loading}
              data={bookingProgressData}
              timeFrame={timeFrame}
              range={chartRange}
              onChangeRange={setChartRange}
              width={screenWidth - 64}
              height={240}
            />

            <View style={styles.boxRow}>
              <View style={[styles.card, styles.boxCard]}>
                <CompletionPie completed={completedBookings} total={totalBookings} />
              </View>
              <View style={[styles.card, styles.boxCard, styles.boxCardBlack]}>
                <Text style={styles.highlightLabelOnDark}>Total Bookings</Text>
                <Text style={styles.highlightValueOnDark}>{totalBookings}</Text>
              </View>
            </View>

            <View style={[styles.card, styles.glassCard, styles.barCard]}>
              <MiniBarChart data={barChartData} width={screenWidth - 64} />
            </View>

          </ScrollView>
        </SafeAreaView>
        
        {/* Bottom navigation */}
        <BottomNav
          onGoHome={onGoHome}
          onOpenBookings={onOpenBookings}
          onOpenStaff={onOpenStaff}
          onOpenSettings={onOpenSettings}
        />
      </LinearGradient>
    </View>
  );
}

function BottomNav({ onGoHome, onOpenBookings, onOpenStaff, onOpenSettings }: { onGoHome?: () => void; onOpenBookings?: () => void; onOpenStaff?: () => void; onOpenSettings?: () => void }) {
  const [active, setActive] = React.useState<'home' | 'roofs' | 'staff' | 'analytics' | 'settings'>('analytics');

  const Item = ({ id, icon, label }: { id: typeof active; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
    const isActive = active === id;
    const isStaff = id === 'staff';
    const buttonStyles = [
      styles.navButton,
      isStaff ? styles.navButtonStaff : (isActive ? styles.navButtonActive : styles.navButtonInactive),
    ];
    const iconColor = isStaff ? '#1c1c1e' : (isActive ? '#1c1c1e' : 'rgba(255,255,255,0.95)');

    const handlePress = () => {
      void triggerPressHaptic();
      setActive(id);
      if (id === 'home') onGoHome?.();
      if (id === 'roofs') onOpenBookings?.();
      if (id === 'staff') onOpenStaff?.();
      if (id === 'settings') onOpenSettings?.();
    };

    return (
      <Pressable onPress={handlePress} style={styles.navItem} hitSlop={10}>
        <View style={buttonStyles}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <Text style={styles.navLabelHidden}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.bottomNavWrap}>
      <BlurView intensity={28} tint="dark" style={styles.bottomNav}>
        <Item id="home" icon="home-outline" label="Home" />
        <Item id="roofs" icon="grid-outline" label="Bookings" />
        <Item id="staff" icon="people-outline" label="Staff" />
        <Item id="analytics" icon="stats-chart-outline" label="Analytics" />
        <Item id="settings" icon="settings-outline" label="Settings" />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F4F4F6' 
  },
  gradientBackground: { 
    flex: 1, 
    width: '100%', 
    height: '100%' 
  },
  safeArea: { 
    flex: 1 
  },
  
  // Header
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)'
  },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#1c1c1e' 
  },
  
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: { 
    paddingHorizontal: 16, 
    paddingTop: 8, 
    paddingBottom: 160,
    gap: 16,
  },
  timeChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipActive: {
    backgroundColor: '#1c1c1e',
  },
  timeChipText: {
    fontSize: 12,
    color: '#1c1c1e',
    fontWeight: '700',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
  },
  datePillText: {
    fontSize: 12,
    color: '#1c1c1e',
    fontWeight: '700',
  },
  
  // Time Frame Selector
  timeFrameContainer: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 12,
  },
  timeFrameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeFramePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  timeFramePillActive: {
    backgroundColor: '#1c1c1e',
    borderColor: '#1c1c1e',
  },
  timeFrameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  timeFrameTextActive: {
    color: '#FFFFFF',
  },
  
  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,180,34,0.15)',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(28,28,30,0.6)',
    textAlign: 'center',
  },
  
  // Charts
  chartWrapper: {
    alignItems: 'stretch',
    marginTop: 8,
    width: '100%',
  },
  
  // Cards
  card: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  // Yellow themed card (for top line chart)
  yellowCard: {
    backgroundColor: '#F5CE57',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitleDark: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1c1c1e' 
  },
  legendTextDark: { 
    fontSize: 12, 
    fontWeight: '500',
    color: '#1c1c1e' 
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1c1c1e' 
  },
  legendRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  legendDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5 
  },
  legendText: { 
    fontSize: 12, 
    fontWeight: '500',
    color: '#1c1c1e' 
  },

  // Custom boxes row
  boxRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  boxCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  boxCardYellow: {
    backgroundColor: '#F5CE57',
    borderColor: 'transparent',
    shadowColor: '#F5CE57',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  boxCardBlack: {
    backgroundColor: '#1c1c1e',
    borderColor: 'transparent',
    shadowColor: '#000',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  boxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 6,
  },
  boxSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28,28,30,0.7)',
  },
  highlightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(28,28,30,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  highlightValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  highlightLabelOnDark: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  highlightValueOnDark: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  barCard: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
  },

  pieWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  pieChartShell: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  pieValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  pieLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(28,28,30,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pieLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pieLegendDotYellow: {
    backgroundColor: '#F5CE57',
  },
  pieLegendDotBlack: {
    backgroundColor: '#1c1c1e',
  },
  pieLegendText: {
    fontSize: 12,
    color: 'rgba(28,28,30,0.7)',
    fontWeight: '600',
  },
  pieFooterText: {
    fontSize: 11,
    color: 'rgba(28,28,30,0.5)',
  },

  // Insights Card
  insightCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 180, 34, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  insightContent: {
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(28,28,30,0.8)',
  },
  
  // Bottom Navigation
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '94%',
    height: 72,
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 26,
    elevation: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  navButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.26)',
  },
  navButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.32)',
  },
  navButtonStaff: {
    backgroundColor: '#F7CE73',
    borderColor: '#F5C957',
  },
  navLabelHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});