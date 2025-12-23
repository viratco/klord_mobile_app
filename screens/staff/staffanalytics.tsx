import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';
import { triggerPressHaptic } from '../../utils/haptics';

const { width: screenWidth } = Dimensions.get('window');

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type TimeFrame = 'monthly' | 'yearly';

interface StaffAnalyticsProps {
  onBack?: () => void;
  onGoHome?: () => void;
  onOpenTasks?: () => void;
  onOpenSettings?: () => void;
}

const StaffAnalytics: React.FC<StaffAnalyticsProps> = ({ onBack, onGoHome, onOpenTasks, onOpenSettings }) => {
  const [timeFrame, setTimeFrame] = React.useState<TimeFrame>('monthly');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [leads, setLeads] = React.useState<any[]>([]);

  const loadLeads = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
      const resp = await fetch(`${BASE_URL}/api/staff/my-leads`, { headers });
      if (!resp.ok) {
        const message = await resp.text();
        throw new Error(message || `Failed with status ${resp.status}`);
      }
      const json = await resp.json();
      setLeads(Array.isArray(json) ? json : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics data');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const leadsInFrame = React.useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return leads.filter((lead) => {
      const stamp = lead?.updatedAt || lead?.createdAt;
      if (!stamp) return false;
      const d = new Date(stamp);
      if (Number.isNaN(d.getTime())) return false;
      if (timeFrame === 'monthly') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      return d.getFullYear() === currentYear;
    });
  }, [leads, timeFrame]);

  const barChartData = React.useMemo(() => {
    if (!leadsInFrame.length) {
      const today = new Date().getDay();
      return weekdayLabels.map((label, idx) => ({
        key: `wd-${idx}`,
        label,
        value: 0,
        highlight: idx === today,
      }));
    }
    const counts = Array(7).fill(0);
    leadsInFrame.forEach((lead) => {
      const stamp = lead?.updatedAt || lead?.createdAt;
      if (!stamp) return;
      const d = new Date(stamp);
      if (Number.isNaN(d.getTime())) return;
      counts[d.getDay()] += 1;
    });
    const peak = Math.max(...counts);
    const peakIndex = counts.indexOf(peak);
    const fallbackHighlight = new Date().getDay();
    return weekdayLabels.map((label, idx) => ({
      key: `wd-${idx}`,
      label,
      value: counts[idx],
      highlight: peak > 0 ? idx === peakIndex : idx === fallbackHighlight,
    }));
  }, [leadsInFrame]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73']}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} hitSlop={10}>
              <BlurView intensity={24} tint="light" style={styles.backPill}>
                <Ionicons name="arrow-back" size={18} color="#1c1c1e" />
              </BlurView>
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Analytics</Text>
              <Text style={styles.headerSubtitle}>Track progress of your assigned bookings</Text>
            </View>
            <Pressable onPress={loadLeads} hitSlop={10} style={styles.refreshPill}>
              <Ionicons name="refresh" size={18} color="#1c1c1e" />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.chartCard}>
              <View style={styles.chartHeaderRow}>
                <View>
                  <Text style={styles.chartTitle}>Assignments by weekday</Text>
                  <Text style={styles.chartSubtitle}>Distribution of your assigned bookings</Text>
                </View>
                <View style={styles.segmentRow}>
                  <Pressable
                    onPress={() => setTimeFrame('monthly')}
                    style={[styles.segmentBtn, timeFrame === 'monthly' && styles.segmentBtnActive]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.segmentText, timeFrame === 'monthly' && styles.segmentTextActive]}>This month</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTimeFrame('yearly')}
                    style={[styles.segmentBtn, timeFrame === 'yearly' && styles.segmentBtnActive]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.segmentText, timeFrame === 'yearly' && styles.segmentTextActive]}>This year</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.chartBody}>
                {loading ? (
                  <ActivityIndicator size="small" color="#1c1c1e" />
                ) : error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable onPress={loadLeads} style={styles.retryBtn} accessibilityRole="button">
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  </View>
                ) : (
                  <MiniBarChart data={barChartData} width={screenWidth - 64} />
                )}
              </View>
            </View>
          </ScrollView>

          <BottomNav
            onGoHome={onGoHome}
            onOpenTasks={onOpenTasks}
            onOpenAnalytics={() => {}}
            onOpenSettings={onOpenSettings}
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

export default StaffAnalytics;

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
        <Defs>
          <SvgLinearGradient id="staffBarBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(28,28,30,0.05)" />
            <Stop offset="100%" stopColor="rgba(28,28,30,0.01)" />
          </SvgLinearGradient>
        </Defs>

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
          const barHeight = chartHeight * (maxValue ? entry.value / maxValue : 0);
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

const BottomNav: React.FC<{
  onGoHome?: () => void;
  onOpenTasks?: () => void;
  onOpenAnalytics?: () => void;
  onOpenSettings?: () => void;
}> = ({ onGoHome, onOpenTasks, onOpenAnalytics, onOpenSettings }) => {
  const [active, setActive] = React.useState<'home' | 'tasks' | 'analytics' | 'settings'>('analytics');

  const Item = ({ id, icon, label }: { id: typeof active; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
    const isActive = active === id;
    const buttonStyles = [styles.navButton, isActive ? styles.navButtonActive : styles.navButtonInactive];
    const iconColor = isActive ? '#1c1c1e' : 'rgba(255,255,255,0.95)';

    const handlePress = () => {
      void triggerPressHaptic();
      setActive(id);
      if (id === 'home') onGoHome?.();
      if (id === 'tasks') onOpenTasks?.();
      if (id === 'analytics') onOpenAnalytics?.();
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
        <Item id="tasks" icon="list-outline" label="Tasks" />
        <Item id="analytics" icon="stats-chart-outline" label="Analytics" />
        <Item id="settings" icon="settings-outline" label="Settings" />
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F6' },
  gradientBackground: { flex: 1, width: '100%', height: '100%' },
  safeArea: { flex: 1 },
  headerRow: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  refreshPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  headerTitleWrap: { flex: 1, marginLeft: 16, marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1c1c1e' },
  headerSubtitle: { fontSize: 12, color: 'rgba(28,28,30,0.7)', marginTop: 4, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 160, paddingHorizontal: 18, gap: 18 },
  chartCard: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
    gap: 16,
  },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  chartTitle: { fontSize: 18, fontWeight: '800', color: '#1c1c1e' },
  chartSubtitle: { fontSize: 12, color: 'rgba(28,28,30,0.7)', fontWeight: '600', marginTop: 4 },
  segmentRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.06)', padding: 4, gap: 6 },
  segmentBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 999 },
  segmentBtnActive: { backgroundColor: '#1c1c1e' },
  segmentText: { fontSize: 12, fontWeight: '700', color: 'rgba(28,28,30,0.6)' },
  segmentTextActive: { color: '#FFFFFF' },
  chartBody: { alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  barWrapper: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  errorBox: { alignItems: 'center', gap: 12 },
  errorText: { color: '#b00020', fontWeight: '700' },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1c1c1e',
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  emptyText: { color: 'rgba(28,28,30,0.6)', fontWeight: '600' },
  // Bottom nav: glass-pill style
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
  navLabelHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});
