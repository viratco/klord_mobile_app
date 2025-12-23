import React from 'react';
import { View, StyleSheet, Pressable, Text, TextInput, Alert, Image, Keyboard, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { BouncyPressable } from '../../components/BouncyPressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

type Category = 'industrial' | 'residential' | 'commercial' | 'ground';

export default function SelectedCategory({
  category,
  onBack,
  onClose,
}: {
  category: Category;
  onBack?: () => void;
  onClose?: (payload?: { electricityBill?: string; billingCycle?: '1m' | '2m'; budget?: string; pincode?: string; provider?: string | null }) => void;
}) {
  const pretty =
    category === 'industrial' ? 'Industrial' :
      category === 'residential' ? 'Residential' :
        category === 'commercial' ? 'Commercial' :
          'Ground Mounted';
  const [pincode, setPincode] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [billingCycle, setBillingCycle] = React.useState<'1m' | '2m'>('1m');
  const [budget, setBudget] = React.useState('');
  const [electricityBill, setElectricityBill] = React.useState('');
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const inputRef = React.useRef<TextInput | null>(null);

  const handleSubmitPincode = () => {
    if (pincode.length !== 6) {
      Alert.alert('Invalid pincode', 'Please enter a 6-digit pincode.');
      return;
    }
    // Mark as submitted to reveal providers
    setSubmitted(true);
    // Dismiss keyboard and blur input on iOS
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const handleFinalSubmit = () => {
    // Basic guard: ensure pincode submitted
    if (!submitted) {
      Alert.alert('Submit pincode', 'Please enter and submit your pincode first.');
      return;
    }
    onClose?.({
      electricityBill,
      billingCycle,
      budget,
      pincode,
      provider: selectedProvider,
    });
  };

  const providerOptions = React.useMemo(() => (
    [
      {
        id: 'purvanchal_vv',
        label: 'Purvanchal Vidyut',
        source: require('../../assets/purvanchal.jpg'),
      },
      {
        id: 'paschimanchal',
        label: 'Paschimanchal',
        source: require('../../assets/paschimanchal.jpg'),
      },
      {
        id: 'mvvnl',
        label: 'MVVNL',
        source: require('../../assets/MVVNL.jpeg'),
      },
      {
        id: 'dvvnl',
        label: 'DVVNL',
        source: require('../../assets/DVVNL.png'),
      },
      {
        id: 'torrent_power',
        label: 'Torrent Power',
        source: require('../../assets/torrent.png'),
      },
      {
        id: 'npcl',
        label: 'NPCL',
        source: require('../../assets/npcl.png'),
      },
      {
        id: 'others',
        label: 'Others',
        source: null,
      },
    ]
  ), []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[
          '#ECECEC', // top light gray
          '#E6E6E8', // cool gray
          '#EDE5D6', // transition to warm
          '#F3DDAF', // wa
          // rm beige
          '#F7CE73'  // bottom soft yellow
        ]}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Fixed back button */}
      <BouncyPressable onPress={onBack} style={styles.backPill} hitSlop={8} accessibilityRole="button">
        <BlurView intensity={24} tint="light" style={styles.backGlass}>
          <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
        </BlurView>
      </BouncyPressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top black curved rectangle */}
          <View style={styles.topBlackCard}>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.progressText}>1/5 completed</Text>
            </View>
            <Text style={styles.progressSubtitle}>For {pretty}</Text>
          </View>

          {/* Pincode input and submit button row */}
          <View style={styles.pincodeRow}>
            {/* Translucent liquid glass input card */}
            <BlurView intensity={24} tint="light" style={styles.pincodeCard}>
              <View style={styles.pincodeInnerGradient} />
              <Text style={styles.pincodeLabel}>Pincode</Text>
              <TextInput
                ref={inputRef}
                value={pincode}
                onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="Enter pincode"
                placeholderTextColor="rgba(255,255,255,0.7)"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleSubmitPincode}
                style={styles.pincodeInput}
              />
            </BlurView>

            {/* Square yellow submit button */}
            <BouncyPressable
              onPress={handleSubmitPincode}
              style={styles.sideYellowBox}
              accessibilityRole="button"
              accessibilityLabel="Submit pincode"
            >
              <Ionicons name="arrow-forward-circle" size={30} color="#1c1c1e" />
            </BouncyPressable>
          </View>

          {/* Providers container */}
          <BlurView
            intensity={22}
            tint="light"
            style={styles.providersCard}
          >
            <View style={styles.providersInner} />
            {!submitted && (
              <>
                <Text style={styles.providersTitle}>Available providers</Text>
                <Text style={styles.providersHint}>
                  {pincode.length === 6 ? 'Showing providers for ' + pincode : 'Enter a 6-digit pincode to see providers'}
                </Text>
              </>
            )}
            {/* Demo providers grid - visible after submit */}
            {submitted && (
              <View style={styles.providerGrid}>
                {providerOptions.map((provider) => {
                  const active = selectedProvider === provider.id;
                  return (
                    <BouncyPressable
                      key={provider.id}
                      onPress={() => setSelectedProvider(provider.id)}
                      style={[styles.providerItem, active && styles.providerItemActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <View style={styles.providerLogoWrap}>
                        {provider.source ? (
                          <Image source={provider.source} style={styles.providerImage} resizeMode="contain" />
                        ) : (
                          <Text style={[styles.providerName, active && styles.providerNameActive]}>No logo</Text>
                        )}
                      </View>
                      <Text style={[styles.providerLabel, active && styles.providerLabelActive]}>{provider.label}</Text>
                    </BouncyPressable>
                  );
                })}
              </View>
            )}
          </BlurView>

          {/* Billing cycle card */}
          <BlurView
            intensity={22}
            tint="light"
            style={styles.billingCard}
          >
            <View style={styles.providersInner} />
            <Text style={styles.billingTitle}>Billing cycle</Text>
            <View style={styles.billingWrap}>
              <BouncyPressable
                onPress={() => setBillingCycle('1m')}
                style={[styles.billingPill, billingCycle === '1m' && styles.billingPillActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.billingText, billingCycle === '1m' && styles.billingTextActive]}>1 month</Text>
              </BouncyPressable>
              <BouncyPressable
                onPress={() => setBillingCycle('2m')}
                style={[styles.billingPill, billingCycle === '2m' && styles.billingPillActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.billingText, billingCycle === '2m' && styles.billingTextActive]}>2 month</Text>
              </BouncyPressable>
            </View>
          </BlurView>

          {/* Budget card */}
          <BlurView
            intensity={22}
            tint="light"
            style={styles.budgetCard}
          >
            <View style={styles.providersInner} />
            <Text style={styles.budgetTitle}>Budget</Text>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetPrefix}>₹</Text>
              <TextInput
                value={budget}
                onChangeText={(t) => setBudget(t.replace(/[^0-9]/g, '').slice(0, 7))}
                keyboardType="number-pad"
                placeholder="Enter amount"
                placeholderTextColor="rgba(28,28,30,0.5)"
                style={styles.budgetInput}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          </BlurView>

          {/* Electricity bill card */}
          <BlurView
            intensity={22}
            tint="light"
            style={styles.electricityCard}
          >
            <View style={styles.providersInner} />
            <Text style={styles.electricityTitle}>Electricity bill</Text>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetPrefix}>₹</Text>
              <TextInput
                value={electricityBill}
                onChangeText={(t) => setElectricityBill(t.replace(/[^0-9]/g, '').slice(0, 7))}
                keyboardType="number-pad"
                placeholder="Last monthly bill"
                placeholderTextColor="rgba(28,28,30,0.5)"
                style={styles.budgetInput}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          </BlurView>

          {/* Final Submit button */}
          <BouncyPressable
            onPress={handleFinalSubmit}
            style={styles.submitButton}
            accessibilityRole="button"
            accessibilityLabel="continue and next"
          >
            <Text style={styles.submitText}>continue and next</Text>
          </BouncyPressable>

          {/* Extra bottom padding for better scrolling experience */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: 60, // Leave space for back button
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backPill: {
    position: 'absolute',
    left: 20,
    top: 50,
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
  topBlackCard: {
    height: 100,
    borderRadius: 18,
    backgroundColor: '#000',
    marginBottom: 20,
  },
  pincodeRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  sideYellowBox: {
    width: 100,
    height: 100,
    backgroundColor: '#F7CE73',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pincodeCard: {
    flex: 1,
    height: 100,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)'
  },
  pincodeInnerGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  pincodeLabel: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
    marginLeft: 14,
    marginBottom: 6,
    opacity: 0.98,
  },
  pincodeInput: {
    marginHorizontal: 12,
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)'
  },
  providersCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  providersInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  billingCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  budgetCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  electricityCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    marginBottom: 20,
  },
  electricityTitle: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 14,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  submitButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7CE73',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 20,
  },
  submitText: {
    color: '#1c1c1e',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  budgetTitle: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 14,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  budgetPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  budgetInput: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    color: '#1c1c1e',
    fontSize: 16,
    fontWeight: '700',
  },
  providersTitle: {
    paddingTop: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  providersHint: {
    paddingTop: 2,
    paddingHorizontal: 16,
    paddingBottom: 12,
    color: 'rgba(28,28,30,0.8)',
    fontSize: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.35)'
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
    justifyContent: 'space-between',
  },
  providerItem: {
    width: '31%',
    height: 110,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 10,
    gap: 8,
  },
  providerItemActive: {
    backgroundColor: '#F7CE73',
    borderColor: 'rgba(0,0,0,0.2)'
  },
  providerLogoWrap: {
    width: '100%',
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  providerName: {
    paddingHorizontal: 8,
    textAlign: 'center',
    color: '#1c1c1e',
    fontSize: 12,
    fontWeight: '700',
  },
  providerNameActive: {
    color: '#1c1c1e',
    fontWeight: '900'
  },
  providerLabel: {
    textAlign: 'center',
    color: '#1c1c1e',
    fontSize: 11,
    fontWeight: '700',
  },
  providerLabelActive: {
    color: '#1c1c1e',
    fontWeight: '900',
    fontSize: 11,
  },
  providerImage: {
    width: 60,
    height: 45,
  },
  billingTitle: {
    paddingHorizontal: 16,
    paddingTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  billingWrap: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  billingPill: {
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 40,
    backgroundColor: '#FFE27A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)'
  },
  billingPillActive: {
    backgroundColor: '#F7CE73',
    borderColor: 'rgba(0,0,0,0.25)'
  },
  billingText: {
    color: '#1c1c1e',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  billingTextActive: {
    color: '#1c1c1e',
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
    width: '20%', // 1 of 5 steps
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
  bottomPadding: {
    height: 20,
  },
});