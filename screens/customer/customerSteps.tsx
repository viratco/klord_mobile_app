import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Animated, PanResponder, Dimensions, Easing, Pressable, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuthToken } from '../../utils/auth';
import { triggerPressHaptic } from '../../utils/haptics';

type BookingDetailsProps = {
  onBack: () => void;
  onViewDetails?: () => void;
  booking: {
    id: string;
    name: string;
    role: string;
    percent: number;
  };
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function BookingDetails({ onBack, onViewDetails, booking }: BookingDetailsProps) {
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const EXPANDED = 0.5; // 50% height (3/6)
  const COLLAPSED = 0.25; // 25% height (1.5/6)
  const [assigned, setAssigned] = React.useState(false);
  // No expand/notes in customer view
  const [lead, setLead] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        if (!BASE_URL || !booking?.id) return;
        setLoading(true);
        setError(null);
        const token = await getAuthToken();
        const res = await fetch(`${BASE_URL}/api/customer/leads/${booking.id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(t || `Failed ${res.status}`);
        }
        const data = await res.json();
        if (mounted) setLead(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load details');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false };
  }, [BASE_URL, booking?.id]);

  // Derive percent and labels from fetched lead when available
  const percent = typeof lead?.percent === 'number' ? lead.percent : (typeof booking?.percent === 'number' ? booking.percent : 0);
  const completedStepsCount = Math.round((percent / 100) * 12);

  const sheetPct = React.useRef(new Animated.Value(EXPANDED)).current; // percentage of full screen height
  const currentPctRef = React.useRef(EXPANDED);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const id = sheetPct.addListener(({ value }) => (currentPctRef.current = value));
    return () => sheetPct.removeListener(id);
  }, [sheetPct]);

  const startPctRef = React.useRef(currentPctRef.current);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        // Allow taps on inner controls (like back button). Start pan only after movement.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          startPctRef.current = currentPctRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          // Use gesture.dy directly: up (negative dy) should reduce height towards COLLAPSED
          const delta = gesture.dy / windowHeight;
          let next = startPctRef.current + delta;
          if (next < COLLAPSED) next = COLLAPSED;
          if (next > EXPANDED) next = EXPANDED;
          sheetPct.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          void triggerPressHaptic();
          const midpoint = (EXPANDED + COLLAPSED) / 2;
          // Upward swipe (vy < 0) => collapse; Downward swipe (vy > 0) => expand
          let target: number;
          if (gesture.vy < -0.2) {
            target = COLLAPSED;
          } else if (gesture.vy > 0.2) {
            target = EXPANDED;
          } else {
            target = currentPctRef.current < midpoint ? COLLAPSED : EXPANDED;
          }
          Animated.timing(sheetPct, {
            toValue: target,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        },
      }),
    [windowHeight]
  );

  // Remove overlay scroll; rely on drag anywhere on the sheet

  const animatedHeight = sheetPct.interpolate({ inputRange: [0, 1], outputRange: [0, windowHeight] });
  // Animate billing rows: fully visible at EXPANDED, hidden above notch at COLLAPSED
  const progress = sheetPct.interpolate({
    inputRange: [COLLAPSED, EXPANDED],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const billingTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-(insets.top + 140), 0],
  });
  const billingOpacity = progress;
  // Steps stick just below the sheet: position by top = animatedHeight

  // Build steps data: merge server steps with default 12-step list
  const defaultLabels = [
    'Meeting',
    'Survey',
    'Structure Install',
    'Civil Work',
    'Wiring',
    'Panel Installation',
    'Net Metering',
    'Testing',
    'Full Plant Start',
    'Subsidy Process Request',
    'Subsidy Disbursement',
    'Certificate',
  ];

  const dbSteps = Array.isArray(lead?.steps) ? lead.steps : [];
  const stepsData = defaultLabels.map((label, idx) => {
    const found = dbSteps.find((s: any) => s.name === label);
    if (found) return { ...found, order: idx };
    return { id: `default-${idx}`, name: label, order: idx, completed: false };
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[
          '#ECECEC',
          '#E6E6E8',
          '#EDE5D6',
          '#F3DDAF',
          '#F7CE73',
        ]}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          {/* Left steps: scrollable, anchored under the sheet (assign banner removed) */}
          <Animated.View style={[styles.stepsContainer, { top: animatedHeight }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.stepsContent}
            >
              {stepsData.map((step: any, idx: number) => (
                <View key={step.id || step.name || idx}>
                  <View style={[styles.stepPill, step.completed && styles.stepPillCompleted]}>
                    <View style={[styles.stepNumber, step.completed && styles.stepNumberCompleted]}>
                      <Text style={[styles.stepNumberText, step.completed && styles.stepNumberTextCompleted]}>
                        {step.completed ? '✓' : idx + 1}
                      </Text>
                    </View>
                    <Text style={[styles.stepLabel, step.completed && styles.stepLabelCompleted]}>{step.name}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
          {/* Draggable black sheet (pan anywhere on it) */}
          <Animated.View
            style={[
              styles.topSheet,
              { paddingTop: insets.top, height: animatedHeight },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.grabberHandle}>
              <View style={styles.grabber} />
            </View>

            {/* Step progress rows that hide when collapsed */}
            <Animated.View style={[styles.billingContainer, { opacity: billingOpacity, transform: [{ translateY: billingTranslateY }] }]}>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Total Steps</Text>
                <Text style={styles.billingValue}>12</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Completed Steps</Text>
                <Text style={styles.billingValue}>{completedStepsCount}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Remaining Steps</Text>
                <Text style={styles.billingValue}>{12 - completedStepsCount}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Project Status</Text>
                <Text style={[styles.billingValue, { color: percent >= 100 ? '#4CAF50' : '#FFA500' }]}>
                  {percent >= 100 ? 'Completed' : 'In Progress'}
                </Text>
              </View>
            </Animated.View>

            <View style={styles.bottomContainer}>
              <Pressable onPress={onBack} hitSlop={10} style={styles.backCircle}>
                <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              </Pressable>
              {/* Quick link to preview details (bookingdetail2) */}
              {onViewDetails && (
                <Pressable onPress={onViewDetails} hitSlop={10} style={styles.viewDetailsPill}>
                  <Text style={styles.viewDetailsText}>View details</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1c1c1e" />
                </Pressable>
              )}
              <View style={styles.stepsProgressWrap}>
                <View style={styles.stepsProgressTrack}>
                  <View style={[styles.stepsProgressFill, { width: `${Math.max(6, booking.percent)}%` }]}>
                  </View>
                </View>
                <Text style={styles.stepsProgressLabel}>{`${Math.round((booking.percent / 100) * 12)} of 12 steps completed`}</Text>
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  topSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#191A1C',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    zIndex: 2,
  },
  stepsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  stepsContent: {
    paddingTop: 16,
    paddingBottom: 36,
    gap: 12,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    minHeight: 64,
  },
  stepPillCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  expandedSection: {
    marginTop: 8,
    marginBottom: 10,
    marginHorizontal: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  expandedText: {
    fontSize: 13,
    color: '#1c1c1e',
    fontFamily: 'Inter_500Medium',
    marginBottom: 10,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaThumb: {
    width: 80,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E8E8EA',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  stepNumberCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepNumberText: {
    fontSize: 14,
    color: '#1c1c1e',
    fontFamily: 'Inter_700Bold',
  },
  stepNumberTextCompleted: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 16,
    lineHeight: 20,
    color: '#1c1c1e',
    fontFamily: 'Inter_500Medium',
  },
  stepLabelCompleted: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  grabber: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    width: 64,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  grabberHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  billingContainer: {
    paddingTop: 28,
    paddingHorizontal: 20,
    gap: 12,
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billingLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_500Medium',
  },
  billingValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 20,
  },
  viewDetailsPill: {
    position: 'absolute',
    right: 20,
    top: -30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7CE73',
    borderColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 36,
  },
  viewDetailsText: {
    color: '#1c1c1e',
    fontSize: 13,
    fontWeight: '700',
  },
  backCircle: {
    position: 'absolute',
    left: 20,
    top: -30,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    zIndex: 3,
  },
  assignedNamePill: {
    position: 'absolute',
    right: 20,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  assignedNameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  forText: {
    marginTop: 16,
    paddingHorizontal: 20,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
  },
  totalText: {
    marginTop: 72,
    paddingHorizontal: 20,
    fontSize: 45,
    lineHeight: 54,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
    letterSpacing: 0.5,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  // Steps progress styles
  stepsProgressWrap: {
    marginTop: 36,
    paddingHorizontal: 20,
  },
  stepsProgressTrack: {
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  stepsProgressFill: {
    height: '100%',
    backgroundColor: '#F7CE73',
  },
  stepsProgressLabel: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_500Medium',
  },
});