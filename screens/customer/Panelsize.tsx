import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, TextInput } from 'react-native';
import { BouncyPressable } from '../../components/BouncyPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

export default function Panelsize({ onBack, onNext, onEdit, category, electricityBill, billingCycle }: { onBack?: () => void; onNext?: (payload?: { kw: number }) => void; onEdit?: () => void; category?: any; electricityBill?: string; billingCycle?: '1m' | '2m' }) {
  const insets = useSafeAreaInsets();
  // Parse electricity bill (assumed INR). If not provided, use 0.
  const monthlyBillINR = React.useMemo(() => {
    if (!electricityBill) return 0;
    const n = Number(String(electricityBill).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }, [electricityBill]);

  // Heuristic using solar formula:
  // Required kW = (Monthly Units) / (Monthly Generation per kW)
  // Monthly Units ≈ (Monthly Bill INR / Tariff INR per unit)
  // If billing cycle is 2 months, split bill in half to get monthly.
  const estimatedKW = React.useMemo(() => {
    // Assumptions (can be parameterized by region if needed)
    const tariffINR = 8; // INR per kWh (unit)
    const sunHours = 5; // average peak sun hours per day
    const performanceRatio = 0.85; // system losses factor

    // Derived: Monthly generation per kW = sunHours * performanceRatio * 30
    const monthlyGenPerKW = sunHours * performanceRatio * 30; // ≈ 127.5 kWh/kW/month
    if (tariffINR <= 0 || monthlyGenPerKW <= 0) return 0;

    // Adjust for billing cycle to get an effective monthly bill
    const billForOneMonth = (billingCycle === '2m') ? (monthlyBillINR / 2) : monthlyBillINR;
    const monthlyUnits = billForOneMonth / tariffINR; // kWh per month consumed

    // Required kW (exact, no rounding)
    const kw = monthlyUnits / monthlyGenPerKW;
    return monthlyBillINR > 0 ? Math.max(0, kw) : 0;
  }, [monthlyBillINR, billingCycle]);

  const [isEditing, setIsEditing] = React.useState(false);
  const [kwValue, setKwValue] = React.useState<string>('');

  React.useEffect(() => {
    if (!isEditing && !kwValue) {
      setKwValue(estimatedKW.toFixed(2));
    }
  }, [estimatedKW, isEditing, kwValue]);
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
        {/* Black header card with progress (matches SelectedCategory) */}
        <View style={styles.topBlackCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '40%' }]} />
            </View>
            <Text style={styles.progressText}>2/5 completed</Text>
          </View>
          <Text style={styles.progressSubtitle}>Panel size</Text>
        </View>

        {/* Big yellow panel */}
        <View style={styles.yellowPanel}>
          <Image source={require('../../assets/panelsize.png')} style={styles.panelImage} resizeMode="contain" />
          <View style={{ height: 12 }} />
          <Text style={styles.calcLabel}>Estimated size based on your monthly bill</Text>
          <View style={styles.calcCard}>
            <View style={styles.calcCardHeader}>
              {isEditing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={kwValue}
                    onChangeText={(t) => setKwValue(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    style={styles.editInput}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      const n = parseFloat(kwValue);
                      if (!Number.isFinite(n) || n < 0) setKwValue(estimatedKW.toFixed(2));
                      setIsEditing(false);
                    }}
                  />
                  <Text style={styles.kwSuffix}>kW</Text>
                </View>
              ) : (
                <Text style={styles.calcValue}>{(kwValue || estimatedKW.toFixed(2))} kW</Text>
              )}
              <BouncyPressable
                accessibilityRole="button"
                onPress={() => {
                  if (isEditing) {
                    const n = parseFloat(kwValue);
                    if (!Number.isFinite(n) || n < 0) setKwValue(estimatedKW.toFixed(2));
                    setIsEditing(false);
                  } else {
                    setKwValue((kwValue || estimatedKW.toFixed(2)));
                    setIsEditing(true);
                  }
                  if (onEdit) onEdit();
                }}
                style={styles.editPill}
                hitSlop={8}
              >
                <BlurView intensity={10} tint="dark" style={styles.editGlass}>
                  <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={16} color="#FFFFFF" />
                </BlurView>
              </BouncyPressable>
            </View>
            <Text style={styles.calcHint}>Assumes ~5 sun hours/day, PR 0.85 (≈127.5 kWh/kW/month) and ₹8/unit tariff</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Continue button */}
      <View style={styles.bottomButtonWrap}>
        <BouncyPressable
          style={styles.bottomButton}
          onPress={() => {
            const n = parseFloat(kwValue || '');
            const chosen = Number.isFinite(n) && n >= 0 ? n : estimatedKW;
            onNext && onNext({ kw: chosen });
          }}
          accessibilityRole="button"
        >
          <Text style={styles.bottomButtonText}>continue and next</Text>
        </BouncyPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
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
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F7CE73',
    borderRadius: 6,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
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
  backPill: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1c1c1e',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(28,28,30,0.75)',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1c1e',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: 'rgba(28,28,30,0.8)',
  },
  yellowPanel: {
    backgroundColor: '#F7CE73',
    paddingVertical: 30,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 18,
    minHeight: 250,
  },
  yellowTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1c1c1e',
    marginBottom: 6,
  },
  yellowSubtitle: {
    fontSize: 14,
    color: '#1c1c1e',
    opacity: 0.9,
  },
  panelImage: {
    width: '100%',
    height: 140,
    marginTop: 12,
    borderRadius: 12,
  },
  calcLabel: {
    fontSize: 13,
    color: 'rgba(28,28,30,0.8)',
    marginBottom: 8,
    fontWeight: '700',
  },
  calcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  calcCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  editPill: {
    marginLeft: 8,
  },
  editGlass: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  calcValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1c1c1e',
    marginBottom: 6,
  },
  editInput: {
    minWidth: 100,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#FFFFFF',
    color: '#1c1c1e',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  kwSuffix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  calcHint: {
    fontSize: 11,
    color: 'rgba(28,28,30,0.7)'
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
  }
});
