import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';
import { fetchWithCache, getCachedValue } from '../../utils/cache';
import { triggerPressHaptic } from '../../utils/haptics';

type RecentActivity = {
  id: string;
  title: string;
  stepsLabel?: string;
  timeLabel: string;
  status: 'completed' | 'in-progress';
  type?: 'booking' | 'step' | 'complaint' | 'amc';
};

type DashboardStats = {
  bookingCount: number | null;
  staffCount: number | null;
  recentActivities: RecentActivity[];
};

function extractCollection(source: any): any[] {
  if (Array.isArray(source)) return source;
  const candidates = [source?.data, source?.items, source?.results, source?.leads, source?.records, source?.list, source?.staff, source?.rows];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function buildUnifiedRecent(
  bookingCollection: any[],
  complaintCollection: any[],
  amcCollection: any[]
): RecentActivity[] {
  const items: { activity: RecentActivity; timestamp: number }[] = [];

  // Bookings
  bookingCollection.forEach((lead: any, index: number) => {
    const stamp = lead?.updatedAt || lead?.createdAt;
    const { label: timeLabel, timestamp } = formatRelativeLabel(stamp);
    const { total, completed } = getStepsInfo(lead);
    const status: 'completed' | 'in-progress' = total > 0 && completed >= total ? 'completed' : 'in-progress';
    const stepsLabel = total ? `${completed}/${total} steps` : undefined;
    const name = lead?.customerName || lead?.fullName || lead?.name || lead?.email || lead?.phone || `Booking ${index + 1}`;
    const id = String(
      lead?.id ?? lead?._id ?? lead?.leadId ?? lead?.uuid ?? lead?.reference ?? lead?.email ?? lead?.phone ?? `booking-${index}`
    );
    items.push({ activity: { id, title: name, status, stepsLabel, timeLabel, type: 'booking' }, timestamp });

    // Steps completions as separate activities
    const steps = Array.isArray(lead?.steps) ? lead.steps : [];
    steps.forEach((s: any, si: number) => {
      const sStamp = s?.updatedAt || s?.completedAt;
      if (!sStamp && !s?.completed) return;
      const { label: sTimeLabel, timestamp: sTs } = formatRelativeLabel(sStamp || stamp);
      const stepTitle = s?.title || s?.name || `Step ${si + 1}`;
      const sid = String(`${id}-step-${si}`);
      items.push({ activity: { id: sid, title: `${stepTitle} completed · ${name}`, status: 'completed', timeLabel: sTimeLabel, type: 'step' }, timestamp: sTs });
    });
  });

  // Complaints
  complaintCollection.forEach((c: any, i: number) => {
    const stamp = c?.updatedAt || c?.createdAt;
    const { label: timeLabel, timestamp } = formatRelativeLabel(stamp);
    const title = c?.subject || c?.title || c?.message || `Complaint #${c?.id ?? i + 1}`;
    const status: 'completed' | 'in-progress' = (c?.status || '').toString().toLowerCase().includes('resolved') ? 'completed' : 'in-progress';
    const id = String(c?.id ?? c?._id ?? `complaint-${i}`);
    items.push({ activity: { id, title, timeLabel, status, type: 'complaint' }, timestamp });
  });

  // AMC services
  amcCollection.forEach((a: any, i: number) => {
    const stamp = a?.updatedAt || a?.createdAt;
    const { label: timeLabel, timestamp } = formatRelativeLabel(stamp);
    const title = a?.serviceName || a?.title || `AMC Service #${a?.id ?? i + 1}`;
    const status: 'completed' | 'in-progress' = (a?.status || '').toString().toLowerCase().includes('complete') ? 'completed' : 'in-progress';
    const id = String(a?.id ?? a?._id ?? `amc-${i}`);
    items.push({ activity: { id, title, timeLabel, status, type: 'amc' }, timestamp });
  });

  return items
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .slice(0, 4)
    .map(({ activity }) => activity);
}

function buildRecentFromLeadSteps(leads: any[]): RecentActivity[] {
  const items: { activity: RecentActivity; timestamp: number }[] = [];
  leads.forEach((lead: any, idx: number) => {
    const steps = Array.isArray(lead?.steps) ? lead.steps : [];
    steps.forEach((s: any, si: number) => {
      if (!s?.updatedAt && !s?.completed) return;
      const stamp = s?.updatedAt || s?.completedAt || lead?.updatedAt || lead?.createdAt;
      const { label: timeLabel, timestamp } = formatRelativeLabel(stamp);
      const titleBase = lead?.customerName || lead?.fullName || lead?.name || `Booking ${idx + 1}`;
      const stepTitle = s?.title || s?.name || `Step ${si + 1}`;
      const id = String(`${lead?.id ?? lead?._id ?? idx}-step-${si}`);
      items.push({
        activity: { id, title: `${stepTitle} completed · ${titleBase}`, status: 'completed', timeLabel, type: 'step' },
        timestamp,
      });
    });
  });
  return items.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 5).map(({ activity }) => activity);
}

