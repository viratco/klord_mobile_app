import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';

export default function AmcPage({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = React.useState<'pending' | 'resolved'>('pending');
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [staffMap, setStaffMap] = React.useState<Record<string, any>>({});

  const loadAmc = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const token = await getAuthToken();
      const resp = await fetch(`${BASE_URL}/api/admin/amc-requests`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(t || `Failed ${resp.status}`);
      }
      const data = await resp.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load AMC requests');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadAmc(); }, [loadAmc]);

  // Load staff list to resolve assigned staff names when API does not embed assignedStaff
  const loadStaff = React.useCallback(async () => {
    try {
      const token = await getAuthToken();
      const resp = await fetch(`${BASE_URL}/api/admin/staff`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const map: Record<string, any> = {};
      (Array.isArray(data) ? data : []).forEach((s: any) => { if (s?.id) map[s.id] = s; });
      setStaffMap(map);
    } catch {}
  }, []);

  React.useEffect(() => { loadStaff(); }, [loadStaff]);

  const assignedName = (lead?: any): string | null => {
    if (!lead) return null;
    return lead.assignedStaff?.name || (lead.assignedStaffId && staffMap[lead.assignedStaffId]?.name) || null;
  };

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
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.backPill} accessibilityRole="button">
              <Ionicons name="arrow-back" size={18} color="#1c1c1e" />
            </Pressable>
            <Text style={styles.title}>AMC Service</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AMC Requests</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{loading ? '—' : items.length}</Text></View>
            </View>

            {/* Top segmented sections: Pending | Resolved */}
            <View style={styles.segmentWrap}>
              <Pressable
                onPress={() => setTab('pending')}
                style={[styles.segmentItem, tab === 'pending' && styles.segmentItemActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.segmentText, tab === 'pending' && styles.segmentTextActive]}>Pending ({items.filter((a:any)=>a.status === 'pending').length})</Text>
              </Pressable>
              <Pressable
                onPress={() => setTab('resolved')}
                style={[styles.segmentItem, tab === 'resolved' && styles.segmentItemActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.segmentText, tab === 'resolved' && styles.segmentTextActive]}>Resolved ({items.filter((a:any)=>a.status=== 'resolved').length})</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centerRow}>
                <ActivityIndicator size="small" color="#1c1c1e" />
                <Text style={styles.loadingText}> Loading AMC requests…</Text>
              </View>
            ) : error ? (
              <Text style={[styles.sub, { color: '#b00020' }]}>Error: {error}</Text>
            ) : tab === 'pending' ? (
              <>
                <Text style={styles.sub}>Pending AMC requests</Text>
                {items.filter((a:any)=>a.status === 'pending').length === 0 ? (
                  <Text style={styles.sub}>No pending AMC requests.</Text>
                ) : (
                  <View style={{ gap: 12 }}>
                    {items.filter((a:any)=>a.status === 'pending').map((a: any) => (
                      <View key={a.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <View style={styles.bookingLine}>
                            <Ionicons name="home-outline" size={16} color="#1c1c1e" />
                            <Text style={styles.bookingText} numberOfLines={1}>
                              {a.lead?.fullName || a.lead?.projectType || a.lead?.id || 'Booking'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.statusChip, statusChipStyle(a.status)]}>
                              <Text style={styles.statusText}>{String(a.status || 'pending').replace('_',' ')}</Text>
                            </View>
                            <View style={[styles.statusChip, styles.staffChip]}> 
                              <Text style={styles.statusText} numberOfLines={1}>
                                {assignedName(a.lead) ? `assigned to ${assignedName(a.lead)}` : 'not assigned'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.cardBody}>
                          <Text style={styles.messageText}>{a.note || '—'}</Text>
                        </View>
                        <View style={styles.cardFooter}>
                          <View style={styles.metaRow}>
                            <Ionicons name="time-outline" size={14} color="rgba(28,28,30,0.6)" />
                            <Text style={styles.metaText}>{new Date(a.createdAt).toLocaleString('en-IN')}</Text>
                          </View>
                          <View style={styles.metaRow}>
                            <Ionicons name="person-outline" size={14} color="rgba(28,28,30,0.6)" />
                            <Text style={styles.metaText}>{a.customer?.mobile || a.customer?.email || 'customer'}</Text>
                          </View>
                          <View style={styles.metaRow}>
                            <Ionicons name="briefcase-outline" size={14} color="rgba(28,28,30,0.6)" />
                            <Text style={styles.metaText}>
                              {assignedName(a.lead) ? `assigned to ${assignedName(a.lead)}` : 'not assigned'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sub}>Resolved AMC requests</Text>
                {items.filter((a:any)=>a.status === 'resolved').length === 0 ? (
                  <Text style={styles.sub}>No resolved AMC requests.</Text>
                ) : (
                  <View style={{ gap: 12 }}>
                    {items.filter((a:any)=>a.status === 'resolved').map((a: any) => (
                      <View key={a.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <View style={styles.bookingLine}>
                            <Ionicons name="home-outline" size={16} color="#1c1c1e" />
                            <Text style={styles.bookingText} numberOfLines={1}>
                              {a.lead?.fullName || a.lead?.projectType || a.lead?.id || 'Booking'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.statusChip, statusChipStyle(a.status)]}>
                              <Text style={styles.statusText}>resolved</Text>
                            </View>
                            {!!assignedName(a.lead) && (
                              <View style={[styles.statusChip, styles.staffChip]}>
                                <Text style={styles.statusText} numberOfLines={1}>Staff: {assignedName(a.lead)}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.cardBody}>
                          <Text style={styles.messageText}>{a.note || '—'}</Text>
                        </View>
                        <View style={styles.cardFooter}>
                          <View style={styles.metaRow}>
                            <Ionicons name="time-outline" size={14} color="rgba(28,28,30,0.6)" />
                            <Text style={styles.metaText}>{new Date(a.createdAt).toLocaleString('en-IN')}</Text>
                          </View>
                          <View style={styles.metaRow}>
                            <Ionicons name="person-outline" size={14} color="rgba(28,28,30,0.6)" />
                            <Text style={styles.metaText}>{a.customer?.mobile || a.customer?.email || 'customer'}</Text>
                          </View>
                          <View style={styles.metaRow}>
                            <Ionicons name="briefcase-outline" size={14} color="rgba(28,28,30,0.6)" />
                            <Text style={styles.metaText}>Assigned: {assignedName(a.lead) || 'Unassigned'}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <View style={{ height: 10 }} />
            <Pressable style={styles.refreshBtn} onPress={loadAmc} accessibilityRole="button">
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </Pressable>
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
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
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
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1c1c1e' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  sub: { fontSize: 13, color: 'rgba(0,0,0,0.6)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1c1c1e' },
  countBadge: { minWidth: 28, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#F7CE73', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  countText: { color: '#1c1c1e', fontSize: 12, fontWeight: '800' },
  segmentWrap: { marginTop: 8, flexDirection: 'row', gap: 8 },
  segmentItem: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  segmentItemActive: { backgroundColor: '#232428', borderColor: 'rgba(0,0,0,0.3)' },
  segmentText: { fontSize: 14, fontWeight: '700', color: '#1c1c1e' },
  segmentTextActive: { color: '#FFFFFF' },
  centerRow: { flexDirection: 'row', alignItems: 'center' },
  loadingText: { fontSize: 12, color: 'rgba(28,28,30,0.7)', fontWeight: '600', marginLeft: 8 },
  // Cards (reuse similar style from complaints for consistency)
  card: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  cardHeader: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  bookingLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 10 },
  bookingText: { flex: 1, color: '#1c1c1e', fontSize: 14, fontWeight: '700' },
  statusChip: { height: 26, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  staffChip: { backgroundColor: 'rgba(28,28,30,0.06)', borderColor: 'rgba(28,28,30,0.18)' },
  statusText: { fontSize: 11, fontWeight: '800', color: '#1c1c1e', textTransform: 'capitalize' },
  cardBody: { paddingHorizontal: 12, paddingVertical: 12 },
  messageText: { color: '#1c1c1e', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  cardFooter: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: 'rgba(28,28,30,0.7)', fontSize: 12, fontWeight: '600' },
  refreshBtn: { alignSelf: 'center', height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: '#F7CE73', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  refreshBtnText: { color: '#1c1c1e', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
});

// helper to decide chip color by status
function statusChipStyle(status?: string) {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'resolved') return { backgroundColor: 'rgba(76, 175, 80, 0.12)', borderColor: 'rgba(76, 175, 80, 0.45)' };
  if (s === 'rejected') return { backgroundColor: 'rgba(255, 59, 48, 0.12)', borderColor: 'rgba(255, 59, 48, 0.45)' };
  if (s === 'in_progress') return { backgroundColor: 'rgba(0, 122, 255, 0.12)', borderColor: 'rgba(0, 122, 255, 0.45)' };
  return { backgroundColor: 'rgba(255, 149, 0, 0.12)', borderColor: 'rgba(255, 149, 0, 0.45)' };
}

