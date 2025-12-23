import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

interface Slide4Props {
  onNext?: () => void;
  onBack?: () => void;
}

const Slide4: React.FC<Slide4Props> = ({ onNext, onBack }) => {
  React.useEffect(() => {
    const source = Image.resolveAssetSource(require('../../assets/slide4.jpg'));
    if (source?.uri) {
      void Image.prefetch(source.uri);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ImageBackground
        source={require('../../assets/slide4.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <Image source={require('../../assets/klordlogoblack.png')} style={styles.logo} resizeMode="contain" />
          <Pressable onPress={onBack} style={styles.backTap} hitSlop={12}>
            <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
          </Pressable>
          <View style={styles.bottomCard}>
            <Text style={styles.title}>{`Join the\nSolar Movement`}</Text>
            <Text style={styles.subtitle}>Step into a cleaner future, powered by intelligent solar experiences tailored for you.</Text>
            <View style={styles.ctaHolder}>
              <Pressable onPress={onNext} style={styles.ctaButton} hitSlop={10}>
                <Ionicons name="arrow-forward" size={22} color="#1c1c1e" />
              </Pressable>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default Slide4;

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, justifyContent: 'flex-end', padding: 24, paddingBottom: 64 },
  logo: {
    position: 'absolute',
    top: 108,
    left: 24,
    width: 104,
    height: 32,
  },
  backTap: {
    position: 'absolute',
    top: 56,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    maxWidth: 320,
    width: '85%',
    minHeight: 200,
    padding: 24,
    paddingBottom: 28,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    alignSelf: 'flex-start',
    position: 'relative',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1c1c1e', lineHeight: 30, maxWidth: 220 },
  subtitle: { fontSize: 13, lineHeight: 18, color: 'rgba(28,28,30,0.7)', fontWeight: '600', maxWidth: 210 },
  ctaHolder: {
    position: 'absolute',
    right: -30,
    bottom: -15,
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5B422',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
});
