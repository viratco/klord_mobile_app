import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

interface Slide2Props {
  onNext?: () => void;
  onBack?: () => void;
}

const Slide2: React.FC<Slide2Props> = ({ onNext, onBack }) => {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ImageBackground
        source={require('../../assets/slide2.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <Pressable onPress={onBack} style={styles.backTap} hitSlop={12}>
            <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
          </Pressable>
          <View style={styles.bottomCard}>
            <Text style={styles.title}>{`Paving the way for\na brighter, cleaner\nfuture`}</Text>
            <Text style={styles.subtitle}>positive impact and potential of advancements in renewable energy technologies</Text>
            <View style={styles.ctaHolder}>
              <Pressable onPress={onNext} style={styles.ctaButton} hitSlop={10}>
                <Ionicons name="arrow-forward" size={26} color="#1c1c1e" />
              </Pressable>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default Slide2;

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, justifyContent: 'flex-end', padding: 24, paddingBottom: 64 },
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
  title: { fontSize: 24, fontWeight: '800', color: '#1c1c1e', lineHeight: 30, maxWidth: 220, flexShrink: 1 },
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
