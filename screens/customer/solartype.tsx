import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing, Dimensions } from 'react-native';
import { BouncyPressable } from '../../components/BouncyPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

type Category = 'industrial' | 'residential' | 'commercial' | 'ground';
type BudgetLevel = 'low' | 'medium' | 'high';
type SunCondition = 'sunny' | 'cloudy';

// Recommendation logic (same rules used earlier)
function suggestPanel(
  typeLabel: 'Residential' | 'Commercial' | 'Industrial' | 'Ground',
  budget: BudgetLevel,
  demandKW: number,
  locationSun: SunCondition = 'sunny'
): 'Poly' | 'Mono' | 'TOPCon' | 'Bifacial' {
  if (typeLabel === 'Residential') {
    if (budget === 'low') return 'Poly';
    if (budget === 'medium') return 'Mono';
    if (budget === 'high') return locationSun === 'cloudy' ? 'TOPCon' : 'Mono';
  }
  if (typeLabel === 'Commercial') {
    return budget === 'high' ? 'Mono' : 'Poly';
  }
  if (typeLabel === 'Industrial') {
    if (demandKW > 50) return budget === 'high' ? 'Bifacial' : 'Poly';
    // For smaller industrial systems, prefer better tech when budget allows
    if (budget === 'high') return locationSun === 'cloudy' ? 'TOPCon' : 'Mono';
    if (budget === 'medium') return 'Mono';
    return 'Poly';
  }
  if (typeLabel === 'Ground') {
    return budget === 'high' ? 'Bifacial' : 'Poly';
  }
  return 'Poly';
}

function panelDescription(kind: 'Poly' | 'Mono' | 'TOPCon' | 'Bifacial'): string {
  switch (kind) {
    case 'Poly':
      return 'Cost-effective panels suitable for budget-friendly installations. Typically 15–18% efficiency.';
    case 'Mono':
      return 'High-efficiency monocrystalline panels with sleek look. Typically 18–22% efficiency.';
    case 'TOPCon':
      return 'Next-gen high-efficiency mono architecture that performs better in low light and high temp.';
    case 'Bifacial':
      return 'Generates from both sides using reflected light; great for ground-mounted and industrial use.';
  }
}

