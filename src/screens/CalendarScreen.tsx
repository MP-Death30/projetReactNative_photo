import React, { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useJournal } from '../context/JournalProvider';
import { todayISO } from '../types';
import PhotoRow from '../Components/PhotoRow';
import { globalStyles, colors } from '../styles/globalStyles';

export default function CalendarScreen() {
  const { photos } = useJournal();
  const [selected, setSelected] = useState<string>(todayISO());

  const datesWith = useMemo(() => new Set(photos.map(p => p.dateISO)), [photos]);
  const marked = useMemo(() => {
    const m: Record<string, any> = {};
    datesWith.forEach(d => (m[d] = { marked: true, dotColor: colors.primary }));
    m[selected] = { ...(m[selected] || {}), selected: true, selectedColor: colors.primary };
    return m;
  }, [datesWith, selected]);

  const list = photos.filter(p => p.dateISO === selected);

  return (
    <View style={globalStyles.container}>
      <Calendar markedDates={marked} onDayPress={day => setSelected(day.dateString)} theme={{ todayTextColor: colors.primary }} />
      <FlatList data={list} keyExtractor={i => i.id} renderItem={({ item }) => <PhotoRow p={item} />} />
    </View>
  );
}
