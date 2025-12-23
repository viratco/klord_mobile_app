import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuthToken } from '../../utils/auth';
import { triggerPressHaptic } from '../../utils/haptics';
import { fetchWithCache, getCachedValue, invalidateCache } from '../../utils/cache';

export default function Bookings({ onBack, onOpenDetail, onOpenCalculator, onOpenSettings, onOpenPosts, onOpenBookings }: { onBack?: () => void; onOpenDetail?: (b: any) => void; onOpenCalculator?: () => void; onOpenSettings?: () => void; onOpenPosts?: () => void; onOpenBookings?: () => void }) {
  const [items, setItems] = React.useState<any[] | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

  const load = React.useCallback(async (options?: { force?: boolean }) => {
    let cached: any[] | undefined;
    try {
      setError(null);
      if (!BASE_URL) {
        setError('Missing EXPO_PUBLIC_API_BASE_URL');
        setItems([]);
        return;
      }
      const cacheKey = `${BASE_URL}/api/customer/leads`;
      if (options?.force) {
        invalidateCache(cacheKey);
      }
      cached = getCachedValue<any[]>(cacheKey);
      if (cached) {
        setItems(cached);
      }
      setLoading(!cached);

      const data = await fetchWithCache(cacheKey, async () => {
        const token = await getAuthToken();
        const res = await fetch(cacheKey, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(t || `Request failed with ${res.status}`);
        }
        const json = await res.json();
        console.log('[Bookings] API Response:', json);
        console.log('[Bookings] Is Array:', Array.isArray(json));
        console.log('[Bookings] Length:', Array.isArray(json) ? json.length : 'N/A');
        return Array.isArray(json) ? json : [];
      }, { ttlMs: 120_000 });

      console.log('[Bookings] Final data:', data);
      console.log('[Bookings] Setting items with length:', Array.isArray(data) ? data.length : 'N/A');
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('[Bookings] Error:', e);
      setError(e?.message || 'Failed to load bookings');
      if (!cached) {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [BASE_URL]);

  React.useEffect(() => {
    load();
  }, [load]);

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
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={8}>
              <BlurView intensity={24} tint="light" style={styles.glassBackPill}>
                <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
              </BlurView>
            </Pressable>
            <Text style={styles.titleMain}>Bookings</Text>
          </View>

          {/* Dynamic bookings list */}
          <View style={styles.contentBox}>
            {loading && (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#1c1c1e" />
                <Text style={{ marginTop: 8, color: 'rgba(0,0,0,0.65)' }}>Loading...</Text>
              </View>
            )}
            {!!error && !loading && (
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ color: '#b00020' }}>{error}</Text>
                <Pressable onPress={() => load({ force: true })} style={{ marginTop: 10 }}>
                  <Text style={{ color: '#1c1c1e', fontWeight: '700' }}>Retry</Text>
                </Pressable>
              </View>
            )}

            {!loading && !error && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces
                contentContainerStyle={{ paddingBottom: 220 }}
              >
                {(items || []).map((it) => (
                  <BlurView key={it.id} intensity={28} tint="light" style={[styles.glassPanel, { marginBottom: 16 }]}>
                    {/* Top gloss highlight */}
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0)']}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                    />

                    {/* Row */}
                    <Pressable
                      style={styles.panelRow}
                      onPress={() => onOpenDetail && onOpenDetail({ id: it.id, name: it.fullName || 'Customer', role: it.projectType || 'Project', percent: typeof it.percent === 'number' ? it.percent : 0 })}
                    >
                      <Ionicons name="person-circle" size={44} color="#ccc" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.panelName}>{it.fullName || 'Customer'}</Text>
                        <Text style={styles.panelSubtitle}>{it.projectType || 'Project'} • {it.city || ''}{it.state ? `, ${it.state}` : ''}</Text>
                      </View>
                      <View style={styles.actionCol}>
                        <View style={styles.arrowCircle}>
                          <Ionicons name="arrow-forward" size={24} color="#1c1c1e" style={styles.arrowNE} />
                        </View>
                        <View style={styles.callCircle}>
                          <Ionicons name="call" size={24} color="#1c1c1e" />
                        </View>
                      </View>
                    </Pressable>

                    {/* Percent and progress */}
                    <Text style={styles.matchText}>{`${typeof it.percent === 'number' ? it.percent : 0}% Completed`}</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, typeof it.percent === 'number' ? it.percent : 0))}%` }]} />
                      <LinearGradient
                        colors={["#e6e6e6", "#f2f2f2"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.progressCap}
                      />
                    </View>

                    {/* Subtle inner shadow at bottom */}
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.06)']}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.innerShadowBottom}
                    />
                  </BlurView>
                ))}

                {items && items.length === 0 && (
                  <View style={{ paddingVertical: 24 }}>
                    <Text style={{ color: 'rgba(0,0,0,0.65)' }}>No bookings found yet.</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>

        {/* Bottom navigation */}
        <BottomNav
          onGoHome={onBack}
          onOpenBookings={onOpenBookings}
          onOpenCalculator={onOpenCalculator}
          onOpenSettings={onOpenSettings}
          onOpenPosts={onOpenPosts}
        />
      </LinearGradient>
    </View>
  );
}

function BottomNav({
  onGoHome,
  onOpenBookings,
  onOpenCalculator,
  onOpenSettings,
  onOpenPosts,
}: {
  onGoHome?: () => void;
  onOpenBookings?: () => void;
  onOpenCalculator?: () => void;
  onOpenSettings?: () => void;
  onOpenPosts?: () => void;
}) {
  const [active, setActive] = React.useState<'home' | 'roofs' | 'calculator' | 'posts' | 'settings'>('roofs');

  const Item = ({ id, icon, label }: { id: typeof active; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
    const isActive = active === id;
    const isCalculator = id === 'calculator';
    const buttonStyles = [
      styles.navButton,
      isCalculator ? styles.navButtonCalculator : (isActive ? styles.navButtonActive : styles.navButtonInactive),
    ];
    const iconColor = isCalculator ? '#1c1c1e' : (isActive ? '#1c1c1e' : 'rgba(255,255,255,0.95)');

    const handlePress = () => {
      void triggerPressHaptic();
      setActive(id);
      if (id === 'home') onGoHome?.();
      if (id === 'roofs') onOpenBookings?.();
      if (id === 'calculator') onOpenCalculator?.();
      if (id === 'posts') onOpenPosts?.();
      if (id === 'settings') onOpenSettings?.();
    };

    return (
      <Pressable onPress={handlePress} style={styles.navItem} hitSlop={10}>
        <View style={buttonStyles}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <Text style={styles.navLabelHidden}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.bottomNavWrap}>
      <BlurView intensity={28} tint="dark" style={styles.bottomNav}>
        <Item id="home" icon="home-outline" label="Home" />
        <Item id="roofs" icon="grid-outline" label="Bookings" />
        <Item id="calculator" icon="calculator-outline" label="Calculator" />
        <Item id="posts" icon="reader-outline" label="Posts" />
        <Item id="settings" icon="settings-outline" label="Settings" />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F6' },
  gradientBackground: { flex: 1, width: '100%', height: '100%' },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleMain: { fontSize: 22, fontWeight: '700', color: '#1c1c1e', marginTop: 20 },
  glassBackPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    overflow: 'hidden',
  },
  contentBox: { paddingHorizontal: 20, marginTop: 20 },
  glassPanel: {
    height: 170,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  panelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  panelName: {
    fontSize: 16,
    color: '#1c1c1e',
    fontWeight: '700',
    fontFamily: 'Lato-Thin',
  },
  panelSubtitle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.75)',
    marginTop: 2,
    fontFamily: 'Lato-Thin',
  },
  arrowCircle: {
    width: 52,
    height: 52,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  arrowNE: {
    transform: [{ rotate: '-45deg' }],
  },
  actionCol: {
    position: 'absolute',
    right: 16,
    top: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  matchText: {
    marginTop: 34,
    paddingHorizontal: 16,
    color: '#1c1c1e',
    fontSize: 14,
    fontFamily: 'Lato-Thin',
  },
  progressTrack: {
    marginTop: 12,
    marginLeft: 16,
    height: 8,
    width: '70%',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressFill: {
    height: '100%',
    width: '56%',
    backgroundColor: '#000000',
  },
  progressCap: {
    height: '0%',
    width: 34,
  },
  callCircle: {
    width: 52,
    height: 52,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  glossTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 22,
  },
  innerShadowBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 18,
  },

  // Bottom nav (consistent with other pages)
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    height: 72,
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 26,
    elevation: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 50,
    maxWidth: 70,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  navButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.26)',
  },
  navButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.32)',
  },
  navButtonCalculator: {
    backgroundColor: '#F7CE73',
    borderColor: '#F5C957',
  },
  navLabelHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
  safeArea: { flex: 1 },
});

