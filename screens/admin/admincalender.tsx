import React from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

function buildIsoKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

type HolidayEntry = {
  date: string;
  localName: string;
  name: string;
  type?: 'api' | 'curated';
};

type HolidayMap = Record<string, HolidayEntry>;

const curatedFestivalsByYear: Record<number, HolidayEntry[]> = {
  2024: [
    { date: '2024-01-14', localName: 'Makar Sankranti', name: 'Makar Sankranti', type: 'curated' },
    { date: '2024-01-26', localName: 'Republic Day', name: 'Republic Day', type: 'curated' },
    { date: '2024-03-08', localName: 'Maha Shivaratri', name: 'Maha Shivaratri', type: 'curated' },
    { date: '2024-03-25', localName: 'Holi', name: 'Holi', type: 'curated' },
    { date: '2024-04-09', localName: 'Ugadi / Gudi Padwa', name: 'Ugadi / Gudi Padwa', type: 'curated' },
    { date: '2024-04-14', localName: 'Vaisakhi', name: 'Vaisakhi', type: 'curated' },
    { date: '2024-08-19', localName: 'Raksha Bandhan', name: 'Raksha Bandhan', type: 'curated' },
    { date: '2024-08-26', localName: 'Janmashtami', name: 'Janmashtami', type: 'curated' },
    { date: '2024-09-15', localName: 'Onam', name: 'Onam', type: 'curated' },
    { date: '2024-10-02', localName: 'Gandhi Jayanti', name: 'Gandhi Jayanti', type: 'curated' },
    { date: '2024-10-12', localName: 'Navratri Begins', name: 'Navratri', type: 'curated' },
    { date: '2024-10-20', localName: 'Karwa Chauth', name: 'Karwa Chauth', type: 'curated' },
    { date: '2024-10-31', localName: 'Dhanteras', name: 'Dhanteras', type: 'curated' },
    { date: '2024-11-01', localName: 'Naraka Chaturdashi', name: 'Naraka Chaturdashi', type: 'curated' },
    { date: '2024-11-01', localName: 'Diwali', name: 'Diwali', type: 'curated' },
    { date: '2024-11-02', localName: 'Govardhan Puja', name: 'Govardhan Puja', type: 'curated' },
    { date: '2024-11-03', localName: 'Bhai Dooj', name: 'Bhai Dooj', type: 'curated' },
    { date: '2024-11-07', localName: 'Chhath Puja', name: 'Chhath Puja', type: 'curated' },
    { date: '2024-12-25', localName: 'Christmas', name: 'Christmas', type: 'curated' },
  ],
  2025: [
    { date: '2025-01-14', localName: 'Makar Sankranti', name: 'Makar Sankranti', type: 'curated' },
    { date: '2025-01-26', localName: 'Republic Day', name: 'Republic Day', type: 'curated' },
    { date: '2025-02-26', localName: 'Maha Shivaratri', name: 'Maha Shivaratri', type: 'curated' },
    { date: '2025-03-14', localName: 'Holi', name: 'Holi', type: 'curated' },
    { date: '2025-03-30', localName: 'Ugadi / Gudi Padwa', name: 'Ugadi / Gudi Padwa', type: 'curated' },
    { date: '2025-04-13', localName: 'Vaisakhi', name: 'Vaisakhi', type: 'curated' },
    { date: '2025-08-09', localName: 'Raksha Bandhan', name: 'Raksha Bandhan', type: 'curated' },
    { date: '2025-08-16', localName: 'Janmashtami', name: 'Janmashtami', type: 'curated' },
    { date: '2025-09-05', localName: 'Onam', name: 'Onam', type: 'curated' },
    { date: '2025-10-02', localName: 'Gandhi Jayanti', name: 'Gandhi Jayanti', type: 'curated' },
    { date: '2025-09-22', localName: 'Navratri Begins', name: 'Navratri', type: 'curated' },
    { date: '2025-10-09', localName: 'Karwa Chauth', name: 'Karwa Chauth', type: 'curated' },
    { date: '2025-10-19', localName: 'Dhanteras', name: 'Dhanteras', type: 'curated' },
    { date: '2025-10-20', localName: 'Diwali', name: 'Diwali', type: 'curated' },
    { date: '2025-10-21', localName: 'Govardhan Puja', name: 'Govardhan Puja', type: 'curated' },
    { date: '2025-10-22', localName: 'Bhai Dooj', name: 'Bhai Dooj', type: 'curated' },
    { date: '2025-10-29', localName: 'Chhath Puja', name: 'Chhath Puja', type: 'curated' },
    { date: '2025-12-25', localName: 'Christmas', name: 'Christmas', type: 'curated' },
  ],
};

