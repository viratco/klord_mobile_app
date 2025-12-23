import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triggerPressHaptic } from '../../utils/haptics';

export default function AdminHome({ onBack, onOpenBookings, onOpenCalculator, onOpenComplains }: { onBack?: () => void; onOpenBookings?: () => void; onOpenCalculator?: () => void; onOpenComplains?: () => void }) {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[
          '#ECECEC',
          '#E6E6E8',
          '#EDE5D6',
          '#F3DDAF',
          '#F7CE73',
        ]}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          {/* Fixed Header */}
          <View style={styles.header}>
            {/* Avatar on left */}
            <Pressable onPress={onBack} hitSlop={8}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={require('../../assets/Screenshot 2025-09-20 at 6.07.21 PM.png')}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              </View>
            </Pressable>
            {/* Translucent dropdown on right */}
            <Pressable style={styles.glassDropdown} hitSlop={10} onPress={() => {}}>
              <BlurView intensity={24} tint="light" style={styles.glassDropdown}>
                <View style={styles.dropdownInner}>
                  <Text style={styles.dropdownLabel}>All roofs</Text>
                  <Ionicons name="chevron-down" size={18} color="#1c1c1e" />
                </View>
              </BlurView>
            </Pressable>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Title */}
            <Text style={styles.titleMain}>Admin Dashboard</Text>

            {/* Stat cards with additional copies below each */}
            <View style={styles.statsRowColumns}> 
              {/* Column 1: Yellow then Dark copy below */}
              <View style={styles.statsColumn}> 
                {/* Yellow card */}
                <View style={[styles.statCard, styles.statCardYellow]}> 
                  <Text style={styles.statLabel}>Bookings</Text>
                  <Text style={styles.statValue}>35</Text>
                  <Text style={styles.statSub}>View booking</Text>
                  <View style={[styles.arrowPill, styles.arrowPillBlack]}> 
                    <Ionicons name="arrow-forward" size={16} color="#F5CE57" style={styles.arrowNE} />
                  </View>
                </View>
                {/* Dark copy below yellow */}
                <View style={[styles.statCard, styles.statCardDark]}> 
                  <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.85)' }]}>Staff members</Text>
                  <Text style={[styles.statValue, { color: '#FFFFFF' }]}>3</Text>
                  <Text style={[styles.statSub, { color: 'rgba(255,255,255,0.75)' }]}>View staff</Text>
                  <View style={[styles.arrowPill, styles.arrowPillAlt]}> 
                    <Ionicons name="arrow-forward" size={16} color="#1c1c1e" style={styles.arrowNE} />
                  </View>
                </View>
              </View>

              {/* Column 2: Dark then Yellow copy below */}
              <View style={styles.statsColumn}> 
                {/* Dark card */}
                <View style={[styles.statCard, styles.statCardDark]}> 
                  <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.85)' }]}>AMC service</Text>
                  <Text style={[styles.statValue, { color: '#FFFFFF' }]}>3</Text>
                  <Text style={[styles.statSub, { color: 'rgba(255,255,255,0.75)' }]}>View AMC </Text>
                  <View style={[styles.arrowPill, styles.arrowPillAlt]}> 
                    <Ionicons name="arrow-forward" size={16} color="#1c1c1e" style={styles.arrowNE} />
                  </View>
                </View>
                {/* Yellow copy below dark - Complains card clickable */}
                <Pressable style={[styles.statCard, styles.statCardYellow]} onPress={() => onOpenComplains?.()} accessibilityRole="button" hitSlop={8}> 
                  <Text style={styles.statLabel}>Complains filed</Text>
                  <Text style={styles.statValue}>35</Text>
                  <Text style={styles.statSub}>View complains</Text>
                  <View style={[styles.arrowPill, styles.arrowPillBlack]}> 
                    <Ionicons name="arrow-forward" size={16} color="#F5CE57" style={styles.arrowNE} />
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Summary glass card */}
            <View style={styles.summaryWrap}>
              <BlurView intensity={24} tint="light" style={styles.summaryCard}>
                {/* Watermark (without 'y') */}
                <Text pointerEvents="none" style={styles.summaryWatermark}>Summar</Text>
                {/* Fade out the tail of the watermark towards the right */}
                <LinearGradient
                  pointerEvents="none"
                  colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.9)"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.summaryWatermarkFade}
                />

                <Text style={styles.summaryTitle}>Summary</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryCol}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Generated</Text>
                      <Text style={styles.metricValue}>2050.48 kW/h</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Consumed</Text>
                      <Text style={styles.metricValue}>1400.12 kW/h</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Sold</Text>
                      <Text style={styles.metricValue}>650.36 kW</Text>
                    </View>
                  </View>
                  <View style={styles.summaryCol}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Money Earned</Text>
                      <Text style={styles.metricValue}>$ 1012.45</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>SolarCoop Discount</Text>
                      <Text style={styles.metricValue}>10%</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Saved on Discount</Text>
                      <Text style={styles.metricValue}>$ 515.45</Text>
                    </View>
                  </View>
                </View>

                <Pressable style={styles.summaryButton} onPress={() => {}}>
                  <Text style={styles.summaryButtonText}>View details</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </Pressable>
              </BlurView>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Side vignettes */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.10)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.leftVignette}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(0,0,0,0.10)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.rightVignette}
        />
        {/* Top fade */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.06)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topVignette}
        />
        {/* Warm bottom glow */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(247, 206, 115, 0.65)', 'rgba(247, 206, 115, 0)']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.bottomGlow}
        />
        {/* Overlays */}
        <View style={styles.textureOverlay} />
        <View style={styles.noiseOverlay} />

        {/* Fixed Bottom navigation */}
        <BottomNav onOpenBookings={onOpenBookings} onOpenCalculator={onOpenCalculator} />
      </LinearGradient>
    </View>
  );
}