export default function Solartype({ onBack, onNext, category, demandKW, budgetLevel, sunCondition, electricityBill, billingCycle }: { onBack?: () => void; onNext?: (payload?: { wp: number; plates: number; totalKW: number; panelType: 'Poly' | 'Mono' | 'TOPCon' | 'Bifacial' }) => void; category?: Category; demandKW?: number; budgetLevel?: BudgetLevel; sunCondition?: SunCondition; electricityBill?: string; billingCycle?: '1m' | '2m' }) {
  const insets = useSafeAreaInsets();
  const pretty = category === 'industrial' ? 'Industrial'
    : category === 'residential' ? 'Residential'
    : category === 'commercial' ? 'Commercial'
    : category === 'ground' ? 'Ground Mounted'
    : undefined;
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedWp, setSelectedWp] = React.useState<number>(370);

  // Compute recommendation when inputs change
  const recommendedKind = React.useMemo(() => {
    const typeLabel = pretty === 'Ground Mounted' ? 'Ground' : (pretty as 'Residential' | 'Commercial' | 'Industrial' | undefined);
    const b = budgetLevel ?? 'medium';
    const d = typeof demandKW === 'number' ? demandKW : 0;
    const s = sunCondition ?? 'sunny';
    // If category is missing, default to Residential rather than fallback Poly
    const finalType = typeLabel ?? 'Residential';
    return suggestPanel(finalType, b, d, s);
  }, [pretty, budgetLevel, demandKW, sunCondition]);

  const [selectedType, setSelectedType] = React.useState<{ title: 'Poly' | 'Mono' | 'TOPCon' | 'Bifacial'; desc: string }>({
    title: recommendedKind,
    desc: panelDescription(recommendedKind)
  });

  const wpOptions = React.useMemo(() => {
    const t = selectedType.title;
    if (t === 'Poly') return [330, 350, 375];
    if (t === 'Mono') return [400, 430, 450];
    if (t === 'TOPCon') return [450, 500, 550];
    if (t === 'Bifacial') return [540, 600, 650];
    return [370, 400, 430];
  }, [selectedType.title]);

  React.useEffect(() => {
    if (!wpOptions.includes(selectedWp)) {
      const mid = wpOptions[Math.floor(wpOptions.length / 2)];
      setSelectedWp(mid);
    }
  }, [wpOptions, selectedWp]);

  // Keep selectedType synced with new recommendations unless user has overridden via sheet.
  React.useEffect(() => {
    setSelectedType((prev) => {
      // If previous title equals recommendation, refresh description, else keep user choice.
      if (prev.title === recommendedKind) {
        return { title: recommendedKind, desc: panelDescription(recommendedKind) };
      }
      return prev;
    });
  }, [recommendedKind]);

  // Derive required kW from electricity bill when demandKW not provided
  const requiredKW = React.useMemo(() => {
    if (typeof demandKW === 'number' && demandKW > 0) return demandKW;
    const billNum = Number(String(electricityBill || '').replace(/[^0-9.]/g, '')) || 0;
    if (billNum <= 0) return 0;
    const tariffINR = 8; // INR per kWh
    const sunHours = 5;
    const performanceRatio = 0.85;
    const monthlyGenPerKW = sunHours * performanceRatio * 30; // ~127.5 kWh/kW/month
    const billForOneMonth = billingCycle === '2m' ? billNum / 2 : billNum;
    const monthlyUnits = billForOneMonth / tariffINR; // kWh/month
    const kw = monthlyUnits / monthlyGenPerKW;
    return Math.max(0, kw);
  }, [demandKW, electricityBill, billingCycle]);

  // If type suggests higher Wp, prefer 400 as default; else 370
  React.useEffect(() => {
    if (recommendedKind === 'Mono' || recommendedKind === 'TOPCon' || recommendedKind === 'Bifacial') {
      setSelectedWp((prev) => (prev === 330 ? 370 : prev));
    }
  }, [recommendedKind]);
  
  // Derived values for black card (Wp selector)
  const plates = React.useMemo(() => {
    const targetKW = requiredKW > 0 ? requiredKW : (selectedWp * 12) / 1000; // fallback ~12 plates
    const needed = Math.ceil((targetKW * 1000) / selectedWp);
    return Math.max(1, needed);
  }, [requiredKW, selectedWp]);
  const totalKW = React.useMemo(() => (plates * selectedWp) / 1000, [plates, selectedWp]);
  const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.65);
  const sheetProgress = React.useRef(new Animated.Value(0)).current; // 0: closed, 1: open
  const backdropOpacity = sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });
  const sheetTranslateY = sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT, 0] });

  const openSheet = () => {
    setSheetOpen(true);
    Animated.timing(sheetProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const closeSheet = () => {
    Animated.timing(sheetProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSheetOpen(false);
    });
  };
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={['#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73']}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Fixed back button */}
      <BouncyPressable onPress={onBack} style={[styles.backPill, { top: insets.top + 10 }]} hitSlop={8} accessibilityRole="button">
        <BlurView intensity={24} tint="light" style={styles.backGlass}>
          <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
        </BlurView>
      </BouncyPressable>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80 }]}>
        {/* Black header card with progress (3/5) */}
        <View style={styles.topBlackCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
            <Text style={styles.progressText}>3/5 completed</Text>
          </View>
          {!!pretty && <Text style={styles.progressSubtitle}>For {pretty}</Text>}
        </View>

        {/* Large translucent container */}
        <View style={styles.glassLarge}>
          <Text style={[styles.title, { marginBottom: 8 }]}>Select solar panel type</Text>
          <View style={styles.recommendPill}>
            <Text style={styles.recommendText}>Recommended</Text>
          </View>
          <View style={{ height: 12 }} />
          <View style={styles.typeCard}>
            <Text style={styles.typeTitle}>{selectedType.title}</Text>
            <Text style={styles.typeDesc}>{selectedType.desc}</Text>
            <BouncyPressable
              onPress={openSheet}
              accessibilityRole="button"
              accessibilityLabel="Edit panel type"
              style={styles.typeEditIcon}
            >
              <Ionicons name="pencil" size={18} color="#F7CE73" />
            </BouncyPressable>
          </View>
          
          {/* Black card: Wp selector and computed metrics */}
          <View style={styles.blackBlockInside}>
            <View style={styles.blackHeaderRow}>
              <Text style={styles.blackTitle}>Choose Watt Peak (Wp) &{"\n"}Required power (kW)</Text>
              <BouncyPressable accessibilityRole="button" style={styles.blackEditBtn} onPress={openSheet}>
                <Ionicons name="pencil" size={16} color="#1c1c1e" />
              </BouncyPressable>
            </View>
            <View style={{ height: 10 }} />
            <View style={styles.wpRow}>
              {wpOptions.map((wp) => {
                const active = selectedWp === wp;
                return (
                  <BouncyPressable
                    key={wp}
                    accessibilityRole="button"
                    onPress={() => setSelectedWp(wp)}
                    style={[styles.wpChip, active && styles.wpChipActive]}
                  >
                    <Text style={[styles.wpChipText, active && styles.wpChipTextActive]}>{wp} Wp</Text>
                  </BouncyPressable>
                );
              })}
            </View>
            <View style={{ height: 14 }} />
            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Watt Peak</Text>
                <Text style={styles.metricValue}>{selectedWp} Wp</Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Plates</Text>
                <Text style={styles.metricValue}>{plates}</Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>kW</Text>
                <Text style={styles.metricValue}>{totalKW.toFixed(2)} kW</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Continue button */}
      <View style={styles.bottomButtonWrap}>
        <BouncyPressable style={styles.bottomButton} onPress={() => onNext && onNext({ wp: selectedWp, plates, totalKW, panelType: selectedType.title })} accessibilityRole="button">
          <Text style={styles.bottomButtonText}>continue and next</Text>
        </BouncyPressable>
      </View>

      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <View style={styles.sheetRoot} pointerEvents="box-none">
          <Animated.View style={[styles.sheetBackdrop, { opacity: backdropOpacity }]}>
            <BouncyPressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>
          <Animated.View style={[styles.sheetContainer, { height: SHEET_HEIGHT, transform: [{ translateY: sheetTranslateY }] }]}> 
            <BlurView intensity={28} tint="light" style={[styles.sheetBlur, { paddingBottom: Math.max(insets.bottom, 16) }] }>
              {/* subtle inner gradient for liquid glass feel */}
              <LinearGradient
                colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.12)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sheetGradient}
              />
              <View style={styles.sheetHandleWrap}>
                <View style={styles.sheetHandle} />
              </View>
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}> 
                <Text style={styles.sheetTitle}>Edit panel type</Text>
                <View style={{ height: 8 }} />
                <BouncyPressable
                  style={styles.sheetTypeCard}
                  accessibilityRole="button"
                  onPress={() => { setSelectedType({ title: 'Poly', desc: 'Cost-effective panels suitable for budget-friendly installations. Typically 15–18% efficiency.' }); closeSheet(); }}
                >
                  <Text style={styles.sheetTypeTitle}>Poly</Text>
                  <Text style={styles.sheetTypeDesc}>Cost-effective panels suitable for budget-friendly installations. Typically 15–18% efficiency.</Text>
                </BouncyPressable>
                <BouncyPressable
                  style={styles.sheetTypeCard}
                  accessibilityRole="button"
                  onPress={() => { setSelectedType({ title: 'Mono', desc: 'High-efficiency monocrystalline panels with sleek look. Typically 18–22% efficiency.' }); closeSheet(); }}
                >
                  <Text style={styles.sheetTypeTitle}>Mono</Text>
                  <Text style={styles.sheetTypeDesc}>High-efficiency monocrystalline panels with sleek look. Typically 18–22% efficiency.</Text>
                </BouncyPressable>
                <BouncyPressable
                  style={styles.sheetTypeCard}
                  accessibilityRole="button"
                  onPress={() => { setSelectedType({ title: 'TOPCon', desc: 'Next-gen high-efficiency mono architecture that performs better in low light and high temp.' }); closeSheet(); }}
                >
                  <Text style={styles.sheetTypeTitle}>TOPCon</Text>
                  <Text style={styles.sheetTypeDesc}>Next-gen high-efficiency mono architecture that performs better in low light and high temp.</Text>
                </BouncyPressable>
                <BouncyPressable
                  style={styles.sheetTypeCard}
                  accessibilityRole="button"
                  onPress={() => { setSelectedType({ title: 'Bifacial', desc: 'Generates from both sides using reflected light; great for ground-mounted and industrial use.' }); closeSheet(); }}
                >
                  <Text style={styles.sheetTypeTitle}>Bifacial</Text>
                  <Text style={styles.sheetTypeDesc}>Generates from both sides using reflected light; great for ground-mounted and industrial use.</Text>
                </BouncyPressable>
                <View style={{ height: 6 }} />
              </ScrollView>
            </BlurView>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  backPill: { position: 'absolute', left: 20, zIndex: 10 },
  topBlackCard: {
    height: 100,
    borderRadius: 18,
    backgroundColor: '#000',
    marginBottom: 20,
  },
  progressRow: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
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
  progressText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  progressSubtitle: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    bottom: 12,
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 24,
    opacity: 0.95,
  },
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
  title: { fontSize: 28, fontWeight: '800', color: '#1c1c1e', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(28,28,30,0.75)', marginBottom: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1c1c1e', marginBottom: 6 },
  cardText: { fontSize: 13, color: 'rgba(28,28,30,0.8)' },
  glassLarge: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    padding: 20,
  },
  typeCard: {
    backgroundColor: '#F7CE73',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingVertical: 20,
    paddingHorizontal: 18,
    // Keep text away from the floating edit button
    paddingRight: 64,
    paddingBottom: 56,
    position: 'relative',
  },
  typeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1c1c1e',
    marginBottom: 10,
  },
  typeDesc: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(28,28,30,0.9)',
  },
  typeEditIcon: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)'
  },
  recommendPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)'
  },
  recommendText: {
    color: '#1c1c1e',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  blackBlockInside: {
    minHeight: 120,
    borderRadius: 18,
    backgroundColor: '#000',
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  blackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blackTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  blackEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wpChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)'
  },
  wpChipActive: {
    backgroundColor: '#F7CE73',
    borderColor: 'rgba(0,0,0,0.25)'
  },
  wpChipText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '800',
    fontSize: 13,
  },
  wpChipTextActive: {
    color: '#1c1c1e',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  bottomButtonWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
  },
  bottomButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1c1e',
    letterSpacing: 0.3,
    textTransform: 'none'
  },
  // Bottom sheet styles
  sheetRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetContainer: {
    height: '50%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  sheetBlur: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  sheetGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: 'rgba(28,28,30,0.8)'
  },
  sheetTypeCard: {
    backgroundColor: '#F7CE73',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sheetTypeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  sheetTypeDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(28,28,30,0.92)'
  },
});

