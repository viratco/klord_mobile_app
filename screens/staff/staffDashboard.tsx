import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';
import { triggerPressHaptic } from '../../utils/haptics';

export default function StaffDashboard({ onBack, onOpenTasks, onOpenSettings, onOpenAmc, onOpenComplaints, onOpenAnalytics }: { onBack?: () => void; onOpenTasks?: () => void; onOpenSettings?: () => void; onOpenAmc?: () => void; onOpenComplaints?: () => void; onOpenAnalytics?: () => void }) {
  // Work timer state
  const [isWorking, setIsWorking] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [accumulatedSec, setAccumulatedSec] = React.useState(0); // seconds
  const [tick, setTick] = React.useState(0); // rerender ticker
  const [savedLog, setSavedLog] = React.useState<{ date: string; seconds: number } | null>(null);

  // Animations for record button
  const scaleAnim = React.useRef(new Animated.Value(1)).current; // bounce on start/end
  const pulseAnim = React.useRef(new Animated.Value(0)).current; // 0..1 for outer ripple

  // Ticking effect when working (not paused)
  const isRunning = isWorking && !isPaused;
  React.useEffect(() => {
    if (!isRunning || !startedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning, startedAt]);

  const totalSeconds = React.useMemo(() => {
    if (!isRunning || !startedAt) return accumulatedSec;
    const now = Date.now();
    return accumulatedSec + Math.floor((now - startedAt) / 1000);
  }, [isRunning, startedAt, accumulatedSec, tick]);

  const fmtTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const bounce = () => {
    scaleAnim.setValue(0.9);
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
  };

  const startPulse = () => {
    pulseAnim.setValue(0);
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation(() => {
      pulseAnim.setValue(0);
    });
  };

  React.useEffect(() => {
    if (isRunning) startPulse(); else stopPulse();
  }, [isRunning]);

  const onStartOrResume = () => {
    if (isWorking && isPaused) {
      // resume
      setStartedAt(Date.now());
      setIsPaused(false);
      bounce();
      return;
    }
    if (!isWorking) {
      // fresh start
      setStartedAt(Date.now());
      setIsWorking(true);
      setIsPaused(false);
      bounce();
    }
  };

  const onPause = () => {
    if (!isWorking || isPaused) return;
    if (startedAt) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setAccumulatedSec((prev) => prev + elapsed);
    }
    setStartedAt(null);
    setIsPaused(true);
    bounce();
  };

  const persistWorkLog = React.useCallback(async (secs: number) => {
    try {
      if (!secs || secs <= 0) return;
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
      const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const url = `${BASE_URL}/api/staff/timesheet`;
      const body = JSON.stringify({ date: dateStr, seconds: secs });
      const resp = await fetch(url, { method: 'POST', headers, body });
      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        console.warn('[timesheet] save failed', resp.status, t);
      }
      else {
        let total = secs;
        try {
          const j = await resp.json();
          if (j && typeof j.seconds === 'number') total = j.seconds;
        } catch {}
        setSavedLog({ date: dateStr, seconds: total });
      }
    } catch (e) {
      console.warn('[timesheet] error', (e as any)?.message || String(e));
    }
  }, []);

  const onEndWorkToday = () => {
    // Finalize today's session and persist immediately for today's date
    let finalSeconds = accumulatedSec;
    if (startedAt) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      finalSeconds += elapsed;
      setAccumulatedSec((prev) => prev + elapsed);
    }
    // Persist for the specific staff via token on the API
    persistWorkLog(finalSeconds);
    setStartedAt(null);
    setIsPaused(false);
    setIsWorking(false);
    bounce();
    // Optionally reset for next day: keep the number on screen until next start
  };

  React.useEffect(() => {
    // When a workday ends (transition from working to not working), persist the totalSeconds snapshot
    // We trigger on isWorking flag change plus accumulatedSec updates.
    // totalSeconds already accounts for active timer; after end, it's equal to accumulatedSec.
    if (!isWorking && accumulatedSec > 0) {
      persistWorkLog(accumulatedSec);
    }
  }, [isWorking, accumulatedSec, persistWorkLog]);

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
        {/* Vignettes and overlays for depth */}
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.10)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.leftVignette} />
        <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,0.10)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.rightVignette} />
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.06)', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.topVignette} />
        <LinearGradient pointerEvents="none" colors={['rgba(247, 206, 115, 0.65)', 'rgba(247, 206, 115, 0)']} start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }} style={styles.bottomGlow} />

        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10}>
              <BlurView intensity={24} tint="light" style={styles.backPill}>
                <Ionicons name="arrow-back" size={18} color="#1c1c1e" />
              </BlurView>
            </Pressable>
            <Pressable style={styles.glassDropdown} hitSlop={10} onPress={() => {}}>
              <BlurView intensity={24} tint="light" style={styles.glassDropdown}>
                <View style={styles.dropdownInner}>
                  <Text style={styles.dropdownLabel}>My queue</Text>
                  <Ionicons name="chevron-down" size={18} color="#1c1c1e" />
                </View>
              </BlurView>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.titleMain}>Staff Dashboard</Text>

            {/* Stats */}
            <View style={styles.statsRowColumns}>
              <View style={styles.statsColumn}>
                <View style={[styles.statCard, styles.statCardYellow]}> 
                  <Text style={styles.statLabel}>Assigned bookings</Text>
                  <Text style={styles.statValue}>8</Text>
                  <Text style={styles.statSub}>View tasks</Text>
                  <View style={[styles.arrowPill, styles.arrowPillBlack]}> 
                    <Ionicons name="arrow-forward" size={16} color="#F5CE57" style={styles.arrowNE} />
                  </View>
                </View>
                <Pressable style={[styles.statCard, styles.statCardDark]} onPress={() => onOpenComplaints?.()} accessibilityRole="button" hitSlop={8}> 
                  <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.85)' }]}>Complaints call</Text>
                  <Text style={[styles.statValue, { color: '#FFFFFF' }]}>3</Text>
                  <Text style={[styles.statSub, { color: 'rgba(255,255,255,0.75)' }]}>Calls today</Text>
                  <View style={[styles.arrowPill, styles.arrowPillAlt]}> 
                    <Ionicons name="arrow-forward" size={16} color="#1c1c1e" style={styles.arrowNE} />
                  </View>
                </Pressable>
              </View>
              <View style={styles.statsColumn}>
                <View style={[styles.statCard, styles.statCardDark]}> 
                  <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.85)' }]}>Completed</Text>
                  <Text style={[styles.statValue, { color: '#FFFFFF' }]}>15</Text>
                  <Text style={[styles.statSub, { color: 'rgba(255,255,255,0.75)' }]}>Past 7 days</Text>
                  <View style={[styles.arrowPill, styles.arrowPillAlt]}> 
                    <Ionicons name="arrow-forward" size={16} color="#1c1c1e" style={styles.arrowNE} />
                  </View>
                </View>
                <Pressable style={[styles.statCard, styles.statCardYellow]} onPress={() => onOpenAmc?.()} accessibilityRole="button" hitSlop={8}> 
                  <Text style={styles.statLabel}>AMC Calls</Text>
                  <Text style={styles.statValue}>2</Text>
                  <Text style={styles.statSub}>Service visits</Text>
                  <View style={[styles.arrowPill, styles.arrowPillBlack]}> 
                    <Ionicons name="arrow-forward" size={16} color="#F5CE57" style={styles.arrowNE} />
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Work timer */}
            <View style={styles.quickWrap}>
              <BlurView intensity={24} tint="light" style={styles.quickCard}>
                <Text style={styles.quickTitle}>Start your work</Text>
                <View style={styles.workRow}>
                  <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
                    {/* Pulse ring */}
                    {isRunning && (
                      <Animated.View
                        style={[
                          styles.pulseRing,
                          {
                            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
                          },
                        ]}
                      />
                    )}
                    {/* Record button */}
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                      <Pressable onPress={onStartOrResume} style={[styles.recordBtn, (isRunning || isPaused) && styles.recordBtnActive]} accessibilityRole="button">
                        <View style={[styles.recordDot, (isRunning || isPaused) && styles.recordDotActive]} />
                      </Pressable>
                    </Animated.View>
                  </View>
                  <View style={styles.timerCol}>
                    <Text style={styles.timerLabel}>
                      {isRunning ? 'Recording time…' : (isPaused ? 'Paused' : 'Tap to start recording')}
                    </Text>
                    <Text style={styles.timerValue}>{fmtTime(totalSeconds)}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                  <Pressable
                    onPress={onPause}
                    style={[styles.ctrlBtn, (!isWorking || isPaused) && styles.ctrlBtnDisabled]}
                    disabled={!isWorking || isPaused}
                  >
                    <Text style={[styles.ctrlBtnText, (!isWorking || isPaused) && styles.ctrlBtnTextDisabled]}>Pause</Text>
                  </Pressable>
                  <Pressable onPress={onEndWorkToday} style={[styles.ctrlBtn, styles.ctrlBtnDanger]}>
                    <Text style={[styles.ctrlBtnText, styles.ctrlBtnTextDanger]}>End work for today</Text>
                  </Pressable>
                </View>
                {!!accumulatedSec && !isWorking && (
                  <Text style={styles.timerHint}>Session paused. Press the red button to resume.</Text>
                )}
              </BlurView>
            </View>

            {savedLog && (
              <View style={[styles.quickWrap, { marginTop: 12 }]}>
                <BlurView intensity={24} tint="light" style={styles.quickCard}>
                  <Text style={styles.quickTitle}>Today's work recorded</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={styles.statLabel}>Date</Text>
                    <Text style={styles.statValue}>{savedLog.date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={styles.statLabel}>Time done</Text>
                    <Text style={styles.statValue}>{fmtTime(savedLog.seconds)}</Text>
                  </View>
                </BlurView>
              </View>
            )}
          </ScrollView>

          {/* Bottom navigation */}
          <BottomNav onOpenTasks={onOpenTasks} onOpenSettings={onOpenSettings} onOpenAnalytics={onOpenAnalytics} />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function BottomNav({ onOpenTasks, onOpenSettings, onOpenAnalytics }: { onOpenTasks?: () => void; onOpenSettings?: () => void; onOpenAnalytics?: () => void }) {
  const [active, setActive] = React.useState<'home' | 'tasks' | 'analytics' | 'settings'>('home');

  const Item = ({ id, icon, label }: { id: typeof active; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
    const isActive = active === id;
    const buttonStyles = [styles.navButton, isActive ? styles.navButtonActive : styles.navButtonInactive];
    const iconColor = isActive ? '#1c1c1e' : 'rgba(255,255,255,0.95)';

    const handlePress = () => {
      void triggerPressHaptic();
      setActive(id);
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F6' },
  gradientBackground: { flex: 1, width: '100%', height: '100%' },
  safeArea: { flex: 1 },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
  },
  glassDropdown: {
    height: 45,
    borderRadius: 222,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
    minWidth: 171,
  },
  dropdownInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  dropdownLabel: { fontSize: 14, color: '#1c1c1e' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  titleMain: {
    marginTop: 40,
    paddingHorizontal: 20,
    fontSize: 26,
    lineHeight: 34,
    color: '#1c1c1e',
    fontFamily: 'Bambino-Light',
    letterSpacing: 0.2,
  },
  statsRowColumns: { marginTop: 26, paddingHorizontal: 20, flexDirection: 'row', gap: 12 },
  statsColumn: { flex: 1, gap: 12 },
  statCard: {
    borderRadius: 22,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  statCardYellow: { backgroundColor: '#F5CE57', minHeight: 160 },
  statCardDark: { backgroundColor: '#232428' },
  statLabel: { fontSize: 14, color: '#1c1c1e', marginBottom: 6, fontWeight: '600' },
  statValue: { fontSize: 26, fontWeight: '800', color: '#1c1c1e', marginBottom: 10 },
  statSub: { fontSize: 13, color: 'rgba(0,0,0,0.7)' },
  arrowPill: {
    position: 'absolute', right: 12, bottom: 12, width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAD27A',
  },
  arrowPillAlt: { backgroundColor: '#F5CE57' },
  arrowPillBlack: { backgroundColor: '#1c1c1e' },
  arrowNE: { transform: [{ rotate: '-45deg' }] },

  quickWrap: { marginTop: 18, paddingHorizontal: 20 },
  quickCard: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
    minHeight: 120,
  },
  quickTitle: { fontSize: 16, fontWeight: '700', color: '#1c1c1e', marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F7CE73', borderRadius: 12, paddingHorizontal: 14, height: 40,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)'
  },
  quickBtnText: { color: '#1c1c1e', fontWeight: '700' },

  // Work timer styles
  workRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 6,
  },
  recordBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)'
  },
  recordBtnActive: {
    backgroundColor: '#D32F2F',
  },
  recordDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFCDD2',
  },
  recordDotActive: {
    backgroundColor: '#FFEBEE',
  },
  timerCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  timerLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.65)',
    fontWeight: '600',
  },
  timerValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  timerHint: {
    marginTop: 10,
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '600',
  },

  // Animated pulse ring behind record button
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F44336',
  },

  // Control buttons (Pause, End work for today)
  ctrlBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)'
  },
  ctrlBtnDisabled: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderColor: 'rgba(0,0,0,0.08)'
  },
  ctrlBtnDanger: {
    backgroundColor: '#D32F2F',
    borderColor: '#B71C1C',
  },
  ctrlBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ctrlBtnTextDisabled: {
    color: 'rgba(0,0,0,0.35)',
    fontWeight: '700',
  },
  ctrlBtnTextDanger: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  bottomNavWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 24,
    paddingHorizontal: 16, paddingBottom: 0,
  },
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '94%', height: 72, backgroundColor: 'transparent', borderRadius: 999, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 26, elevation: 16, overflow: 'hidden', alignSelf: 'center'
  },
  navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
  navButton: {
    width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  navButtonInactive: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.26)' },
  navButtonActive: { backgroundColor: '#FFFFFF', borderColor: 'rgba(255,255,255,0.32)' },
  navLabelHidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },

  leftVignette: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 24 },
  rightVignette: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 24 },
  topVignette: { position: 'absolute', left: 0, right: 0, top: 0, height: 80 },
  bottomGlow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 },
});

