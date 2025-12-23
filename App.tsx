

import React from 'react';
import { StyleSheet, View, Image, Text, Pressable, Platform } from 'react-native';
import { BouncyPressable } from './components/BouncyPressable';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import { Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import AuthScreen from './screens/outer/auth';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
// import Bookings from './screens/customer/bookings';
import Bookings from './screens/customer/bookings';
import BookingDetail from './screens/customer/BookingDetail';
import Calculator from './screens/customer/calculator';
import SelectedCategory from './screens/customer/SelectedCategory';
import Panelsize from './screens/customer/Panelsize';
import Solartype from './screens/customer/solartype';
import FourthForm from './screens/customer/fourthform';
import FifthStep from './screens/customer/fifthstep';
import CustomerDashboard from './screens/customer/customerHome';
import CustomerStepsScreen from './screens/customer/customerSteps';
import CustomerSettingsScreen from './screens/customer/customerSettings';
import CustomerCode from './screens/customer/customercode';
import StaffDashboardScreen from './screens/staff/staffDashboard';
import StaffTasks from './screens/staff/staffTasks';
import StaffSteps from './screens/staff/staffSteps';
import StaffSettingsScreen from './screens/staff/staffSettings';
import StaffAnalytics from './screens/staff/staffanalytics';
import AmcStaff from './screens/staff/amcstaff';
import StaffComplaints from './screens/staff/staffcomplaints';
import AdminDashboard from './screens/admin/adminDashboard';
import AdminAnalyticsScreen from './screens/admin/adminAnalytics';
import AdminBooking from './screens/admin/adminBooking';
import AdminStaff from './screens/admin/adminStaff';
import StaffProfileScreen from './screens/admin/staffProfile';
import AdminSettingsScreen from './screens/admin/adminSettings';
// import AdminAnalytics from './screens/admin/adminAnalytics';
import ComplainsScreen from './screens/admin/complains';
import AmcPage from './screens/admin/amcpage';
import AdminCalendar from './screens/admin/admincalender';
import Slide1 from './screens/outer/slide1';
import Slide2 from './screens/outer/slide2';
import Slide3 from './screens/outer/slide3';
import Slide4 from './screens/outer/slide4';

// Import the correct CustomerDashboard component
// import CustomerDashboard from './screens/outer/Home';


// Removed inline StaffSteps placeholder in favor of real screen

// Removed inline AdminBooking placeholder in favor of real screen

// Removed inline AdminStaff placeholder in favor of real screen

// Removed inline CustomerSteps placeholder in favor of real screen



// Removed inline SelectedCategory placeholder in favor of real screen

// Removed inline Panelsize and Solartype placeholders in favor of real screens

// Replaced inline placeholder with real screen `CustomerSettingsScreen`


// Removed inline StaffDashboard placeholder in favor of real screen


// Removed inline StaffSettings placeholder in favor of real screen


// Removed inline AdminSettings placeholder in favor of real screen


function Panelselection({ onBack, onNext, category, requiredKW, provider }: { onBack?: () => void; onNext?: (payload?: any) => void; category?: Category; requiredKW?: number; provider?: string | null }) {
  return (
    <View style={styles.container}>
      <Text>Panel Selection - Placeholder</Text>
      <Pressable onPress={onBack}><Text>Back</Text></Pressable>
      <Pressable onPress={() => onNext && onNext()}><Text>Next</Text></Pressable>
    </View>
  );
}


function Personalform({ onBack, category, bookingContext }: { onBack?: () => void; category?: Category; bookingContext?: any }) {
  return (
    <View style={styles.container}>
      <Text>Personal Form - Placeholder</Text>
      <Pressable onPress={onBack}><Text>Back</Text></Pressable>
    </View>
  );
}


type BookingData = {
  id: string;
  name: string;
  role: string;
  percent: number;
};


type StaffBookingData = {
  id: string;
  projectType: string;
  fullName: string;
  city: string;
  state: string;
  country: string;
  percent: number;
};


type Category = 'industrial' | 'residential' | 'commercial' | 'ground';


type RootStackParamList = {
  Onboarding: undefined;
  Slide1: undefined;
  Slide2: undefined;
  Slide3: undefined;
  Slide4: undefined;
  Auth: undefined;
  CustomerDashboard: undefined;
  CustomerSettings: undefined;
  StaffDashboard: undefined;
  StaffTasks: undefined;
  StaffSteps: undefined;
  StaffSettings: undefined;
  StaffAnalytics: undefined;
  StaffAmc: undefined;
  StaffComplaints: undefined;
  AdminDashboard: undefined;
  AdminBooking: undefined;
  AdminStaff: undefined;
  StaffProfile: undefined;
  AdminAnalytics: undefined;
  AdminSettings: undefined;
  AdminComplains: undefined;
  AdminAmc: undefined;
  AdminCalendar: undefined;
  Bookings: undefined;
  BookingDetail: undefined;
  CustomerSteps: undefined;
  Calculator: undefined;
  CategoryDetail: undefined;
  PanelSize: undefined;
  SolarType: undefined;
  FourthForm: undefined;
  FifthStep: undefined;
  PanelSelection: undefined;
  PersonalForm: undefined;
  CustomerCode: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();


export default function App() {
  const [selectedBooking, setSelectedBooking] = React.useState<BookingData | null>(null);
  const [selectedStaffBooking, setSelectedStaffBooking] = React.useState<StaffBookingData | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
  const [categorySubmitData, setCategorySubmitData] = React.useState<{ pincode: string; electricityBill: string; budget: string; billingCycle: '1m' | '2m'; provider: string | null } | null>(null);
  const [selectedStaff, setSelectedStaff] = React.useState<{ id: string; name: string; email: string; phone: string; createdAt: string } | null>(null);
  const [requiredKW, setRequiredKW] = React.useState<number | null>(null);
  const [wp, setWp] = React.useState<number | null>(null);
  const [plates, setPlates] = React.useState<number | null>(null);
  const [panelType, setPanelType] = React.useState<string | null>(null);
  const [finance, setFinance] = React.useState<{
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
  } | null>(null);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Inter_900Black,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });


  React.useEffect(() => {
    if (!fontsLoaded) return;
    const textComponent = Text as any;
    if (!textComponent.defaultProps) {
      textComponent.defaultProps = {};
    }
    const existingStyle = Array.isArray(textComponent.defaultProps.style)
      ? Object.assign({}, ...(textComponent.defaultProps.style as any))
      : { ...(textComponent.defaultProps.style || {}) };
    textComponent.defaultProps.style = { ...existingStyle, fontFamily: 'Manrope_400Regular' };
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.appContainer}>
        <NavigationContainer>
          <Stack.Navigator id={undefined} initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding">
              {({ navigation }) => (
                <OnboardingScreen onGetStarted={() => navigation.navigate('Slide1')} />
              )}
            </Stack.Screen>
            <Stack.Screen name="Slide1">
              {({ navigation }) => (
                <Slide1
                  onNext={() => navigation.navigate('Slide2')}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Slide2">
              {({ navigation }) => (
                <Slide2
                  onNext={() => navigation.navigate('Slide3')}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Slide3">
              {({ navigation }) => (
                <Slide3
                  onNext={() => navigation.navigate('Slide4')}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Slide4">
              {({ navigation }) => (
                <Slide4
                  onNext={() => navigation.navigate('Auth')}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Auth">
              {({ navigation }) => (
                <AuthScreen
                  onBack={() => navigation.navigate('Onboarding')}
                  onLogin={(role) => {
                    if (role === 'customer') {
                      navigation.reset({ index: 0, routes: [{ name: 'CustomerDashboard' }] });
                    } else if (role === 'staff') {
                      navigation.reset({ index: 0, routes: [{ name: 'StaffDashboard' }] });
                    } else if (role === 'admin') {
                      navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
                    }
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CustomerDashboard">
              {({ navigation }) => (
                <CustomerDashboard
                  onOpenBookings={() => navigation.navigate('Bookings')}
                  onOpenCalculator={() => navigation.navigate('Calculator')}
                  onOpenSettings={() => navigation.navigate('CustomerSettings')}
                  onOpenReferral={() => navigation.navigate('CustomerCode')}
                  onOpenPosts={() => navigation.navigate('CustomerCode')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CustomerSettings">
              {({ navigation }) => (
                <CustomerSettingsScreen
                  onBack={() => navigation.goBack()}
                  onSignOut={() => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })}
                  onGoHome={() => navigation.navigate('CustomerDashboard')}
                  onOpenBookings={() => navigation.navigate('Bookings')}
                  onOpenCalculator={() => navigation.navigate('Calculator')}
                  onOpenPosts={() => navigation.navigate('CustomerCode')}
                  onOpenSettings={() => navigation.navigate('CustomerSettings')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Bookings">
              {({ navigation }) => (
                <Bookings
                  onBack={() => navigation.goBack()}
                  onOpenDetail={(b) => {
                    setSelectedBooking(b);
                    navigation.navigate('BookingDetail');
                  }}
                  onOpenCalculator={() => navigation.navigate('Calculator')}
                  onOpenSettings={() => navigation.navigate('CustomerSettings')}
                  onOpenPosts={() => navigation.navigate('CustomerCode')}
                  onOpenBookings={() => navigation.navigate('Bookings')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="BookingDetail">
              {({ navigation }) => (
                selectedBooking ? (
                  <BookingDetail
                    booking={selectedBooking}
                    onBack={() => {
                      setSelectedBooking(null);
                      navigation.goBack();
                    }}
                    onOpenSteps={(b) => {
                      setSelectedBooking(b);
                      navigation.navigate('CustomerSteps');
                    }}
                  />
                ) : null
              )}
            </Stack.Screen>
            <Stack.Screen name="CustomerSteps">
              {({ navigation }) => (
                selectedBooking ? (
                  <CustomerStepsScreen
                    booking={selectedBooking}
                    onBack={() => navigation.goBack()}
                  />
                ) : null
              )}
            </Stack.Screen>
            <Stack.Screen name="Calculator">
              {({ navigation }) => (
                <Calculator
                  onBack={() => navigation.goBack()}
                  onSelect={(c) => {
                    setSelectedCategory(c);
                    navigation.navigate('CategoryDetail');
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CategoryDetail">
              {({ navigation }) => (
                selectedCategory ? (
                  <SelectedCategory
                    category={selectedCategory}
                    onBack={() => navigation.goBack()}
                    onClose={(payload) => {
                      setCategorySubmitData((prev) => ({
                        pincode: payload?.pincode || prev?.pincode || '',
                        electricityBill: payload?.electricityBill || prev?.electricityBill || '',
                        budget: payload?.budget || prev?.budget || '',
                        billingCycle: payload?.billingCycle || prev?.billingCycle || '1m',
                        provider: payload?.provider ?? prev?.provider ?? null,
                      }));
                      navigation.navigate('PanelSize');
                    }}
                  />
                ) : null
              )}
            </Stack.Screen>
            <Stack.Screen name="PanelSize">
              {({ navigation }) => (
                <Panelsize
                  onBack={() => navigation.goBack()}
                  category={selectedCategory ?? undefined}
                  electricityBill={categorySubmitData?.electricityBill}
                  billingCycle={categorySubmitData?.billingCycle}
                  onNext={(p) => {
                    if (p && typeof p.kw === 'number') setRequiredKW(p.kw);
                    navigation.navigate('SolarType');
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="SolarType">
              {({ navigation }) => (
                <Solartype
                  onBack={() => navigation.goBack()}
                  onNext={(payload) => {
                    if (payload) {
                      setWp(payload.wp);
                      setPlates(payload.plates);
                      setRequiredKW(payload.totalKW);
                      setPanelType(payload.panelType);
                    }
                    navigation.navigate('FourthForm');
                  }}
                  category={selectedCategory ?? undefined}
                  electricityBill={categorySubmitData?.electricityBill}
                  billingCycle={categorySubmitData?.billingCycle}
                  demandKW={requiredKW ?? undefined}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="FourthForm">
              {({ navigation }) => (
                <FourthForm
                  onBack={() => navigation.goBack()}
                  onNext={(payload) => {
                    if (payload) setFinance(payload as any);
                    navigation.navigate('FifthStep');
                  }}
                  category={selectedCategory ?? undefined}
                  electricityBill={categorySubmitData?.electricityBill}
                  billingCycle={categorySubmitData?.billingCycle}
                  capacityKW={requiredKW ?? undefined}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="FifthStep">
              {({ navigation }) => (
                <FifthStep
                  onBack={() => navigation.goBack()}
                  onSubmit={() => {
                    navigation.navigate('Bookings');
                  }}
                  panelType={panelType ?? undefined}
                  category={selectedCategory ?? undefined}
                  wp={wp ?? undefined}
                  plates={plates ?? undefined}
                  capacityKW={requiredKW ?? undefined}
                  electricityBill={categorySubmitData?.electricityBill}
                  billingCycle={categorySubmitData?.billingCycle}
                  pincode={categorySubmitData?.pincode}
                  provider={categorySubmitData?.provider ?? null}
                  budget={categorySubmitData?.budget}
                  finance={finance ?? undefined}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="PanelSelection">
              {({ navigation }) => (
                <Panelselection
                  onBack={() => navigation.goBack()}
                  onNext={(payload?: any) => {
                    if (payload) setFinance(payload as any);
                    navigation.navigate('PersonalForm');
                  }}
                  category={selectedCategory ?? undefined}
                  requiredKW={requiredKW ?? undefined}
                  provider={categorySubmitData?.provider ?? null}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="PersonalForm">
              {({ navigation }) => (
                <Personalform
                  onBack={() => navigation.goBack()}
                  category={selectedCategory ?? undefined}
                  bookingContext={{
                    pincode: categorySubmitData?.pincode || '',
                    monthlyBill: Number((categorySubmitData?.electricityBill || '0').replace(/[^0-9.]/g, '')) || 0,
                    provider: categorySubmitData?.provider || '',
                    sizedKW: requiredKW || 0,
                    wp: wp || 0,
                    plates: plates || 0,
                    finance: finance || null,
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CustomerCode">
              {({ navigation }) => (
                <CustomerCode
                  onBack={() => navigation.goBack()}
                  onGoHome={() => navigation.navigate('CustomerDashboard')}
                  onOpenBookings={() => navigation.navigate('Bookings')}
                  onOpenCalculator={() => navigation.navigate('Calculator')}
                  onOpenSettings={() => navigation.navigate('CustomerSettings')}
                  onOpenPosts={() => navigation.navigate('CustomerCode')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="StaffDashboard">
              {({ navigation }) => (
                <StaffDashboardScreen
                  onBack={() => navigation.navigate('Auth')}
                  onOpenTasks={() => navigation.navigate('StaffTasks')}
                  onOpenSettings={() => navigation.navigate('StaffSettings')}
                  onOpenAmc={() => navigation.navigate('StaffAmc')}
                  onOpenComplaints={() => navigation.navigate('StaffComplaints')}
                  onOpenAnalytics={() => navigation.navigate('StaffAnalytics')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="StaffTasks">
              {({ navigation }) => (
                <StaffTasks
                  onBack={() => navigation.goBack()}
                  onOpenSteps={(booking) => {
                    setSelectedStaffBooking(booking);
                    navigation.navigate('StaffSteps');
                  }}
                  onOpenSettings={() => navigation.navigate('StaffSettings')}
                  onOpenAnalytics={() => navigation.navigate('StaffAnalytics')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="StaffSteps">
              {({ navigation }) => (
                selectedStaffBooking ? (
                  <StaffSteps
                    onBack={() => {
                      setSelectedStaffBooking(null);
                      navigation.goBack();
                    }}
                    booking={selectedStaffBooking}
                  />
                ) : null
              )}
            </Stack.Screen>
            <Stack.Screen name="StaffSettings">
              {({ navigation }) => (
                <StaffSettingsScreen
                  onBack={() => navigation.goBack()}
                  onSignOut={() => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="StaffAnalytics">
              {({ navigation }) => (
                <StaffAnalytics
                  onBack={() => navigation.goBack()}
                  onGoHome={() => navigation.navigate('StaffDashboard')}
                  onOpenTasks={() => navigation.navigate('StaffTasks')}
                  onOpenSettings={() => navigation.navigate('StaffSettings')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="StaffAmc">
              {({ navigation }) => (
                <AmcStaff onBack={() => navigation.goBack()} />
              )}
            </Stack.Screen>
            <Stack.Screen name="StaffComplaints">
              {({ navigation }) => (
                <StaffComplaints onBack={() => navigation.goBack()} />
              )}
            </Stack.Screen>
            <Stack.Screen name="AdminDashboard">
              {({ navigation }) => (
                <AdminDashboard
                  onBack={() => navigation.goBack()}
                  onOpenBookings={() => navigation.navigate('AdminBooking')}
                  onOpenStaff={() => navigation.navigate('AdminStaff')}
                  onOpenAnalytics={() => navigation.navigate('AdminAnalytics')}
                  onOpenSettings={() => navigation.navigate('AdminSettings')}
                  onOpenComplains={() => navigation.navigate('AdminComplains')}
                  onOpenAmc={() => navigation.navigate('AdminAmc')}
                  onOpenCalendar={() => navigation.navigate('AdminCalendar')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AdminBooking">
              {({ navigation }) => (
                <AdminBooking
                  onBack={() => navigation.goBack()}
                  onOpenDetail={(b) => {
                    setSelectedBooking(b);
                    navigation.navigate('BookingDetail');
                  }}
                  onGoHome={() => navigation.navigate('AdminDashboard')}
                  onOpenBookings={() => navigation.navigate('AdminBooking')}
                  onOpenStaff={() => navigation.navigate('AdminStaff')}
                  onOpenAnalytics={() => navigation.navigate('AdminAnalytics')}
                  onOpenSettings={() => navigation.navigate('AdminSettings')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AdminStaff">
              {({ navigation }) => (
                <AdminStaff
                  onBack={() => navigation.goBack()}
                  onGoHome={() => navigation.navigate('AdminDashboard')}
                  onOpenBookings={() => navigation.navigate('AdminBooking')}
                  onOpenAnalytics={() => navigation.navigate('AdminAnalytics')}
                  onOpenSettings={() => navigation.navigate('AdminSettings')}
                  onOpenStaffProfile={(staff) => {
                    setSelectedStaff(staff);
                    navigation.navigate('StaffProfile');
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="StaffProfile">
              {({ navigation }) => (
                selectedStaff ? (
                  <StaffProfileScreen
                    staff={selectedStaff}
                    onBack={() => navigation.goBack()}
                  />
                ) : null
              )}
            </Stack.Screen>
            <Stack.Screen name="AdminAnalytics">
              {({ navigation }) => (
                <AdminAnalyticsScreen
                  onBack={() => navigation.goBack()}
                  onGoHome={() => navigation.navigate('AdminDashboard')}
                  onOpenBookings={() => navigation.navigate('AdminBooking')}
                  onOpenStaff={() => navigation.navigate('AdminStaff')}
                  onOpenSettings={() => navigation.navigate('AdminSettings')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AdminSettings">
              {({ navigation }) => (
                <AdminSettingsScreen
                  onBack={() => navigation.goBack()}
                  onSignOut={() => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })}
                  onGoHome={() => navigation.navigate('AdminDashboard')}
                  onOpenBookings={() => navigation.navigate('AdminBooking')}
                  onOpenStaff={() => navigation.navigate('AdminStaff')}
                  onOpenAnalytics={() => navigation.navigate('AdminAnalytics')}
                  onOpenSettings={() => navigation.navigate('AdminSettings')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="AdminComplains">
              {({ navigation }) => (
                <ComplainsScreen onBack={() => navigation.goBack()} />
              )}
            </Stack.Screen>
            <Stack.Screen name="AdminAmc">
              {({ navigation }) => (
                <AmcPage onBack={() => navigation.goBack()} />
              )}
            </Stack.Screen>
            <Stack.Screen name="AdminCalendar">
              {({ navigation }) => (
                <AdminCalendar onBack={() => navigation.goBack()} />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}


// Onboarding screen
function OnboardingScreen({ onGetStarted }: { onGetStarted?: () => void }) {
  const handleGetStarted = React.useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        await Haptics.selectionAsync();
      }
    } catch (err) {
      // noop – haptics not supported
    }
    onGetStarted?.();
  }, [onGetStarted]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[
          '#ECECEC', // top light gray
          '#E6E6E8', // cool gray
          '#EDE5D6', // transition to warm
          '#F3DDAF', // warm beige
          '#F7CE73'  // bottom soft yellow
        ]}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradientBackground}
      >
        {/* Title block (uses Bambino-Light if available) */}
        <View style={styles.titleWrap} pointerEvents="none">
          <Image
            source={require('./assets/klordlogoblack.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.titleLine}>Solar monetary</Text>
          <Text style={styles.titleLine}>System</Text>
          <Text style={styles.subtitle}>
            Optimize energy, track performance,
            maximize solar efficiency.
          </Text>
        </View>
        {/* Hero image at bottom-right */}
        <Image
          source={require('./assets/onboardinghouse.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
        {/* Side vignettes for depth */}
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
        {/* Top fade to emulate header shadow */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.06)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topVignette}
        />


        {/* Warm bottom glow to emphasize yellow area */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(247, 206, 115, 0.65)', 'rgba(247, 206, 115, 0)']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.bottomGlow}
        />
        {/* Subtle texture overlay */}
        <View style={styles.textureOverlay} />
        <View style={styles.noiseOverlay} />


        {/* Transducer glass card overlay */}
        <TransducerCard
          style={{
            position: 'absolute',
            left: 16,
            top: '63%',
            width: '50%',
            zIndex: 10,
          }}
        >
          <View style={{ gap: 8 }}>
            <Text style={styles.transducerTitle}>Transducer</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.transducerValue}>562</Text>
              <Text style={styles.transducerSub}>Reboots</Text>
            </View>
            {/* status pills row */}
            <View style={styles.indicatorRow}>
              <View style={[styles.indicatorDot, { backgroundColor: 'rgba(255, 165, 0, 0.25)', borderColor: 'rgba(255,165,0,0.6)' }]} />
              <View style={[styles.indicatorDot, { backgroundColor: 'rgba(255, 59, 48, 0.18)', borderColor: 'rgba(255,59,48,0.55)' }]} />
              <View style={[styles.indicatorDot, { backgroundColor: 'rgba(255, 149, 0, 0.18)', borderColor: 'rgba(255,149,0,0.55)' }]} />
            </View>
          </View>
        </TransducerCard>



        {/* Liquid glass Get Started button */}
        <GlassButton
          label="Get Started"
          style={{ position: 'absolute', left: 20, right: 20, bottom: 34 }}
          onPress={handleGetStarted}
        />
      </LinearGradient>
    </View>
  );
}


// Reusable card with blurred backdrop similar to `.transducer-card`  CSS
const TransducerCard: React.FC<{ style?: any; children?: React.ReactNode }> = ({ style, children }) => (
  <BlurView intensity={20} tint="light" style={[styles.transducerCard, style]}>
    {children}
  </BlurView>
);


// Liquid glass button component
const GlassButton: React.FC<{ label: string; style?: any; onPress?: () => void }> = ({ label, style, onPress }) => (
  <BouncyPressable
    onPress={onPress}
    style={({ pressed }: { pressed: boolean }) => [
      style,
      { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.98 : 1 },
    ]}
  >
    <BlurView intensity={40} tint="light" style={styles.glassButton}>
      {/* Soft diagonal fill to simulate liquid glass */}
      <LinearGradient
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.14)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.glassButtonInner}
      >
        {/* Gloss highlight at the top */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glassButtonOverlayTop}
        />
        {/* Soft inner shadow near the bottom for depth */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.06)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glassButtonOverlayBottom}
        />
        <Text style={styles.glassButtonText}>{label}</Text>
      </LinearGradient>
    </BlurView>
  </BouncyPressable>
);


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#ECECEC',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  heroImage: {
    position: 'absolute',
    right: 0,
    bottom: -40,
    width: '100%',
    aspectRatio: 1.35,
  },
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
  bottomEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  transducerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderRadius: 15,
    padding: 20,
    // Shadows (iOS) and elevation (Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden', // to clip blur/border radius nicely
  },
  footerTitle: {
    fontSize: 16,
    letterSpacing: 0.2,
    color: 'rgba(28,28,30,0.9)',
    fontFamily: 'Sora_600SemiBold',
  },
  statusText: {
    color: 'rgba(28,28,30,0.9)',
    fontSize: 13,
    letterSpacing: 0.2,
    fontFamily: 'Manrope_600SemiBold',
  },
  transducerTitle: {
    fontSize: 16,
    color: '#222',
    fontFamily: 'Sora_600SemiBold',
  },
  transducerValue: {
    fontSize: 28,
    color: '#1a1a1a',
    lineHeight: 30,
    fontFamily: 'Sora_700Bold',
  },
  transducerSub: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.65)',
    marginBottom: 2,
    fontFamily: 'Manrope_500Medium',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  indicatorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  glassButton: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  glassButtonInner: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glassButtonOverlayTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 22,
  },
  glassButtonOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 18,
  },
  glassButtonText: {
    fontSize: 18,
    color: '#1c1c1e',
    letterSpacing: 0.2,
    fontFamily: 'Sora_600SemiBold',
  },
  helpTitle: {
    fontSize: 16,
    color: '#1c1c1e',
    letterSpacing: 0.2,
    marginBottom: 4,
    fontFamily: 'Sora_600SemiBold',
  },
  // Dashboard styles
  dashboardHeader: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dashboardTitle: {
    fontSize: 20,
    color: '#1c1c1e',
    fontFamily: 'Sora_600SemiBold',
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
  dashboardGrid: {
    padding: 20,
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dashboardCard: {
    width: '47%',
    paddingVertical: 16,
  },
  cardLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    marginBottom: 6,
    fontFamily: 'Manrope_600SemiBold',
  },
  cardValue: {
    fontSize: 22,
    color: '#1c1c1e',
    fontFamily: 'Sora_700Bold',
  },
  cardSmallText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.75)',
    alignSelf: 'center',
    fontFamily: 'Manrope_500Medium',
  },
  titleWrap: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 88,
    gap: 6,
  },
  titleLine: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 42,
    lineHeight: 46,
    color: '#2B2B2B',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(0,0,0,0.55)',
    maxWidth: '78%',
    fontFamily: 'Manrope_400Regular',
  },
  brandLogo: {
    width: 180,
    height: 120,
    marginBottom: 20,
  },
  amcTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.3,
    marginBottom: 4,
    fontFamily: 'Sora_600SemiBold',
  },
  amcSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 10,
    fontFamily: 'Manrope_500Medium',
  },
  helpButtonText: {
    fontSize: 15,
    color: '#1c1c1e',
    textTransform: 'none',
    letterSpacing: 0.3,
    fontFamily: 'Sora_600SemiBold',
  },
  amcButtonText: {
    color: '#1c1c1e',
    fontSize: 15,
    letterSpacing: 0.3,
    fontFamily: 'Sora_600SemiBold',
  },
});
