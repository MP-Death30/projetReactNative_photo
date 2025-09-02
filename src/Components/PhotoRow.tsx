import React from 'react';
import { View, Image, Text, Pressable, StyleSheet } from 'react-native';
import type { JournalPhoto } from '../types';

export default function PhotoRow({ p, onPress }: { p: JournalPhoto; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Image source={{ uri: p.uri }} style={styles.thumb} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{p.title || 'Sans titre'}</Text>
        <Text style={styles.rowSub}>
          {new Date(p.timestamp).toLocaleString()}
          {p.locationName ? ` — ${p.locationName}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center' },
  thumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#eee' },
  rowTitle: { fontWeight: '700', fontSize: 16 },
  rowSub: { color: '#6b7280', marginTop: 2 },
});