function buildRecentFromComplaints(list: any[]): RecentActivity[] {
  const arr = list.map((c: any, i: number) => {
    const stamp = c?.updatedAt || c?.createdAt;
    const { label: timeLabel, timestamp } = formatRelativeLabel(stamp);
    const title = c?.subject || c?.title || c?.message || `Complaint #${c?.id ?? i + 1}`;
    const status: 'completed' | 'in-progress' = (c?.status || '').toString().toLowerCase().includes('resolved') ? 'completed' : 'in-progress';
    const id = String(c?.id ?? c?._id ?? `complaint-${i}`);
    return { activity: { id, title, timeLabel, status, type: 'complaint' as const }, timestamp };
  });
  return arr.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 5).map(({ activity }) => activity);
}

function buildRecentFromAmc(list: any[]): RecentActivity[] {
  const arr = list.map((a: any, i: number) => {
    const stamp = a?.updatedAt || a?.createdAt;
    const { label: timeLabel, timestamp } = formatRelativeLabel(stamp);
    const title = a?.serviceName || a?.title || `AMC Service #${a?.id ?? i + 1}`;
    const status: 'completed' | 'in-progress' = (a?.status || '').toString().toLowerCase().includes('complete') ? 'completed' : 'in-progress';
    const id = String(a?.id ?? a?._id ?? `amc-${i}`);
    return { activity: { id, title, timeLabel, status, type: 'amc' as const }, timestamp };
  });
  return arr.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 5).map(({ activity }) => activity);
}

function getStepsInfo(lead: any) {
  const steps = Array.isArray(lead?.steps) ? lead.steps : [];
  const completed = steps.filter((step: any) => step?.completed).length;
  return { total: steps.length, completed };
}

function formatRelativeLabel(stamp: any): { label: string; timestamp: number } {
  if (!stamp) return { label: 'Unknown date', timestamp: 0 };
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return { label: 'Unknown date', timestamp: 0 };
  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return { label: 'Just now', timestamp: date.getTime() };
  if (minutes < 60) return { label: `${minutes} min${minutes === 1 ? '' : 's'} ago`, timestamp: date.getTime() };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { label: `${hours} hour${hours === 1 ? '' : 's'} ago`, timestamp: date.getTime() };
  const days = Math.floor(hours / 24);
  if (days === 1) return { label: 'Yesterday', timestamp: date.getTime() };
  if (days < 7) return { label: `${days} days ago`, timestamp: date.getTime() };
  return {
    label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    timestamp: date.getTime(),
  };
}

function buildRecentActivities(leads: any[]): RecentActivity[] {
  const enriched = leads.map((lead, index) => {
    const stamp = lead?.updatedAt || lead?.createdAt;
    const { label: timeLabel, timestamp } = formatRelativeLabel(stamp);
    const { total, completed } = getStepsInfo(lead);
    const status: 'completed' | 'in-progress' = total > 0 && completed >= total ? 'completed' : 'in-progress';
    const stepsLabel = total ? `${completed}/${total} steps` : undefined;
    const name = lead?.customerName || lead?.fullName || lead?.name || lead?.email || lead?.phone || `Booking ${index + 1}`;
    const id = String(
      lead?.id ??
        lead?._id ??
        lead?.leadId ??
        lead?.uuid ??
        lead?.reference ??
        lead?.email ??
        lead?.phone ??
        `booking-${index}`
    );
    return {
      activity: { id, title: name, status, stepsLabel, timeLabel, type: 'booking' as const },
      timestamp,
    };
  });

  return enriched
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .slice(0, 5)
    .map(({ activity }) => activity);
}

