import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, Modal, FlatList, TouchableOpacity } from 'react-native';
import { BouncyPressable } from '../../components/BouncyPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { getAuthToken } from '../../utils/auth';
import { INDIAN_STATES_CITIES } from '../../constants/IndianStatesCities';

type Category = 'industrial' | 'residential' | 'commercial' | 'ground';

export default function FifthStep({
  onBack,
  onSubmit,
  panelType,
  category,
  wp,
  plates,
  capacityKW,
  electricityBill,
  billingCycle,
  pincode,
  provider,
  budget,
  finance,
}: {
  onBack?: () => void;
  onSubmit?: (payload: any) => void;
  panelType?: string;
  category?: Category;
  wp?: number;
  plates?: number;
  capacityKW?: number;
  electricityBill?: string;
  billingCycle?: '1m' | '2m';
  pincode?: string;
  provider?: string | null;
  budget?: string;
  finance?: {
    withSubsidy: boolean;
    ratePerKW: number;
    networkChargePerUnit: number;
    annualGenPerKW: number;
    moduleDegradationPct: number;
    omPerKWYear: number;
    omEscalationPct: number;
    tariffINR: number;
    tariffEscalationPct: number;
    lifeYears: number;
    gstPct: number;
    gstAmount: number;
    totalInvestment: number;
    capacityKW: number;
  } | undefined;
}) {
  const insets = useSafeAreaInsets();
  const prettyCategory = category === 'industrial' ? 'Industrial'
    : category === 'residential' ? 'Residential'
      : category === 'commercial' ? 'Commercial'
        : category === 'ground' ? 'Ground Mounted'
          : undefined;
  const [form, setForm] = React.useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    street: '',
    zip: '',
    state: '',
    city: '',
    country: 'India',
  });
  const [submitting, setSubmitting] = React.useState(false);

  // Dropdown State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'state' | 'city'>('state');
  const [searchQuery, setSearchQuery] = useState('');

  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

  const submit = async () => {
    try {
      setSubmitting(true);
      // Base amounts
      const billNum = Number(String(electricityBill || '').replace(/[^0-9.]/g, '')) || 0;
      const monthlyBill = billingCycle === '2m' ? Math.round(billNum / 2) : Math.round(billNum);
      const sizedKW = typeof capacityKW === 'number' && capacityKW > 0
        ? capacityKW
        : (finance?.capacityKW ?? 0);
      const totalInvestment = finance?.totalInvestment ?? Math.round((sizedKW || 0) * (finance?.ratePerKW || 60000));

      // Validate required fields expected by backend
      const missing: string[] = [];
      const reqCheck = (key: string, val: any) => {
        if (val === undefined || val === null || String(val).trim() === '') missing.push(key);
      };
      reqCheck('projectType', (category === 'industrial' ? 'Industrial' : category === 'residential' ? 'Residential' : category === 'commercial' ? 'Commercial' : category === 'ground' ? 'Ground Mounted' : 'Residential'));
      reqCheck('sizedKW', sizedKW);
      reqCheck('monthlyBill', monthlyBill);
      reqCheck('pincode', pincode);
      reqCheck('estimateINR', totalInvestment);
      reqCheck('fullName', form.fullName);
      reqCheck('phone', form.phone);
      reqCheck('address', form.address);
      reqCheck('street', form.street);
      reqCheck('state', form.state);
      reqCheck('city', form.city);
      reqCheck('country', form.country);
      reqCheck('zip', form.zip);
      if (missing.length) {
        Alert.alert('Missing details', `Please fill: ${missing.join(', ')}`);
        return;
      }

      const payload: any = {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        address: form.address,
        street: form.street,
        zip: form.zip,
        state: form.state,
        city: form.city,
        country: form.country,
        // Booking requireds
        projectType: (category === 'industrial' ? 'Industrial' : category === 'residential' ? 'Residential' : category === 'commercial' ? 'Commercial' : category === 'ground' ? 'Ground Mounted' : 'Residential'),
        sizedKW: sizedKW,
        monthlyBill,
        pincode: String(pincode || ''),
        estimateINR: totalInvestment,
        // calculator context
        billingCycle,
        budget,
        // selection context
        wp: typeof wp === 'number' ? wp : null,
        plates: typeof plates === 'number' ? plates : null,
        // finance context
        withSubsidy: finance?.withSubsidy ?? true,
        ratePerKW: finance?.ratePerKW,
        networkChargePerUnit: finance?.networkChargePerUnit,
        annualGenPerKW: finance?.annualGenPerKW,
        moduleDegradationPct: finance?.moduleDegradationPct,
        omPerKWYear: finance?.omPerKWYear,
        omEscalationPct: finance?.omEscalationPct,
        tariffINR: finance?.tariffINR,
        tariffEscalationPct: finance?.tariffEscalationPct,
        lifeYears: finance?.lifeYears,
        gstPct: finance?.gstPct,
        gstAmount: finance?.gstAmount,
        totalInvestment,
      };
      // Only include provider if it matches backend enum PanelProvider (new utilities list)
      if (typeof provider === 'string') {
        const raw = provider.trim().toLowerCase();
        const compact = raw.replace(/\s+/g, ' ').trim();
        // Map common inputs to enum identifiers
        const map: Record<string, string> = {
          'purvanchal vv': 'purvanchal_vv',
          'purvanchal_vv': 'purvanchal_vv',
          'torrent power': 'torrent_power',
          'torrnet power': 'torrent_power',
          'torrent_power': 'torrent_power',
          'paschimanchal': 'paschimanchal',
          'mvvnl': 'mvvnl',
          'dvvnl': 'dvvnl',
          'npcl': 'npcl',
          'NPCL': 'npcl',
          'Npcl': 'npcl',
        };
        const mapped = map[compact] || map[raw] || null;
        const allowed = new Set(['purvanchal_vv', 'torrent_power', 'paschimanchal', 'mvvnl', 'dvvnl', 'npcl']);
        if (mapped && allowed.has(mapped)) {
          payload.provider = mapped;
        }
      }

      if (BASE_URL) {
        const token = await getAuthToken().catch(() => null);
        console.log('[submit] payload', payload);
        const res = await fetch(`${BASE_URL}/api/leads/public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }).catch((e) => {
          throw new Error('Network request failed');
        });
        if (res && !res.ok) {
          const t = await res.text().catch(() => '');
          console.log('[submit] failed', res.status, t);
          Alert.alert('Submit failed', t || `Submit failed (${res.status})`);
          return; // do not navigate on failure
        }
      }
      Alert.alert('Submitted', 'Your details were submitted successfully.');
      onSubmit?.(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (mode: 'state' | 'city') => {
    if (mode === 'city' && !form.state) {
      Alert.alert('Select State First', 'Please select a state before selecting a city.');
      return;
    }
    setSelectionMode(mode);
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSelect = (item: string) => {
    if (selectionMode === 'state') {
      setForm(f => ({ ...f, state: item, city: '' })); // Reset city on state change
    } else {
      setForm(f => ({ ...f, city: item }));
    }
    setModalVisible(false);
  };

  const getListData = () => {
    if (selectionMode === 'state') {
      return Object.keys(INDIAN_STATES_CITIES).sort();
    }
    return (INDIAN_STATES_CITIES[form.state] || []).sort();
  };

  const filteredData = getListData().filter(item =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={['#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73']}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >

        {/* Fixed back button */}
        <BouncyPressable onPress={onBack} style={[styles.backPill, { top: insets.top + 10 }]} hitSlop={8} accessibilityRole="button">
          <BlurView intensity={24} tint="light" style={styles.backGlass}>
            <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
          </BlurView>
        </BouncyPressable>

        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Black progress/header card */}
          <View style={styles.topBlackCard}>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '100%' }]} />
              </View>
              <Text style={styles.progressText}>5/5 completed</Text>
            </View>
            <Text style={styles.progressTitle}>For {prettyCategory ?? panelType ?? '—'}</Text>
            <Text style={styles.progressSubtitleLight}>We’ll use this to contact you about your solar installation.</Text>
          </View>

          {/* Form card */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              placeholder="Enter your name"
              placeholderTextColor="rgba(28,28,30,0.5)"
              style={styles.input}
              value={form.fullName}
              onChangeText={(t) => setForm((f) => ({ ...f, fullName: t }))}
            />

            <Text style={styles.label}>Mobile number</Text>
            <View style={styles.rowInputs}>
              <View style={[styles.input, styles.codeBox]}>
                <Text style={styles.codeText}>+91</Text>
              </View>
              <TextInput
                placeholder="Enter mobile number"
                placeholderTextColor="rgba(28,28,30,0.5)"
                keyboardType="phone-pad"
                style={[styles.input, { flex: 1 }]}
                value={form.phone}
                onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
              />
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Enter email"
              placeholderTextColor="rgba(28,28,30,0.5)"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              value={form.email}
              onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              placeholder="House / Apartment / Landmark"
              placeholderTextColor="rgba(28,28,30,0.5)"
              style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
              multiline
              value={form.address}
              onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Street name</Text>
                <TextInput
                  placeholder="Street"
                  placeholderTextColor="rgba(28,28,30,0.5)"
                  style={styles.input}
                  value={form.street}
                  onChangeText={(t) => setForm((f) => ({ ...f, street: t }))}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Zip code</Text>
                <TextInput
                  placeholder="ZIP"
                  placeholderTextColor="rgba(28,28,30,0.5)"
                  keyboardType="number-pad"
                  style={styles.input}
                  value={form.zip}
                  onChangeText={(t) => setForm((f) => ({ ...f, zip: t }))}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>State</Text>
                <Pressable onPress={() => openModal('state')} style={[styles.input, { justifyContent: 'center' }]}>
                  <Text style={{ color: form.state ? '#1c1c1e' : 'rgba(28,28,30,0.5)' }}>
                    {form.state || 'Select State'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="rgba(28,28,30,0.5)" style={{ position: 'absolute', right: 12 }} />
                </Pressable>
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>City</Text>
                <Pressable onPress={() => openModal('city')} style={[styles.input, { justifyContent: 'center', opacity: form.state ? 1 : 0.6 }]}>
                  <Text style={{ color: form.city ? '#1c1c1e' : 'rgba(28,28,30,0.5)' }}>
                    {form.city || 'Select City'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="rgba(28,28,30,0.5)" style={{ position: 'absolute', right: 12 }} />
                </Pressable>
              </View>
            </View>

            <Text style={styles.label}>Country</Text>
            <TextInput
              placeholder="Country"
              placeholderTextColor="rgba(28,28,30,0.5)"
              style={styles.input}
              value={form.country}
              editable={false}
            />

            <BouncyPressable style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={submit} accessibilityRole="button" disabled={submitting}>
              <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
            </BouncyPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {selectionMode === 'state' ? 'State' : 'City'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#1c1c1e" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                placeholder="Search..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                autoFocus={false}
              />
            </View>

            <FlatList
              data={filteredData}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {((selectionMode === 'state' && form.state === item) || (selectionMode === 'city' && form.city === item)) && (
                    <Ionicons name="checkmark" size={20} color="#F7CE73" />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </BlurView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  backPill: { position: 'absolute', left: 20, zIndex: 10 },
  backGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
  },
  topBlackCard: {
    borderRadius: 18,
    backgroundColor: '#000',
    marginBottom: 16,
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F7CE73',
    borderRadius: 8,
  },
  progressText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  progressTitle: { marginTop: 10, color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  progressSubtitleLight: { marginTop: 6, color: 'rgba(255,255,255,0.9)', fontSize: 13 },

  formCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1c1e',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 14,
    color: '#1c1c1e',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeBox: {
    width: 72,
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  submitBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  submitText: { fontSize: 16, fontWeight: '800', color: '#1c1c1e', letterSpacing: 0.3 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1c1c1e',
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1c1c1e',
    fontWeight: '500',
  },
});
