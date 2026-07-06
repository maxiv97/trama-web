import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotificationsService } from './notifications.service';
import { Notification } from '../models/notification.model';
import { MockStore } from '../mocks/mock-store';

function build(userId: string, read = false): Notification {
  return {
    id: `not-test-${Math.random()}`,
    userId,
    type: 'sale',
    text: 'Test',
    date: new Date(),
    read,
    target: '/c/garment/gar-1',
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(MockStore);
    store.reset();
    service = TestBed.inject(NotificationsService);
  });

  it('marca una notificación como leída y baja el conteo de no leídas', () => {
    expect(service.unreadCountFor('con-ana')).toBe(1);

    service.markRead('not-1');

    expect(service.unreadCountFor('con-ana')).toBe(0);
    expect(store.data.notifications.find((item) => item.id === 'not-1')?.read).toBe(true);
  });

  it('marca todas como leídas para un usuario', () => {
    service.emit(build('con-nuevo'));
    service.emit(build('con-nuevo'));
    expect(service.unreadCountFor('con-nuevo')).toBe(2);

    service.markAllRead('con-nuevo');

    expect(service.unreadCountFor('con-nuevo')).toBe(0);
  });

  it('emite una notificación y sube el conteo y el signal', () => {
    const before = service.all().length;

    service.emit(build('con-ana'));

    expect(service.unreadCountFor('con-ana')).toBe(2);
    expect(service.all().length).toBe(before + 1);
  });

  it('byUser devuelve solo las del usuario', async () => {
    const list = await firstValueFrom(service.byUser('con-ana'));
    expect(list).toHaveLength(1);
    expect(list[0].userId).toBe('con-ana');
  });
});