function GlassCard({ children, style }: { children?: React.ReactNode; style?: any }) {
  return (
    <BlurView intensity={24} tint="light" style={[styles.card, style]}>
      {children}
    </BlurView>
  );
}

// Bottom navigation component
function BottomNav({ onOpenBookings, onOpenCalculator }: { onOpenBookings?: () => void; onOpenCalculator?: () => void }) {
  const [active, setActive] = React.useState<'home' | 'roofs' | 'calculator' | 'analytics' | 'settings'>('home');

  const Item = ({ id, icon, label }: { id: typeof active; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
    const isActive = active === id;
    return (
      <Pressable onPress={() => { void triggerPressHaptic(); setActive(id); if (id === 'roofs') onOpenBookings && onOpenBookings(); if (id === 'calculator') onOpenCalculator && onOpenCalculator(); }} style={styles.navItem} hitSlop={10}>
        <View style={[styles.navIconPill, isActive && styles.navIconPillActive]}>
          <Ionicons name={icon} size={18} color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
        </View>
        <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.bottomNavWrap}>
      <View style={styles.bottomNav}>
        <Item id="home" icon="home-outline" label="Home" />
        <Item id="roofs" icon="grid-outline" label="Bookings" />
        <Item id="calculator" icon="calculator-outline" label="Calculator" />
        <Item id="analytics" icon="stats-chart-outline" label="Analytics" />
        <Item id="settings" icon="settings-outline" label="Settings" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra space above bottom navigation
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  backPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backPillText: {
    fontSize: 22,
    color: '#1c1c1e',
    marginTop: -2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  titleMain: {
    marginTop: 40,
    paddingHorizontal: 20,
    fontSize: 26,
    lineHeight: 34,
    color: '#1c1c1e',
    fontFamily: 'Bambino-Light',
    letterSpacing: 0.2,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  cardSmall: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.75)',
  },
  glassDropdown: {
    height: 45,
    borderRadius: 222,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
    minWidth: 171,
  },
  dropdownInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#1c1c1e',
  },
  // Modified stats layout: two columns with two cards each
  statsRowColumns: {
    marginTop: 26,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  statsColumn: {
    flex: 1,
    gap: 12,
  },
  statCard: {
    borderRadius: 22,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  statCardYellow: {
    backgroundColor: '#F5CE57',
    minHeight: 160,
  },
  statCardDark: {
    backgroundColor: '#232428',
  },
  statLabel: {
    fontSize: 14,
    color: '#1c1c1e',
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1c1c1e',
    marginBottom: 10,
  },
  statSub: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.7)',
  },
  statDelta: {
    fontSize: 14,
    color: '#1c1c1e',
    fontWeight: '600',
    marginTop: 2,
  },
  arrowPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAD27A',
  },
  arrowPillAlt: {
    backgroundColor: '#F5CE57',
  },
  arrowPillBlack: {
    backgroundColor: '#1c1c1e',
  },
  arrowNE: {
    transform: [{ rotate: '-45deg' }],
  },
  // Summary card
  summaryWrap: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  summaryCard: {
    borderRadius: 26,
    padding: 29,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
    minHeight: 309,
  },
  summaryWatermark: {
    position: 'absolute',
    right: -30,
    top: -4,
    fontSize: 64,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.05)',
  },
  summaryWatermarkFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 140,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1e',
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCol: {
    flex: 1,
    gap: 12,
  },
  metricItem: {
    gap: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  summaryButton: {
    marginTop: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2C2D30',
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 22,
  },
  summaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Vignettes and overlays for gradient
  leftVignette: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
  },
  rightVignette: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
  },
  topVignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 80,
  },
  bottomGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
  textureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.6,
  },
  noiseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    opacity: 0,
  },
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#191A1C',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingVertical: 12,
    paddingBottom: 22, // internal space for home indicator
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  navItem: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  navIconPill: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  navIconPillActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  navLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});