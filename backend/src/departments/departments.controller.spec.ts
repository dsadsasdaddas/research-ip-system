import { DepartmentsController } from './departments.controller';
import type { DepartmentsService } from './departments.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    remove: jest.fn().mockResolvedValue({ deleted: true, id: 1 }),
  };
}

describe('DepartmentsController', () => {
  let controller: DepartmentsController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new DepartmentsController(
      service as unknown as DepartmentsService,
    );
  });

  it('findAll 带 keyword 委托 service', async () => {
    const res = await controller.findAll('计算机');
    expect(service.findAll).toHaveBeenCalledWith('计算机');
    expect(res).toEqual([{ id: 1 }]);
  });

  it('findAll 无 keyword 传 undefined', async () => {
    await controller.findAll(undefined);
    expect(service.findAll).toHaveBeenCalledWith(undefined);
  });

  it('findOne 委托 service(id)', async () => {
    const res = await controller.findOne(1);
    expect(service.findOne).toHaveBeenCalledWith(1);
    expect(res).toEqual({ id: 1 });
  });

  it('create 委托 service(dto)', async () => {
    const res = await controller.create({ name: 'a' });
    expect(service.create).toHaveBeenCalledWith({ name: 'a' });
    expect(res).toEqual({ id: 1 });
  });

  it('update 委托 service(id, dto)', async () => {
    const res = await controller.update(2, { name: 'n' });
    expect(service.update).toHaveBeenCalledWith(2, { name: 'n' });
    expect(res).toEqual({ id: 1 });
  });

  it('remove 委托 service(id)', async () => {
    const res = await controller.remove(3);
    expect(service.remove).toHaveBeenCalledWith(3);
    expect(res).toEqual({ deleted: true, id: 1 });
  });
});
