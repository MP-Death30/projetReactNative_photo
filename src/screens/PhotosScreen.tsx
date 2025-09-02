import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList, StyleSheet, Alert } from 'react-native';
import { useJournal } from '../context/JournalProvider';
import PhotoRow from '../Components/PhotoRow';
import type { JournalPhoto } from '../types';

export default function PhotosScreen() {
  const { photos, removePhoto, updatePhoto } = useJournal();
  const [editing, setEditing] = useState<JournalPhoto | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const openEdit = (p: JournalPhoto) => { setEditing(p); setTitle(p.title || ''); setNote(p.note || ''); };
  const saveEdit = () => { if (editing) { updatePhoto(editing.id, { title, note }); setEditing(null); } };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={photos}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View>
            <PhotoRow p={item} onPress={() => openEdit(item)} />
            <View style={styles.rowActions}>
              <Pressable style={styles.smallBtn} onPress={() => openEdit(item)}><Text style={styles.smallBtnText}>Éditer</Text></Pressable>
              <Pressable
                style={[styles.smallBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => Alert.alert('Supprimer', 'Confirmer ?', [
                  { text: 'Annuler' },
                  { text: 'Supprimer', style: 'destructive', onPress: () => removePhoto(item.id) },
                ])}
              >
                <Text style={styles.smallBtnText}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />}
      />

      {editing && (
        <View style={styles.editor}>
          <Text style={styles.h2}>Éditer</Text>
          <Text>Titre</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} />
          <Text>Note</Text>
          <TextInput value={note} onChangeText={setNote} style={[styles.input, { height: 80 }]} multiline />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.smallBtn} onPress={() => setEditing(null)}><Text style={styles.smallBtnText}>Annuler</Text></Pressable>
            <Pressable style={[styles.smallBtn, { backgroundColor: '#10b981' }]} onPress={saveEdit}><Text style={styles.smallBtnText}>Enregistrer</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rowActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  smallBtn: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  smallBtnText: { color: 'white', fontWeight: '700' },
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, backgroundColor: 'white' },
  editor: { position:'absolute', left:0, right:0, bottom:0, backgroundColor:'white', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16, gap:8, elevation:10 }
});
