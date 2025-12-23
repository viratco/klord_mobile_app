import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Image, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuthToken } from '../../utils/auth';
import { triggerPressHaptic } from '../../utils/haptics';


const CARD_GAP = 12;

// Animated Help Popup Component
function AnimatedHelpPopup() {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(2000),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1000),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 10,
        right: '25%',
        zIndex: 10,
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <View
        style={{
          backgroundColor: '#F5CE57',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1c1c1e' }}>Help?</Text>
      </View>
      {/* Speech bubble tail */}
      <View
        style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          marginLeft: -6,
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: '#F5CE57',
        }}
      />
    </Animated.View>
  );
}


export default function CustomerDashboard({ onBack, onOpenBookings, onOpenCalculator, onOpenSettings, onOpenPosts, onOpenReferral }: { onBack?: () => void; onOpenBookings?: () => void; onOpenCalculator?: () => void; onOpenSettings?: () => void; onOpenPosts?: () => void; onOpenReferral?: () => void }) {
  const testimonialRef = React.useRef<ScrollView | null>(null);
  const [testimonialIndex, setTestimonialIndex] = React.useState(0);
  const totalTestimonials = 4;
  const [viewportW, setViewportW] = React.useState(Dimensions.get('window').width);
  const cardW = Math.min(340, viewportW - 40);
  const hPad = Math.max(12, (viewportW - cardW) / 2);
  const SNAP_STEP = cardW + CARD_GAP;
  const snapOffsets = React.useMemo(() => Array.from({ length: totalTestimonials }, (_, i) => i * SNAP_STEP), [totalTestimonials, SNAP_STEP]);

  const [bookingCount, setBookingCount] = React.useState<number | null>(null);
  const [bookingErr, setBookingErr] = React.useState<string | null>(null);
  const [amcCount, setAmcCount] = React.useState<number | null>(null);
  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

  const loadBookingCount = React.useCallback(async () => {
    try {
      setBookingErr(null);
      if (!BASE_URL) {
        setBookingErr('Missing EXPO_PUBLIC_API_BASE_URL');
        setBookingCount(0);
        return;
      }
      const token = await getAuthToken();
      const res = await fetch(`${BASE_URL}/api/customer/leads`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `Failed to load`);
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setBookingCount(arr.length);
    } catch (e: any) {
      setBookingErr(e?.message || 'Failed to load');
    }
  }, [BASE_URL]);

  const loadAmcCount = React.useCallback(async () => {
    try {
      if (!BASE_URL) {
        setAmcCount(0);
        return;
      }
      const token = await getAuthToken();
      const res = await fetch(`${BASE_URL}/api/customer/amc-requests`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setAmcCount(0);
        return;
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setAmcCount(arr.length);
    } catch (e: any) {
      setAmcCount(0);
    }
  }, [BASE_URL]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => {
        const next = (prev + 1) % totalTestimonials;
        const offset = next * SNAP_STEP;
        testimonialRef.current?.scrollTo({ x: offset, y: 0, animated: true });
        return next;
      });
    }, 3500);
    let poll: any;
    let amcPoll: any;
    // initial fetch
    loadBookingCount();
    loadAmcCount();
    // polling every 15s
    poll = setInterval(loadBookingCount, 15000);
    amcPoll = setInterval(loadAmcCount, 15000);
    return () => {
      clearInterval(interval);
      if (poll) clearInterval(poll);
      if (amcPoll) clearInterval(amcPoll);
    };
  }, [SNAP_STEP, totalTestimonials, loadBookingCount, loadAmcCount]);
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header on top of gradient */}
            <View style={styles.header}>
              {/* Avatar placeholder on left */}
              <View style={styles.avatar}>
                <Ionicons name="person-circle" size={44} color="rgba(0,0,0,0.3)" />
              </View>
              {/* Translucent dropdown on right */}
              <Pressable style={styles.glassDropdown} hitSlop={10} onPress={() => { }}>
                <BlurView intensity={24} tint="light" style={styles.glassDropdown}>
                  <View style={styles.dropdownInner}>
                    <Text style={styles.dropdownLabel}>All roofs</Text>
                    <Ionicons name="chevron-down" size={18} color="#1c1c1e" />
                  </View>
                </BlurView>
              </Pressable>
            </View>

            {/* Title */}
            <Text style={styles.titleMain}>Dashboard</Text>

            {/* Stat cards row */}
            <View style={styles.statsRow}>
              {/* Yellow card - Bookings */}
              <Pressable
                style={[styles.statCard, styles.statCardYellow]}
                onPress={() => {
                  void triggerPressHaptic();
                  if (onOpenBookings) onOpenBookings();
                }}
              >
                <Text style={styles.statLabel}>Bookings</Text>
                <Text style={styles.statValue}>{bookingCount === null ? '…' : `${bookingCount}`}</Text>
                <Text style={styles.statSub}>Add a new booking</Text>
                <View style={[styles.arrowPill, styles.arrowPillBlack]}>
                  <Ionicons name="arrow-forward" size={16} color="#F5CE57" style={styles.arrowNE} />
                </View>
              </Pressable>

              {/* Dark card - Referral Program */}
              <Pressable
                style={[styles.statCard, styles.statCardDark]}
                onPress={() => {
                  triggerPressHaptic();
                  if (onOpenReferral) onOpenReferral();
                }}
              >
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.85)' }]}>Referral Program</Text>
                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>💰</Text>
                <Text style={[styles.statSub, { color: 'rgba(255,255,255,0.75)' }]}>Earn rewards</Text>
                <View style={[styles.arrowPill, styles.arrowPillAlt]}>
                  <Ionicons name="arrow-forward" size={16} color="#1c1c1e" style={styles.arrowNE} />
                </View>
              </Pressable>
            </View>

            {/* Customer Care card */}
            <View style={styles.summaryWrap}>
              <BlurView intensity={24} tint="light" style={styles.summaryCard}>
                {/* Watermark */}
                <Text pointerEvents="none" style={styles.summaryWatermark}>Care</Text>
                {/* Fade out the tail of the watermark towards the right */}
                <LinearGradient
                  pointerEvents="none"
                  colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.9)"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.summaryWatermarkFade}
                />

                <Text style={styles.summaryTitle}>Customer Care</Text>
                <Text style={[styles.metricLabel, { marginBottom: 16, fontSize: 14 }]}>
                  Need help? Our support team is here for you
                </Text>

                <View style={{ gap: 12, marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="call" size={20} color="#F5CE57" />
                      <Text style={[styles.metricValue, { fontSize: 18 }]}>8881144800</Text>
                    </View>
                    <Pressable style={styles.callButton} onPress={() => { }}>
                      <Ionicons name="call-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.callButtonText}>Call</Text>
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="call" size={20} color="#F5CE57" />
                      <Text style={[styles.metricValue, { fontSize: 18 }]}>8881144811</Text>
                    </View>
                    <Pressable style={styles.callButton} onPress={() => { }}>
                      <Ionicons name="call-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.callButtonText}>Call</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Customer Care Image with animated popup */}
                <View style={{ position: 'relative', marginTop: 8 }}>
                  {/* Animated "Help?" popup */}
                  <AnimatedHelpPopup />

                  <Image
                    source={require('../../assets/customercare-removebg-preview.png')}
                    style={{
                      width: '100%',
                      height: 180,
                      borderRadius: 16,
                    }}
                    resizeMode="contain"
                  />
                </View>
              </BlurView>
            </View>

            {/* Testimonials section */}
            <View
              style={styles.testimonialsWrap}
              onLayout={(e) => setViewportW(e.nativeEvent.layout.width)}
            >
              <Text style={styles.testimonialsTitle}>What our customers say</Text>
              <ScrollView
                ref={testimonialRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.testimonialsRow, { paddingHorizontal: hPad }]}
                decelerationRate="fast"
                snapToOffsets={snapOffsets}
                snapToAlignment="start"
                disableIntervalMomentum
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(x / SNAP_STEP);
                  if (idx !== testimonialIndex) setTestimonialIndex(idx);
                }}
                scrollEventThrottle={16}
              >
                <View style={[styles.testimonialCard, { width: cardW }]}>
                  <View style={styles.testimonialHeader}>
                    <View style={[styles.testimonialAvatar, styles.testimonialAvatarGold]}>
                      <Ionicons name="person" size={22} color="#1c1c1e" />
                    </View>
                    <View style={styles.testimonialMeta}>
                      <Text style={styles.testimonialName}>Priya Sharma</Text>
                      <Text style={styles.testimonialLocation}>Ahmedabad, IN</Text>
                    </View>
                  </View>
                  <Text style={styles.testimonialQuote}>
                    “Klord transformed our energy bills. The team’s support has been outstanding from start to finish.”
                  </Text>
                  <View style={styles.testimonialRating}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Ionicons key={idx} name="star" size={16} color="#F5CE57" />
                    ))}
                  </View>
                </View>

                <View style={[styles.testimonialCard, { width: cardW }]}>
                  <View style={styles.testimonialHeader}>
                    <View style={[styles.testimonialAvatar, styles.testimonialAvatarOrange]}>
                      <Ionicons name="person" size={22} color="#1c1c1e" />
                    </View>
                    <View style={styles.testimonialMeta}>
                      <Text style={styles.testimonialName}>Rohit Kulkarni</Text>
                      <Text style={styles.testimonialLocation}>Pune, IN</Text>
                    </View>
                  </View>
                  <Text style={styles.testimonialQuote}>
                    “The solar calculator helped us plan with confidence. Installation was quick and professionally handled.”
                  </Text>
                  <View style={styles.testimonialRating}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Ionicons key={idx} name="star" size={16} color="#F5CE57" />
                    ))}
                  </View>
                </View>

                <View style={[styles.testimonialCard, { width: cardW }]}>
                  <View style={styles.testimonialHeader}>
                    <View style={[styles.testimonialAvatar, styles.testimonialAvatarGreen]}>
                      <Ionicons name="person" size={22} color="#1c1c1e" />
                    </View>
                    <View style={styles.testimonialMeta}>
                      <Text style={styles.testimonialName}>Sneha Patel</Text>
                      <Text style={styles.testimonialLocation}>Surat, IN</Text>
                    </View>
                  </View>
                  <Text style={styles.testimonialQuote}>
                    “Monitoring my plant is effortless now. Love the daily summaries and proactive service reminders.”
                  </Text>
                  <View style={styles.testimonialRating}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Ionicons key={idx} name="star" size={16} color="#F5CE57" />
                    ))}
                  </View>
                </View>

                <View style={[styles.testimonialCard, { width: cardW }]}>
                  <View style={styles.testimonialHeader}>
                    <View style={[styles.testimonialAvatar, { backgroundColor: 'rgba(88, 86, 214, 0.26)' }]}>
                      <Ionicons name="person" size={22} color="#1c1c1e" />
                    </View>
                    <View style={styles.testimonialMeta}>
                      <Text style={styles.testimonialName}>Aarav Mehta</Text>
                      <Text style={styles.testimonialLocation}>Vadodara, IN</Text>
                    </View>
                  </View>
                  <Text style={styles.testimonialQuote}>
                    “Seamless experience end-to-end. The app makes it super easy to track performance and savings.”
                  </Text>
                  <View style={styles.testimonialRating}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Ionicons key={idx} name="star" size={16} color="#F5CE57" />
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Side vignettes */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.10)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.leftVignette}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(0,0,0,0.10)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.rightVignette}
        />
        {/* Top fade */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.06)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topVignette}
        />
        {/* Warm bottom glow */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(247, 206, 115, 0.65)', 'rgba(247, 206, 115, 0)']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.bottomGlow}
        />
        {/* Overlays */}
        <View pointerEvents="none" style={styles.textureOverlay} />
        <View pointerEvents="none" style={styles.noiseOverlay} />

        {/* Bottom navigation */}
        <BottomNav onOpenBookings={onOpenBookings} onOpenCalculator={onOpenCalculator} onOpenSettings={onOpenSettings} onOpenPosts={onOpenPosts} />
      </LinearGradient>
    </View>
  );
}

