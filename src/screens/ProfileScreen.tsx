import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, Image, Pressable, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useJournal } from '../context/JournalProvider';
import DefaultAvatar from '../../assets/default-avatar.png';

export default function ProfileScreen() {
  const { photos, profile, setProfile } = useJournal();
  const [name, setName] = useState(profile.name);
  useEffect(() => { setName(profile.name); }, [profile.name]);

  const stats = useMemo(() => {
    const days = new Set(photos.map(p => p.dateISO)).size;
    return { total: photos.length, days };
  }, [photos]);

  const changeAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1, allowsEditing: true, aspect: [1,1] });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setProfile({ ...profile, avatarUri: res.assets[0].uri });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Profil</Text>

      <Pressable onPress={changeAvatar} style={{ alignSelf: 'center' }}>
        <Image source={profile.avatarUri ? { uri: profile.avatarUri } : DefaultAvatar} style={styles.avatar} />
        <Text style={{ textAlign: 'center', marginTop: 6, color: '#2563eb' }}>Changer la photo</Text>
      </Pressable>

      <Text style={{ marginTop: 12 }}>Nom</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Votre nom" />
      <Pressable style={[styles.smallBtn, { alignSelf: 'flex-start', backgroundColor: '#2563eb' }]} onPress={() => setProfile({ ...profile, name })}>
        <Text style={styles.smallBtnText}>Enregistrer le nom</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.h2}>Statistiques</Text>
        <Text>Photos : {stats.total}</Text>
        <Text>Jours couverts : {stats.days}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:16, gap:12 },
  h1:{ fontSize:22, fontWeight:'800' },
  h2:{ fontSize:16, fontWeight:'700', marginBottom:6 },
  input:{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:10, backgroundColor:'white' },
  smallBtn:{ backgroundColor:'#334155', paddingHorizontal:12, paddingVertical:10, borderRadius:8 },
  smallBtnText:{ color:'white', fontWeight:'700' },
  card:{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:12, padding:12, gap:4, backgroundColor:'white' },
  avatar:{ width:120, height:120, borderRadius:60, alignSelf:'center', backgroundColor:'#e5e7eb' },
});
