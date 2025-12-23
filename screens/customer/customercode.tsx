import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Share, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { triggerPressHaptic } from '../../utils/haptics';
import * as Clipboard from 'expo-clipboard';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';
import { useFocusEffect } from '@react-navigation/native';

type BottomNavKey = 'home' | 'roofs' | 'calculator' | 'posts' | 'settings';

export default function CustomerPost({
  onBack,
  onGoHome,
  onOpenBookings,
  onOpenCalculator,
  onOpenSettings,
  onOpenPosts,
}: {
  onBack?: () => void;
  onGoHome?: () => void;
  onOpenBookings?: () => void;
  onOpenCalculator?: () => void;
  onOpenSettings?: () => void;
  onOpenPosts?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [referralCode, setReferralCode] = React.useState<string>('');
  const copiedAnim = React.useRef(new Animated.Value(0)).current;
  const showCopied = React.useCallback(() => {
    copiedAnim.stopAnimation();
    copiedAnim.setValue(0);
    Animated.sequence([
      Animated.timing(copiedAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(copiedAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [copiedAnim]);

  const [levelPercents, setLevelPercents] = React.useState<number[]>([2.0, 1.0, 1.0]);
  const [maxPayout, setMaxPayout] = React.useState<number>(4);
  const [counts, setCounts] = React.useState<{ a1: number; a2: number; a3: number }>({ a1: 0, a2: 0, a3: 0 });
  const [earnings, setEarnings] = React.useState<{ a1: number; a2: number; a3: number }>({ a1: 0, a2: 0, a3: 0 });
  const [recent, setRecent] = React.useState<Array<{ amount: number; level: number; mobile: string; createdAt: string }>>([]);

  const refreshProfile = React.useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`${BASE_URL}/api/customer/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (typeof data?.referralCode === 'string') setReferralCode(data.referralCode);
    } catch { }
  }, []);

  const refreshOverview = React.useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`${BASE_URL}/api/referrals/overview`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data) {
        setCounts(data.counts ?? { a1: 0, a2: 0, a3: 0 });
        setEarnings(data.earnings ?? { a1: 0, a2: 0, a3: 0 });
        if (data.settings?.levelPercents) setLevelPercents(data.settings.levelPercents);
        if (typeof data.settings?.maxPayoutPercent === 'number') setMaxPayout(data.settings.maxPayoutPercent);
      }
    } catch { }
  }, []);

  const refreshRecentCommissions = React.useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`${BASE_URL}/api/referrals/recent`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data) {
        setRecent(data);
      }
    } catch { }
  }, []);

  const onRefreshRecent = React.useCallback(async () => {
    try {
      triggerPressHaptic();
      await Promise.all([refreshOverview(), refreshRecentCommissions()]);
    } catch { }
  }, [refreshOverview, refreshRecentCommissions]);

  React.useEffect(() => {
    void refreshProfile();
    void refreshOverview();
    void refreshRecentCommissions();
  }, [refreshProfile, refreshOverview, refreshRecentCommissions]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshOverview();
      void refreshRecentCommissions();
      // Poll recent commissions while focused to surface new earnings automatically
      const intervalId = setInterval(() => {
        void refreshRecentCommissions();
      }, 10000); // 10s
      return () => {
        clearInterval(intervalId);
      };
    }, [refreshOverview, refreshRecentCommissions])
  );

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    triggerPressHaptic();
    showCopied();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Klord Solar! Use my referral code ${referralCode} to sign up and start earning.`,
      });
    } catch { }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73']}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View pointerEvents="none" style={[styles.copiedToastWrap, { top: insets.top + 8 }, {
          opacity: copiedAnim,
          transform: [{ translateY: copiedAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
        }]}>
          <View style={styles.copiedToast}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.copiedToastText}>Copied!</Text>
          </View>
        </Animated.View>
        <View style={styles.contentWrap}>
          <View style={styles.header}>
            <Pressable hitSlop={8} onPress={onBack} style={styles.backButton} accessibilityRole="button">
              <BlurView intensity={24} tint="light" style={styles.backButtonGlass}>
                <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
              </BlurView>
            </Pressable>
            <Text style={styles.headerTitle}>Referral Matrix</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Referral Code Card */}
            <View style={styles.summaryCardShell}>
              <BlurView intensity={24} tint="light" style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Your Referral Code</Text>
                <View style={styles.codeRow}>
                  <View style={styles.codePill}>
                    <Text style={styles.codeText}>{referralCode || 'Fetching…'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable onPress={handleCopy} style={styles.glassIconBtn} accessibilityRole="button" disabled={!referralCode}>
                      <Ionicons name="copy-outline" size={18} color="#1c1c1e" />
                    </Pressable>
                    <Pressable onPress={handleShare} style={styles.glassIconBtn} accessibilityRole="button" disabled={!referralCode}>
                      <Ionicons name="share-social-outline" size={18} color="#1c1c1e" />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.subtleText}>Invite friends. Earn up to {maxPayout}% from your network’s purchases across levels.</Text>
                <View style={styles.pillRow}>
                  <View style={styles.blackPill}><Text style={styles.blackPillText}>MLM Matrix</Text></View>
                </View>
              </BlurView>
            </View>

            {/* Earning Distribution */}
            <View style={styles.summaryCardShell}>
              <BlurView intensity={24} tint="light" style={styles.summaryCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.summaryTitle}>Earning Distribution</Text>
                  <View style={styles.capBadge}><Text style={styles.capBadgeText}>Max {maxPayout}% cap</Text></View>
                </View>
                {(['A1', 'A2', 'A3'] as const).map((label, idx) => {
                  const pct = levelPercents[idx] ?? 0;
                  return (
                    <View key={label} style={styles.levelRow}>
                      <View style={styles.levelTag}><Text style={styles.levelTagText}>{label}</Text></View>
                      <View style={styles.levelBarWrap}>
                        <View style={[styles.levelBarFill, { width: `${maxPayout ? (pct / maxPayout) * 100 : 0}%` }]} />
                      </View>
                      <Text style={styles.levelPct}>{pct}%</Text>
                    </View>
                  );
                })}
                <View style={styles.totalRow}>
                  <Text style={styles.bold}>Total</Text>
                  <Text style={styles.totalPct}>{levelPercents.reduce((a, b) => a + b, 0)}%</Text>
                </View>
              </BlurView>
            </View>

            {/* Network Snapshot */}
            <View style={styles.summaryCardShell}>
              <BlurView intensity={24} tint="light" style={styles.summaryCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.summaryTitle}>Network Snapshot</Text>
                  <View style={styles.blackPill}><Text style={styles.blackPillText}>Live</Text></View>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <View style={styles.metricHeaderRow}>
                      <View style={[styles.levelChip, styles.levelChipA1]}><Text style={styles.levelChipText}>A1</Text></View>
                    </View>
                    <Text style={styles.metricValueLarge}>{counts.a1}</Text>
                    <Text style={styles.metricLabelSubtle}>Directs</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <View style={styles.metricHeaderRow}>
                      <View style={[styles.levelChip, styles.levelChipA2]}><Text style={styles.levelChipText}>A2</Text></View>
                    </View>
                    <Text style={styles.metricValueLarge}>{counts.a2}</Text>
                    <Text style={styles.metricLabelSubtle}>Members</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <View style={styles.metricHeaderRow}>
                      <View style={[styles.levelChip, styles.levelChipA3]}><Text style={styles.levelChipText}>A3</Text></View>
                    </View>
                    <Text style={styles.metricValueLarge}>{counts.a3}</Text>
                    <Text style={styles.metricLabelSubtle}>Members</Text>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Recent Downline Activity */}
            <View style={styles.summaryCardShell}>
              <BlurView intensity={24} tint="light" style={styles.summaryCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.summaryTitle}>Recent Downline Activity</Text>
                  <Pressable onPress={onRefreshRecent} style={styles.glassIconBtn} accessibilityRole="button">
                    <Ionicons name="refresh-outline" size={18} color="#1c1c1e" />
                  </Pressable>
                </View>
                {recent.map((r, idx) => (
                  <View key={idx} style={styles.activityRow}>
                    <View style={[styles.badgeA1, r.level === 2 ? styles.badgeA2 : r.level === 3 ? styles.badgeA3 : null]}>
                      <Text style={styles.badgeText}>{`A${r.level}`}</Text>
                    </View>
                    <Text style={styles.activityText}>{`User ${r.mobile}`}</Text>
                    <View style={styles.activityEarnPill}><Text style={styles.activityEarnPillText}>{`+₹${Math.round(r.amount)}`}</Text></View>
                  </View>
                ))}
              </BlurView>
            </View>

            {/* Invite CTA */}
            <Pressable style={styles.primaryButton} onPress={handleShare} accessibilityRole="button">
              <View style={styles.primaryButtonFill}>
                <Text style={styles.primaryButtonText}>Invite & Share Code</Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
        <BottomNav
          onGoHome={onGoHome}
          onOpenBookings={onOpenBookings}
          onOpenCalculator={onOpenCalculator}
          onOpenSettings={onOpenSettings}
          onOpenPosts={onOpenPosts}
        />
      </SafeAreaView>
    </View>
  );
}

