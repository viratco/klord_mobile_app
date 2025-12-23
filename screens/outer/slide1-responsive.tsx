import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

interface Slide1Props {
    onNext?: () => void;
    onBack?: () => void;
}

const Slide1: React.FC<Slide1Props> = ({ onNext, onBack }) => {
    const { width, height } = useWindowDimensions();

    // Dynamic scaling functions
    const scale = (size: number) => (width / 375) * size;
    const verticalScale = (size: number) => (height / 812) * size;
    const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <ImageBackground
                source={require('../../assets/slide1.png')}
                style={styles.background}
                resizeMode="cover"
            >
                <View style={[styles.overlay, { padding: scale(24), paddingBottom: verticalScale(64) }]}>
                    <Pressable onPress={onBack} style={[styles.backTap, { top: verticalScale(56), left: scale(24) }]} hitSlop={12}>
                        <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
                    </Pressable>
                    <View style={[
                        styles.bottomCard,
                        {
                            maxWidth: scale(320),
                            padding: scale(24),
                            paddingBottom: scale(28),
                        }
                    ]}>
                        <Text style={[styles.title, { fontSize: moderateScale(28), lineHeight: moderateScale(32) }]}>
                            {`Powering\nTomorrow\nSustainably`}
                        </Text>
                        <Text style={[styles.subtitle, { fontSize: moderateScale(13), lineHeight: moderateScale(18) }]}>
                            positive impact and potential of advancements in renewable energy technologies
                        </Text>
                        <View style={[
                            styles.ctaHolder,
                            {
                                right: scale(-79),
                                bottom: scale(-22),
                                width: scale(84 + 22),
                                height: scale(86 + 22),
                            }
                        ]}>
                            <Pressable
                                onPress={onNext}
                                style={[
                                    styles.ctaButton,
                                    {
                                        width: scale(84),
                                        height: scale(86),
                                    }
                                ]}
                                hitSlop={10}
                            >
                                <Ionicons name="arrow-forward" size={moderateScale(26)} color="#1c1c1e" />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

export default Slide1;

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1, width: '100%', height: '100%' },
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backTap: {
        position: 'absolute',
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
        width: '85%',
        minHeight: 200,
        gap: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 6,
        alignSelf: 'flex-start',
        position: 'relative',
    },
    title: { fontWeight: '800', color: '#1c1c1e', flexShrink: 1 },
    subtitle: { color: 'rgba(28,28,30,0.7)', fontWeight: '600' },
    ctaHolder: {
        position: 'absolute',
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
    },
    ctaButton: {
        borderRadius: 24,
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
