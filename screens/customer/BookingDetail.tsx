import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { getAuthToken } from '../../utils/auth';
import { BASE_URL } from '../../utils/config';
import { triggerPressHaptic } from '../../utils/haptics';

export type BookingData = {
  id: string;
  name: string;
  role: string;
  percent: number;
};

export default function BookingDetail({ booking, onBack, onOpenSteps }: { booking: BookingData; onBack?: () => void; onOpenSteps?: (b: any) => void }) {
  const barColor = booking.percent >= 86 ? '#FF3B30' : booking.percent >= 61 ? '#FF8C00' : '#FFA500';
  const barWidth = Math.max(4, Math.min(100, booking.percent));
  const [complaint, setComplaint] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMsg, setSubmitMsg] = React.useState<string | null>(null);
  // AMC state
  const [amcNote, setAmcNote] = React.useState('');
  const [amcSubmitting, setAmcSubmitting] = React.useState(false);
  const [amcMsg, setAmcMsg] = React.useState<string | null>(null);
  // Resolved AMC history
  const [amcResolved, setAmcResolved] = React.useState<any[]>([]);
  const [amcResolvedLoading, setAmcResolvedLoading] = React.useState(false);
  const [amcResolvedError, setAmcResolvedError] = React.useState<string | null>(null);

  // Load full lead details for receipt
  const [lead, setLead] = React.useState<any | null>(null);
  const [loadingLead, setLoadingLead] = React.useState(false);
  const [leadError, setLeadError] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const fetchLead = React.useCallback(async () => {
    try {
      setLeadError(null);
      const token = await getAuthToken();
      const authHeader = token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : null;
      const url = `${BASE_URL}/api/customer/leads/${booking.id}`;
      const resp = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setLead(data);
    } catch (e: any) {
      setLeadError(e?.message || 'Failed to load booking');
    }
  }, [booking?.id]);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoadingLead(true);
        if (booking?.id) await fetchLead();
      } finally {
        if (mounted) setLoadingLead(false);
      }
    };
    run();
    const interval = setInterval(fetchLead, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, [booking?.id, fetchLead]);

  const TYPE_IMAGE: Record<string, any> = {
    residential: require('../../assets/reseidency.jpeg'),
    commercial: require('../../assets/commercial.jpeg'),
    industrial: require('../../assets/industory.jpeg'),
    ground: require('../../assets/ground.jpeg'),
  };

  const normalizeType = (t?: string | null) => {
    const k = String(t || '').toLowerCase().trim();
    if (!k) return '';
    if (k.includes('ground')) return 'ground';
    if (k.startsWith('res')) return 'residential';
    if (k.startsWith('com')) return 'commercial';
    if (k.startsWith('ind')) return 'industrial';
    return k;
  };

  const projectTypeKey = normalizeType(lead?.projectType || booking?.role);
  const headerImg = TYPE_IMAGE[projectTypeKey] || TYPE_IMAGE['residential'];
  const projectLabel = projectTypeKey ? projectTypeKey.replace(/\b\w/g, (m) => m.toUpperCase()) : 'Residential';

  // Load resolved AMC requests for this booking
  React.useEffect(() => {
    const run = async () => {
      if (!booking?.id) return;
      try {
        setAmcResolvedLoading(true);
        setAmcResolvedError(null);
        const token = await getAuthToken();
        const authHeader = token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : null;
        const url = `${BASE_URL}/api/customer/leads/${booking.id}/amc-requests?status=resolved`;
        const resp = await fetch(url, {
          headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        setAmcResolved(Array.isArray(data) ? data : []);
      } catch (e: any) {
        // Silently ignore if endpoint not available; show minimal error text
        setAmcResolvedError(e?.message || 'Failed to load AMC history');
        setAmcResolved([]);
      } finally {
        setAmcResolvedLoading(false);
      }
    };
    run();
  }, [booking?.id]);

  // Helpers for receipt
  const inr = (n: any) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '₹ 0';
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
    } catch {
      return `₹ ${Math.round(num).toLocaleString('en-IN')}`;
    }
  };
  const providerLabel = (p?: string | null) => {
    if (!p) return '';
    const key = String(p).toLowerCase();
    const map: Record<string, string> = {
      purvanchal_vv: 'Purvanchal VV',
      torrent_power: 'Torrent Power',
      paschimanchal: 'Paschimanchal',
      mvvnl: 'MVVNL',
      dvvnl: 'DVVNL',
      npcl: 'NPCL',
    };
    return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  };

  const submitComplaint = React.useCallback(async () => {
    try {
      void triggerPressHaptic();
      setSubmitting(true);
      setSubmitMsg(null);
      const msg = complaint.trim();
      if (!msg) {
        setSubmitMsg('Please type your complaint before submitting.');
        return;
      }
      if (!booking?.id) {
        setSubmitMsg('Cannot submit: missing booking ID.');
        return;
      }
      const token = await getAuthToken();
      const authHeader = token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : null;
      const url = `${BASE_URL}/api/customer/leads/${booking.id}/complaints`;
      if (__DEV__) console.log('[complaint] POST', url);
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ message: msg }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || `Failed with ${resp.status}`);
      }
      setComplaint('');
      setSubmitMsg('Complaint submitted successfully.');
    } catch (e: any) {
      setSubmitMsg(e?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  }, [complaint, booking.id]);

  const submitAmc = React.useCallback(async () => {
    try {
      void triggerPressHaptic();
      setAmcSubmitting(true);
      setAmcMsg(null);
      if (!booking?.id) {
        setAmcMsg('Cannot submit: missing booking ID.');
        return;
      }
      const token = await getAuthToken();
      const authHeader = token ? (token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`) : null;
      const url = `${BASE_URL}/api/customer/leads/${booking.id}/amc-requests`;
      if (__DEV__) console.log('[amc] POST', url);
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ note: amcNote?.trim() || undefined }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || `Failed with ${resp.status}`);
      }
      setAmcNote('');
      setAmcMsg('Service request submitted. We will contact you shortly.');
    } catch (e: any) {
      setAmcMsg(e?.message || 'Failed to submit service request');
    } finally {
      setAmcSubmitting(false);
    }
  }, [amcNote, booking?.id]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73', '#F7CE73']}
        locations={[0, 0.18, 0.46, 0.74, 0.92, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
          {/* Scrollable content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 96 }]}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* White card with image occupying ~3/4 from top */}
            <View style={styles.translucentDiv}>
              <Image
                source={headerImg}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>active</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.footerTitle}>{projectLabel}</Text>
              </View>
            </View>

            {/* Weekly chart card (real-time steps vs time) */}
            <WeeklyStepsChart lead={lead} />

            {/* View details button directly below the chart */}
            <Pressable
              style={styles.viewDetailsBtn}
              onPress={() => onOpenSteps?.(booking)}
              accessibilityRole="button"
            >
              <Text style={styles.viewDetailsText}>View details</Text>
            </Pressable>

            {/* Receipt (black) card */}
            <View style={styles.receiptCard}>
              {loadingLead ? (
                <View style={{ padding: 16 }}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : leadError ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: '#FF8A80', fontWeight: '700' }}>Error: {leadError}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.receiptHeaderRow}>
                    <Text style={styles.receiptTitle}>Booking Receipt</Text>
                    <Text style={styles.receiptSub}>{lead?.fullName || booking?.name || ''}</Text>
                  </View>

                  {/* Project Info */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Project Status</Text>
                    <Text style={[styles.receiptValue, { color: lead?.certificateUrl ? '#4CAF50' : '#FFA500' }]}>
                      {lead?.certificateUrl ? 'Completed' : `${Math.max(0, Math.min(100, Number(lead?.percent ?? booking?.percent ?? 0)))}% Complete`}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Project Type</Text>
                    <Text style={styles.receiptValue}>{lead?.projectType || booking?.role || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Booking ID</Text>
                    <Text style={styles.receiptValue}>{lead?.bookingCode || lead?.id || booking?.id}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Created Date</Text>
                    <Text style={styles.receiptValue}>{lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN') : '—'}</Text>
                  </View>

                  <View style={styles.receiptDivider} />

                  {/* Financial Summary */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Cost of Solar PV Plant</Text>
                    <Text style={styles.receiptValue}>{inr(lead?.totalInvestment ?? lead?.estimateINR)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>GST {lead?.gstPct ? `(${Number(lead.gstPct).toFixed(1)}%)` : ''}</Text>
                    <Text style={styles.receiptValue}>{inr(lead?.gstAmount)}</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                  <View style={[styles.receiptRow, { marginTop: 6 }]}>
                    <Text style={[styles.receiptLabel, { color: '#FFFFFF' }]}>Total Payable</Text>
                    <Text style={[styles.receiptValue, { color: '#FFFFFF' }]}>
                      {inr((Number(lead?.totalInvestment ?? lead?.estimateINR) || 0) + (Number(lead?.gstAmount) || 0))}
                    </Text>
                  </View>

                  <View style={{ height: 12 }} />
                  <View style={styles.receiptMetaRow}>
                    <Text style={styles.receiptMeta}>Size: {Number.isFinite(Number(lead?.sizedKW)) ? `${Number(lead?.sizedKW).toFixed(1)} kW` : '—'}</Text>
                    {!!lead?.provider && <Text style={styles.receiptMeta}>Provider: {providerLabel(lead?.provider)}</Text>}
                  </View>
                  <View style={styles.receiptMetaRow}>
                    {!!lead?.plates && <Text style={styles.receiptMeta}>Plates: {String(lead.plates)}</Text>}
                    {!!lead?.wp && <Text style={styles.receiptMeta}>WP: {String(lead.wp)}</Text>}
                  </View>

                  <View style={styles.receiptDivider} />

                  {/* Customer Information */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Customer Name</Text>
                    <Text style={styles.receiptValue}>{lead?.fullName || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Phone</Text>
                    <Text style={styles.receiptValue}>{lead?.phone || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Email</Text>
                    <Text style={styles.receiptValue}>{lead?.email || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Pincode</Text>
                    <Text style={styles.receiptValue}>{lead?.pincode || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Address</Text>
                    <Text style={[styles.receiptValue, { textAlign: 'right' }]} numberOfLines={3} ellipsizeMode="tail">
                      {[lead?.address, lead?.street, lead?.city, lead?.state, lead?.country, lead?.zip].filter(Boolean).join(', ') || '—'}
                    </Text>
                  </View>

                  <View style={styles.receiptDivider} />

                  {/* Technical Details */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Monthly Bill</Text>
                    <Text style={styles.receiptValue}>{inr(lead?.monthlyBill)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Billing Cycle</Text>
                    <Text style={styles.receiptValue}>
                      {lead?.billingCycleMonths ? `${lead.billingCycleMonths} month${lead.billingCycleMonths > 1 ? 's' : ''}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Rate per kW</Text>
                    <Text style={styles.receiptValue}>{inr(lead?.ratePerKW)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Annual Gen per kW</Text>
                    <Text style={styles.receiptValue}>{Number.isFinite(Number(lead?.annualGenPerKW)) ? String(lead.annualGenPerKW) : '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Tariff</Text>
                    <Text style={styles.receiptValue}>
                      {Number.isFinite(Number(lead?.tariffINR)) ? `${inr(lead?.tariffINR)} /unit` : '—'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>With Subsidy</Text>
                    <Text style={styles.receiptValue}>{lead?.withSubsidy === undefined || lead?.withSubsidy === null ? '—' : (lead?.withSubsidy ? 'Yes' : 'No')}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Complaint section (moved above AMC) */}
            {/* Bottom white div */}
            <View style={styles.bottomWhiteDiv}>
              <Image
                source={require('../../assets/complainpic.png')}
                style={styles.bottomImage}
              />
              {/* Help CTA */}
              <View style={styles.helpWrap}>
                <Text style={styles.helpTitle}>having trouble?</Text>
                {/* Complaint input */}
                <View style={styles.complaintBox}>
                  <TextInput
                    value={complaint}
                    onChangeText={setComplaint}
                    placeholder="Describe the issue you're facing..."
                    placeholderTextColor="#8e8e93"
                    multiline
                    style={styles.complaintInput}
                    editable={!submitting}
                  />
                  {!!submitMsg && (
                    <Text style={[styles.submitMsg, submitMsg.includes('successfully') ? { color: '#2e7d32' } : { color: '#c62828' }]}>
                      {submitMsg}
                    </Text>
                  )}
                  <Pressable style={[styles.helpButton, submitting && { opacity: 0.6 }]} onPress={submitComplaint} disabled={submitting}>
                    {submitting ? (
                      <ActivityIndicator size="small" color="#1c1c1e" />
                    ) : (
                      <Text style={styles.helpButtonText}>Submit complaint</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>

            {/* AMC request black card */}
            <View style={styles.amcCard}>
              <Text style={styles.amcTitle}>Need service/AMC support?</Text>
              <Text style={styles.amcSubtitle}>Tell us briefly and submit a request.</Text>
              <TextInput
                value={amcNote}
                onChangeText={setAmcNote}
                placeholder="Optional note (ex: inverter issue, panel cleaning, etc.)"
                placeholderTextColor="rgba(255,255,255,0.6)"
                multiline
                style={styles.amcInput}
                editable={!amcSubmitting}
              />
              {!!amcMsg && (
                <Text style={[styles.amcMsg, amcMsg.includes('submitted') ? { color: '#A5D6A7' } : { color: '#FF8A80' }]}>
                  {amcMsg}
                </Text>
              )}
              <Pressable style={[styles.amcButton, amcSubmitting && { opacity: 0.7 }]} onPress={submitAmc} disabled={amcSubmitting}>
                {amcSubmitting ? (
                  <ActivityIndicator size="small" color="#1c1c1e" />
                ) : (
                  <Text style={styles.amcButtonText}>Request AMC service</Text>
                )}
              </Pressable>
            </View>

            {/* Resolved AMC history */}
            <View style={styles.amcHistoryCard}>
              <View style={styles.amcHistoryHeader}>
                <Text style={styles.amcHistoryTitle}>Resolved AMC history</Text>
                <View style={styles.countBadge}><Text style={styles.countText}>{amcResolvedLoading ? '—' : amcResolved.length}</Text></View>
              </View>
              {amcResolvedLoading ? (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : amcResolvedError ? (
                <Text style={[styles.historySub, { color: '#FF8A80' }]}>Error: {amcResolvedError}</Text>
              ) : amcResolved.length === 0 ? (
                <Text style={styles.historySub}>No resolved AMC requests yet.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {amcResolved.map((r: any) => (
                    <View key={r.id} style={styles.historyItem}>
                      <View style={styles.historyTopRow}>
                        <View style={[styles.statusPill, { backgroundColor: 'rgba(76,175,80,0.12)', borderColor: 'rgba(76,175,80,0.45)' }]}>
                          <Text style={styles.statusPillText}>resolved</Text>
                        </View>
                        <Text style={styles.historyDate}>{new Date(r.updatedAt || r.createdAt).toLocaleString('en-IN')}</Text>
                      </View>
                      {!!r.note && <Text style={styles.historyNote} numberOfLines={3}>{r.note}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Timeframe segmented control removed */}
          </ScrollView>

          {/* Fixed back button overlay */}
          <View pointerEvents="box-none" style={[styles.backRow, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={onBack} hitSlop={8} style={styles.backPressable} accessibilityRole="button" accessibilityLabel="Go back">
              <BlurView intensity={24} tint="light" style={styles.glassBackPill}>
                <Ionicons name="arrow-back" size={18} color="#1c1c1e" />
                <Text style={styles.backText}>Back</Text>
              </BlurView>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function WeeklyStepsChart({ lead }: { lead: any }) {
  const totalSteps = 12;
  const days = React.useMemo(() => {
    const out: { date: Date; key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      out.push({ date: d, key, label });
    }
    return out;
  }, []);

  const series = React.useMemo(() => {
    const bins: Record<string, number> = Object.fromEntries(days.map(d => [d.key, 0]));
    const stepsArr: any[] = Array.isArray(lead?.steps) ? lead.steps : [];

    let usedFallback = false;
    if (stepsArr.length > 0) {
      for (const s of stepsArr) {
        const isDone = !!(s?.completed || s?.status === 'done' || s?.isCompleted);
        const tsStr = s?.completedAt || s?.updatedAt || s?.timestamp || s?.date;
        if (isDone && tsStr) {
          const dt = new Date(tsStr);
          if (!isNaN(dt.getTime())) {
            dt.setHours(0, 0, 0, 0);
            const key = dt.toISOString().slice(0, 10);
            if (bins[key] !== undefined) bins[key] += 1;
          }
        }
      }
    } else {
      usedFallback = true;
    }

    if (usedFallback) {
      const pct = Number(lead?.percent);
      const completed = Number.isFinite(pct) ? Math.max(0, Math.min(totalSteps, Math.round((pct / 100) * totalSteps))) : 0;
      const created = lead?.createdAt ? new Date(lead.createdAt) : null;
      const now = new Date();
      const daysElapsed = created ? Math.max(1, Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))) : 7;
      const span = Math.min(7, daysElapsed);
      let left = completed;
      for (let i = 0; i < span; i++) {
        const idx = days.length - 1 - i;
        if (idx < 0) break;
        const key = days[idx].key;
        const give = Math.floor(left / (span - i));
        bins[key] += give;
        left -= give;
      }
      let i = 0;
      while (left > 0 && i < days.length) {
        const idx = days.length - 1 - i;
        if (idx >= 0) bins[days[idx].key] += 1;
        left--;
        i++;
      }
    }

    const arr = days.map(d => ({ key: d.key, label: d.label, value: bins[d.key] || 0 }));
    const max = Math.max(1, ...arr.map(a => a.value));
    const avg = arr.reduce((s, a) => s + a.value, 0) / arr.length;
    return { arr, max, avg };
  }, [days, lead?.steps, lead?.percent, lead?.createdAt]);

  const maxBarHeight = 140;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Weekly Avg {series.avg.toFixed(2)} steps/day</Text>
      <View style={styles.chartContainer}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.yAxisLabel}>{series.max}</Text>
          <Text style={styles.yAxisLabel}>{Math.ceil(series.max * 0.6)}</Text>
          <Text style={styles.yAxisLabel}>{Math.ceil(series.max * 0.3)}</Text>
        </View>
        <View style={styles.barsContainer}>
          {series.arr.map((d, idx) => {
            const h = Math.round((d.value / series.max) * maxBarHeight);
            const isToday = idx === series.arr.length - 1;
            return (
              <View key={d.key} style={styles.barColumn}>
                <View style={[styles.bar, { height: Math.max(4, h), backgroundColor: isToday ? '#1c1c1e' : '#F7CE73' }]} />
                <Text style={styles.dayLabel}>{d.label}</Text>
                {isToday && <Text style={styles.barValue}>{d.value} steps</Text>}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7CE73' },
  gradientBackground: { flex: 1, width: '100%', height: '100%' },
  safeArea: { flex: 1 },
  backRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50, // Extra space for future content
  },
  backPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  translucentDiv: {
    marginTop: 16,
    marginHorizontal: 20,
    height: 270,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '75%',
    resizeMode: 'cover',
  },
  cardFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '25%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(28,28,30,0.9)',
    letterSpacing: 0.2,
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderBottomRightRadius: 26,
    borderTopLeftRadius: 0,
    minWidth: 110,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statusText: {
    color: 'rgba(28,28,30,0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Segmented control styles
  segmentRow: {
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'nowrap',
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#1c1c1e',
    borderColor: '#1c1c1e',
  },
  chipText: {
    color: 'rgba(28,28,30,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  bottomWhiteDiv: {
    marginTop: 16,
    marginHorizontal: 20,
    minHeight: 420, // Increased height
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    marginBottom: 20, // Add bottom margin for better spacing
    overflow: 'hidden',
    paddingTop: 25,
  },
  bottomImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  helpWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
    gap: 10,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1c1e',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  helpButton: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7CE73',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1c1c1e',
    textTransform: 'none',
    letterSpacing: 0.3,
  },
  // AMC card styles
  amcCard: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    padding: 16,
  },
  amcTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  amcSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  amcInput: {
    minHeight: 90,
    maxHeight: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  amcMsg: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  amcButton: {
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)'
  },
  amcButtonText: {
    color: '#1c1c1e',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  complaintBox: {
    alignSelf: 'stretch',
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  complaintInput: {
    minHeight: 96,
    maxHeight: 180,
    color: '#1c1c1e',
    textAlignVertical: 'top',
  },
  submitMsg: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Chart card styles
  chartCard: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    padding: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
  },
  yAxisLabels: {
    height: 180,
    justifyContent: 'space-between',
    marginRight: 14,
    paddingBottom: 24,
  },
  yAxisLabel: {
    fontSize: 12,
    color: 'rgba(28,28,30,0.6)',
    fontWeight: '500',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
  },
  barColumn: {
    alignItems: 'center',
    position: 'relative',
  },
  bar: {
    width: 28,
    borderRadius: 4,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 12,
    color: 'rgba(28,28,30,0.7)',
    fontWeight: '500',
  },
  barValue: {
    position: 'absolute',
    top: -24,
    fontSize: 10,
    color: '#1c1c1e',
    fontWeight: '600',
    textAlign: 'center',
  },
  // View details button styles
  viewDetailsBtn: {
    marginTop: 12,
    marginHorizontal: 20,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)'
  },
  viewDetailsText: {
    color: '#1c1c1e',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleMain: { fontSize: 22, fontWeight: '700', color: '#1c1c1e', marginTop: 20 },
  glassBackPill: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
  },
  contentBox: { paddingHorizontal: 20, marginTop: 20 },
  detailCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  glassFill: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
  },
  glossTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 22 },
  innerShadowBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 18 },

  name: { fontSize: 20, fontWeight: '700', color: '#1c1c1e' },
  role: { fontSize: 14, color: 'rgba(0,0,0,0.75)' },
  label: { fontSize: 13, color: 'rgba(0,0,0,0.8)', marginBottom: 6 },
  percentText: { fontSize: 13, color: '#1c1c1e', marginTop: 4 },

  progressTrack: {
    height: 10,
    width: '70%',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '40%',
    backgroundColor: '#FF3B30',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  noteText: { fontSize: 13, color: 'rgba(0,0,0,0.7)', lineHeight: 18 },
  // Receipt styles (black card)
  receiptCard: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 120,
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  receiptSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    minHeight: 32,
  },
  receiptLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 100,
  },
  receiptValue: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginTop: 8,
  },
  receiptMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  receiptMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    marginBottom: 2,
  },
  // AMC history styles
  amcHistoryCard: {
    marginTop: -1, // attach to previous card
    marginHorizontal: 20,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    padding: 14,
  },
  amcHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amcHistoryTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  countBadge: { minWidth: 28, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  countText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  historySub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  historyItem: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: 10, backgroundColor: 'transparent' },
  historyTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statusPill: { height: 22, paddingHorizontal: 10, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.25)' },
  statusPillText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', textTransform: 'capitalize' },
  historyDate: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  historyNote: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
})