import { api } from './api';

const EVENT_STORAGE_KEY = 'fairdrop:eventId';

export const getCurrentEventId = () =>
  typeof window === 'undefined' ? null : window.localStorage.getItem(EVENT_STORAGE_KEY);

export const loadActiveEventId = async () => {
  const response = await api.get('/events');
  const event = response.data.find((item: { status: string }) => item.status === 'active')
    || response.data[0];
  if (!event?.id) return null;
  window.localStorage.setItem(EVENT_STORAGE_KEY, event.id);
  return event.id as string;
};