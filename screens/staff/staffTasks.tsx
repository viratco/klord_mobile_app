import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../../utils/config';
import { getAuthToken } from '../../utils/auth';
import { triggerPressHaptic } from '../../utils/haptics';

export default function StaffTasks({ onBack, onOpenSteps, onOpenSettings, onOpenAnalytics }: { onBack?: () => void; onOpenSteps?: (booking: any) => void; onOpenSettings?: () => void; onOpenAnalytics?: () => void }) {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  const fetchMyLeads = React.useCallback(async () => {
    try {
      if (!items.length) setLoading(true);
      const token = await getAuthToken();
      const resp = await fetch(`${BASE_URL}/api/staff/my-leads`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[staffTasks] fetch failed', (e as any)?.message || e);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [items.length]);

  React.useEffect(() => {
    fetchMyLeads();
  }, [fetchMyLeads]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchMyLeads();
  }, [fetchMyLeads]);

  const computeProgress = (lead: any): { completed: number; total: number } => {
    const steps = Array.isArray(lead?.steps) ? lead.steps : [];
    const total = steps.length || 12;
    const completed = steps.filter((s: any) => !!s?.completed).length;
    return { completed, total };
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[ '#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73' ]}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradient}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.backPill}>
              <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
            </Pressable>
            <Text style={styles.title}>My Tasks</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1c1c1e" /> }>
            {loading ? (
              <View style={styles.infoBox}><Text style={styles.infoText}>Loading assigned tasks...</Text></View>
            ) : items.length === 0 ? (
              <View style={styles.infoBox}><Text style={styles.infoText}>No tasks assigned yet.</Text></View>
            ) : (
              items.map((lead) => {
                const { completed, total } = computeProgress(lead);
                const pct = Math.round((completed / Math.max(1, total)) * 100);
                return (
                  <Pressable 
                    key={lead.id} 
                    style={styles.taskCard}
                    onPress={() => onOpenSteps?.(lead)}
                  >
                    <View style={styles.taskIcon}><Ionicons name="construct-outline" size={18} color="#1c1c1e" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle}>{lead.fullName || 'Customer'} • {lead.projectType || 'Project'}</Text>
                      <Text style={styles.taskMeta}>{[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}</Text>
                      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(8, pct)}%` }]} /></View>
                      <Text style={styles.progressLabel}>{completed} of {total} steps completed</Text>
                    </View>
                    <View style={styles.statusPill}><Text style={styles.statusText}>{pct >= 100 ? 'Completed' : 'In Progress'}</Text></View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Bottom navigation */}
          <BottomNav onGoHome={onBack} onOpenSettings={onOpenSettings} onOpenAnalytics={onOpenAnalytics} />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function BottomNav({ onGoHome, onOpenSettings, onOpenAnalytics }: { onGoHome?: () => void; onOpenSettings?: () => void; onOpenAnalytics?: () => void }) {
  const [active, setActive] = React.useState<'home' | 'tasks' | 'analytics' | 'settings'>('tasks');

  const Item = ({ id, icon, label }: { id: typeof active; icon: keyof typeof Ionicons.glyphMap; label: string }) => {
    const isActive = active === id;
    const buttonStyles = [styles.navButton, isActive ? styles.navButtonActive : styles.navButtonInactive];
    const iconColor = isActive ? '#1c1c1e' : 'rgba(255,255,255,0.95)';

    const handlePress = () => {
      void triggerPressHaptic();
      setActive(id);
      if (id === 'home') onGoHome?.();
      if (id === 'analytics') onOpenAnalytics?.();
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
        <Item id="tasks" icon="list-outline" label="Tasks" />
        <Item id="analytics" icon="stats-chart-outline" label="Analytics" />
        <Item id="settings" icon="settings-outline" label="Settings" />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F6' },
  gradient: { flex: 1, width: '100%', height: '100%' },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)'
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1c1c1e' },
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 14 },
  infoBox: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  infoText: { fontSize: 14, color: 'rgba(28,28,30,0.7)', fontWeight: '600' },
  taskCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 18, minHeight: 96, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  taskIcon: { width: 40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center', backgroundColor:'#F5CE57', borderWidth:1, borderColor:'rgba(0,0,0,0.15)' },
  taskTitle: { fontSize: 14, fontWeight: '700', color: '#1c1c1e' },
  taskMeta: { fontSize: 12, color: 'rgba(0,0,0,0.6)', marginTop: 2 },
  statusPill: { paddingHorizontal: 12, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'rgba(76, 217, 100, 0.18)', borderColor: 'rgba(76, 217, 100, 0.45)' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#1c1c1e' },
  progressTrack: { height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#F5CE57' },
  progressLabel: { marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.65)', fontWeight: '600' },
  // Bottom nav styles (glass-pill)
  bottomNavWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 24,
    paddingHorizontal: 16, paddingBottom: 0,
  },
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '94%', height: 72, backgroundColor: 'transparent', borderRadius: 999, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.35, shadowRadius: 26, elevation: 16, overflow: 'hidden', alignSelf: 'center'
  },
  navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
  navButton: {
    width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  navButtonInactive: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.26)' },
  navButtonActive: { backgroundColor: '#FFFFFF', borderColor: 'rgba(255,255,255,0.32)' },
  navLabelHidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});

