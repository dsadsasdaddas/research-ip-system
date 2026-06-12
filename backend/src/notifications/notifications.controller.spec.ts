import { NotificationsController } from './notifications.controller';
import type { NotificationsService } from './notifications.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    findMyNotifications: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
    countUnread: jest.fn().mockResolvedValue({ count: 0 }),
    markRead: jest.fn().mockResolvedValue({ id: 1 }),
    markAllRead: jest.fn().mockResolvedValue({ affected: 0 }),
  };
}

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new NotificationsController(
      service as unknown as NotificationsService,
    );
  });

  it('findMyNotifications 委托 service(user.id + query)', async () => {
    await controller.findMyNotifications({ isRead: true }, { id: 7 } as never);
    expect(service.findMyNotifications).toHaveBeenCalledWith(7, {
      isRead: true,
    });
  });

  it('countUnread 委托 service', async () => {
    await controller.countUnread({ id: 7 } as never);
    expect(service.countUnread).toHaveBeenCalledWith(7);
  });

  it('markRead 解析 id 字符串后委托 service', async () => {
    await controller.markRead('12', { id: 7 } as never);
    expect(service.markRead).toHaveBeenCalledWith(12, 7);
  });

  it('markAllRead 委托 service', async () => {
    await controller.markAllRead({ id: 7 } as never);
    expect(service.markAllRead).toHaveBeenCalledWith(7);
  });
});
