import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useAuth } from './AuthProvider';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onLogin = async () => {
    const ok = await login(username, password);
    if (!ok) Alert.alert("Erreur", "Identifiants invalides");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>
      <TextInput placeholder="Nom d'utilisateur" style={styles.input} value={username} onChangeText={setUsername} />
      <TextInput placeholder="Mot de passe" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable style={styles.btn} onPress={onLogin}><Text style={styles.btnText}>Se connecter</Text></Pressable>
      <Pressable onPress={() => navigation.navigate("Register")}>
        <Text style={{ marginTop: 16, color: "#2563eb" }}>Créer un compte</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:"center", padding:20 },
  title:{ fontSize:22, fontWeight:"800", marginBottom:20, textAlign:"center" },
  input:{ borderWidth:1, borderColor:"#ddd", borderRadius:8, padding:12, marginBottom:12 },
  btn:{ backgroundColor:"#2563eb", padding:14, borderRadius:10, alignItems:"center" },
  btnText:{ color:"white", fontWeight:"700" }
});
