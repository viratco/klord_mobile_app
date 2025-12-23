import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';

type StaffLite = { id: string; name: string; email: string; phone: string; createdAt: string };

// Simple weekly bar chart inside the black card
const WeeklyBarChart: React.FC<{ leads: LeadItem[] }> = ({ leads }) => {
  // Aggregate counts per weekday based on createdAt
  const counts = React.useMemo(() => {
    const arr = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    for (const l of leads || []) {
      const d = l.createdAt ? new Date(l.createdAt) : null;
      if (!d || isNaN(d.getTime())) continue;
      arr[d.getDay()] += 1;
    }
    return arr;
  }, [leads]);

  const max = Math.max(1, ...counts);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // map Sun..Sat to Mon..Sun order like in the reference
  const mapToMonFirst = (arr: number[]) => [arr[1], arr[2], arr[3], arr[4], arr[5], arr[6], arr[0]];
  const series = mapToMonFirst(counts);
  const maxBar = Math.max(...series, 0);

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartInner}>
        <View style={styles.chartGridLine} />
        <View style={styles.barsRow}>
          {series.map((v, i) => {
            const hPct = Math.max(12, Math.round((v / max) * 78)); // min 12%, top 78%
            const isMax = v === maxBar && maxBar > 0;
            return (
              <View key={i} style={styles.barCol}>
                <View style={[styles.bar, isMax ? styles.barWhite : styles.barYellow, { height: `${hPct}%` }]} />
                <Text style={[styles.barLabel, isMax && styles.barLabelActive]}>{days[i]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

type LeadItem = {
  id: string;
  fullName?: string;
  city?: string;
  state?: string;
  country?: string;
  percent?: number;
  projectType?: string;
  assignedStaffId?: string | null;
  assignedStaff?: { id: string; name?: string } | null;
  createdAt?: string;
};

export default function StaffProfileScreen({
  staff,
  onBack,
}: {
  staff: StaffLite;
  onBack?: () => void;
}) {
  const [leads, setLeads] = React.useState<LeadItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const token = await getAuthToken();
        const resp = await fetch(`${BASE_URL}/api/admin/leads`, {
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data: LeadItem[] = await resp.json();
        const filtered = (Array.isArray(data) ? data : []).filter((l) =>
          (l.assignedStaffId && l.assignedStaffId === staff.id) || (l.assignedStaff && l.assignedStaff.id === staff.id)
        );
        setLeads(filtered);
      } catch (e: any) {
        console.warn('[staffProfile] failed to load leads', e?.message || e);
        Alert.alert('Error', 'Failed to load assigned tasks for this staff');
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [staff?.id]);


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
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.screenContent}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={onBack} hitSlop={10} style={styles.backPill} accessibilityRole="button" accessibilityLabel="Go back">
                <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{staff?.name || 'Staff Profile'}</Text>
                {!!staff?.email && <Text style={styles.subtitle}>{staff.email}</Text>}
              </View>
            </View>

            {/* Staff summary card */}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{staff?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{staff?.name}</Text>
                <Text style={styles.meta}>{staff?.email}</Text>
                <Text style={styles.meta}>{staff?.phone || 'No phone'}</Text>
              </View>

              {/* Mini weekly chart */}
              <WeeklyBarChart leads={leads} />
            </View>

            {/* Assigned tasks list */}
            <Text style={styles.sectionTitle}>Assigned Bookings</Text>
            {loading ? (
              <View style={[styles.emptyContainer, styles.listSection]}><Text style={styles.emptyText}>Loading...</Text></View>
            ) : leads.length === 0 ? (
              <View style={[styles.emptyContainer, styles.listSection]}><Text style={styles.emptyText}>No tasks assigned</Text></View>
            ) : (
              <View style={styles.listSection}>
                <View style={styles.listContent}>
                  {leads.map((l) => (
                    <View key={l.id} style={styles.leadCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.leadName}>{l.fullName || '—'}</Text>
                        <Text style={styles.leadMeta}>{[l.city, l.state, l.country].filter(Boolean).join(', ') || '—'}</Text>
                        <Text style={styles.leadMeta}>Type: {l.projectType || '—'}</Text>
                      </View>
                      <View style={styles.badge}><Text style={styles.badgeText}>{Math.max(0, Math.min(100, Number(l.percent || 0)))}%</Text></View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F6' },
  gradientBackground: { flex: 1, width: '100%', height: '100%' },
  safeArea: { flex: 1 },
  contentScroll: { flex: 1 },
  screenContent: {
    paddingBottom: 140,
  },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
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
  title: { fontSize: 22, fontWeight: '700', color: '#1c1c1e' },
  subtitle: { fontSize: 12, color: 'rgba(28,28,30,0.65)', marginTop: 2 },
  profileCard: {
    marginTop: 8,
    marginHorizontal: 20,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#1c1c1e', fontWeight: '800' },
  name: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  meta: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  // Chart styles
  chartWrap: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 12,
  },
  chartInner: {
    height: 132,
    position: 'relative',
  },
  chartGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 28,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)'
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  barCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 28,
    borderRadius: 8,
  },
  barYellow: {
    backgroundColor: '#F7CE73',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)'
  },
  barWhite: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)'
  },
  barDark: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)'
  },
  barLabel: {
    marginTop: 6,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)'
  },
  barLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  listSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  listContent: { gap: 12, paddingBottom: 40 },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  leadName: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  leadMeta: { fontSize: 12, color: 'rgba(0,0,0,0.6)', marginTop: 2 },
  badge: {
    minWidth: 42,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7CE73',
    borderColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
  },
  badgeText: { color: '#1c1c1e', fontWeight: '800' },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(28,28,30,0.6)',
    fontWeight: '500',
  },
  bottomSpacer: { height: 40 },
});
