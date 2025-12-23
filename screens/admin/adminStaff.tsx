import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { triggerPressHaptic } from '../../utils/haptics';
import { getAuthToken } from '../../utils/auth';
import { BASE_URL } from '../../utils/config';

type AdminNavKey = 'home' | 'roofs' | 'staff' | 'analytics' | 'settings';

export default function AdminStaff({ onBack, onGoHome, onOpenBookings, onOpenAnalytics, onOpenSettings, onOpenStaffProfile }: { onBack?: () => void; onGoHome?: () => void; onOpenBookings?: () => void; onOpenAnalytics?: () => void; onOpenSettings?: () => void; onOpenStaffProfile?: (s: { id: string; name: string; email: string; phone: string; createdAt: string }) => void }) {
  const [showAdd, setShowAdd] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [staff, setStaff] = React.useState<Array<{ id: string; name: string; email: string; phone: string; createdAt: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const slide = React.useRef(new Animated.Value(0)).current;

  // Fetch staff from API
  React.useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const token = await getAuthToken();
        const resp = await fetch(`${BASE_URL}/api/admin/staff`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        setStaff(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn('[adminStaff] failed to load staff', (e as any)?.message || e);
        Alert.alert('Error', 'Failed to load staff members');
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const openAdd = () => {
    setShowAdd(true);
    Animated.timing(slide, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const closeAdd = () => {
    Animated.timing(slide, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setShowAdd(false));
  };
  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      const token = await getAuthToken();
      const resp = await fetch(`${BASE_URL}/api/admin/staff/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          phone: phone.trim(),
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Failed to create staff member');
      }

      const newStaff = await resp.json();
      setStaff(prev => [newStaff, ...prev]);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      closeAdd();
      Alert.alert('Success', 'Staff member created successfully');
    } catch (e) {
      console.warn('[adminStaff] failed to create staff', (e as any)?.message || e);
      Alert.alert('Error', (e as any)?.message || 'Failed to create staff member');
    } finally {
      setSaving(false);
    }
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
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.backPill}>
              <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
            </Pressable>
            <Text style={styles.title}>Staff</Text>
          </View>

          {/* Add new staff bar */}
          <View style={styles.addBar}>
            <Text style={styles.addBarText}>Add new staff member</Text>
            <Pressable style={styles.addButton} onPress={openAdd}>
              <Ionicons name="add" size={18} color="#1c1c1e" />
            </Pressable>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
            <Text style={styles.sectionTitle}>Staff members</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading staff members...</Text>
                </View>
              ) : staff.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No staff members found</Text>
                  <Text style={styles.emptySubtext}>Add a new staff member using the button above</Text>
                </View>
              ) : (
                staff.map((s) => (
                  <Pressable key={s.id} style={styles.staffCard} onPress={() => onOpenStaffProfile && onOpenStaffProfile(s)} accessibilityRole="button">
                    <View style={styles.staffAvatar}>
                      <Text style={styles.staffAvatarText}>{s.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffName}>{s.name}</Text>
                      <Text style={styles.staffMeta}>{s.email}</Text>
                      <Text style={styles.staffMeta}>{s.phone || 'No phone'}</Text>
                    </View>
                    <View style={styles.cardChevron}>
                      <Ionicons name="chevron-forward" size={18} color="#1c1c1e" />
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </KeyboardAvoidingView>

          {showAdd && (
            <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
              {/* dim overlay to focus */}
              <Pressable style={styles.overlay} onPress={closeAdd} />
              <Animated.View
                style={[
                  styles.addDropdown,
                  {
                    transform: [
                      {
                        translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }),
                      },
                    ],
                    opacity: slide,
                  },
                ]}
              >
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>New Staff</Text>
                  <Pressable onPress={closeAdd} hitSlop={8} style={styles.closePill}>
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter full name"
                    placeholderTextColor="#8E8E93"
                    style={styles.input}
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    placeholderTextColor="#8E8E93"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create password"
                    placeholderTextColor="#8E8E93"
                    secureTextEntry
                    style={styles.input}
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="98765 43210"
                    placeholderTextColor="#8E8E93"
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                </View>
                <View style={styles.actionsRow}>
                  <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={closeAdd}>
                    <Text style={styles.actionBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.actionBtn, styles.saveBtn, saving && styles.saveBtnDisabled]} 
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text style={[styles.actionBtnText, { color: '#1c1c1e' }]}>
                      {saving ? 'Saving...' : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          )}

        </SafeAreaView>
      </LinearGradient>
      {/* Bottom navigation */}
      <BottomNav
        onGoHome={onGoHome}
        onOpenBookings={onOpenBookings}
        onOpenAnalytics={onOpenAnalytics}
        onOpenSettings={onOpenSettings}
      />
    </View>
  );
}

function BottomNav({ onGoHome, onOpenBookings, onOpenAnalytics, onOpenSettings }: { onGoHome?: () => void; onOpenBookings?: () => void; onOpenAnalytics?: () => void; onOpenSettings?: () => void }) {
  const [active, setActive] = React.useState<AdminNavKey>('staff');

  const Item = ({ id, icon, label }: { id: AdminNavKey; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
    const isActive = active === id;
    const isStaff = id === 'staff';
    const buttonStyles = [
      styles.navButton,
      isStaff ? styles.navButtonStaff : (isActive ? styles.navButtonActive : styles.navButtonInactive),
    ];
    const iconColor = isStaff ? '#1c1c1e' : (isActive ? '#1c1c1e' : 'rgba(255,255,255,0.95)');

    return (
      <Pressable
        onPress={() => {
          void triggerPressHaptic();
          setActive(id);
          if (id === 'home') onGoHome && onGoHome();
          if (id === 'roofs') onOpenBookings && onOpenBookings();
          if (id === 'analytics') onOpenAnalytics && onOpenAnalytics();
          if (id === 'settings') onOpenSettings && onOpenSettings();
        }}
        style={styles.navItem}
        hitSlop={10}
      >
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
  safeArea: { flex: 1 },
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
  addBar: {
    marginTop: 8,
    marginHorizontal: 20,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  addBarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7CE73',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)'
  },
  content: { flex: 1 },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  listContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40, gap: 12 },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    color: '#1c1c1e',
    fontWeight: '800',
  },
  staffName: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  staffMeta: { fontSize: 13, color: 'rgba(0,0,0,0.6)' },
  cardChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  addDropdown: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 120,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dropdownTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closePill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  formRow: {
    marginTop: 10,
    gap: 6,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    color: '#FFFFFF',
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  saveBtn: {
    backgroundColor: '#F7CE73',
    borderColor: 'rgba(0,0,0,0.15)',
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(247, 206, 115, 0.6)',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(28,28,30,0.6)',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#1c1c1e',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(28,28,30,0.6)',
    textAlign: 'center',
  },
  // Bottom navigation (matching admin screens)
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

