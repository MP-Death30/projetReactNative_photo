import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ——————————— Types ———————————
export interface TodoReminder {
  id: string;
  title: string;
  dateISO: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
}

// ——— Affichage quand la notif arrive (foreground) ———
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }as Notifications.NotificationBehavior),
});

// ——— Permissions + canal Android ———
export async function ensurePermissionsAndChannel(): Promise<void> {
  if (Device.isDevice) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission de notification refusée.');
    }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('todos', {
      name: 'Todo reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}


export async function scheduleTodoNotification(
  todo: TodoReminder,
  advanceMinutes: number = 5 
): Promise<string> {
  const [y, m, d] = todo.dateISO.split('-').map(Number);
  const [hh, mm] = todo.time.split(':').map(Number);
  const when = new Date(y, m - 1, d, hh, mm, 0, 0);

  const now = Date.now();
  if (when.getTime() <= now) {
    throw new Error("La date/heure du rappel est déjà passée.");
  }

  
  const advanceMs = advanceMinutes * 60 * 1000;
  let fireAt = new Date(when.getTime() - advanceMs);

  if (fireAt.getTime() <= now) {
    fireAt = when;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "🗓️ Rappel Todo",
      body: todo.title,
      sound: "default",
      data: { todoId: todo.id, plannedFor: when.toISOString() },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: "todos",
    },
  });
}
