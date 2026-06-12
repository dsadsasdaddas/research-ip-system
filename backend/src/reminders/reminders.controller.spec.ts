import { RemindersController } from './reminders.controller';
import type { RemindersService } from './reminders.service';
import type { MockObject } from '../testing/mocks';
import { mockAuthUser } from '../testing/mocks';
import { UserRole } from '../users/entities/user.entity';

function mockService(): MockObject {
  return {
    listTasks: jest.fn().mockResolvedValue([{ id: 1 }]),
    createTask: jest.fn().mockResolvedValue({ id: 1 }),
    updateTask: jest.fn().mockResolvedValue({ id: 1 }),
    deleteTask: jest.fn().mockResolvedValue({ success: true }),
    confirmTask: jest.fn().mockResolvedValue({ id: 1 }),
    checkSecondRemind: jest.fn().mockResolvedValue({ secondReminded: 0 }),
    summary: jest.fn().mockResolvedValue({ total: 0 }),
    listRules: jest.fn().mockResolvedValue([{ id: 1 }]),
    createRule: jest.fn().mockResolvedValue({ id: 1 }),
    updateRule: jest.fn().mockResolvedValue({ id: 1 }),
    deleteRule: jest.fn().mockResolvedValue({ success: true }),
  };
}

describe('RemindersController', () => {
  let controller: RemindersController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new RemindersController(
      service as unknown as RemindersService,
    );
  });

  it('listTasks 全院用户 → deptId=undefined', async () => {
    await controller.listTasks(
      'kw',
      '紧急',
      'true',
      mockAuthUser(UserRole.SYS_ADMIN),
    );
    expect(service.listTasks).toHaveBeenCalledWith({
      keyword: 'kw',
      remindLevel: '紧急',
      isConfirm: 'true',
      deptId: undefined,
    });
  });

  it('listTasks 部门隔离用户 → deptId=user.deptId', async () => {
    await controller.listTasks(
      undefined,
      undefined,
      undefined,
      mockAuthUser(UserRole.DEPT_SEC, 5),
    );
    expect(service.listTasks).toHaveBeenCalledWith({
      keyword: undefined,
      remindLevel: undefined,
      isConfirm: undefined,
      deptId: 5,
    });
  });

  it('listTasks 无 user → deptId=undefined', async () => {
    await controller.listTasks(undefined, undefined, undefined, undefined);
    expect(service.listTasks).toHaveBeenCalledWith({
      keyword: undefined,
      remindLevel: undefined,
      isConfirm: undefined,
      deptId: undefined,
    });
  });

  it('summary 委托', async () => {
    await controller.summary(mockAuthUser());
    expect(service.summary).toHaveBeenCalled();
  });

  it('createTask 委托', async () => {
    await controller.createTask({ title: 't' }, mockAuthUser());
    expect(service.createTask).toHaveBeenCalledWith(
      { title: 't' },
      mockAuthUser(),
    );
  });

  it('updateTask +id 转换', async () => {
    await controller.updateTask('7', { title: 'n' });
    expect(service.updateTask).toHaveBeenCalledWith(7, { title: 'n' });
  });

  it('deleteTask +id 转换', async () => {
    await controller.deleteTask('7');
    expect(service.deleteTask).toHaveBeenCalledWith(7);
  });

  it('confirmTask +id 转换', async () => {
    await controller.confirmTask('7');
    expect(service.confirmTask).toHaveBeenCalledWith(7);
  });

  it('checkSecondRemind 委托', async () => {
    await controller.checkSecondRemind();
    expect(service.checkSecondRemind).toHaveBeenCalled();
  });

  it('listRules 委托', async () => {
    await controller.listRules();
    expect(service.listRules).toHaveBeenCalled();
  });

  it('createRule 委托', async () => {
    await controller.createRule({ title: 'r' });
    expect(service.createRule).toHaveBeenCalledWith({ title: 'r' });
  });

  it('updateRule +id 转换', async () => {
    await controller.updateRule('7', { daysBefore: 10 });
    expect(service.updateRule).toHaveBeenCalledWith(7, { daysBefore: 10 });
  });

  it('deleteRule +id 转换', async () => {
    await controller.deleteRule('7');
    expect(service.deleteRule).toHaveBeenCalledWith(7);
  });
});