function GlassCard({ children, style }: { children?: React.ReactNode; style?: any }) {
  return (
    <BlurView intensity={24} tint="light" style={[styles.card, style]}>
      {children}
    </BlurView>
  );
}

// Bottom navigation component
function BottomNav({ onOpenBookings, onOpenCalculator, onOpenSettings, onOpenPosts }: { onOpenBookings?: () => void; onOpenCalculator?: () => void; onOpenSettings?: () => void; onOpenPosts?: () => void }) {
  const [active, setActive] = React.useState<'home' | 'roofs' | 'calculator' | 'posts' | 'settings'>('home');

  const Item = ({ id, icon, label }: { id: typeof active; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
    const isActive = active === id;
    const isCalculator = id === 'calculator';
    const buttonStyles = [
      styles.navButton,
      isCalculator ? styles.navButtonCalculator : (isActive ? styles.navButtonActive : styles.navButtonInactive),
    ];
    const iconColor = isCalculator ? '#1c1c1e' : (isActive ? '#1c1c1e' : 'rgba(255,255,255,0.95)');

    return (
      <Pressable onPress={() => {
        void triggerPressHaptic();
        setActive(id);
        if (id === 'roofs' && onOpenBookings) onOpenBookings();
        if (id === 'calculator' && onOpenCalculator) onOpenCalculator();
        if (id === 'posts' && onOpenPosts) onOpenPosts();
        if (id === 'settings' && onOpenSettings) onOpenSettings();
      }} style={styles.navItem} hitSlop={10}>
        <View style={buttonStyles}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        {/* Labels hidden to match reference pill nav */}
        <Text style={styles.navLabelHidden}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.bottomNavWrap}>
      <BlurView intensity={28} tint="dark" style={styles.bottomNav}>
        <Item id="home" icon="home-outline" label="Home" />
        <Item id="roofs" icon="grid-outline" label="Bookings" />
        <Item id="calculator" icon="calculator-outline" label="Calculator" />
        <Item id="posts" icon="reader-outline" label="Posts" />
        <Item id="settings" icon="settings-outline" label="Settings" />
      </BlurView>
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
  scrollContent: {
    paddingBottom: 180,
  },
  testimonialsWrap: {
    marginTop: 32,
    paddingBottom: 12,
  },
  testimonialsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: 'Sora_700Bold',
  },
  testimonialsRow: {
    // paddingHorizontal set dynamically for perfect centering
    // spacing controlled via card marginRight; last card has marginRight: 0
  },
  testimonialCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
    marginRight: CARD_GAP,
    overflow: 'visible',
  },
  // no special last-card margin; right padding keeps centering consistent
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  testimonialAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialAvatarGold: {
    backgroundColor: 'rgba(245, 206, 87, 0.32)',
  },
  testimonialAvatarOrange: {
    backgroundColor: 'rgba(255, 149, 0, 0.26)',
  },
  testimonialAvatarGreen: {
    backgroundColor: 'rgba(52, 199, 89, 0.26)',
  },
  testimonialMeta: {
    flex: 1,
    gap: 2,
  },
  testimonialName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  testimonialLocation: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.55)',
  },
  testimonialQuote: {
    fontSize: 14,
    color: 'rgba(28,28,30,0.85)',
    lineHeight: 20,
    marginBottom: 16,
  },
  testimonialRating: {
    flexDirection: 'row',
    gap: 4,
  },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  backPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backPillText: {
    fontSize: 22,
    color: '#1c1c1e',
    marginTop: -2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  titleMain: {
    marginTop: 40,
    paddingHorizontal: 20,
    fontSize: 26,
    lineHeight: 34,
    color: '#1c1c1e',
    fontFamily: 'Bambino-Light',
    letterSpacing: 0.2,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  cardSmall: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.75)',
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
  dropdownLabel: {
    fontSize: 14,
    color: '#1c1c1e',
  },
  // Stat cards
  statsRow: {
    marginTop: 26,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
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
  statCardYellow: {
    backgroundColor: '#F5CE57',
    minHeight: 160,
  },
  statCardDark: {
    backgroundColor: '#232428',
  },
  statLabel: {
    fontSize: 14,
    color: '#1c1c1e',
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1c1c1e',
    marginBottom: 10,
  },
  statSub: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.7)',
  },
  statDelta: {
    fontSize: 14,
    color: '#1c1c1e',
    fontWeight: '600',
    marginTop: 2,
  },
  arrowPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAD27A',
  },
  arrowPillAlt: {
    backgroundColor: '#F5CE57',
  },
  arrowPillBlack: {
    backgroundColor: '#1c1c1e',
  },
  arrowNE: {
    transform: [{ rotate: '-45deg' }],
  },
  // Summary card
  summaryWrap: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  summaryCard: {
    borderRadius: 26,
    padding: 29,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
    minHeight: 309,
  },
  summaryWatermark: {
    position: 'absolute',
    right: -30,
    top: -4,
    fontSize: 64,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.05)',
  },
  summaryWatermarkFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 140,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCol: {
    flex: 1,
    gap: 12,
  },
  metricItem: {
    gap: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  summaryButton: {
    marginTop: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2C2D30',
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 22,
  },
  summaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  watermarkBase: {
    position: 'absolute',
    right: -10,
    top: 20,
    transform: [{ rotate: '-90deg' }],
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  watermarkYellow: {
    color: 'rgba(245, 206, 87, 0.22)',
  },
  watermarkDark: {
    color: 'rgba(255,255,255,0.09)',
  },
  watermarkDarkTransform: {
    right: -100,
    top: 90,
    transform: [{ rotate: '91deg' }],
    fontSize: 58,
    width: 260,
    textAlign: 'left',
  },
  watermarkYellowTransform: {
    right: -90,
    top: 72,
    transform: [{ rotate: '90deg' }],
    fontSize: 58,
    width: 220,
    textAlign: 'left',
  },
  watermarkFadeYellow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  watermarkFadeDark: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  // Vignettes and overlays for gradient
  leftVignette: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
  },
  rightVignette: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
  },
  topVignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 80,
  },
  bottomGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
  textureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.6,
  },
  noiseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0,
  },
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
    justifyContent: 'space-evenly',
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    height: 72,
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 8,
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
    flex: 1,
    minWidth: 50,
    maxWidth: 70,
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
  navButtonCalculator: {
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
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2C2D30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
