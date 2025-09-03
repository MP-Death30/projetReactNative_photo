import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList, StyleSheet, Alert } from 'react-native';
import PhotoRow from '../Components/PhotoRow';
import { JournalPhoto } from '../types';
import { useJournal } from '../context/JournalProvider';
import { globalStyles, spacing, colors, borderRadius } from '../styles/globalStyles';

export default function PhotosScreen() {
  const { photos, removePhoto, updatePhoto } = useJournal();
  const [editing, setEditing] = useState<JournalPhoto | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const openEdit = (p: JournalPhoto) => { setEditing(p); setTitle(p.title || ''); setNote(p.note || ''); };
  const saveEdit = () => { if (!editing) return; updatePhoto(editing.id, { title, note }); setEditing(null); };
  const confirmRemove = (id: string) => { Alert.alert('Supprimer', 'Confirmer ?', [{ text: 'Annuler' }, { text: 'Supprimer', style: 'destructive', onPress: () => removePhoto(id) }]); };

  return (
    <View style={globalStyles.container}>
      <FlatList
        data={photos}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View>
            <PhotoRow p={item} onPress={() => openEdit(item)} />
            <View style={styles.rowActions}>
              <Pressable style={styles.smallBtn} onPress={() => openEdit(item)}>
                <Text style={styles.smallBtnText}>Éditer</Text>
              </Pressable>
              <Pressable style={[styles.smallBtn, { backgroundColor: colors.danger }]} onPress={() => confirmRemove(item.id)}>
                <Text style={styles.smallBtnText}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#e5e7eb' }} />}
      />

      {editing && (
        <View style={styles.editor}>
          <Text style={globalStyles.h2}>Éditer</Text>
          <Text>Titre</Text>
          <TextInput value={title} onChangeText={setTitle} style={globalStyles.input} />
          <Text>Note</Text>
          <TextInput value={note} onChangeText={setNote} style={[globalStyles.input, { height: 80 }]} multiline />
          <View style={{ flexDirection: 'row', gap: spacing.s }}>
            <Pressable style={styles.smallBtn} onPress={() => setEditing(null)}>
              <Text style={styles.smallBtnText}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, { backgroundColor: colors.success }]} onPress={saveEdit}>
              <Text style={styles.smallBtnText}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rowActions: { flexDirection: 'row', gap: spacing.s, paddingHorizontal: spacing.m, paddingBottom: spacing.m },
  smallBtn: { backgroundColor: colors.dark, paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: borderRadius.m },
  smallBtnText: { color: colors.white, fontWeight: '700' },
  editor: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopLeftRadius: borderRadius.l, borderTopRightRadius: borderRadius.l, padding: spacing.m, gap: spacing.s, elevation: 10 },
});
