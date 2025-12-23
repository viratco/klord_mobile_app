import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Animated, PanResponder, Dimensions, Easing, Pressable, Platform, Modal, UIManager, LayoutAnimation } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../../utils/config';
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
  const [expandedStep, setExpandedStep] = React.useState<string | null>(null);
  const [steps, setSteps] = React.useState<any[]>([]);
  const [loadingSteps, setLoadingSteps] = React.useState<boolean>(false);
  const [preview, setPreview] = React.useState<{ type: 'image' | 'video'; url: string } | null>(null);

  React.useEffect(() => {
    if (Platform.OS === 'android' && (UIManager as any)?.setLayoutAnimationEnabledExperimental) {
      (UIManager as any).setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const sheetPct = React.useRef(new Animated.Value(EXPANDED)).current; // percentage of full screen height
  const currentPctRef = React.useRef(EXPANDED);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Helper: resolve URL for device (prefix BASE_URL for relative paths; avoid localhost on device)
  const resolveUrl = React.useCallback((raw?: string): string => {
    const val = String(raw || '');
    if (!val) return '';
    const isHttp = /^https?:\/\//i.test(val);
    if (isHttp) return val;
    const base = BASE_URL.replace('localhost', Platform.OS !== 'web' ? '127.0.0.1' : 'localhost');
    return `${base}${val.startsWith('/') ? val : `/${val}`}`;
  }, []);

  // Inline component to render a video with generated thumbnail, tap to play
  const StepVideo: React.FC<{ url: string }> = ({ url }) => {
    const [thumb, setThumb] = React.useState<string | null>(null);
    React.useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const result = await VideoThumbnails.getThumbnailAsync(url, { time: 1000 });
          if (mounted) setThumb(result.uri);
        } catch (e) {
        }
      })();
      return () => {
        mounted = false;
      };
    }, [url]);
    return (
      <Pressable style={styles.videoWrap} onPress={() => setPreview({ type: 'video', url })}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.videoPlayer} resizeMode="cover" />
        ) : (
          <View style={[styles.videoPlayer, { backgroundColor: '#000' }]} />
        )}
        <View style={styles.playOverlay}>
          <Ionicons name="play" size={22} color="#fff" />
        </View>
      </Pressable>
    );
  };

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

  // Load steps for this lead (admin view)
  React.useEffect(() => {
    const run = async () => {
      try {
        setLoadingSteps(true);
        const token = await getAuthToken();
        const resp = await fetch(`${BASE_URL}/api/admin/leads/${booking.id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        if (Array.isArray(data?.steps)) setSteps(data.steps);
      } catch (e) {
        console.warn('[adminBookingDetails] load steps failed', (e as any)?.message || e);
        setSteps([]);
      } finally {
        setLoadingSteps(false);
      }
    };
    run();
  }, [booking?.id]);

  // Refresh steps to get freshly presigned S3 URLs (when expanding a step after some time)
  const refreshSteps = React.useCallback(() => {
    (async () => {
      try {
        const token = await getAuthToken();
        const resp = await fetch(`${BASE_URL}/api/admin/leads/${booking.id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (Array.isArray(data?.steps)) setSteps(data.steps);
      } catch { }
    })();
  }, [booking?.id]);

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
              {(Array.isArray(steps) && steps.length > 0
                ? steps
                : [
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
                ].map((label, idx) => ({ id: `default-${idx}`, name: label, completed: false }))
              ).map((step: any, idx: number) => {
                // Helper function to get urgency colors based on days overdue
                const getUrgencyColors = (days: number) => {
                  if (days === 0) return null;
                  const colorMap: { [key: number]: { bg: string, border: string, text: string, numberBg: string, label: string } } = {
                    1: { bg: '#FFF9E6', border: '#F59E0B', text: '#F59E0B', numberBg: '#FEF3C7', label: 'Due Soon' },
                    2: { bg: '#FFF4E0', border: '#FB923C', text: '#FB923C', numberBg: '#FFEDD5', label: 'Attention' },
                    3: { bg: '#FFEDD5', border: '#F97316', text: '#F97316', numberBg: '#FED7AA', label: 'Urgent' },
                    4: { bg: '#FEE2E2', border: '#EF4444', text: '#EF4444', numberBg: '#FECACA', label: 'Very Urgent' },
                    5: { bg: '#FFF5F5', border: '#E53935', text: '#E53935', numberBg: '#FFEBEE', label: 'CRITICAL' }
                  };
                  return colorMap[Math.min(days, 5)];
                };

                const daysOverdue = step.dueDays || 0;
                const urgencyColors = getUrgencyColors(daysOverdue);

                return (
                  <View key={step.id || step.name}>
                    <Pressable
                      style={[
                        styles.stepPill,
                        step.completed && styles.stepPillCompleted,
                        urgencyColors && { backgroundColor: urgencyColors.bg, borderColor: urgencyColors.border, borderWidth: 1 },
                        expandedStep === (step.name || step.id) && styles.stepPillExpanded
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setExpandedStep(prev => {
                          const next = prev === (step.name || step.id) ? null : (step.name || step.id);
                          if (next) {
                            refreshSteps();
                          }
                          return next;
                        });
                      }}
                    >
                      <View style={[
                        styles.stepNumber,
                        step.completed && styles.stepNumberCompleted,
                        urgencyColors && { backgroundColor: urgencyColors.numberBg }
                      ]}>
                        <Text style={[
                          styles.stepNumberText,
                          step.completed && styles.stepNumberTextCompleted,
                          urgencyColors && { color: urgencyColors.text }
                        ]}>
                          {step.completed ? '✓' : idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.stepLabel,
                          step.completed && styles.stepLabelCompleted,
                          urgencyColors && { color: urgencyColors.text }
                        ]}>{step.name}</Text>
                        {!step.completed && urgencyColors && (
                          <Text style={{ fontSize: 11, color: urgencyColors.text, fontWeight: '700', marginTop: 2 }}>
                            {urgencyColors.label}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name={expandedStep === (step.name || step.id) ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#1c1c1e"
                        style={{ marginLeft: 'auto' }}
                      />
                    </Pressable>

                    {expandedStep === (step.name || step.id) && (
                      <View style={styles.expandedSection}>
                        {!step.completed && (
                          <Text style={styles.expandedText}>This step is not completed yet.</Text>
                        )}
                        {!!step.completed && (
                          <>
                            <View style={styles.completedRow}>
                              <View style={styles.completedBadge}>
                                <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                                <Text style={styles.completedBadgeText}>Completed</Text>
                              </View>
                              <View style={styles.completedDateRow}>
                                <Ionicons name="calendar-outline" size={14} color="rgba(0,0,0,0.55)" />
                                <Text style={styles.completedDateText}>{new Date(step.completedAt || Date.now()).toLocaleDateString()}</Text>
                              </View>
                            </View>

                            <View style={styles.notesCard}>
                              <Text style={styles.notesTitle}>Technician Notes</Text>
                              {step.completionNotes ? (
                                <Text style={styles.notesBody}>{step.completionNotes}</Text>
                              ) : (
                                <Text style={styles.notesEmpty}>No additional notes.</Text>
                              )}
                            </View>

                            {/* Step media */}
                            <View style={styles.mediaCard}>
                              <Text style={styles.mediaTitle}>Evidence</Text>
                              {Array.isArray(step.medias) && step.medias.length > 0 ? (
                                <View style={styles.mediaGrid}>
                                  {step.medias.map((m: any) => {
                                    const url: string = resolveUrl(m?.url);
                                    if (m.type === 'image') {
                                      return (
                                        <Pressable key={m.id} onPress={() => setPreview({ type: 'image', url })}>
                                          <Image
                                            source={{ uri: url }}
                                            style={styles.mediaThumb}
                                            resizeMode="cover"
                                            onError={() => console.warn('[admin] image failed', url)}
                                          />
                                        </Pressable>
                                      );
                                    }
                                    return <StepVideo key={m.id} url={url} />;
                                  })}
                                </View>
                              ) : (
                                <Text style={styles.emptyMediaText}>No media attached.</Text>
                              )}
                            </View>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
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
                <Text style={styles.billingValue}>{Math.round((booking.percent / 100) * 12)}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Remaining Steps</Text>
                <Text style={styles.billingValue}>{12 - Math.round((booking.percent / 100) * 12)}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Project Status</Text>
                <Text style={[styles.billingValue, { color: booking.percent >= 100 ? '#4CAF50' : '#FFA500' }]}>
                  {booking.percent >= 100 ? 'Completed' : 'In Progress'}
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
          <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
            <View style={styles.previewModal}>
              <Pressable style={styles.previewBackdrop} onPress={() => setPreview(null)} />
              <View style={styles.previewContent}>
                <Pressable style={styles.previewClose} onPress={() => setPreview(null)}>
                  <Ionicons name="close" size={20} color="#1c1c1e" />
                </Pressable>
                {preview?.type === 'image' ? (
                  <Image source={{ uri: preview.url }} style={styles.previewImage} resizeMode="contain" />
                ) : preview?.type === 'video' ? (
                  <Video
                    style={styles.previewVideo}
                    source={{ uri: preview.url }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping={false}
                  />
                ) : null}
              </View>
            </View>
          </Modal>
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
    marginTop: 0,
    marginBottom: 10,
    marginHorizontal: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  stepPillExpanded: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  stepNotes: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  stepCompletedAt: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
  },
  completedBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  completedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedDateText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.55)',
  },
  notesCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  notesTitle: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.7)',
    fontWeight: '700',
    marginBottom: 4,
  },
  notesBody: {
    fontSize: 13,
    color: '#1c1c1e',
    lineHeight: 18,
  },
  notesEmpty: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)'
  },
  expandedText: {
    fontSize: 13,
    color: '#1c1c1e',
    fontFamily: 'Inter_500Medium',
    marginBottom: 10,
  },
  mediaCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  mediaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaThumb: {
    width: 112,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#F2F2F4',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  videoWrap: {
    width: 160,
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  videoPlayer: {
    width: '100%',
    height: '100%'
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)'
  },
  videoTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F7CE73',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)'
  },
  videoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1c1c1e'
  },
  emptyMediaText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)'
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
  },
  stepNumberTextCompleted: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 16,
    lineHeight: 20,
    color: '#1c1c1e',
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
  previewModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject as any,
  },
  previewContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    maxHeight: '80%',
  },
  previewClose: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)'
  },
  previewImage: {
    width: Dimensions.get('window').width - 64,
    height: Dimensions.get('window').height * 0.6,
    alignSelf: 'center',
  },
  previewVideo: {
    width: Dimensions.get('window').width - 64,
    height: Dimensions.get('window').height * 0.6,
    alignSelf: 'center',
  },
});