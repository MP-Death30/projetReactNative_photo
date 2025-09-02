export type JournalPhoto = {
  id: string;
  uri: string;
  timestamp: number;
  dateISO: string;             // yyyy-mm-dd
  locationName?: string | null;
  title?: string;
  note?: string;
};

export type ProfileState = {
  name: string;
  avatarUri?: string | null;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
