import AsyncStorage from "@react-native-async-storage/async-storage";

export type InboxItem = {
  id: string;
  oneSignalId?: string;
  title?: string;
  message?: string;
  postId?: string;
  categoryName?: string;
  deepLinkUrl?: string;
  imageUrl?: string;
  receivedAt: number;
  read: boolean;
};

const KEY = "notificationsInbox";

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export function inboxSubscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function getInbox(): Promise<InboxItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as InboxItem[]) : [];
}

export async function getUnreadCount(): Promise<number> {
  const list = await getInbox();
  return list.filter((i) => !i.read).length;
}

export async function addToInbox(item: InboxItem) {
  const list = await getInbox();
  if (item.oneSignalId && list.some((i) => i.oneSignalId === item.oneSignalId))
    return;
  const next = [item, ...list].slice(0, 200);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

export async function markRead(oneSignalId?: string) {
  if (!oneSignalId) return;
  const list = await getInbox();
  const next = list.map((i) =>
    i.oneSignalId === oneSignalId ? { ...i, read: true } : i,
  );
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  emit();
}

export async function clearInbox() {
  await AsyncStorage.removeItem(KEY);
  emit();
}
