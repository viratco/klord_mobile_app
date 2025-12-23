import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';

export default function AmcStaff({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = React.useState<'pending' | 'resolved'>('pending');
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [resolvingId, setResolvingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (Platform.OS === 'android' && (UIManager as any)?.setLayoutAnimationEnabledExperimental) {
      (UIManager as any).setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const load = React.useCallback(async (status: 'pending' | 'resolved', isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const token = await getAuthToken();
      const url = `${BASE_URL}/api/staff/amc-requests?status=${encodeURIComponent(status)}`;
      const resp = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load AMC requests');
      setItems([]);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(tab); }, [tab, load]);

  const resolveAmc = React.useCallback(async (id: string) => {
    try {
      setResolvingId(id);
      const token = await getAuthToken();
      const url = `${BASE_URL}/api/staff/amc-requests/${encodeURIComponent(id)}/resolve`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) throw new Error(await resp.text());
      // Refresh current tab after resolve
      await load(tab);
      // collapse the card
      setExpanded((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      // Optional: setError(String(e)); keep quiet per UX
    } finally {
      setResolvingId(null);
    }
  }, [tab, load]);
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
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.backPill} accessibilityRole="button">
              <Ionicons name="arrow-back" size={18} color="#1c1c1e" />
            </Pressable>
            <Text style={styles.title}>AMC Calls</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(tab, true)} />}
          >
            {/* Segmented control */}
            <View style={styles.segmentRow}>
              <Pressable onPress={() => setTab('pending')} style={[styles.chip, tab === 'pending' && styles.chipActive]} accessibilityRole="button">
                <Text style={[styles.chipText, tab === 'pending' && styles.chipTextActive]}>Pending</Text>
              </Pressable>
              <Pressable onPress={() => setTab('resolved')} style={[styles.chip, tab === 'resolved' && styles.chipActive]} accessibilityRole="button">
                <Text style={[styles.chipText, tab === 'resolved' && styles.chipTextActive]}>Resolved</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#1c1c1e" />
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {items.map((it) => (
                  <View key={it.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{it.lead?.fullName || it.lead?.projectType || 'Booking'}</Text>
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {(it.lead?.projectType || 'Project') + (it.lead?.city ? ` • ${it.lead.city}${it.lead?.state ? ", " + it.lead.state : ''}` : '')}
                        </Text>
                      </View>
                      <View style={styles.rightControls}>
                        <View style={[styles.statusChip, statusChipStyle(it.status)]}>
                          <Text style={styles.statusText}>{String(it.status || 'pending').replace('_',' ')}</Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(it.id)) next.delete(it.id); else next.add(it.id);
                              return next;
                            });
                          }}
                          accessibilityRole="button"
                          hitSlop={8}
                          style={styles.toggleBtn}
                        >
                          <Ionicons name={expanded.has(it.id) ? 'chevron-up' : 'chevron-down'} size={18} color="#1c1c1e" />
                        </Pressable>
                      </View>
                    </View>

                    {!!it.note && !expanded.has(it.id) && (
                      <View style={styles.cardBody}><Text style={styles.noteText} numberOfLines={2}>{it.note}</Text></View>
                    )}

                    <View style={styles.cardFooter}>
                      <Ionicons name="time-outline" size={14} color="rgba(28,28,30,0.6)" />
                      <Text style={styles.metaText}>{new Date(it.createdAt).toLocaleString('en-IN')}</Text>
                    </View>

                    {expanded.has(it.id) && (
                      <View style={styles.detailsBox}>
                        {!!it.note && (
                          <View style={styles.detailLine}>
                            <Text style={styles.detailLabel}>Note</Text>
                            <Text style={styles.detailValue}>{it.note}</Text>
                          </View>
                        )}
                        {!!it.lead?.phone && (
                          <View style={styles.detailLine}>
                            <Text style={styles.detailLabel}>Number</Text>
                            <Text style={styles.detailValue}>{it.lead.phone}</Text>
                          </View>
                        )}
                        {!!it.lead?.projectType && (
                          <View style={styles.detailLine}>
                            <Text style={styles.detailLabel}>Project</Text>
                            <Text style={styles.detailValue}>{it.lead.projectType}</Text>
                          </View>
                        )}
                        {it.lead?.sizedKW !== undefined && it.lead?.sizedKW !== null && (
                          <View style={styles.detailLine}>
                            <Text style={styles.detailLabel}>Size</Text>
                            <Text style={styles.detailValue}>{String(it.lead.sizedKW)} kW</Text>
                          </View>
                        )}
                        {(() => {
                          const parts = [it.lead?.address, it.lead?.street, it.lead?.city, it.lead?.state, it.lead?.country, it.lead?.zip].filter(Boolean);
                          const addr = parts.join(', ');
                          return addr ? (
                            <View style={styles.detailLine}>
                              <Text style={styles.detailLabel}>Address</Text>
                              <Text style={styles.detailValue}>{addr}</Text>
                            </View>
                          ) : null;
                        })()}
                        <View style={styles.detailLine}>
                          <Text style={styles.detailLabel}>Booking Code</Text>
                          <Text style={styles.detailValue}>{it.lead?.bookingCode || '-'}</Text>
                        </View>
                        <View style={styles.detailLine}>
                          <Text style={styles.detailLabel}>Created</Text>
                          <Text style={styles.detailValue}>{new Date(it.createdAt).toLocaleString('en-IN')}</Text>
                        </View>

                        {String(it.status).toLowerCase() !== 'resolved' && (
                          <Pressable
                            onPress={() => resolveAmc(it.id)}
                            disabled={resolvingId === it.id}
                            style={[styles.resolveBtn, resolvingId === it.id && { opacity: 0.6 }]}
                            accessibilityRole="button"
                          >
                            {resolvingId === it.id ? (
                              <ActivityIndicator size="small" color="#1c1c1e" />
                            ) : (
                              <Text style={styles.resolveText}>Resolve</Text>
                            )}
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                ))}
                {items.length === 0 && !error && <View style={styles.emptySpacer} />}
              </View>
            )}
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
  content: { padding: 16 },
  segmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center', flex: 1 },
  chipActive: { backgroundColor: '#1c1c1e', borderColor: '#1c1c1e' },
  chipText: { color: 'rgba(28,28,30,0.9)', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  // Detailed card styles
  card: { borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  cardHeader: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1c1c1e' },
  cardSubtitle: { fontSize: 12, fontWeight: '600', color: 'rgba(28,28,30,0.7)', marginTop: 2 },
  statusChip: { height: 26, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '800', color: '#1c1c1e', textTransform: 'capitalize' },
  cardBody: { paddingHorizontal: 12, paddingBottom: 8 },
  noteText: { color: 'rgba(28,28,30,0.8)', fontSize: 12, fontWeight: '600' },
  cardFooter: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  detailsBox: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', gap: 6 },
  detailLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  detailLabel: { color: 'rgba(28,28,30,0.6)', fontSize: 12, fontWeight: '700', minWidth: 90 },
  detailValue: { color: '#1c1c1e', fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
  metaText: { color: 'rgba(28,28,30,0.7)', fontSize: 12, fontWeight: '600' },
  resolveBtn: { marginTop: 10, height: 38, borderRadius: 19, backgroundColor: '#F7CE73', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  resolveText: { color: '#1c1c1e', fontSize: 13, fontWeight: '800' },
  emptySpacer: { height: 12 },
});

// helper to decide chip color by status
function statusChipStyle(status?: string) {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'resolved') return { backgroundColor: 'rgba(76, 175, 80, 0.12)', borderColor: 'rgba(76, 175, 80, 0.45)' };
  if (s === 'rejected') return { backgroundColor: 'rgba(255, 59, 48, 0.12)', borderColor: 'rgba(255, 59, 48, 0.45)' };
  if (s === 'in_progress') return { backgroundColor: 'rgba(0, 122, 255, 0.12)', borderColor: 'rgba(0, 122, 255, 0.45)' };
  // pending -> yellow pill box
  return { backgroundColor: '#F7CE73', borderColor: 'rgba(0,0,0,0.12)' };
}

