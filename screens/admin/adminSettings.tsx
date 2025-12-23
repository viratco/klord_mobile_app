import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { triggerPressHaptic } from '../../utils/haptics';

type AdminNavKey = 'home' | 'roofs' | 'staff' | 'analytics' | 'settings';

export default function AdminSettingsScreen({
  onBack,
  onSignOut,
  onGoHome,
  onOpenBookings,
  onOpenStaff,
  onOpenAnalytics,
  onOpenSettings,
}: {
  onBack?: () => void;
  onSignOut?: () => void;
  onGoHome?: () => void;
  onOpenBookings?: () => void;
  onOpenStaff?: () => void;
  onOpenAnalytics?: () => void;
  onOpenSettings?: () => void;
}) {
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
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.backPill}>
              <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
            </Pressable>
            <Text style={styles.title}>Settings</Text>
          </View>

          {/* Content */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Profile card */}
            <BlurView intensity={24} tint="light" style={styles.card}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={26} color="#1c1c1e" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>Admin User</Text>
                  <Text style={styles.email}>admin@example.com</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#1c1c1e" />
              </View>
            </BlurView>

            {/* Account section */}
            <Text style={styles.sectionTitle}>Account</Text>
            <BlurView intensity={22} tint="light" style={styles.card}>
              <Row icon="person-outline" label="Profile" onPress={() => {}} />
              <View style={styles.divider} />
              <Row icon="mail-outline" label="Notifications" onPress={() => {}} />
              <View style={styles.divider} />
              <Row icon="key-outline" label="Change Password" onPress={() => {}} />
            </BlurView>

            {/* App section */}
            <Text style={styles.sectionTitle}>App</Text>
            <BlurView intensity={22} tint="light" style={styles.card}>
              <Row icon="color-palette-outline" label="Appearance" onPress={() => {}} />
              <View style={styles.divider} />
              <Row icon="information-circle-outline" label="About" onPress={() => {}} />
            </BlurView>

            {/* Sign out */}
            <Pressable style={styles.signOutBtn} onPress={onSignOut}>
              <Ionicons name="log-out-outline" size={16} color="#1c1c1e" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
        <BottomNav
          onGoHome={onGoHome}
          onOpenBookings={onOpenBookings}
          onOpenStaff={onOpenStaff}
          onOpenAnalytics={onOpenAnalytics}
          onOpenSettings={onOpenSettings}
        />
      </LinearGradient>
    </View>
  );
}

function Row({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row} hitSlop={6}>
      <View style={styles.rowIconPill}>
        <Ionicons name={icon} size={16} color="#1c1c1e" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#1c1c1e" style={{ marginLeft: 'auto' }} />
    </Pressable>
  );
}

function BottomNav({
  onGoHome,
  onOpenBookings,
  onOpenStaff,
  onOpenAnalytics,
  onOpenSettings,
}: {
  onGoHome?: () => void;
  onOpenBookings?: () => void;
  onOpenStaff?: () => void;
  onOpenAnalytics?: () => void;
  onOpenSettings?: () => void;
}) {
  const [active, setActive] = React.useState<AdminNavKey>('settings');

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
  content: { paddingHorizontal: 20, paddingBottom: 140, gap: 14 },
  card: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    padding: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  email: { fontSize: 12, color: 'rgba(28,28,30,0.65)', marginTop: 2 },
  sectionTitle: { marginTop: 8, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#1c1c1e' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowLabel: { fontSize: 14, color: '#1c1c1e' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  signOutBtn: {
    marginTop: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7CE73',
    borderColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 46,
  },
  signOutText: { color: '#1c1c1e', fontSize: 15, fontWeight: '800' },
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