export default function AdminCalendar({ onBack }: { onBack?: () => void }) {
  const today = React.useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), date: now.getDate() };
  }, []);

  const [currentMonth, setCurrentMonth] = React.useState(() => new Date(today.year, today.month, 1));
  const [holidayMap, setHolidayMap] = React.useState<HolidayMap>({});
  const [holidayError, setHolidayError] = React.useState<string | null>(null);
  const [loadingHolidays, setLoadingHolidays] = React.useState(false);
  const fetchedYearsRef = React.useRef<Set<number>>(new Set());

  React.useEffect(() => {
    const year = currentMonth.getFullYear();
    const curated = curatedFestivalsByYear[year] ?? [];
    setHolidayMap((prev) => {
      const next = { ...prev } as HolidayMap;
      curated.forEach((entry) => {
        next[entry.date] = entry;
      });
      return next;
    });

    if (fetchedYearsRef.current.has(year)) {
      return;
    }

    let cancelled = false;
    const loadHolidays = async () => {
      try {
        setLoadingHolidays(true);
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`, {
          headers: {
            Accept: 'application/json',
          },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to load Indian holidays');
        }
        const payload = await res.text();
        let data: HolidayEntry[] = [];
        try {
          data = payload ? JSON.parse(payload) : [];
        } catch {
          throw new Error('Holiday service returned unexpected data');
        }
        if (cancelled) return;
        setHolidayMap((prev) => {
          const next = { ...prev } as HolidayMap;
          data.forEach((item) => {
            if (item?.date) next[item.date] = { ...item, type: 'api' };
          });
          return next;
        });
        fetchedYearsRef.current.add(year);
        setHolidayError(null);
      } catch (err: any) {
        if (cancelled) return;
        setHolidayError(err?.message || 'Failed to load festivals');
      } finally {
        if (!cancelled) setLoadingHolidays(false);
      }
    };

    loadHolidays();
    return () => {
      cancelled = true;
    };
  }, [currentMonth]);

  const calendarMatrix = React.useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const rows: { key: string; cells: { key: string; label: string; inMonth: boolean; isToday: boolean; isFestival: boolean }[] }[] = [];
    let currentDay = 1;
    let nextMonthDay = 1;
    for (let week = 0; week < 6; week++) {
      const cells = [];
      for (let weekday = 0; weekday < 7; weekday++) {
        const cellIndex = week * 7 + weekday;
        if (cellIndex < firstWeekday) {
          const dateNum = prevMonthDays - (firstWeekday - cellIndex - 1);
          cells.push({
            key: `prev-${week}-${weekday}`,
            label: String(dateNum),
            inMonth: false,
            isToday: false,
            isFestival: false,
          });
        } else if (currentDay <= daysInMonth) {
          const isToday = today.year === year && today.month === month && today.date === currentDay;
          const holidayEntry = holidayMap[buildIsoKey(year, month, currentDay)];
          const isFestival = Boolean(holidayEntry);
          cells.push({
            key: `current-${week}-${weekday}`,
            label: String(currentDay),
            inMonth: true,
            isToday,
            isFestival,
          });
          currentDay++;
        } else {
          cells.push({
            key: `next-${week}-${weekday}`,
            label: String(nextMonthDay++),
            inMonth: false,
            isToday: false,
            isFestival: false,
          });
        }
      }
      rows.push({ key: `week-${week}`, cells });
      if (currentDay > daysInMonth) break;
    }
    return rows;
  }, [currentMonth, holidayMap, today]);

  const monthLabel = React.useMemo(() => currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), [currentMonth]);

  const goPrev = React.useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goNext = React.useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const weekdayLabels = React.useMemo(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], []);

  const holidaysForCurrentMonth = React.useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return Object.values(holidayMap)
      .filter((holiday) => holiday.date.startsWith(prefix))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [currentMonth, holidayMap]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#ECECEC', '#E6E6E8', '#EDE5D6', '#F3DDAF', '#F7CE73']}
        locations={[0, 0.18, 0.46, 0.74, 1]}
        start={{ x: 0.0, y: 0.1 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} style={styles.backPill} hitSlop={10}>
              <Ionicons name="arrow-back" size={20} color="#1c1c1e" />
            </Pressable>
            <Pressable onPress={goPrev} style={styles.navPill} hitSlop={10}>
              <Ionicons name="chevron-back" size={18} color="#1c1c1e" />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={goNext} style={styles.navPill} hitSlop={10}>
              <Ionicons name="chevron-forward" size={18} color="#1c1c1e" />
            </Pressable>
          </View>

          <View style={styles.calendarBoard}>
            <View style={styles.weekdayRow}>
              {weekdayLabels.map((label) => (
                <Text key={label} style={styles.weekdayLabel}>{label}</Text>
              ))}
            </View>
            {calendarMatrix.map((week) => (
              <View key={week.key} style={styles.weekRow}>
                {week.cells.map((cell) => {
                  const cellStyle = [styles.dayCell, !cell.inMonth && styles.dayCellMuted];
                  const pillStyle = [
                    styles.dayPill,
                    cell.isToday && styles.dayPillToday,
                    !cell.isToday && cell.isFestival && styles.dayPillFestival,
                  ];
                  const labelStyle = [
                    styles.dayLabel,
                    cell.isToday && styles.dayLabelOnDark,
                    !cell.isToday && cell.isFestival && styles.dayLabelOnFestival,
                  ];
                  return (
                    <View key={cell.key} style={cellStyle}>
                      <View style={pillStyle}>
                        <Text style={labelStyle}>{cell.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.holidayStatusRow}>
            {loadingHolidays ? (
              <View style={styles.holidayStatusInline}>
                <ActivityIndicator size="small" color="#1c1c1e" />
                <Text style={styles.holidayStatusText}>Fetching Indian festivals…</Text>
              </View>
            ) : holidayError ? (
              <Text style={styles.holidayStatusError}>{holidayError}</Text>
            ) : (
              <Text style={styles.holidayStatusText}>Indian public holidays are highlighted in yellow.</Text>
            )}
          </View>

          {holidaysForCurrentMonth.length ? (
            <ScrollView style={styles.holidayList} contentContainerStyle={styles.holidayListContent} showsVerticalScrollIndicator={false}>
              {holidaysForCurrentMonth.map((holiday) => (
                <View key={holiday.date} style={styles.holidayItem}>
                  <View style={[styles.holidayDot, holiday.type === 'curated' && styles.holidayDotCurated]} />
                  <Text style={styles.holidayDate}>{holiday.date}</Text>
                  <Text style={styles.holidayName} numberOfLines={1}>{holiday.localName || holiday.name}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 26,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  navPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1e',
    letterSpacing: 0.2,
  },
  calendarBoard: {
    flex: 1,
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    gap: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(28,28,30,0.55)',
    letterSpacing: 0.4,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayCell: {
    width: 36,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellMuted: {
    opacity: 0.35,
  },
  dayPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillToday: {
    backgroundColor: '#1c1c1e',
  },
  dayPillFestival: {
    backgroundColor: '#F5CE57',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  dayLabelOnDark: {
    color: '#FFFFFF',
  },
  dayLabelOnFestival: {
    color: '#1c1c1e',
  },
  holidayStatusRow: {
    minHeight: 36,
    justifyContent: 'center',
  },
  holidayStatusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holidayStatusText: {
    fontSize: 12,
    color: 'rgba(28,28,30,0.65)',
  },
  holidayStatusError: {
    fontSize: 12,
    color: '#FF3B30',
  },
  holidayList: {
    maxHeight: 160,
  },
  holidayListContent: {
    gap: 10,
    paddingBottom: 4,
  },
  holidayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  holidayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F5CE57',
  },
  holidayDotCurated: {
    backgroundColor: '#1c1c1e',
  },
  holidayDate: {
    width: 78,
    fontSize: 13,
    color: 'rgba(28,28,30,0.75)',
    fontWeight: '600',
  },
  holidayName: {
    flex: 1,
    fontSize: 13,
    color: '#1c1c1e',
  },
});
