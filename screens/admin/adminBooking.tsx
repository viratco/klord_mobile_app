import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, RefreshControl, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerPressHaptic } from '../../utils/haptics';
import BookingDetails from './adminBookingDetails';
import BookingPreview, { type BookingData as BookingDataType } from './bookingdetail2';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';

type AdminNavKey = 'home' | 'roofs' | 'staff' | 'analytics' | 'settings';

type BookingData = { id: string; name: string; role: string; percent: number };

// Slide-in wrapper shared in this module to prevent remounts on parent re-renders
const SlideInScreen: React.FC<{ children?: React.ReactNode; style?: any }> = ({ children, style }) => {
  const tx = React.useRef(new Animated.Value(48)).current;
  const op = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const ease = Easing.bezier(0.22, 0.61, 0.36, 1);
    Animated.parallel([
      Animated.timing(tx, { toValue: 0, duration: 420, easing: ease, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 420, easing: ease, useNativeDriver: true }),
    ]).start();
  }, [tx, op]);
  return <Animated.View style={[{ flex: 1, transform: [{ translateX: tx }], opacity: op }, style]}>{children}</Animated.View>;
};

const percentFieldCandidates = [
  'matchRate',
  'match_rate',
  'matchRatePercent',
  'match_rate_percent',
  'matchPercentage',
  'match_percentage',
  'progressPercent',
  'progress_percent',
  'percent',
];

function normalizePercentValue(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const adjusted = value > 0 && value <= 1 ? value * 100 : value;
    return Math.max(0, Math.min(100, Math.round(adjusted)));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const hasPercentSymbol = trimmed.endsWith('%');
    const numericPortion = hasPercentSymbol ? trimmed.slice(0, -1) : trimmed;
    const parsed = Number(numericPortion);
    if (!Number.isFinite(parsed)) return null;
    const adjusted = !hasPercentSymbol && parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
    return Math.max(0, Math.min(100, Math.round(adjusted)));
  }
  return null;
}

function extractPercentFromLead(lead: any): number | null {
  if (!lead || typeof lead !== 'object') return null;
  for (const key of percentFieldCandidates) {
    const candidate = (lead as any)[key];
    const parsed = normalizePercentValue(candidate);
    if (parsed !== null) return parsed;
  }
  return null;
}

