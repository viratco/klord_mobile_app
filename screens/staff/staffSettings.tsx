import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function StaffSettings({ onBack, onSignOut }: { onBack?: () => void; onSignOut?: () => void }) {
  const Row = ({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void }) => (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color="#1c1c1e" /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.35)" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[ '#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73' ]}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradient}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.backPill}>
              <Ionicons name="arrow-back" size={18} color="#1c1c1e" />
            </Pressable>
            <Text style={styles.title}>Settings</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Content */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
              <Row icon="person-outline" label="Profile" onPress={() => {}} />
              <View style={styles.divider} />
              <Row icon="mail-outline" label="Notifications" onPress={() => {}} />
              <View style={styles.divider} />
              <Row icon="key-outline" label="Change Password" onPress={() => {}} />
            </View>

            <Text style={styles.sectionTitle}>App</Text>
            <View style={styles.card}>
              <Row icon="color-palette-outline" label="Appearance" onPress={() => {}} />
              <View style={styles.divider} />
              <Row icon="shield-checkmark-outline" label="Privacy" onPress={() => {}} />
              <View style={styles.divider} />
              <Row icon="information-circle-outline" label="About" onPress={() => {}} />
            </View>

            <Pressable style={styles.signOutBtn} onPress={onSignOut}>
              <Ionicons name="log-out-outline" size={18} color="#1c1c1e" />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F6' },
  gradient: { flex: 1, width: '100%', height: '100%' },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
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
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)'
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1c1c1e' },
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 18 },
  sectionTitle: { marginTop: 8, marginBottom: 8, fontSize: 14, color: 'rgba(0,0,0,0.55)', fontWeight: '700' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7CE73',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)'
  },
  rowLabel: { flex: 1, fontSize: 14, color: '#1c1c1e', fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  signOutBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7CE73',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)'
  },
  signOutText: { fontSize: 14, color: '#1c1c1e', fontWeight: '800' },
});