function BottomNav({
  onGoHome,
  onOpenBookings,
  onOpenCalculator,
  onOpenSettings,
  onOpenPosts,
}: {
  onGoHome?: () => void;
  onOpenBookings?: () => void;
  onOpenCalculator?: () => void;
  onOpenSettings?: () => void;
  onOpenPosts?: () => void;
}) {
  const [active, setActive] = React.useState<BottomNavKey>('posts');

  const Item = ({ id, icon, label }: { id: BottomNavKey; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
    const isActive = active === id;
    const isCalculator = id === 'calculator';
    const buttonStyles = [
      styles.navButton,
      isCalculator ? styles.navButtonCalculator : (isActive ? styles.navButtonActive : styles.navButtonInactive),
    ];
    const iconColor = isCalculator ? '#1c1c1e' : (isActive ? '#1c1c1e' : 'rgba(255,255,255,0.95)');

    const handlePress = () => {
      void triggerPressHaptic();
      setActive(id);
      if (id === 'home') onGoHome?.();
      if (id === 'roofs') onOpenBookings?.();
      if (id === 'calculator') onOpenCalculator?.();
      if (id === 'posts') onOpenPosts?.();
      if (id === 'settings') onOpenSettings?.();
    };

    return (
      <Pressable onPress={handlePress} style={styles.navItem} hitSlop={10} accessibilityRole="button">
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
    backgroundColor: '#ECECEC',
  },
  safeArea: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGlass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  copiedToastWrap: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  copiedToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(28,28,30,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.7)',
  },
  copiedToastText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 150,
    gap: 20,
  },
  summaryCardShell: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    gap: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  summaryDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(28,28,30,0.75)',
  },
  subtleText: {
    fontSize: 12,
    color: 'rgba(28,28,30,0.6)',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  codePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  codeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#1c1c1e',
  },
  glassIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  blackPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.85)',
  },
  blackPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  capBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  capBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  levelTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  levelTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  levelBarWrap: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  levelPct: {
    width: 50,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  totalPct: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
  },
  metricHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  levelChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  levelChipA1: {
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    borderColor: 'rgba(255, 214, 10, 0.6)',
  },
  levelChipA2: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderColor: 'rgba(52, 199, 89, 0.5)',
  },
  levelChipA3: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: 'rgba(0, 122, 255, 0.45)',
  },
  levelChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  metricValueLarge: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  metricLabelSubtle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(28,28,30,0.7)',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(28,28,30,0.7)',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
  },
  badgeA1: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 214, 10, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.6)',
  },
  badgeA2: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.5)',
  },
  badgeA3: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.45)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(28,28,30,0.9)',
  },
  bold: {
    fontWeight: '800',
    color: '#1c1c1e',
  },
  activityEarn: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  activityEarnPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.85)',
  },
  activityEarnPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryButton: {
    height: 48,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButtonFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7CE73',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c1c1e',
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
});
