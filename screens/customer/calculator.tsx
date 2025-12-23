import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Pressable, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

export default function Calculator({ onBack, onSelect }: { onBack?: () => void; onSelect?: (c: any) => void }) {
  const [selectedCategory, setSelectedCategory] = React.useState<'industrial' | 'residential' | 'commercial' | 'ground'>('industrial');

  const getCategoryImage = (category: typeof selectedCategory) => {
    switch (category) {
      case 'industrial': return require('../../assets/industory.jpeg');
      case 'residential': return require('../../assets/reseidency.jpeg');
      case 'commercial': return require('../../assets/commercial.jpeg');
      case 'ground': return require('../../assets/ground.jpeg');
      default: return require('../../assets/industory.jpeg');
    }
  };

  const getCategoryTitle = (category: typeof selectedCategory) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ImageBackground source={getCategoryImage(selectedCategory)} style={styles.gradientBackground} resizeMode="cover">
        {/* Optional subtle warm overlay to keep branding; remove if not desired */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(236,236,236,0.00)',
            'rgba(230,230,232,0.00)',
            'rgba(237,229,214,0.08)',
            'rgba(243,221,175,0.14)',
            'rgba(247,206,115,0.18)',
          ]}
          locations={[0, 0.18, 0.46, 0.74, 1]}
          start={{ x: 0.0, y: 0.1 }}
          end={{ x: 1.0, y: 1.0 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}> 
          {/* Industrial info card */}
          <View style={styles.infoCardWrap}>
            <BlurView intensity={32} tint="light" style={styles.infoCard}>
              <LinearGradient
                colors={["rgba(255,255,255,0.40)", "rgba(255,255,255,0.15)"]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Top gloss highlight */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0.60)', 'rgba(255,255,255,0.20)', 'rgba(255,255,255,0)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.glossTop}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="business-outline" size={24} color="#1c1c1e" />
                <Text style={styles.infoTitle}>{getCategoryTitle(selectedCategory)}</Text>
              </View>
              {/* <Image source={getCategoryImage(selectedCategory)} style={styles.categoryImage} resizeMode="cover" /> */}
              <Text style={styles.infoText} numberOfLines={3} ellipsizeMode="tail">
                {selectedCategory === 'industrial' ? 'Industrial solar panel systems are designed for large-scale energy production, featuring high-efficiency photovoltaic modules that can generate substantial power for manufacturing facilities, warehouses, and commercial operations. These robust systems offer significant cost savings, reduced carbon footprint, and long-term energy independence for industrial applications.' :
                 selectedCategory === 'residential' ? 'Residential solar panel systems are ideal for homeowners looking to reduce electricity bills and contribute to environmental sustainability. These systems are designed to fit seamlessly on rooftops, providing clean energy for daily household needs while increasing property value.' :
                 selectedCategory === 'commercial' ? 'Commercial solar installations cater to businesses, offices, and retail spaces, offering scalable solutions that lower operational costs and demonstrate corporate responsibility. With customizable designs, these systems maximize energy output in urban environments.' :
                 'Ground-mounted solar systems are perfect for large open areas, providing high-capacity energy generation without the constraints of rooftop installations. These systems are highly efficient and ideal for agricultural, industrial, or community-scale projects.'}
              </Text>
            </BlurView>
          </View>

          {/* Back button above selector */}
          <View style={[styles.backRow, { paddingTop: 0, paddingBottom: 12 }]}>
            <Pressable onPress={onBack} hitSlop={8} style={styles.backPressable}>
              <BlurView intensity={24} tint="light" style={styles.glassBackPill}>
                <Ionicons name="arrow-back" size={18} color="#1c1c1e" />
                <Text style={styles.backText}>Back</Text>
              </BlurView>
            </Pressable>
          </View>

          {/* Slideshow selector */}
          <SlideShowSelector onSelectionChange={setSelectedCategory} />

          {/* Bottom translucent oval button */}
          <View style={styles.bottomButtonWrap}>
            <Pressable style={styles.bottomButton} onPress={() => onSelect && onSelect(selectedCategory)}>
              <LinearGradient
                colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0.18)"]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.bottomButtonInner}
              >
                <Text style={styles.bottomButtonText}>select this</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

function SlideShowSelector({ onSelectionChange }: { onSelectionChange?: (selected: 'industrial' | 'residential' | 'commercial' | 'ground') => void }) {
  const [selected, setSelected] = React.useState<'industrial' | 'residential' | 'commercial' | 'ground'>('industrial');
  const items: { id: typeof selected; label: string }[] = [
    { id: 'industrial', label: 'Industrial' },
    { id: 'residential', label: 'Residential' },
    { id: 'commercial', label: 'Commercial' },
    { id: 'ground', label: 'Ground Mounted' },
  ];

  const handleSelect = (id: typeof selected) => {
    setSelected(id);
    onSelectionChange && onSelectionChange(id);
  };

  return (
    <View style={styles.sliderWrap}>
      <BlurView intensity={28} tint="light" style={styles.sliderParent}>
        <LinearGradient
          colors={["rgba(255,255,255,0.40)", "rgba(255,255,255,0.15)"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sliderContent}>
          {items.map((it) => {
            const active = selected === it.id;
            return (
              <Pressable key={it.id} onPress={() => handleSelect(it.id)} style={styles.sliderItem}>
                <View style={[styles.gridButton, active && styles.gridButtonActive]}>
                  <Text style={[styles.gridText, active && styles.gridTextActive]}>{it.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  backRow: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glassBackPill: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
  },
  backText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1c1e',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F4F4F6',
  },
  infoCardWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100, // Space for bottom button
  },
  infoCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  glossTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 28,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1c1c1e',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  categoryImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginVertical: 16,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(0,0,0,0.8)',
    fontWeight: '400',
  },
  sliderWrap: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 70,
  },
  sliderParent: {
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  sliderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  sliderItem: {
    width: '48%',
    marginBottom: 6,
  },
  gridButton: {
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'transparent'
  },
  gridButtonActive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.85)'
  },
  gridText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.85)'
  },
  gridTextActive: {
    color: '#1c1c1e',
    fontWeight: '700'
  },
  bottomButtonWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
  },
  bottomButton: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.25)'
  },
  bottomButtonInner: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1e',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
});