export default function AdminHome({ onBack, onOpenBookings, onOpenStaff, onOpenAnalytics, onOpenSettings, onOpenComplains, onOpenAmc, onOpenCalendar }: { onBack?: () => void; onOpenBookings?: () => void; onOpenStaff?: () => void; onOpenAnalytics?: () => void; onOpenSettings?: () => void; onOpenComplains?: () => void; onOpenAmc?: () => void; onOpenCalendar?: () => void }) {
  const [stats, setStats] = React.useState<DashboardStats>({ bookingCount: null, staffCount: null, recentActivities: [] });
  const [loadingStats, setLoadingStats] = React.useState(false);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isActive = true;

    const applyData = (bookingsData: any, staffData: any, complaintsData: any, amcData: any) => {
      if (!isActive) return;
      const bookingCollection = extractCollection(bookingsData);
      const staffCollection = extractCollection(staffData);
      const complaintCollection = extractCollection(complaintsData);
      const amcCollection = extractCollection(amcData);
      const merged = buildUnifiedRecent(bookingCollection, complaintCollection, amcCollection);
      setStats({
        bookingCount: bookingCollection.length,
        staffCount: staffCollection.length,
        recentActivities: merged,
      });
      setStatsError(null);
    };

    const loadStats = async () => {
      const bookingsKey = `${BASE_URL}/api/admin/leads`;
      const staffKey = `${BASE_URL}/api/admin/staff`;
      const complaintsKey = `${BASE_URL}/api/admin/complains`;
      const amcKey = `${BASE_URL}/api/admin/amc`;

      const cachedBookings = getCachedValue<any>(bookingsKey);
      const cachedStaff = getCachedValue<any>(staffKey);
      const cachedComplaints = getCachedValue<any>(complaintsKey);
      const cachedAmc = getCachedValue<any>(amcKey);

      const hadCache = cachedBookings || cachedStaff || cachedComplaints || cachedAmc;
      if (hadCache) {
        applyData(
          cachedBookings ?? [],
          cachedStaff ?? [],
          cachedComplaints ?? {},
          cachedAmc ?? {}
        );
      }

      if (isActive) setLoadingStats(!hadCache);

      try {
        const token = await getAuthToken().catch(() => null);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const ttl = 120_000;

        const [bookingsData, staffData, complaintsData, amcData] = await Promise.all([
          fetchWithCache(bookingsKey, async () => {
            const res = await fetch(bookingsKey, { headers });
            if (!res.ok) {
              const msg = await res.text().catch(() => '');
              throw new Error(msg || 'Failed to load bookings');
            }
            return res.json();
          }, { ttlMs: ttl }),
          fetchWithCache(staffKey, async () => {
            const res = await fetch(staffKey, { headers });
            if (!res.ok) {
              const msg = await res.text().catch(() => '');
              throw new Error(msg || 'Failed to load staff');
            }
            return res.json();
          }, { ttlMs: ttl }),
          fetchWithCache(complaintsKey, async () => {
            try {
              const res = await fetch(complaintsKey, { headers });
              if (!res.ok) return {};
              return await res.json().catch(() => ({}));
            } catch {
              return {};
            }
          }, { ttlMs: ttl }),
          fetchWithCache(amcKey, async () => {
            try {
              const res = await fetch(amcKey, { headers });
              if (!res.ok) return {};
              return await res.json().catch(() => ({}));
            } catch {
              return {};
            }
          }, { ttlMs: ttl }),
        ]);

        applyData(bookingsData, staffData, complaintsData, amcData);
      } catch (err: any) {
        if (!isActive) return;
        if (!hadCache) {
          setStats({ bookingCount: null, staffCount: null, recentActivities: [] });
        }
        setStatsError(err?.message || 'Failed to load dashboard stats');
      } finally {
        if (isActive) setLoadingStats(false);
      }
    };

    loadStats();
    return () => {
      isActive = false;
    };
  }, []);

  const bookingCountDisplay = loadingStats ? '…' : `${stats.bookingCount ?? 0}`;
  const staffCountDisplay = loadingStats ? '…' : `${stats.staffCount ?? 0}`;

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
        {/* Side vignettes and overlays */}
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
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.06)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topVignette}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(247, 206, 115, 0.65)', 'rgba(247, 206, 115, 0)']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.bottomGlow}
        />
        <View style={styles.textureOverlay} />
        <View style={styles.noiseOverlay} />

        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          {/* Fixed Header */}
          <View style={styles.header}>
            {/* Avatar placeholder on left */}
            <Pressable onPress={onBack} hitSlop={8}>
              <View style={[styles.avatarWrapper, styles.avatarPlaceholder]}>
                <Ionicons name="person-circle" size={54} color="rgba(0,0,0,0.35)" />
              </View>
            </Pressable>
            {/* Translucent dropdown on right */}
            <Pressable style={styles.glassDropdown} hitSlop={10} onPress={() => {}}>
              <BlurView intensity={24} tint="light" style={styles.glassDropdown}>
                <View style={styles.dropdownInner}>
                  <Text style={styles.dropdownLabel}>All roofs</Text>
                  <Ionicons name="chevron-down" size={18} color="#1c1c1e" />
                </View>
              </BlurView>
            </Pressable>
          </View>

          {/* Scrollable Content - This is the key fix */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            scrollEnabled={true}
          >
            {/* Title */}
            <Text style={styles.titleMain}>Admin Dashboard</Text>

            {/* Stat cards with additional copies below each */}
            <View style={styles.statsRowColumns}> 
              {/* Column 1: Yellow then Dark copy below */}
              <View style={styles.statsColumn}> 
                {/* Yellow card */}
                <View style={[styles.statCard, styles.statCardYellow]}> 
                  <Text style={styles.statLabel}>Bookings</Text>
                  <Text style={styles.statValue}>{bookingCountDisplay}</Text>
                  <Text style={styles.statSub}>View booking</Text>
                  <View style={[styles.arrowPill, styles.arrowPillBlack]}> 
                    <Ionicons name="arrow-forward" size={16} color="#F5CE57" style={styles.arrowNE} />
                  </View>
                </View>
                {/* Dark copy below yellow */}
                <Pressable style={[styles.statCard, styles.statCardDark]} onPress={() => { void triggerPressHaptic(); onOpenCalendar?.(); }} accessibilityRole="button" hitSlop={8}> 
                  <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.85)' }]}>Calendar</Text>
                  <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{staffCountDisplay}</Text>
                  <Text style={[styles.statSub, { color: 'rgba(255,255,255,0.75)' }]}>Open calendar</Text>
                  <View style={[styles.arrowPill, styles.arrowPillAlt]}> 
                    <Ionicons name="arrow-forward" size={16} color="#1c1c1e" style={styles.arrowNE} />
                  </View>
                </Pressable>
              </View>

              {/* Column 2: Dark then Yellow copy below */}
              <View style={styles.statsColumn}> 
                {/* Dark card - AMC (pressable) */}
                <Pressable style={[styles.statCard, styles.statCardDark]} onPress={() => onOpenAmc?.()} accessibilityRole="button" hitSlop={8}> 
                  <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.85)' }]}>AMC service</Text>
                  <Text style={[styles.statValue, { color: '#FFFFFF' }]}>3</Text>
                  <Text style={[styles.statSub, { color: 'rgba(255,255,255,0.75)' }]}>View AMC </Text>
                  <View style={[styles.arrowPill, styles.arrowPillAlt]}> 
                    <Ionicons name="arrow-forward" size={16} color="#1c1c1e" style={styles.arrowNE} />
                  </View>
                </Pressable>
                {/* Yellow copy below dark - Complains card clickable */}
                <Pressable style={[styles.statCard, styles.statCardYellow]} onPress={() => onOpenComplains?.()} accessibilityRole="button" hitSlop={8}> 
                  <Text style={styles.statLabel}>Complains filed</Text>
                  <Text style={styles.statValue}>35</Text>
                  <Text style={styles.statSub}>View complains</Text>
                  <View style={[styles.arrowPill, styles.arrowPillBlack]}> 
                    <Ionicons name="arrow-forward" size={16} color="#F5CE57" style={styles.arrowNE} />
                  </View>
                </Pressable>
              </View>
            </View>

            {!!statsError && (
              <Text style={styles.statsError}>{statsError}</Text>
            )}

            {/* Recent activity glass card */}
            <View style={styles.summaryWrap}>
              <BlurView intensity={24} tint="light" style={[styles.summaryCard, styles.activityCard]}>
                <View style={styles.activityHeaderRow}>
                  <Text style={styles.summaryTitle}>Recent Activity</Text>
                  <Pressable style={styles.activityRefresh} onPress={() => { /* TODO: wire manual refresh */ }}>
                    <Ionicons name="refresh" size={18} color="#1c1c1e" />
                  </Pressable>
                </View>

                {loadingStats ? (
                  <View style={styles.activityLoading}>
                    <ActivityIndicator size="small" color="#1c1c1e" />
                    <Text style={styles.activityLoadingText}>Loading activity…</Text>
                  </View>
                ) : stats.recentActivities.length ? (
                  <View style={styles.activityList}>
                    {stats.recentActivities.map((item, idx) => (
                      <View key={item.id}>
                        <Pressable style={styles.activityRow} onPress={() => {}} hitSlop={8}>
                          <View style={[styles.activityStatusDot, item.status === 'completed' ? styles.activityStatusCompleted : styles.activityStatusInProgress]} />
                          <View style={styles.activityContent}>
                            <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                            <View style={styles.activityMeta}>
                              {item.stepsLabel ? (
                                <View style={[styles.activityBadge, styles.activityBadgeNeutral]}>
                                  <Text style={styles.activityBadgeText}>{item.stepsLabel}</Text>
                                </View>
                              ) : null}
                              <View style={[styles.activityBadge, item.status === 'completed' ? styles.activityBadgeSuccess : styles.activityBadgeWarn]}>
                                <Text style={styles.activityBadgeText}>{item.status === 'completed' ? 'Completed' : 'In progress'}</Text>
                              </View>
                              <Text style={styles.activityTime}>{item.timeLabel}</Text>
                            </View>
                          </View>
                          <View style={styles.activityChevronPill}>
                            <Ionicons name="chevron-forward" size={14} color="#1c1c1e" />
                          </View>
                        </Pressable>
                        {idx < stats.recentActivities.length - 1 ? <View style={styles.activityDivider} /> : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.activityEmpty}>
                    <Ionicons name="albums-outline" size={32} color="rgba(28,28,30,0.25)" />
                    <Text style={styles.activityEmptyText}>No recent activity yet</Text>
                    <Text style={styles.activityEmptySub}>New bookings will appear here once they start coming in.</Text>
                  </View>
                )}
              </BlurView>
            </View>

            {/* Extra content to test scrolling */}
            <View style={styles.extraContent}>
              <Text style={styles.extraText}>You can scroll to see more content!</Text>
              <View style={styles.extraCard}>
                <Text style={styles.extraCardText}>Additional Content Card 1</Text>
              </View>
              <View style={styles.extraCard}>
                <Text style={styles.extraCardText}>Additional Content Card 2</Text>
              </View>
              <View style={styles.extraCard}>
                <Text style={styles.extraCardText}>Additional Content Card 3</Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Navigation - Now properly positioned */}
          <BottomNav
            onGoHome={onBack}
            onOpenBookings={onOpenBookings}
            onOpenStaff={onOpenStaff}
            onOpenAnalytics={onOpenAnalytics}
            onOpenSettings={onOpenSettings}
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// Bottom navigation component
function BottomNav({ onGoHome, onOpenBookings, onOpenStaff, onOpenAnalytics, onOpenSettings }: { onGoHome?: () => void; onOpenBookings?: () => void; onOpenStaff?: () => void; onOpenAnalytics?: () => void; onOpenSettings?: () => void }) {
  const [active, setActive] = React.useState<'home' | 'roofs' | 'staff' | 'analytics' | 'settings'>('home');

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
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // space for fixed bottom nav
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  avatar: {
    width: '100%',
    height: '100%',
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
  statsRowColumns: {
    marginTop: 26,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  statsColumn: {
    flex: 1,
    gap: 12,
  },
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
  statsError: {
    marginTop: 12,
    paddingHorizontal: 20,
    fontSize: 12,
    color: '#FF3B30',
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
  summaryWrap: {
    paddingHorizontal: 20,
    marginTop: 26,
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
  
  activityCard: {
    paddingTop: 24,
    paddingBottom: 30,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  activityRefresh: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,28,30,0.08)',
  },
  activityLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  activityLoadingText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(28,28,30,0.7)',
  },
  activityList: {
    gap: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activityStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  activityStatusCompleted: {
    backgroundColor: '#46C972',
  },
  activityStatusInProgress: {
    backgroundColor: '#F5B422',
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activitySteps: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(28,28,30,0.6)',
  },
  activityTime: {
    fontSize: 12,
    color: 'rgba(28,28,30,0.6)',
  },
  activityBadge: {
    height: 22,
    paddingHorizontal: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBadgeNeutral: {
    backgroundColor: 'rgba(28,28,30,0.08)',
  },
  activityBadgeSuccess: {
    backgroundColor: 'rgba(70,201,114,0.20)',
  },
  activityBadgeWarn: {
    backgroundColor: 'rgba(245,180,34,0.25)',
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  activityChevronPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,28,30,0.08)',
  },
  activityDivider: {
    height: 1,
    backgroundColor: 'rgba(28,28,30,0.08)',
    marginVertical: 12,
    marginLeft: 26,
  },
  activityEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  activityEmptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  activityEmptySub: {
    fontSize: 13,
    color: 'rgba(28,28,30,0.6)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  summaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  summaryButton: {
    backgroundColor: '#2C2D30',
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 22,
  },
  // Extra content for testing scroll
  extraContent: {
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  extraText: {
    fontSize: 16,
    color: '#1c1c1e',
    textAlign: 'center',
    marginBottom: 10,
  },
  extraCard: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  extraCardText: {
    fontSize: 14,
    color: '#1c1c1e',
    textAlign: 'center',
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
  // Vignettes and overlays
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
});