import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';

// Map project type to header images
const TYPE_IMAGE: Record<string, any> = {
  residential: require('../../assets/reseidency.jpeg'),
  commercial: require('../../assets/commercial.jpeg'),
  industrial: require('../../assets/industory.jpeg'),
  ground: require('../../assets/ground.jpeg'),
};

export type BookingData = {
  id: string;
  name: string;
  role: string;
  percent: number;
};

export default function BookingDetail({ booking, onBack, onOpenSteps }: { booking: BookingData; onBack?: () => void; onOpenSteps?: (b: BookingData) => void }) {
  const barColor = booking.percent >= 86 ? '#FF3B30' : booking.percent >= 61 ? '#FF8C00' : '#FFA500';
  const barWidth = Math.max(4, Math.min(100, booking.percent));

  // Fetch full booking for receipt details using admin endpoint
  const [lead, setLead] = React.useState<any | null>(null);
  const [loadingLead, setLoadingLead] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  // Complaints
  const [complaints, setComplaints] = React.useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = React.useState<boolean>(false);
  const [complaintsError, setComplaintsError] = React.useState<string | null>(null);
  // AMC
  const [amcRequests, setAmcRequests] = React.useState<any[]>([]);
  const [loadingAmc, setLoadingAmc] = React.useState<boolean>(false);
  const [amcError, setAmcError] = React.useState<string | null>(null);

  // Staff & assignment
  const [staff, setStaff] = React.useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = React.useState<boolean>(false);
  const [staffError, setStaffError] = React.useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [assignOpen, setAssignOpen] = React.useState<boolean>(false);
  // Receipt: inline edit Total Payable (persisted to backend)
  const [isEditingTotal, setIsEditingTotal] = React.useState<boolean>(false);
  const [editedTotal, setEditedTotal] = React.useState<string>('');

  const refreshLead = React.useCallback(async () => {
    try {
      setLoadingLead(true);
      setError(null);
      const token = await getAuthToken();
      const resp = await fetch(`${BASE_URL}/api/admin/leads/${booking.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(errorText);
      }
      const data = await resp.json();
      setLead(data);
    } catch (e) {
      const errorMessage = (e as any)?.message || 'Failed to load booking details';
      setError(errorMessage);
    } finally {
      setLoadingLead(false);
    }
  }, [booking?.id]);

  const loadStaff = React.useCallback(async () => {
    try {
      setStaffError(null);
      setLoadingStaff(true);
      const token = await getAuthToken();
      const resp = await fetch(`${BASE_URL}/api/admin/staff`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || `Failed ${resp.status}`);
      }
      const items = await resp.json();
      setStaff(Array.isArray(items) ? items : []);
    } catch (e) {
      const msg = (e as any)?.message || 'Failed to load staff';
      setStaffError(msg);
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  const assignTo = React.useCallback(async () => {
    if (!selectedStaffId) return;
    const token = await getAuthToken();
    const url = `${BASE_URL}/api/admin/leads/${booking.id}/assign`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ staffId: selectedStaffId })
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.warn('[admin assign] failed', t);
      return;
    }
    await refreshLead();
  }, [selectedStaffId, booking?.id, refreshLead]);

  const unassign = React.useCallback(async () => {
    const token = await getAuthToken();
    const url = `${BASE_URL}/api/admin/leads/${booking.id}/unassign`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.warn('[admin unassign] failed', t);
      return;
    }
    setSelectedStaffId(null);
    await refreshLead();
  }, [booking?.id, refreshLead]);

  React.useEffect(() => {
    refreshLead();
    loadStaff();
  }, [refreshLead, loadStaff]);

  // When lead loads, seed edited total payable from computed grand total
  React.useEffect(() => {
    const totalInvestment = lead?.totalInvestment ?? lead?.estimateINR ?? null;
    const gstPct = lead?.gstPct ?? 8.9;
    const gstAmount = lead?.gstAmount ?? (Number.isFinite(totalInvestment) ? Math.round(Number(totalInvestment) * (Number(gstPct) / 100)) : null);
    const grand = Number.isFinite(Number(totalInvestment)) && Number.isFinite(Number(gstAmount))
      ? Number(totalInvestment) + Number(gstAmount)
      : (Number(totalInvestment) || 0);
    if (!isEditingTotal) setEditedTotal(String(grand));
  }, [lead, isEditingTotal]);

  // Load complaints for this lead (admin endpoint)
  const loadComplaints = React.useCallback(async () => {
    try {
      setComplaintsError(null);
      setLoadingComplaints(true);
      const token = await getAuthToken();
      const url = `${BASE_URL}/api/admin/leads/${booking.id}/complaints`;
      if (__DEV__) console.log('[admin complaints] GET', url);
      const resp = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || `Failed ${resp.status}`);
      }
      const items = await resp.json();
      if (__DEV__) console.log('[admin complaints] count', Array.isArray(items) ? items.length : 0);
      setComplaints(Array.isArray(items) ? items : []);
    } catch (e) {
      const msg = (e as any)?.message || 'Failed to load complaints';
      console.warn('[admin complaints] load failed', msg);
      setComplaintsError(msg);
      setComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  }, [booking?.id]);

  React.useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // Load AMC requests for this lead (admin endpoint)
  const loadAmc = React.useCallback(async () => {
    try {
      setAmcError(null);
      setLoadingAmc(true);
      const token = await getAuthToken();
      const url = `${BASE_URL}/api/admin/leads/${booking.id}/amc-requests`;
      if (__DEV__) console.log('[admin amc] GET', url);
      const resp = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || `Failed ${resp.status}`);
      }
      const items = await resp.json();
      if (__DEV__) console.log('[admin amc] count', Array.isArray(items) ? items.length : 0);
      setAmcRequests(Array.isArray(items) ? items : []);
    } catch (e) {
      const msg = (e as any)?.message || 'Failed to load AMC requests';
      console.warn('[admin amc] load failed', msg);
      setAmcError(msg);
      setAmcRequests([]);
    } finally {
      setLoadingAmc(false);
    }
  }, [booking?.id]);

  React.useEffect(() => {
    loadAmc();
  }, [loadAmc]);

  // Staff assignment removed

  // Staff assignment removed

  // Helpers
  const inr = (n: any) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '₹ 0';
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
    } catch {
      return `₹ ${Math.round(num).toLocaleString('en-IN')}`;
    }
  };

  // Normalize status across entities
  const statusKey = React.useCallback((s?: string | null): 'pending' | 'in_progress' | 'resolved' => {
    const v = String(s || '').toLowerCase();
    if (v === 'resolved') return 'resolved';
    if (v === 'in_progress') return 'in_progress';
    if (v === 'open' || v === 'pending') return 'pending';
    return 'pending';
  }, []);
  const titleCase = (s?: string | null) => (s ? String(s).replace(/(^|\s)\S/g, t => t.toUpperCase()) : '');
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
    return map[key] || titleCase(key.replace(/_/g, ' '));
  };

  const totalInvestment = lead?.totalInvestment ?? lead?.estimateINR ?? null;
  const gstPct = lead?.gstPct ?? 8.9;
  const gstAmount = lead?.gstAmount ?? (Number.isFinite(totalInvestment) ? Math.round(Number(totalInvestment) * (Number(gstPct) / 100)) : null);
  const grandTotal = Number.isFinite(Number(totalInvestment)) && Number.isFinite(Number(gstAmount))
    ? Number(totalInvestment) + Number(gstAmount)
    : (Number(totalInvestment) || 0);
  const fmtNum = (n: any) => (Number.isFinite(Number(n)) ? String(Number(n)) : '—');
  const fmtPct = (n: any) => (Number.isFinite(Number(n)) ? `${Number(n)}%` : '—');
  const yesNo = (v: any) => (v === undefined || v === null ? '—' : (v ? 'Yes' : 'No'));

  // Determine project type for header image
  const projectTypeRaw = String(lead?.projectType ?? booking?.role ?? '').toLowerCase().trim();
  const projectTypeKey = projectTypeRaw.includes('res')
    ? 'residential'
    : projectTypeRaw.includes('com')
    ? 'commercial'
    : projectTypeRaw.includes('ind')
    ? 'industrial'
    : projectTypeRaw.includes('ground')
    ? 'ground'
    : 'residential';
  const headerImage = TYPE_IMAGE[projectTypeKey];

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73']}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={[styles.backPressableFloating, { top: insets.top + 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <BlurView intensity={24} tint="light" style={styles.glassBackPill}>
              <Ionicons name="arrow-back" size={18} color="#1c1c1e" />
              <Text style={styles.backText}>Back</Text>
            </BlurView>
          </Pressable>

          {/* Scrollable content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 104, paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"
            bounces
          >
            {/* White card with header image based on project type */}
            <View style={styles.translucentDiv}>
              {!!headerImage && (
                <Image source={headerImage} style={styles.cardImage} />
              )}
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>active</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.footerTitle}>{titleCase(projectTypeKey) || booking.role || 'Project'}</Text>
              </View>
            </View>

            {/* Staff Assignment */}
            <View style={styles.assignCard}>
              <View style={styles.assignHeaderRow}>
                <Text style={styles.assignTitle}>Assign to staff</Text>
                {loadingStaff ? <ActivityIndicator size="small" color="#1c1c1e" /> : null}
              </View>
              {!!staffError && <Text style={styles.assignError}>{staffError}</Text>}
              {lead?.assignedStaff ? (
                <View style={styles.assignedRow}>
                  <Text
                    style={[styles.assignedText, { flex: 1 }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Assigned: {lead.assignedStaff.name} ({lead.assignedStaff.email})
                  </Text>
                  <Pressable style={styles.unassignBtn} onPress={unassign} accessibilityRole="button">
                    <Text style={styles.unassignText}>Unassign</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* Dropdown selector */}
                  <Pressable
                    onPress={() => setAssignOpen((v) => !v)}
                    style={styles.dropdownBox}
                    accessibilityRole="button"
                  >
                    <Text style={styles.dropdownLabel}>
                      {selectedStaffId ? (staff.find((s) => s.id === selectedStaffId)?.name || 'Select staff') : 'Select staff'}
                    </Text>
                    <Ionicons name={assignOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#1c1c1e" />
                  </Pressable>
                  {assignOpen && (
                    <View style={styles.dropdownList}>
                      <ScrollView style={{ maxHeight: 180 }}>
                        {staff.map((s: any) => (
                          <Pressable
                            key={s.id}
                            onPress={() => { setSelectedStaffId(s.id); setAssignOpen(false); }}
                            style={[styles.dropdownOption, selectedStaffId === s.id && { backgroundColor: 'rgba(28,28,30,0.06)' }]}
                          >
                            <Text style={styles.dropdownOptionText}>{s.name} <Text style={{ color: 'rgba(28,28,30,0.6)' }}>· {s.email}</Text></Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  <Pressable
                    style={[styles.assignBtn, !selectedStaffId && { opacity: 0.6 }]}
                    onPress={assignTo}
                    disabled={!selectedStaffId}
                    accessibilityRole="button"
                  >
                    <Text style={styles.assignBtnText}>Assign</Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Receipt (black) card */}
            <View style={styles.receiptCard}>
              {loadingLead ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading booking details...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Error: {error}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.receiptHeaderRow}>
                    <Text style={styles.receiptTitle}>Booking Receipt</Text>
                    <Text style={styles.receiptSub}>{titleCase(lead?.customer?.fullName || booking?.name)}</Text>
                  </View>

                  {/* Project Status */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Project Status</Text>
                    <Text style={[styles.receiptValue, { color: lead?.certificateUrl ? '#4CAF50' : '#FFA500' }]}>
                      {lead?.certificateUrl ? 'Completed' : `${booking.percent}% Complete`}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Project Type</Text>
                    <Text style={styles.receiptValue}>{titleCase(lead?.projectType ?? booking?.role)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Booking Code</Text>
                    <Text style={styles.receiptValue}>{lead?.bookingCode || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Created Date</Text>
                    <Text style={styles.receiptValue}>
                      {lead?.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN') : '—'}
                    </Text>
                  </View>

                  <View style={styles.receiptDivider} />

                  {/* Financial Summary */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Cost of Solar PV Plant</Text>
                    <Text style={styles.receiptValue}>{inr(totalInvestment)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>{`GST (${Number(gstPct).toFixed(1)}%)`}</Text>
                    <Text style={styles.receiptValue}>{inr(gstAmount)}</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                  <View style={[styles.receiptRow, { marginTop: 6 }]}>
                    <Text style={[styles.receiptLabel, { color: '#FFFFFF' }]}>Total Payable</Text>
                    {isEditingTotal ? (
                      <View style={styles.editCostWrap}>
                        <TextInput
                          value={editedTotal}
                          onChangeText={setEditedTotal}
                          keyboardType="numeric"
                          placeholder="Enter total payable"
                          placeholderTextColor="rgba(255,255,255,0.5)"
                          style={styles.editCostInput}
                        />
                        <Pressable
                          onPress={async () => {
                            const newVal = Number(editedTotal);
                            if (!Number.isFinite(newVal) || newVal <= 0) return;
                            try {
                              const token = await getAuthToken();
                              const resp = await fetch(`${BASE_URL}/api/admin/leads/${booking.id}/total-payable`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...(token ? { Authorization: token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}` } : {}),
                                },
                                body: JSON.stringify({ totalPayable: newVal })
                              });
                              if (!resp.ok) {
                                console.warn('[admin total-payable] failed', await resp.text());
                              }
                              await refreshLead();
                            } finally {
                              setIsEditingTotal(false);
                            }
                          }}
                          style={styles.saveBtn}
                          accessibilityRole="button"
                        >
                          <Text style={styles.saveBtnText}>Save</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.viewCostWrap}>
                        <Pressable onPress={() => setIsEditingTotal(true)} style={styles.editBtn} accessibilityRole="button">
                          <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                        <Text style={[styles.receiptValueShrink, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
                          {inr(grandTotal)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ height: 14 }} />
                  <View style={styles.receiptMetaRow}>
                    <Text style={styles.receiptMeta}>Size: {Number.isFinite(Number(lead?.sizedKW)) ? `${Number(lead?.sizedKW).toFixed(1)} kW` : '—'}</Text>
                    {!!lead?.provider && <Text style={styles.receiptMeta}>Provider: {providerLabel(lead.provider)}</Text>}
                  </View>
                  <View style={styles.receiptMetaRow}>
                    {!!lead?.plates && <Text style={styles.receiptMeta}>Plates: {fmtNum(lead.plates)}</Text>}
                    {!!lead?.wp && <Text style={styles.receiptMeta}>WP: {fmtNum(lead.wp)}</Text>}
                  </View>

                  <View style={styles.receiptDivider} />

                  {/* Customer Information */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Customer Name</Text>
                    <Text style={styles.receiptValue}>{lead?.customer?.fullName || lead?.fullName || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Phone</Text>
                    <Text style={styles.receiptValue}>{lead?.customer?.phone || lead?.phone || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Email</Text>
                    <Text style={styles.receiptValue}>{lead?.customer?.email || lead?.email || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Pincode</Text>
                    <Text style={styles.receiptValue}>{lead?.pincode || '—'}</Text>
                  </View>
                  <View style={styles.receiptAddressRow}>
                    <Text style={styles.receiptLabel}>Address</Text>
                    <Text style={styles.receiptAddressValue} numberOfLines={3} ellipsizeMode="tail">
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
                    <Text style={styles.receiptValue}>{fmtNum(lead?.annualGenPerKW)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Tariff</Text>
                    <Text style={styles.receiptValue}>
                      {Number.isFinite(Number(lead?.tariffINR)) ? `${inr(lead?.tariffINR)} /unit` : '—'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>With Subsidy</Text>
                    <Text style={styles.receiptValue}>{yesNo(lead?.withSubsidy)}</Text>
                  </View>

                  <View style={styles.receiptDivider} />

                  {/* Project Timeline */}
                  {lead?.steps && Array.isArray(lead.steps) && lead.steps.length > 0 && (
                    <>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Completed Steps</Text>
                        <Text style={styles.receiptValue}>
                          {lead.steps.filter((s: any) => s.completed).length} / {lead.steps.length}
                        </Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Last Updated</Text>
                        <Text style={styles.receiptValue}>
                          {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString('en-IN') : '—'}
                        </Text>
                </View>
                    </>
                  )}

                  {/* Certificate Status */}
                  {lead?.certificateUrl && (
                    <>
                      <View style={styles.receiptDivider} />
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Certificate</Text>
                        <Text style={[styles.receiptValue, { color: '#4CAF50' }]}>Available</Text>
              </View>
                    </>
                  )}
                </>
              )}
            </View>

            {/* View Details Button */}
            <Pressable 
              style={styles.viewDetailsButton} 
              accessibilityRole="button"
              accessibilityLabel="View booking steps"
              onPress={() => onOpenSteps && onOpenSteps(booking)}
            >
              <Text style={styles.viewDetailsButtonText}>View Details</Text>
            </Pressable>

            {/* Bottom white div */}
            <View style={styles.bottomWhiteDiv}>
              <Image
                source={require('../../assets/complainpic.png')}
                style={styles.bottomImage}
              />
              <View style={{ height: 12 }} />
              <Text style={styles.bottomHelpText}>Customer complaints</Text>
              <View style={{ height: 12 }} />
              {loadingComplaints ? (
                <Text style={styles.complaintsMeta}>Loading complaints...</Text>
              ) : complaintsError ? (
                <Text style={[styles.complaintsMeta, { color: '#b00020' }]}>Error loading complaints: {complaintsError}</Text>
              ) : complaints.length === 0 ? (
                <Text style={styles.complaintsMeta}>No complaints filed for this booking.</Text>
              ) : (
                <View style={{ paddingHorizontal: 16, gap: 10 }}>
                  {complaints.map((c, idx) => {
                    const s = statusKey(c?.status);
                    return (
                      <View key={c.id || idx} style={styles.complaintItem}>
                        <View style={styles.itemHeaderRow}>
                          <Text style={[styles.complaintMsg, { flex: 1 }]} numberOfLines={1}>{c.message || '—'}</Text>
                          <View style={[
                            styles.statusPill,
                            s === 'resolved' ? styles.statusPillResolved : (s === 'in_progress' ? styles.statusPillInProgress : styles.statusPillPending)
                          ]}>
                            <Text style={styles.statusPillText}>{s.replace('_',' ')}</Text>
                          </View>
                        </View>
                        <Text style={styles.complaintMeta}>
                          {new Date(c.createdAt).toLocaleString('en-IN')} • {c.customer?.mobile || c.customer?.email || 'customer'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={{ height: 12 }} />
              <Pressable style={styles.complainButton} onPress={loadComplaints} accessibilityRole="button">
                <Text style={styles.complainButtonText}>Refresh complaints</Text>
              </Pressable>
            </View>

            {/* AMC requests card (image-free) */}
            <View style={styles.amcCard}>
              <View style={styles.amcHeaderRow}>
                <Text style={styles.amcTitle}>AMC requests</Text>
                <View style={styles.amcCountBadge}>
                  <Text style={{ color: '#1c1c1e', fontSize: 12, fontWeight: '800' }}>{loadingAmc ? '—' : amcRequests.length}</Text>
                </View>
              </View>
              {loadingAmc ? (
                <Text style={styles.complaintsMeta}>Loading AMC requests...</Text>
              ) : amcError ? (
                <Text style={[styles.complaintsMeta, { color: '#b00020' }]}>Error loading AMC: {amcError}</Text>
              ) : amcRequests.length === 0 ? (
                <Text style={styles.complaintsMeta}>No AMC requests for this booking.</Text>
              ) : (
                <View style={styles.amcList}>
                  {amcRequests.map((a, idx) => {
                    const s = statusKey(a?.status);
                    return (
                      <View key={a.id || idx} style={styles.amcItem}>
                        <View style={styles.itemHeaderRow}>
                          <Text style={[styles.amcNote, { flex: 1 }]} numberOfLines={1}>{a.note || '—'}</Text>
                          <View style={[
                            styles.statusPill,
                            s === 'resolved' ? styles.statusPillResolved : (s === 'in_progress' ? styles.statusPillInProgress : styles.statusPillPending)
                          ]}>
                            <Text style={styles.statusPillText}>{s.replace('_',' ')}</Text>
                          </View>
                        </View>
                        <Text style={styles.amcMeta}>
                          {new Date(a.createdAt).toLocaleString('en-IN')} • {a.customer?.mobile || a.customer?.email || 'customer'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={{ height: 12 }} />
              <Pressable style={styles.amcRefresh} onPress={loadAmc} accessibilityRole="button">
                <Text style={styles.complainButtonText}>Refresh AMC</Text>
              </Pressable>
            </View>
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
  backRow: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 18,
  },
  backPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backPressableFloating: {
    position: 'absolute',
    left: 20,
    zIndex: 2,
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
    paddingHorizontal: 20, // inset content from white div edges
    paddingBottom: 20, // add space below refresh button
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
  bottomHelpText: {
    textAlign: 'center',
    color: 'rgba(28,28,30,0.9)',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  complaintsMeta: {
    textAlign: 'center',
    color: 'rgba(28,28,30,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  complaintItem: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  complaintMsg: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  complaintMeta: {
    color: 'rgba(28,28,30,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  // AMC styles
  amcCard: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  amcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  amcTitle: {
    color: 'rgba(28,28,30,0.9)',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  amcCountBadge: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  amcList: {
    paddingHorizontal: 0,
    gap: 10,
  },
  amcItem: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  amcNote: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  amcMeta: {
    color: 'rgba(28,28,30,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  amcRefresh: {
    height: 48,
    marginTop: 4,
    borderRadius: 24,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Receipt edit total cost UI
  viewCostWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  editBtn: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)'
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  editCostWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  editCostInput: {
    minWidth: 120,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    textAlign: 'right',
  },
  saveBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)'
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  complainButton: {
    height: 48,
    width: '100%', // fill available width within padded container
    borderRadius: 24,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  complainButtonText: {
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Reusable list item header row for title + status pill
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusPill: {
    minWidth: 80,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statusPillResolved: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderColor: 'rgba(76, 175, 80, 0.45)'
  },
  statusPillInProgress: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    borderColor: 'rgba(0, 122, 255, 0.45)'
  },
  statusPillPending: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderColor: 'rgba(255, 149, 0, 0.45)'
  },
  statusPillText: {
    color: '#1c1c1e',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  viewDetailsButton: {
    marginTop: 16,
    marginHorizontal: 20,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  viewDetailsButtonText: {
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    minHeight: 200,
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
  receiptAddressRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 8,
    minHeight: 60,
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
  // Same as receiptValue but optimized to truncate with an adjacent button
  receiptValueShrink: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
    flexShrink: 1,
    minWidth: 0,
  },
  receiptAddressValue: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 18,
    marginTop: 4,
    flex: 1,
    width: '100%',
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Staff assignment styles removed
  assignCard: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  assignHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  assignTitle: {
    color: 'rgba(28,28,30,0.9)',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  assignError: {
    color: '#b00020',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  assignedText: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '700',
  },
  unassignBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unassignText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  staffChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  staffChipActive: {
    backgroundColor: '#1c1c1e',
    borderColor: '#1c1c1e',
  },
  staffChipText: {
    color: 'rgba(28,28,30,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },
  staffChipTextActive: {
    color: '#FFFFFF',
  },
  assignBtn: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  assignBtnText: {
    color: '#1c1c1e',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dropdownBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownLabel: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)'
  },
  dropdownOptionText: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '700',
  },
});