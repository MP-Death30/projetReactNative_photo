import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useAuth } from './AuthProvider';

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onRegister = async () => {
    await register(username, password);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>
      <TextInput placeholder="Nom d'utilisateur" style={styles.input} value={username} onChangeText={setUsername} />
      <TextInput placeholder="Mot de passe" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable style={styles.btn} onPress={onRegister}><Text style={styles.btnText}>S'inscrire</Text></Pressable>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={{ marginTop: 16, color: "#2563eb" }}>Déjà un compte ? Se connecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:"center", padding:20 },
  title:{ fontSize:22, fontWeight:"800", marginBottom:20, textAlign:"center" },
  input:{ borderWidth:1, borderColor:"#ddd", borderRadius:8, padding:12, marginBottom:12 },
  btn:{ backgroundColor:"#16a34a", padding:14, borderRadius:10, alignItems:"center" },
  btnText:{ color:"white", fontWeight:"700" }
});
