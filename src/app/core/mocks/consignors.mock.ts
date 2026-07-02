import { Consignor } from '../models/user.model';

export const CONSIGNORS: Consignor[] = [
  {
    id: 'con-ana',
    name: 'Ana Gómez',
    email: 'ana@example.com',
    phone: '351-2000001',
    role: 'consignor',
    verified: true,
    createdAt: new Date('2026-03-10'),
    accountStatus: 'active',
    location: { neighborhood: 'Nueva Córdoba', city: 'Córdoba', lat: -31.4281, lng: -64.1888 },
    dni: '32.111.222',
  },
  {
    id: 'con-luis',
    name: 'Luis Ríos',
    email: 'luis@example.com',
    phone: '351-2000002',
    role: 'consignor',
    verified: false,
    createdAt: new Date('2026-04-02'),
    accountStatus: 'active',
    location: { neighborhood: 'Güemes', city: 'Córdoba', lat: -31.4256, lng: -64.195 },
    dni: '28.333.444',
  },
];
