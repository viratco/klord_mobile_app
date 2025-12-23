import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { BouncyPressable } from '../../components/BouncyPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

type Category = 'industrial' | 'residential' | 'commercial' | 'ground';

const SUBSIDY_AMOUNT_TABLE = [
  { kw: 1, withSubsidy: 40000, withoutSubsidy: 85000 },
  { kw: 2, withSubsidy: 65000, withoutSubsidy: 155000 },
  { kw: 3, withSubsidy: 91000, withoutSubsidy: 199000 },
  { kw: 4, withSubsidy: 147000, withoutSubsidy: 255000 },
  { kw: 5, withSubsidy: 214000, withoutSubsidy: 322000 },
  { kw: 6, withSubsidy: 291000, withoutSubsidy: 399000 },
  { kw: 7, withSubsidy: 347000, withoutSubsidy: 455000 },
  { kw: 8, withSubsidy: 407000, withoutSubsidy: 515000 },
  { kw: 9, withSubsidy: 432000, withoutSubsidy: 540000 },
  { kw: 10, withSubsidy: 490000, withoutSubsidy: 598000 },
];

export default function FourthForm({
  onBack,
  onNext,
  panelType,
  category,
  electricityBill,
  billingCycle,
  capacityKW,
  networkChargePerUnit = 0,
  ratePerKW = 60000,
  annualGenPerKW = 1440, // kWh/year (≈120 kWh/month)
  moduleDegradationPct = 0.55, // % per year
  omPerKWYear = 400, // INR
  omEscalationPct = 0,
  tariffINR = 8,
  tariffEscalationPct = 2,
  lifeYears = 25,
  gstPct = 8.9, // % (updated per new receipt pattern)
  subsidyAmount = 180000,
}: {
  onBack?: () => void;
  onNext?: (payload: {
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
  }) => void;
  panelType?: string;
  category?: Category;
  electricityBill?: string;
  billingCycle?: '1m' | '2m';
  capacityKW?: number;
  networkChargePerUnit?: number; // INR per kWh charged by DISCOM
  ratePerKW?: number;
  annualGenPerKW?: number;
  moduleDegradationPct?: number;
  omPerKWYear?: number;
  omEscalationPct?: number;
  tariffINR?: number;
  tariffEscalationPct?: number;
  lifeYears?: number;
  gstPct?: number;
  subsidyAmount?: number;
}) {
  const insets = useSafeAreaInsets();
  const prettyCategory = category === 'industrial' ? 'Industrial'
    : category === 'residential' ? 'Residential'
      : category === 'commercial' ? 'Commercial'
        : category === 'ground' ? 'Ground Mounted'
          : undefined;

  // Compute capacity (kW) from bill using sun-hours formula if bill provided
  const billBasedKW = React.useMemo(() => {
    const billNum = Number(String(electricityBill || '').replace(/[^0-9.]/g, '')) || 0;
    if (billNum <= 0) return 0;
    const sunHours = 5;
    const PR = 0.85;
    const monthlyGenPerKW = sunHours * PR * 30; // ~127.5 kWh/kW/month
    const billForOneMonth = billingCycle === '2m' ? billNum / 2 : billNum;
    const monthlyUnits = billForOneMonth / tariffINR;
    const kw = monthlyUnits / monthlyGenPerKW;
    return Math.max(0, kw);
  }, [electricityBill, billingCycle, tariffINR]);

  // Final capacity: prefer the value selected on previous page if provided
  const finalCapacityKW = typeof capacityKW === 'number' && capacityKW > 0 ? capacityKW : billBasedKW;

  const capacityForCalc = React.useMemo(() => {
    if (!Number.isFinite(finalCapacityKW) || finalCapacityKW <= 0) return 0;
    const rounded = Math.round(finalCapacityKW);
    return Math.max(1, rounded);
  }, [finalCapacityKW]);

  // Cost calculations
  const roundedCapacityKW = React.useMemo(() => {
    if (!Number.isFinite(capacityForCalc) || capacityForCalc <= 0) return 0;
    if (capacityForCalc < 1 || capacityForCalc > 10) return 0;
    return capacityForCalc;
  }, [capacityForCalc]);

  const tableEntry = React.useMemo(
    () => (roundedCapacityKW ? SUBSIDY_AMOUNT_TABLE.find((row) => row.kw === roundedCapacityKW) : undefined),
    [roundedCapacityKW]
  );

  const effectiveRatePerKW = React.useMemo(() => {
    if (tableEntry) {
      return Math.round(tableEntry.withoutSubsidy / tableEntry.kw);
    }
    return ratePerKW;
  }, [tableEntry, ratePerKW]);

  const baseCost = React.useMemo(() => {
    if (tableEntry) {
      return tableEntry.withoutSubsidy;
    }
    return capacityForCalc * ratePerKW;
  }, [tableEntry, capacityForCalc, ratePerKW]);

  const gstAmountCalc = React.useMemo(() => {
    if (tableEntry) {
      return 0;
    }
    return Math.round((baseCost * gstPct) / 100);
  }, [tableEntry, baseCost, gstPct]);

  const totalWithoutSubsidy = React.useMemo(() => {
    if (tableEntry) {
      return tableEntry.withoutSubsidy;
    }
    return Math.round(baseCost);
  }, [tableEntry, baseCost]);

  const totalWithSubsidy = React.useMemo(() => {
    if (tableEntry) {
      return tableEntry.withSubsidy;
    }
    return Math.round(Math.max(0, baseCost + subsidyAmount));
  }, [tableEntry, baseCost, subsidyAmount]);

  const subsidySavings = React.useMemo(() => Math.max(0, totalWithoutSubsidy - totalWithSubsidy), [totalWithoutSubsidy, totalWithSubsidy]);
  const [withSubsidy, setWithSubsidy] = React.useState(true);

  // Derived finance metrics based on current selection (with/without subsidy)
  const investmentUsed = withSubsidy ? totalWithSubsidy : totalWithoutSubsidy;
  const annualGenAllKW = React.useMemo(() => capacityForCalc * annualGenPerKW, [capacityForCalc, annualGenPerKW]);
  const annualOMTotal = React.useMemo(() => Math.round(capacityForCalc * omPerKWYear), [capacityForCalc, omPerKWYear]);
  const annualNetworkCharges = React.useMemo(() => Math.round(annualGenAllKW * networkChargePerUnit), [annualGenAllKW, networkChargePerUnit]);
  const annualSavingsGross = React.useMemo(() => Math.round(annualGenAllKW * tariffINR), [annualGenAllKW, tariffINR]);
  const netAnnualBenefit = React.useMemo(() => Math.max(0, annualSavingsGross - annualOMTotal - annualNetworkCharges), [annualSavingsGross, annualOMTotal, annualNetworkCharges]);
  const roiPct = React.useMemo(() => (investmentUsed > 0 ? (netAnnualBenefit / investmentUsed) * 100 : 0), [investmentUsed, netAnnualBenefit]);
  const breakEvenYears = React.useMemo(() => (netAnnualBenefit > 0 ? investmentUsed / netAnnualBenefit : 0), [investmentUsed, netAnnualBenefit]);
  const monthlySavings = React.useMemo(() => Math.round(netAnnualBenefit / 12), [netAnnualBenefit]);
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
        {/* Header card */}
        <View style={styles.topBlackCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '80%' }]} />
            </View>
            <Text style={styles.progressText}>4/5 completed</Text>
          </View>
          <Text style={styles.progressSubtitle}>For {prettyCategory ?? panelType ?? 'Site details'}</Text>
        </View>

        {/* Receipt card */}
        <View style={styles.receiptWrap}>
          {/* Toggle */}
          <View style={styles.toggleRow}>
            <BouncyPressable
              accessibilityRole="button"
              onPress={() => setWithSubsidy(true)}
              style={[styles.toggleChip, withSubsidy && styles.toggleChipActive]}
            >
              <Text style={[styles.toggleText, withSubsidy && styles.toggleTextActive]}>With subsidy</Text>
            </BouncyPressable>
            <BouncyPressable
              accessibilityRole="button"
              onPress={() => setWithSubsidy(false)}
              style={[styles.toggleChip, !withSubsidy && styles.toggleChipActive]}
            >
              <Text style={[styles.toggleText, !withSubsidy && styles.toggleTextActive]}>Without subsidy</Text>
            </BouncyPressable>
          </View>



          {/* Receipt */}
          <Text style={[styles.title, { marginTop: 14 }]}>Receipt</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.keyText}>Capacity (kW)</Text>
            <Text style={styles.valText}>{capacityForCalc > 0 ? `${capacityForCalc} kW` : '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>Annual Gen per kW</Text>
            <Text style={styles.valText}>{annualGenPerKW} kWh</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>Module Degradation</Text>
            <Text style={styles.valText}>{moduleDegradationPct}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>O&M per kW/year</Text>
            <Text style={styles.valText}>₹ {omPerKWYear.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>O&M Escalation</Text>
            <Text style={styles.valText}>{omEscalationPct}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>Tariff (INR/kWh)</Text>
            <Text style={styles.valText}>₹ {tariffINR.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>Tariff Escalation</Text>
            <Text style={styles.valText}>{tariffEscalationPct.toFixed(2)}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>Useful Life</Text>
            <Text style={[styles.valText, { fontWeight: '900' }]}>{lifeYears} years</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>Rate per kW</Text>
            <Text style={styles.valText}>₹ {Math.round(effectiveRatePerKW).toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.keyText}>Cost of the Solar PV Plant</Text>
            <Text style={styles.valText}>₹ {Math.round(baseCost).toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>GST ({gstPct.toFixed(2)}%)</Text>
            <Text style={styles.valText}>₹ {gstAmountCalc.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.keyText, { fontWeight: '800' }]}>
              {withSubsidy
                ? `Total Investment (after subsidy savings ₹${subsidySavings.toLocaleString()})`
                : 'Total Investment'}
            </Text>
            <Text style={[styles.valText, { fontWeight: '900' }]}>₹ {(withSubsidy ? totalWithSubsidy : totalWithoutSubsidy).toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.keyText}>Network Charges per Unit by DISCOM</Text>
            <Text style={styles.valText}>₹ {networkChargePerUnit.toFixed(0)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>ROI (per year)</Text>
            <Text style={styles.valText}>{roiPct.toFixed(1)}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>Break-even</Text>
            <Text style={styles.valText}>{breakEvenYears > 0 ? `${breakEvenYears.toFixed(1)} yrs` : '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.keyText}>Monthly savings</Text>
            <Text style={styles.valText}>₹ {monthlySavings.toLocaleString()}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Continue button */}
      <View style={styles.bottomButtonWrap}>
        <BouncyPressable style={styles.bottomButton} onPress={() => onNext && onNext({
          withSubsidy,
          ratePerKW: effectiveRatePerKW,
          networkChargePerUnit,
          annualGenPerKW,
          moduleDegradationPct,
          omPerKWYear,
          omEscalationPct,
          tariffINR,
          tariffEscalationPct,
          lifeYears,
          gstPct,
          gstAmount: gstAmountCalc,
          totalInvestment: withSubsidy ? totalWithSubsidy : totalWithoutSubsidy,
          capacityKW: capacityForCalc,
        })} accessibilityRole="button">
          <Text style={styles.bottomButtonText}>continue and next</Text>
        </BouncyPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
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
  progressText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
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
  contentCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    padding: 20,
  },
  receiptWrap: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    padding: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 18,
    padding: 4,
  },
  toggleChip: {
    flex: 1,
    height: 36,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toggleChipActive: {
    backgroundColor: '#F7CE73',
  },
  toggleText: {
    fontSize: 13,
    color: '#1c1c1e',
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#1c1c1e',
  },
  logoRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  logoCell: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)'
  },
  logoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 10,
  },
  keyText: {
    fontSize: 14,
    color: '#1c1c1e',
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 10,
  },
  valText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1c1c1e',
    textAlign: 'right',
    minWidth: 110,
    flexShrink: 0,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1c1c1e', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(28,28,30,0.8)' },
  bottomButtonWrap: { position: 'absolute', left: 20, right: 20, bottom: 24 },
  bottomButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  bottomButtonText: { fontSize: 16, fontWeight: '800', color: '#1c1c1e', letterSpacing: 0.3 },
});

