import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Linking,
  Pressable,
  LayoutAnimation,
  UIManager,
  Image,
  Modal,
  TextInput,
  InputAccessoryView,
  Animated,
  PanResponder,
  Easing
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';

type StaffStepsProps = {
  onBack: () => void;
  booking: {
    id: string;
    projectType: string;
    fullName: string;
    city: string;
    state: string;
    country: string;
    percent: number;
  };
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function StaffSteps({ onBack, booking }: StaffStepsProps) {
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const EXPANDED = 0.5; // 50% height (3/6)
  const COLLAPSED = 0.25; // 25% height (1.5/6)

  const sheetPct = React.useRef(new Animated.Value(EXPANDED)).current; // percentage of full screen height
  const currentPctRef = React.useRef(EXPANDED);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Fetch full booking details and steps
  const [lead, setLead] = React.useState<any | null>(null);
  const [steps, setSteps] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  const [completingStep, setCompletingStep] = React.useState<any>(null);
  const [completionNotes, setCompletionNotes] = React.useState<string>('');
  const [showCompletionModal, setShowCompletionModal] = React.useState<boolean>(false);
  const [isCompleting, setIsCompleting] = React.useState<boolean>(false);
  // State for viewing step details
  const [viewingStep, setViewingStep] = React.useState<any>(null);
  const [showStepDetailModal, setShowStepDetailModal] = React.useState<boolean>(false);
  // Media state for completion
  const [photos, setPhotos] = React.useState<Array<{ uri: string; type: string }>>([]); // up to 2
  const [video, setVideo] = React.useState<{ uri: string; duration?: number; type?: string } | null>(null);
  // Notes input refs/accessory
  const notesRef = React.useRef<TextInput | null>(null);
  const notesAccessoryId = 'completionNotesAccessory';

  // Steps progress (completed/total)
  const [stepsTotal, setStepsTotal] = React.useState<number>(12);
  const [stepsCompleted, setStepsCompleted] = React.useState<number>(Math.max(0, Math.min(12, Math.round((booking?.percent || 0) / 100 * 12))));

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const token = await getAuthToken();
        const resp = await fetch(`${BASE_URL}/api/staff/my-leads/${booking.id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        setLead(data);
        if (Array.isArray(data?.steps)) {
          setSteps(data.steps);
          const total = data.steps.length || 12;
          const completed = data.steps.filter((s: any) => !!s?.completed).length;
          setStepsTotal(total);
          setStepsCompleted(completed);
        }
      } catch (e) {
        console.warn('[staffSteps] failed to load lead', (e as any)?.message || e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [booking?.id]);

  // Enable LayoutAnimation for Android
  React.useEffect(() => {
    if (Platform.OS === 'android' && (UIManager as any)?.setLayoutAnimationEnabledExperimental) {
      (UIManager as any).setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Helper: resolve URL for device
  const resolveUrl = (raw?: string): string => {
    const val = String(raw || '');
    if (!val) return '';

    // If it's already a full URL (http/https), return as-is
    if (/^https?:\/\//i.test(val)) {
      return val;
    }

    // If it starts with 'uploads/', it's a local server file
    if (val.startsWith('uploads/')) {
      const base = BASE_URL.replace('localhost', Platform.OS !== 'web' ? '192.168.1.4' : 'localhost');
      return `${base}/${val}`;
    }

    // Otherwise, prepend BASE_URL
    const base = BASE_URL.replace('localhost', Platform.OS !== 'web' ? '192.168.1.4' : 'localhost');
    return `${base}${val.startsWith('/') ? val : `/${val}`}`;
  };

  // Inline component to render a video with generated thumbnail
  const StepVideo: React.FC<{ url: string }> = ({ url }) => {
    const [thumb, setThumb] = React.useState<string | null>(null);
    React.useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const result = await VideoThumbnails.getThumbnailAsync(url, { time: 1000 });
          if (mounted) setThumb(result.uri);
        } catch (e) {
          // Silently fail
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

  const handleMarkAsDone = (step: any) => {
    if (step.completed) {
      Alert.alert('Already Completed', 'This step has already been marked as complete.');
      return;
    }
    setCompletingStep(step);
    setCompletionNotes('');
    setShowCompletionModal(true);
  };

  const handleViewStepDetail = (step: any) => {
    console.log('[handleViewStepDetail] called with step:', step.name, 'completed:', step.completed);
    if (!step.completed) {
      console.log('[handleViewStepDetail] step not completed, returning');
      return;
    }
    console.log('[handleViewStepDetail] opening modal for step:', step.name);
    console.log('[handleViewStepDetail] step has medias:', step.medias?.length || 0);
    setViewingStep(step);
    setShowStepDetailModal(true);
  };

  const pickPhoto = async () => {
    try {
      if (photos.length >= 2) {
        Alert.alert('Limit reached', 'You can add up to 2 photos.');
        return;
      }
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo library access.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsMultipleSelection: false });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const asset = res.assets[0];
        setPhotos((prev) => [...prev, { uri: asset.uri, type: asset.mimeType || 'image/jpeg' }]);
      }
    } catch (e) {
      console.warn('[pickPhoto] error', e);
    }
  };

  const pickVideo = async () => {
    try {
      if (video) {
        Alert.alert('Video already selected', 'Only one video (up to 30s) can be attached.');
        return;
      }
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow media library access.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 1 });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const asset = res.assets[0];
        // Normalize duration to seconds (Expo may return ms on some devices)
        let dur = Number(asset.duration ?? 0);
        const durSec = dur > 1000 ? dur / 1000 : dur; // assume ms if very large
        if (durSec && durSec > 30.5) {
          Alert.alert('Video too long', 'Please select a video of up to 30 seconds.');
          return;
        }
        setVideo({ uri: asset.uri, duration: durSec, type: asset.mimeType || 'video/mp4' });
      }
    } catch (e) {
      console.warn('[pickVideo] error', e);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeVideo = () => setVideo(null);

  const handleCompleteStep = async () => {
    if (!completingStep || !completionNotes.trim() || isCompleting) {
      if (!completingStep || !completionNotes.trim()) {
        Alert.alert('Notes Required', 'Please provide completion notes before marking as done.');
      }
      return;
    }

    setIsCompleting(true);
    try {
      const token = await getAuthToken();

      // 1) Upload media if any
      let imageUrls: string[] = [];
      let videoUrl: string | undefined = undefined;
      if (photos.length > 0 || video) {
        const form = new FormData();
        photos.slice(0, 2).forEach((p, i) => {
          form.append('images', {
            // @ts-ignore react-native FormData file
            uri: p.uri,
            name: `photo_${i + 1}.jpg`,
            type: p.type || 'image/jpeg',
          } as any);
        });
        if (video) {
          form.append('video', {
            // @ts-ignore react-native FormData file
            uri: video.uri,
            name: 'evidence.mp4',
            type: video.type || 'video/mp4',
          } as any);
        }
        const mediaResp = await fetch(`${BASE_URL}/api/staff/steps/${completingStep.id}/media`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Let RN set the multipart boundary
          } as any,
          body: form as any,
        });
        if (!mediaResp.ok) {
          throw new Error(await mediaResp.text());
        }
        const mediaJson = await mediaResp.json();
        imageUrls = Array.isArray(mediaJson?.images) ? mediaJson.images : [];
        videoUrl = typeof mediaJson?.video === 'string' ? mediaJson.video : undefined;
      }

      // Simple retry with exponential backoff to handle transient pool timeouts
      const postWithRetry = async (retries = 2, baseDelay = 600): Promise<Response> => {
        let attempt = 0;
        let lastErr: any = null;
        while (attempt <= retries) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const resp = await fetch(`${BASE_URL}/api/staff/steps/${completingStep.id}/complete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ notes: completionNotes.trim(), images: imageUrls, video: videoUrl }),
              signal: controller.signal,
            });
            clearTimeout(timeout);
            if (resp.ok) return resp;
            // Retry on 429/500/502/503/504
            if ([429, 500, 502, 503, 504].includes(resp.status)) {
              lastErr = new Error(await resp.text());
              const delay = baseDelay * Math.pow(2, attempt);
              await new Promise(r => setTimeout(r, delay));
              attempt++;
              continue;
            }
            // Other errors -> throw
            throw new Error(await resp.text());
          } catch (e: any) {
            lastErr = e;
            // Network/abort -> retry
            if (attempt < retries) {
              const delay = baseDelay * Math.pow(2, attempt);
              await new Promise(r => setTimeout(r, delay));
              attempt++;
              continue;
            }
            throw e;
          }
        }
        throw lastErr || new Error('Request failed');
      };

      const resp = await postWithRetry();

      // Update local state
      const updatedSteps = steps.map(s =>
        s.id === completingStep.id
          ? { ...s, completed: true, completedAt: new Date().toISOString(), completionNotes: completionNotes.trim() }
          : s
      );
      setSteps(updatedSteps);
      setStepsCompleted(prev => prev + 1);

      setShowCompletionModal(false);
      setCompletingStep(null);
      setCompletionNotes('');
      setPhotos([]);
      setVideo(null);

      Alert.alert('Success', 'Step marked as complete successfully!');
    } catch (e) {
      const raw = (e as any)?.message ? String((e as any).message) : String(e);
      console.warn('[staffSteps] failed to complete step', raw);
      const friendly = /P2024|connection pool|timeout/i.test(raw)
        ? 'Server is busy right now. Please try again in a few seconds.'
        : (raw || 'Failed to mark step as complete. Please try again.');
      Alert.alert('Error', friendly);
    } finally {
      setIsCompleting(false);
    }
  };

  React.useEffect(() => {
    const id = sheetPct.addListener(({ value }) => (currentPctRef.current = value));
    return () => sheetPct.removeListener(id);
  }, [sheetPct]);

  const startPctRef = React.useRef(currentPctRef.current);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          startPctRef.current = currentPctRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const delta = gesture.dy / windowHeight;
          let next = startPctRef.current + delta;
          if (next < COLLAPSED) next = COLLAPSED;
          if (next > EXPANDED) next = EXPANDED;
          sheetPct.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const midpoint = (EXPANDED + COLLAPSED) / 2;
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

  const animatedHeight = sheetPct.interpolate({ inputRange: [0, 1], outputRange: [0, windowHeight] });
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
          {/* Left steps: scrollable, anchored under the sheet */}
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
                // SLA Logic
                // Use dueDays from database for progressive urgency colors
                const daysOverdue = step.dueDays || 0;

                // Calculate deadline for display (optional)
                let deadline: Date | null = null;
                if (daysOverdue > 0 && !step.completed) {
                  let startDate = null;
                  if (idx === 0) {
                    startDate = lead?.createdAt;
                  } else {
                    const prevStep = lead?.steps?.find((s: any) => s.order === idx - 1);
                    if (prevStep?.completed) {
                      startDate = prevStep.completedAt;
                    }
                  }
                  if (startDate) {
                    deadline = new Date(startDate);
                    deadline.setDate(deadline.getDate() + 5);
                  }
                }
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

                const urgencyColors = getUrgencyColors(daysOverdue);

                return (
                  <View key={step.id || `step-${idx}`}>
                    <Pressable
                      style={[
                        styles.stepPill,
                        step.completed && styles.stepPillCompleted,
                        urgencyColors && { backgroundColor: urgencyColors.bg, borderColor: urgencyColors.border, borderWidth: 1 },
                        expandedStep === (step.id || `step-${idx}`) && styles.stepPillExpanded
                      ]}
                      onPress={() => {
                        if (step.completed) {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setExpandedStep(prev => prev === (step.id || `step-${idx}`) ? null : (step.id || `step-${idx}`));
                        }
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

                      <View style={styles.stepContent}>
                        <Text style={[
                          styles.stepLabel,
                          step.completed && styles.stepLabelCompleted,
                          urgencyColors && { color: urgencyColors.text }
                        ]}>
                          {step.name}
                        </Text>

                        {/* Urgency Label */}
                        {!step.completed && urgencyColors && (
                          <Text style={[styles.overdueText, { color: urgencyColors.text }]}>
                            {urgencyColors.label}
                          </Text>
                        )}
                      </View>

                      {/* Mark Done Button - Small inline button for incomplete steps */}
                      {!step.completed && step.id && !String(step.id).startsWith('default-') && (
                        <Pressable
                          style={[
                            styles.markDoneButtonInline,
                            urgencyColors && { backgroundColor: urgencyColors.text }
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleMarkAsDone(step);
                          }}
                        >
                          <Text style={[styles.markDoneTextInline, urgencyColors && styles.markDoneTextOverdue]}>Mark Done</Text>
                        </Pressable>
                      )}

                      {/* Chevron for completed steps - at very right */}
                      {step.completed && (
                        <Ionicons
                          name={expandedStep === (step.id || `step-${idx}`) ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#1c1c1e"
                          style={{ marginLeft: 8, opacity: 0.5 }}
                        />
                      )}
                    </Pressable>

                    {/* Expanded Content - Only for completed steps */}
                    {step.completed && expandedStep === (step.id || `step-${idx}`) && (
                      <View style={styles.expandedSection}>
                        <View style={styles.completedRow}>
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                            <Text style={styles.completedBadgeText}>Completed</Text>
                          </View>
                          <View style={styles.completedDateRow}>
                            <Ionicons name="calendar-outline" size={14} color="rgba(0,0,0,0.55)" />
                            <Text style={styles.completedDateText}>
                              {new Date(step.completedAt || Date.now()).toLocaleDateString()}
                            </Text>
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
                                console.log('[StaffSteps] Media item:', { id: m.id, type: m.type, originalUrl: m?.url, resolvedUrl: url });
                                if (m.type === 'image') {
                                  return (
                                    <Pressable key={m.id} onPress={() => setPreview({ type: 'image', url })}>
                                      <Image
                                        source={{ uri: url }}
                                        style={styles.mediaThumb}
                                        resizeMode="cover"
                                        onError={(e) => console.log('[StaffSteps] Image load error:', url, e.nativeEvent.error)}
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
                <Text style={styles.billingValue}>{stepsTotal}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Completed Steps</Text>
                <Text style={styles.billingValue}>{stepsCompleted}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Remaining Steps</Text>
                <Text style={styles.billingValue}>{stepsTotal - stepsCompleted}</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Project Status</Text>
                <Text style={[styles.billingValue, { color: stepsCompleted >= stepsTotal ? '#4CAF50' : '#FFA500' }]}>
                  {stepsCompleted >= stepsTotal ? 'Completed' : 'In Progress'}
                </Text>
              </View>
            </Animated.View>

            <View style={styles.bottomContainer}>
              <Pressable onPress={onBack} hitSlop={10} style={styles.backCircle}>
                <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              </Pressable>
              <View style={styles.stepsProgressWrap}>
                <View style={styles.stepsProgressTrack}>
                  <View style={[styles.stepsProgressFill, { width: `${Math.max(6, Math.round((stepsCompleted / Math.max(1, stepsTotal)) * 100))}%` }]}>
                  </View>
                </View>
                <Text style={styles.stepsProgressLabel}>{`${stepsCompleted} of ${stepsTotal} steps completed`}</Text>
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
      </LinearGradient >


      {/* Step Detail Modal */}
      < Modal
        visible={showStepDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStepDetailModal(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>{viewingStep?.name}</Text>
              <Pressable onPress={() => setShowStepDetailModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#1c1c1e" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {viewingStep?.completedAt && (
                <Text style={styles.stepDetailDate}>
                  Completed: {new Date(viewingStep.completedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </Text>
              )}

              {viewingStep?.completionNotes && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.stepDetailLabel}>Notes</Text>
                  <Text style={styles.stepDetailNotes}>{viewingStep.completionNotes}</Text>
                </View>
              )}

              {viewingStep?.medias && viewingStep.medias.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.stepDetailLabel}>Media ({viewingStep.medias.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                    {viewingStep.medias.map((media: any) => (
                      <View key={media.id} style={styles.mediaItem}>
                        {media.type === 'image' ? (
                          <Image
                            source={{ uri: media.url }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.mediaVideo}>
                            <Ionicons name="play-circle" size={48} color="#fff" />
                            <Text style={styles.mediaVideoLabel}>Video</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal >

      {/* Completion Modal */}
      < Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mark Step as Complete</Text>
            <Text style={styles.modalSubtitle}>{completingStep?.name}</Text>

            <Text style={styles.inputLabel}>Completion Notes *</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Describe what was completed..."
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType={Platform.OS === 'ios' ? 'done' : 'done'}
              blurOnSubmit={true}
              enablesReturnKeyAutomatically
              onSubmitEditing={() => notesRef.current?.blur?.()}
              ref={notesRef}
              inputAccessoryViewID={Platform.OS === 'ios' ? notesAccessoryId : undefined}
            />
            {Platform.OS === 'ios' && (
              <InputAccessoryView nativeID={notesAccessoryId} backgroundColor="#F7F7F9">
                <View style={styles.accessoryBar}>
                  <View style={{ flex: 1 }} />
                  <Pressable style={styles.accessoryDoneBtn} onPress={() => notesRef.current?.blur?.()}>
                    <Text style={styles.accessoryDoneText}>Done</Text>
                  </Pressable>
                </View>
              </InputAccessoryView>
            )}
            {/* Media section */}
            <View style={styles.mediaCard}>
              <View style={styles.mediaHeader}>
                <View style={styles.mediaHeaderIcon}>
                  <Ionicons name="attach-outline" size={18} color="#1c1c1e" />
                </View>
                <View>
                  <Text style={styles.inputLabel}>Attach Evidence</Text>
                  <Text style={styles.mediaHint}>Add up to 2 photos and 1 short video (≤ 30s)</Text>
                </View>
              </View>

              {/* Photo tiles row */}
              <View style={styles.tilesRow}>
                {Array.from({ length: 2 }).map((_, i) => {
                  const p = photos[i];
                  if (p) {
                    return (
                      <View key={`p-${i}`} style={styles.tile}>
                        <View style={styles.thumb}>
                          <Image source={{ uri: p.uri }} style={styles.thumbImage} />
                          <Pressable style={styles.thumbRemoveBtn} onPress={() => removePhoto(i)}>
                            <Ionicons name="close" size={14} color="#fff" />
                          </Pressable>
                        </View>
                        <Text style={styles.thumbBadge}>Photo {i + 1}</Text>
                      </View>
                    );
                  }
                  return (
                    <Pressable key={`addp-${i}`} style={[styles.tile, styles.addTile]} onPress={pickPhoto}>
                      <View style={styles.addTileIconCircle}>
                        <Ionicons name="add" size={18} color="#1c1c1e" />
                      </View>
                      <Text style={styles.addTileText}>Add Photo</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Video tile row */}
              <View style={styles.tilesRow}>
                {video ? (
                  <View style={[styles.tile, styles.videoTile]}>
                    <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="film-outline" size={22} color="#1c1c1e" />
                      <Text style={styles.videoDuration}>{video.duration ? `${Math.round(video.duration)}s` : ''}</Text>
                      <Pressable style={styles.thumbRemoveBtn} onPress={removeVideo}>
                        <Ionicons name="close" size={14} color="#fff" />
                      </Pressable>
                    </View>
                    <Text style={styles.thumbBadge}>Video</Text>
                  </View>
                ) : (
                  <Pressable style={[styles.tile, styles.addTile, styles.addTileDashed]} onPress={pickVideo}>
                    <View style={styles.addTileIconCircle}>
                      <Ionicons name="videocam-outline" size={18} color="#1c1c1e" />
                    </View>
                    <Text style={styles.addTileText}>Add Video</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowCompletionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.completeButton, (!completionNotes.trim() || isCompleting) && styles.completeButtonDisabled]}
                onPress={handleCompleteStep}
                disabled={!completionNotes.trim() || isCompleting}
              >
                <Text style={styles.completeButtonText}>
                  {isCompleting ? 'Completing...' : 'Mark Complete'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal >
    </View >
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
  stepContent: {
    flex: 1,
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
  stepNotes: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.8)',
    lineHeight: 18,
  },
  stepCompletedAt: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  markDoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5CE57',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  markDoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  markDoneButtonInline: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FCD34D',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  markDoneTextInline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
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
    bottom: 48,
    paddingHorizontal: 20,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1c1c1e',
    backgroundColor: '#F8F9FA',
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  completeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mediaCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  mediaHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  mediaHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7CE73',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)'
  },
  mediaHint: { fontSize: 12, color: 'rgba(0,0,0,0.55)' },
  tilesRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 8 },
  tile: { flex: 1, alignItems: 'center' },
  addTile: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileDashed: {
    borderStyle: 'dashed',
  },
  addTileIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)'
  },
  addTileText: { fontSize: 12, fontWeight: '700', color: '#1c1c1e' },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F2F4',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)'
  },
  thumbBadge: { marginTop: 6, fontSize: 11, color: 'rgba(0,0,0,0.6)', fontWeight: '600' },
  videoTile: {},
  videoDuration: { position: 'absolute', bottom: 6, right: 8, fontSize: 12, color: '#1c1c1e', fontWeight: '700' },
  // Keyboard accessory styles (iOS)
  accessoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  accessoryDoneBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  accessoryDoneText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Step Detail Modal Styles
  stepDetailDate: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '600',
  },
  stepDetailLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  stepDetailNotes: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.7)',
    lineHeight: 20,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  mediaItem: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  mediaVideo: {
    width: 200,
    height: 150,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaVideoLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  // Inline step notes and media styles
  stepNotesBox: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  stepNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepMediaSection: {
    marginTop: 12,
  },
  stepMediaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepMediaScroll: {
    marginTop: 4,
  },
  stepMediaItem: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepMediaImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  stepMediaVideo: {
    width: 120,
    height: 90,
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMediaVideoLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  // Overdue Styles
  stepPillOverdue: {
    backgroundColor: '#FFF5F5',
    borderColor: '#E53935',
    borderWidth: 1,
  },
  stepNumberOverdue: {
    backgroundColor: '#FFEBEE',
  },
  stepNumberTextOverdue: {
    color: '#D32F2F',
  },
  stepLabelOverdue: {
    color: '#D32F2F',
  },
  overdueText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },
  markDoneButtonOverdue: {
    backgroundColor: '#D32F2F',
  },
  markDoneTextOverdue: {
    color: '#FFFFFF',
  },
  // Collapsible Styles
  stepPillExpanded: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
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
  expandedText: {
    fontSize: 13,
    color: '#1c1c1e',
    marginBottom: 10,
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
  emptyMediaText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)'
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
