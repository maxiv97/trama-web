import {
  BarChart3,
  Bell,
  Inbox,
  LayoutDashboard,
  LucideIconData,
  MapPin,
  Receipt,
  Settings,
  Tags,
  Users,
} from 'lucide-angular';
import { Role } from '../../../core/models/user.model';
import { Hanger } from '../../icons/hanger';

export interface NavItem {
  label: string;
  link: string;
  icon: LucideIconData;
  exact?: boolean;
  counter?: boolean;
}

// Secciones de cada rol
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  consignor: [
    { label: 'Mi panel', link: '/c', icon: LayoutDashboard, exact: true },
    { label: 'Mis liquidaciones', link: '/c/payouts', icon: Receipt },
    { label: 'Notificaciones', link: '/c/notifications', icon: Bell, counter: true },
  ],
  merchant: [
    { label: 'Panel', link: '/m', icon: LayoutDashboard, exact: true },
    { label: 'Propuestas', link: '/m/proposals', icon: Inbox },
    { label: 'Inventario', link: '/m/inventory', icon: Hanger },
    { label: 'Liquidaciones', link: '/m/payouts', icon: Receipt },
    { label: 'Reportes', link: '/m/reports', icon: BarChart3 },
    { label: 'Mis cedentes', link: '/m/consignors', icon: Users },
    { label: 'Puntos de venta', link: '/m/sales-points', icon: MapPin },
    { label: 'Categorías', link: '/m/categories', icon: Tags },
    { label: 'Configuración', link: '/m/settings', icon: Settings },
    { label: 'Notificaciones', link: '/m/notifications', icon: Bell, counter: true },
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  consignor: 'Cedente',
  merchant: 'Comercio',
};
