import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { scheduleTodoNotification } from '../utils/notifications';

export default function TodoFormScreen({ addTodo }: { addTodo: (todo: any) => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2025-09-03'); // exemple par défaut
  const [time, setTime] = useState('15:30');      // exemple par défaut

  const handleSave = async () => {
    const newTodo = {
      id: String(Date.now()),
      title,
      dateISO: date,
      time,
    };

    try {
      await scheduleTodoNotification(newTodo);
      addTodo(newTodo); // Ajoute la todo à la liste
      console.log('✅ Notification programmée !');
    } catch (e) {
      if (e instanceof Error) {
        console.warn('⚠️ Impossible de programmer la notif :', e.message);
      } else {
        console.warn('⚠️ Impossible de programmer la notif :', e);
      }
    }

    // Ici tu peux aussi sauvegarder la todo dans ton state/BDD
  };

  return (
    <View>
      <TextInput
        placeholder="Titre de la todo"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <TextInput
        placeholder="Heure (HH:mm)"
        value={time}
        onChangeText={setTime}
      />
      <Button title="Enregistrer la todo" onPress={handleSave} />
    </View>
  );
}
