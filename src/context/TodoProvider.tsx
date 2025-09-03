import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { Todo } from "../utils/todo";
import { scheduleTodoNotification, cancelTodoNotification } from "../utils/notifications";

type TodoContextValue = {
  todos: Todo[];
  addTodo: (t: Omit<Todo, "id" | "notifId">) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  getByDate: (date: string) => Todo[];
};

const TodoContext = createContext<TodoContextValue | undefined>(undefined);

const STORAGE_KEY = "@app/todos";

export const TodoProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Charger depuis AsyncStorage au démarrage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: Todo[] = JSON.parse(raw);
          setTodos(parsed);
        }
      } catch (e) {
        console.warn("Failed to load todos:", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Sauvegarder à chaque changement
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos)).catch((e) =>
      console.warn("Failed to persist todos:", e)
    );
  }, [todos, loaded]);

  const addTodo: TodoContextValue["addTodo"] = async (t) => {
    // sécurités de base
    if (!t.title?.trim()) {
      Alert.alert("Titre requis", "Saisis au moins un titre.");
      return;
    }
    if (!t.date) {
      Alert.alert("Date manquante", "La todo doit avoir une date (YYYY-MM-DD).");
      return;
    }

    const newTodo: Todo = {
      id: String(Date.now()),
      title: t.title.trim(),
      done: t.done ?? false,
      date: t.date,
      time: t.time,
      notes: t.notes,
    };

    // Planifier la notif si time présent
    let notifId: string | undefined;
    if (newTodo.time) {
      try {
        notifId = await scheduleTodoNotification({
          id: newTodo.id,
          title: newTodo.title,
          dateISO: newTodo.date,
          time: newTodo.time,
        });
      } catch (e) {
        console.warn("Failed to schedule notification:", e);
      }
    }

    setTodos((prev) => [{ ...newTodo, notifId }, ...prev]);
  };

  const toggleTodo: TodoContextValue["toggleTodo"] = async (id) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, done: !t.done }
          : t
      )
    );
  };

  const removeTodo: TodoContextValue["removeTodo"] = async (id) => {
    const current = todos.find((t) => t.id === id);
    if (current?.notifId) {
      try {
        await cancelTodoNotification(current.notifId);
      } catch (e) {
        console.warn("Failed to cancel notification:", e);
      }
    }
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const getByDate: TodoContextValue["getByDate"] = (date) => {
    const arr = todos.filter((t) => t.date === date);
    // Tri: d’abord celles avec heure (croissant), puis sans heure
    return arr.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  };

  const value = useMemo(
    () => ({ todos, addTodo, toggleTodo, removeTodo, getByDate }),
    [todos]
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};

export const useTodos = () => {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
};
