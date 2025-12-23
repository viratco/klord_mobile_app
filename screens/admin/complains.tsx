import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';

export default function ComplainsScreen({ onBack }: { onBack?: () => void }) {
  // Simple local state; later we can fetch and filter by status
  const [tab, setTab] = React.useState<'pending' | 'resolved'>('pending');
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [staffMap, setStaffMap] = React.useState<Record<string, any>>({});

  const loadComplaints = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const token = await getAuthToken();
      const authHeader = token ? { Authorization: token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}` } : {};

      // 1) Load all leads to iterate through
      const leadsResp = await fetch(`${BASE_URL}/api/admin/leads`, {
        headers: { 'Content-Type': 'application/json', ...authHeader },
      });
      if (!leadsResp.ok) throw new Error(`Failed to load leads: ${leadsResp.status}`);
      const leads = await leadsResp.json();
      const leadList: any[] = Array.isArray(leads) ? leads : [];

      // 2) For each lead, fetch its complaints
      const results = await Promise.all(
        leadList.map(async (lead) => {
          try {
            const url = `${BASE_URL}/api/admin/leads/${encodeURIComponent(lead.id)}/complaints`;
            console.log('[admin complaints] GET', url);
            const r = await fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeader } });
            if (!r.ok) return [] as any[];
            const arr = await r.json();
            const list: any[] = Array.isArray(arr) ? arr : [];
            // attach lead info since API doesn't include it
            return list.map((c) => ({ ...c, lead }));
          } catch {
            return [] as any[];
          }
        })
      );

      const combined = results.flat();
      console.log('[admin complaints] combined count', combined.length);
      setItems(combined);
    } catch (e: any) {
      setError(e?.message || 'Failed to load complaints');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Fallback: load staff list to resolve names when API response lacks lead.assignedStaff
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

  // Derive a normalized status for display/filtering
  const getStatus = React.useCallback((c: any): 'pending' | 'in_progress' | 'resolved' => {
    const s = String(c?.status || '').toLowerCase();
    if (s === 'resolved') return 'resolved';
    if (s === 'in_progress') return 'in_progress';
    if (s === 'open' || s === 'pending') return 'pending';
    // Default: treat missing/unknown as pending
    return 'pending';
  }, []);

  const pendingItems = React.useMemo(() => items.filter((c: any) => getStatus(c) !== 'resolved'), [items, getStatus]);
  const resolvedItems = React.useMemo(() => items.filter((c: any) => getStatus(c) === 'resolved'), [items, getStatus]);
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
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.backPill}>
              <Ionicons name="arrow-back" size={18} color="#1c1c1e" />
            </Pressable>
            <Text style={styles.title}>Complains</Text>
            <View style={{ width: 36 }} />
          </View>
          {/* Top segmented sections: Pending | Resolved */}
          <View style={styles.segmentWrap}>
            <Pressable
              onPress={() => setTab('pending')}
              style={[styles.segmentItem, tab === 'pending' && styles.segmentItemActive]}
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, tab === 'pending' && styles.segmentTextActive]}>Pending ({pendingItems.length})</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('resolved')}
              style={[styles.segmentItem, tab === 'resolved' && styles.segmentItemActive]}
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, tab === 'resolved' && styles.segmentTextActive]}>Resolved ({resolvedItems.length})</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#1c1c1e" />
                <Text style={styles.loadingText}>Loading complaints...</Text>
              </View>
            ) : error ? (
              <Text style={[styles.sub, { color: '#b00020' }]}>Error: {error}</Text>
            ) : tab === 'pending' ? (
              <>
                <Text style={styles.sub}>Pending complains</Text>
                {pendingItems.length === 0 ? (
                  <Text style={styles.sub}>No pending complaints.</Text>
                ) : (
                  pendingItems.map((c: any) => (
                    <View key={c.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.bookingLine}>
                          <Ionicons name="home-outline" size={16} color="#1c1c1e" />
                          <Text style={styles.bookingText} numberOfLines={1}>
                            {c.lead?.fullName || c.lead?.projectType || c.lead?.id || 'Booking'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.statusChip, styles.statusOpen]}>
                            <Text style={styles.statusText}>{String(c.status || 'open').replace('_',' ')}</Text>
                          </View>
                          <View style={[styles.statusChip, styles.staffChip]}>
                            <Text style={styles.statusText} numberOfLines={1}>
                              {assignedName(c.lead) ? `assigned to ${assignedName(c.lead)}` : 'not assigned'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.messageText}>{c.message || '—'}</Text>
                      </View>
                      <View style={styles.cardFooter}>
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={14} color="rgba(28,28,30,0.6)" />
                          <Text style={styles.metaText}>{new Date(c.createdAt).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Ionicons name="person-outline" size={14} color="rgba(28,28,30,0.6)" />
                          <Text style={styles.metaText}>{c.customer?.mobile || c.customer?.email || 'customer'}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Ionicons name="briefcase-outline" size={14} color="rgba(28,28,30,0.6)" />
                          <Text style={styles.metaText}>
                            {assignedName(c.lead) ? `assigned to ${assignedName(c.lead)}` : 'not assigned'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                <Text style={styles.sub}>Resolved complains</Text>
                {resolvedItems.length === 0 ? (
                  <Text style={styles.sub}>No resolved complaints.</Text>
                ) : (
                  resolvedItems.map((c: any) => (
                    <View key={c.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.bookingLine}>
                          <Ionicons name="home-outline" size={16} color="#1c1c1e" />
                          <Text style={styles.bookingText} numberOfLines={1}>
                            {c.lead?.fullName || c.lead?.projectType || c.lead?.id || 'Booking'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.statusChip, styles.statusResolved]}>
                            <Text style={styles.statusText}>resolved</Text>
                          </View>
                          {!!c.lead?.assignedStaff?.name && (
                            <View style={[styles.statusChip, styles.staffChip]}>
                              <Text style={styles.statusText} numberOfLines={1}>Staff: {c.lead.assignedStaff.name}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.messageText}>{c.message || '—'}</Text>
                      </View>
                      <View style={styles.cardFooter}>
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={14} color="rgba(28,28,30,0.6)" />
                          <Text style={styles.metaText}>{new Date(c.createdAt).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Ionicons name="person-outline" size={14} color="rgba(28,28,30,0.6)" />
                          <Text style={styles.metaText}>{c.customer?.mobile || c.customer?.email || 'customer'}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Ionicons name="briefcase-outline" size={14} color="rgba(28,28,30,0.6)" />
                          <Text style={styles.metaText}>Assigned: {c.lead?.assignedStaff?.name || 'Unassigned'}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
            <View style={{ height: 8 }} />
            <Pressable style={styles.refreshBtn} onPress={loadComplaints} accessibilityRole="button">
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
    paddingBottom: 6,
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
  segmentWrap: {
    marginTop: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  segmentItem: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  segmentItemActive: {
    backgroundColor: '#232428',
    borderColor: 'rgba(0,0,0,0.3)'
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  sub: { fontSize: 13, color: 'rgba(0,0,0,0.6)', marginBottom: 4 },
  item: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 14,
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 },
  itemMeta: { fontSize: 12, color: 'rgba(0,0,0,0.6)', fontWeight: '600' },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(28,28,30,0.7)',
    fontWeight: '600',
  },
  refreshBtn: {
    alignSelf: 'center',
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)'
  },
  refreshBtnText: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // New card design styles
  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)'
  },
  bookingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  bookingText: {
    flex: 1,
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '700',
  },
  statusChip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statusOpen: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderColor: 'rgba(255, 149, 0, 0.45)'
  },
  statusResolved: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderColor: 'rgba(76, 175, 80, 0.45)'
  },
  staffChip: {
    backgroundColor: 'rgba(28,28,30,0.06)',
    borderColor: 'rgba(28,28,30,0.18)'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1c1c1e',
    textTransform: 'capitalize',
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageText: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardFooter: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: 'rgba(28,28,30,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
});

