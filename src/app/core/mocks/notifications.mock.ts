import { Notification } from '../models/notification.model';

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'not-1',
    userId: 'con-ana',
    type: 'proposal',
    text: 'Tu propuesta de "Vestido de fiesta" está en revisión.',
    date: new Date('2026-06-20'),
    read: false,
    target: '/c/garment/gar-1',
  },
  {
    id: 'not-2',
    userId: 'con-luis',
    type: 'sale',
    text: '¡Vendimos tus "Zapatillas urbanas"!',
    date: new Date('2026-06-05'),
    read: false,
    target: '/c/garment/gar-3',
  },
  {
    id: 'not-3',
    userId: 'mer-trama',
    type: 'proposal',
    text: 'Nueva propuesta de Ana Gómez para revisar.',
    date: new Date('2026-06-20'),
    read: false,
    target: '/m/proposal/prop-1',
  },
];
