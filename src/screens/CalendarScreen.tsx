import React, { useMemo, useState } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useJournal } from '../context/JournalProvider';
import { useTodos } from '../context/TodoProvider';
import { todayISO } from '../types';
import PhotoRow from '../Components/PhotoRow';
import TodoList from '../Components/TodoList';

export default function CalendarScreen() {
  const { photos } = useJournal();
  const { todos } = useTodos();
  const [selected, setSelected] = useState<string>(todayISO());

  // Jours contenant des photos / des todos
  const photoDates = useMemo(() => new Set(photos.map(p => p.dateISO)), [photos]);
  const todoDates  = useMemo(() => new Set(todos.map(t => t.date)), [todos]);

  // Marquage "multi-dot" : bleu = photos, rouge = todos
  const marked = useMemo(() => {
    const m: Record<string, any> = {};
    photoDates.forEach(d => {
      m[d] = { ...(m[d] || {}), dots: [ ...(m[d]?.dots || []), { key: 'photos', color: '#2563eb' }] };
    });
    todoDates.forEach(d => {
      m[d] = { ...(m[d] || {}), dots: [ ...(m[d]?.dots || []), { key: 'todos', color: '#ef4444' }] };
    });
    m[selected] = { ...(m[selected] || {}), selected: true, selectedColor: '#2563eb' };
    return m;
  }, [photoDates, todoDates, selected]);

  // Liste des photos du jour sélectionné
  const list = photos.filter(p => p.dateISO === selected);

  return (
    <View style={{ flex: 1 }}>
      <Calendar
        markingType="multi-dot"
        markedDates={marked}
        onDayPress={(day) => setSelected(day.dateString)}
        theme={{ todayTextColor: '#2563eb', arrowColor: '#2563eb' }}
      />

      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <PhotoRow p={item} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <TodoList date={selected} />
            <Text style={styles.photosTitle}>Photos du {selected}</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, gap: 12, backgroundColor: '#fff' },
  photosTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 8 },
});
