declare module 'react-native-push-notification' {
  export interface PushNotificationObject {
    /* options utiles pour localNotificationSchedule */
    id?: string;
    message: string;
    date: Date;
    allowWhileIdle?: boolean;
    playSound?: boolean;
    soundName?: string;
    importance?: number;
    vibrate?: boolean;
    channelId?: string;
    title?: string;
  }

  export default class PushNotification {
    static configure(options: any): void;
    static localNotificationSchedule(options: PushNotificationObject): void;
    static localNotification(options: PushNotificationObject): void;
    static cancelLocalNotifications(details: { id: string }): void;
    static cancelLocalNotification(id: string): void;
    static createChannel(config: any, callback?: (created: boolean) => void): void;
    static checkPermissions(callback: (permissions: any) => void): void;
    static requestPermissions(): void;
  }
}
