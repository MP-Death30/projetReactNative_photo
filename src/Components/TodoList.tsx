import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, Alert, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useTodos } from "../context/TodoProvider";

type Props = { date: string };

// petit helper pour formater HH:mm
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const formatHHmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function TodoList({ date }: Props) {
  const { getByDate, addTodo, toggleTodo, removeTodo } = useTodos();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  // ⏰ état du temps
  const [timeDate, setTimeDate] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const items = getByDate(date);

  const onAdd = async () => {
    if (!title.trim()) {
      Alert.alert("Titre requis", "Saisis au moins un titre.");
      return;
    }
    await addTodo({
      title: title.trim(),
      notes: notes.trim() || undefined,
      date,
      time: timeDate ? formatHHmm(timeDate) : undefined,
      done: false,
    });
    setTitle("");
    setNotes("");
    setTimeDate(null);
  };

  const onPickTime = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false); // le modal Android se referme
    if (selected) setTimeDate(selected);
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.sectionTitle}>Tâches du {date}</Text>

      <TextInput
        style={styles.input}
        placeholder="Nouvelle tâche…"
        value={title}
        onChangeText={setTitle}
      />

      {/* BOUTON SÉLECTEUR D’HEURE (pas de clavier) */}
      <Pressable
        onPress={() => setShowTimePicker(true)}
        style={[styles.input, styles.timeButton]}
        accessibilityRole="button"
        accessibilityLabel="Choisir une heure"
      >
        <Text style={{ color: timeDate ? "#111827" : "#6b7280", fontSize: 16 }}>
          {timeDate ? `Heure : ${formatHHmm(timeDate)}` : "Choisir une heure (optionnel)"}
        </Text>
      </Pressable>

      {showTimePicker && (
        <DateTimePicker
          value={timeDate ?? new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour
          onChange={onPickTime}
          // iOS : pour garder le picker visible dans l’UI (sans modal)
          style={Platform.OS === "ios" ? { alignSelf: "stretch" } : undefined}
        />
      )}

      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Notes (optionnel)…"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Pressable style={styles.addBtn} onPress={onAdd}>
        <Text style={styles.addBtnText}>Ajouter</Text>
      </Pressable>

      {items.length === 0 ? (
        <Text style={{ color: "#6b7280" }}>Aucune tâche pour ce jour.</Text>
      ) : (
        items.map((t) => (
          <View
            key={t.id}
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 12,
              backgroundColor: t.done ? "#ecfdf5" : "white",
              marginTop: 6,
            }}
          >
            <Pressable onPress={() => toggleTodo(t.id)}>
              <Text style={{ fontWeight: "700" }}>
                {t.done ? "✅ " : "⬜ "}
                {t.time ? `[${t.time}] ` : ""}
                {t.title}
              </Text>
            </Pressable>
            {t.notes ? <Text style={{ color: "#4b5563", marginTop: 4 }}>{t.notes}</Text> : null}
            <Pressable
              onPress={() =>
                Alert.alert("Supprimer", "Supprimer cette tâche ?", [
                  { text: "Annuler", style: "cancel" },
                  { text: "Supprimer", style: "destructive", onPress: () => removeTodo(t.id) },
                ])
              }
              style={{ marginTop: 6 }}
            >
              <Text style={{ color: "#dc2626", fontWeight: "600" }}>Supprimer</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  input: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12,
    padding: 12, backgroundColor: "#f9fafb",
  },
  timeButton: {
    justifyContent: "center",
    minHeight: 50,
  },
  addBtn: {
    backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 12, alignItems: "center",
  },
  addBtnText: { color: "white", fontWeight: "700" },
});