export default function Bookings({ onBack, onOpenDetail, onOpenBookings, onOpenStaff, onOpenAnalytics, onOpenSettings, onGoHome }: { onBack?: () => void; onOpenDetail?: (b: BookingData) => void; onOpenBookings?: () => void; onOpenStaff?: () => void; onOpenAnalytics?: () => void; onOpenSettings?: () => void; onGoHome?: () => void }) {
  const [selected, setSelected] = React.useState<BookingData | null>(null);
  const [showFullDetail, setShowFullDetail] = React.useState<boolean>(false);
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchItems = React.useCallback(async () => {
    try {
      // Use refreshing state only if already loaded once
      if (!items.length) setLoading(true);
      setError(null);
      const token = await getAuthToken();
      const url = `${BASE_URL}/api/admin/leads`;
      const authHeader = token
        ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`)
        : null;
      if (__DEV__) console.log('[admin bookings] using auth header:', !!authHeader);
      const resp = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
      });
      if (!resp.ok) {
        const body = await resp.text();
        console.warn('[admin bookings] non-OK', resp.status, body);
        throw new Error(`HTTP ${resp.status}: ${body || 'Failed to load'}`);
      }
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
      console.log('[admin bookings] fetched', list.length, 'items from', url);
      setItems(list);
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      console.warn('[admin bookings] fetch failed', msg, 'BASE_URL=', BASE_URL);
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [items.length]);

  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    // Only fetch/refresh while list is visible (no selection)
    if (!selected) {
      fetchItems();
      const interval = setInterval(fetchItems, 15000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchItems, selected]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchItems();
  }, [fetchItems]);

  const computePercent = (b: any): number => {
    const explicit = extractPercentFromLead(b);
    if (explicit !== null) return explicit;
    if (b?.certificateUrl) return 100;
    const steps = Array.isArray(b?.steps) ? b.steps : [];
    if (steps.length > 0) {
      const completed = steps.filter((s: any) => s.completed).length;
      return Math.round((completed / steps.length) * 100);
    }
    return 25;
  };

  if (selected && !showFullDetail) {
    // Stage 1: preview page (bookingdetail2)
    const previewData: BookingDataType = { id: selected.id, name: selected.name, role: selected.role, percent: selected.percent };
    return (
      <SlideInScreen>
        <BookingPreview
          booking={previewData}
          onBack={() => setSelected(null)}
          onOpenSteps={(b) => {
            setShowFullDetail(true);
          }}
        />
      </SlideInScreen>
    );
  }
  if (selected && showFullDetail) {
    // Stage 2: full details and steps
    return (
      <SlideInScreen>
        <BookingDetails onBack={() => setShowFullDetail(false)} booking={selected} />
      </SlideInScreen>
    );
  }

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
        <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={[styles.backButtonFloating, { top: insets.top + 8 }]}
          >
            <BlurView intensity={24} tint="light" style={styles.glassBackPill}>
              <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
            </BlurView>
          </Pressable>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 96 }]}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"
            bounces
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1c1c1e" /> }
          >
            <Text style={styles.titleMain}>Bookings</Text>
            {error && (
              <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                <Text style={{ color: '#FF3B30', fontWeight: '800' }}>Error loading bookings</Text>
                <Text style={{ color: 'rgba(28,28,30,0.8)', marginTop: 4 }}>{error}</Text>
              </View>
            )}
            {loading && (
              <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                <Text style={{ color: '#1c1c1e', fontWeight: '700' }}>Loading bookings...</Text>
              </View>
            )}
            {!loading && !error && items.length === 0 && (
              <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                <Text style={{ color: '#1c1c1e', fontWeight: '700' }}>No bookings found</Text>
                <Text style={{ color: 'rgba(28,28,30,0.7)', marginTop: 4 }}>Pull to refresh to try again.</Text>
              </View>
            )}
            {items.map((b, idx) => {
              const percent = computePercent(b);
              const widthPct = Math.min(100, Math.max(0, percent));
              const assigned = !!b.assigned || !!b.assignedStaffId;
              const subsidy = !!b.withSubsidy;
              return (
                <Pressable
                  key={b.id || idx}
                  style={styles.contentBox}
                  onPress={() => {
                    const data = { id: String(b.id), name: b.fullName || 'Booking', role: b.projectType || 'Project', percent } as BookingData;
                    setSelected(data);
                    setShowFullDetail(false);
                  }}
                >
                  <View style={styles.whiteCard}>
                    <View style={styles.panelRow}>
                      <View style={[styles.panelAvatar, { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="home-outline" size={22} color="#8e8e93" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.panelName}>{b.fullName || 'Booking'}</Text>
                        <Text style={styles.panelSubtitle}>{b.projectType || 'Project'}</Text>
                      </View>
                      <View style={styles.actionCol}>
                        <View style={styles.arrowCircle}>
                          <Ionicons name="arrow-up" size={24} color="#1c1c1e" style={styles.arrowNE} />
                        </View>
                        <View style={[styles.subsidyContainer, subsidy ? null : { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                          <Text style={[styles.subsidyLabel, subsidy ? null : { color: '#f44336' }]}>Subsidy</Text>
                          <Ionicons name={subsidy ? 'checkmark-circle' : 'close-circle'} size={20} color={subsidy ? '#4CAF50' : '#f44336'} />
                        </View>
                      </View>
                    </View>
                    <View style={styles.statusRow}>
                      <View style={[styles.assignmentStatus, { backgroundColor: assigned ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                        <Ionicons name={assigned ? 'checkmark-circle' : 'close-circle'} size={16} color={assigned ? '#4CAF50' : '#f44336'} />
                        <Text style={[styles.assignmentText, { color: assigned ? '#4CAF50' : '#f44336' }]}>{assigned ? 'Assigned' : 'Not Assigned'}</Text>
                      </View>
                      <Text style={styles.matchText}>{percent}% Completed</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.max(12, widthPct)}%`, backgroundColor: percent >= 80 ? '#00C853' : percent >= 50 ? '#FF8C00' : '#FF3B30' } as const]} />
                      <LinearGradient colors={["#e6e6e6", "#f2f2f2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.progressCap} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>

        {/* Bottom navigation */}
        <BottomNav
          onGoHome={onGoHome || onBack}
          onOpenBookings={onOpenBookings || onBack}
          onOpenStaff={onOpenStaff}
          onOpenAnalytics={onOpenAnalytics}
          onOpenSettings={onOpenSettings}
        />
      </LinearGradient>
    </View>
  );
}

function BottomNav({ onGoHome, onOpenBookings, onOpenStaff, onOpenAnalytics, onOpenSettings }: { onGoHome?: () => void; onOpenBookings?: () => void; onOpenStaff?: () => void; onOpenAnalytics?: () => void; onOpenSettings?: () => void }) {
  const [active, setActive] = React.useState<AdminNavKey>('roofs');

  const Item = ({ id, icon, label }: { id: AdminNavKey; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
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
        <Item id="roofs" icon="grid-outline" label="Bookings" />
        <Item id="staff" icon="people-outline" label="Staff" />
        <Item id="analytics" icon="stats-chart-outline" label="Analytics" />
        <Item id="settings" icon="settings-outline" label="Settings" />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F6' },
  gradientBackground: { flex: 1, width: '100%', height: '100%' },
  safeArea: {
    flex: 1,
  },
  titleMain: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  glassBackPill: {
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
  backButtonFloating: {
    position: 'absolute',
    left: 20,
    zIndex: 2,
  },
  scrollView: {
    flex: 1,
  },
  contentBox: { paddingHorizontal: 20, marginTop: 0 },
  scrollContent: { paddingBottom: 220, paddingTop: 0, gap: 10 },
  whiteCard: {
    minHeight: 170,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  glassPanel: {
    height: 170,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  glassFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  panelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 2,
  },
  panelSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 4,
  },
  panelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  matchText: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
  },
  actionCol: {
    alignItems: 'flex-end',
    marginLeft: 12,
    marginTop: 2,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  arrowNE: {
    transform: [{ rotate: '45deg' }],
  },
  assignmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    minHeight: 24,
  },
  assignmentText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    width: '56%',
    backgroundColor: '#000000',
  },
  progressCap: {
    height: '100%',
    flex: 1,
  },
  subsidyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  subsidyLabel: {
    color: '#1c1c1e',
    fontWeight: '500',
  },
  glossTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 22,
  },
  innerShadowBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 18,
  },

  // Bottom navigation
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

