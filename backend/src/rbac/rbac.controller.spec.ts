import { BadRequestException } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import type { RbacService } from './rbac.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    findAllRoles: jest.fn().mockResolvedValue([]),
    findOneRole: jest.fn().mockResolvedValue({ id: 1 }),
    createRole: jest.fn().mockResolvedValue({ id: 1 }),
    updateRole: jest.fn().mockResolvedValue({ id: 1 }),
    findAllPermissions: jest.fn().mockResolvedValue([]),
    createPermission: jest.fn().mockResolvedValue({ id: 1 }),
    assignPermissions: jest.fn().mockResolvedValue(undefined),
    getPermissionsForRole: jest.fn().mockResolvedValue([]),
    checkPermission: jest.fn().mockResolvedValue(true),
  };
}

describe('RbacController', () => {
  let controller: RbacController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new RbacController(service as unknown as RbacService);
  });

  it('findAllRoles 委托 service', async () => {
    await controller.findAllRoles();
    expect(service.findAllRoles).toHaveBeenCalled();
  });

  it('findOneRole 委托 service(传 id)', async () => {
    await controller.findOneRole(5);
    expect(service.findOneRole).toHaveBeenCalledWith(5);
  });

  it('createRole 委托 service(传 dto)', async () => {
    await controller.createRole({ code: 'r1', name: 'R1' });
    expect(service.createRole).toHaveBeenCalledWith({ code: 'r1', name: 'R1' });
  });

  it('updateRole 委托 service(传 id + dto)', async () => {
    await controller.updateRole(5, { name: 'N' });
    expect(service.updateRole).toHaveBeenCalledWith(5, { name: 'N' });
  });

  it('findAllPermissions 有 module → 透传', async () => {
    await controller.findAllPermissions('papers');
    expect(service.findAllPermissions).toHaveBeenCalledWith('papers');
  });

  it('findAllPermissions 无 module → undefined', async () => {
    await controller.findAllPermissions(undefined);
    expect(service.findAllPermissions).toHaveBeenCalledWith(undefined);
  });

  it('createPermission 委托 service', async () => {
    await controller.createPermission({ code: 'p1', name: 'P1' } as never);
    expect(service.createPermission).toHaveBeenCalledWith({
      code: 'p1',
      name: 'P1',
    });
  });

  it('assignPermissions 透传 roleCode/permissionCodes', async () => {
    await controller.assignPermissions({
      roleCode: 'admin',
      permissionCodes: ['p1', 'p2'],
    });
    expect(service.assignPermissions).toHaveBeenCalledWith('admin', [
      'p1',
      'p2',
    ]);
  });

  it('getPermissionsForRole 委托 service(传 roleCode)', async () => {
    await controller.getPermissionsForRole('admin');
    expect(service.getPermissionsForRole).toHaveBeenCalledWith('admin');
  });

  describe('checkPermission', () => {
    it('缺 roleCode → 400', async () => {
      await expect(
        controller.checkPermission(undefined as unknown as string, 'p1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(service.checkPermission).not.toHaveBeenCalled();
    });

    it('缺 permissionCode → 400', async () => {
      await expect(
        controller.checkPermission('admin', undefined as unknown as string),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(service.checkPermission).not.toHaveBeenCalled();
    });

    it('参数齐全 → 委托 service 并包装 { allowed }', async () => {
      service.checkPermission.mockResolvedValue(true);
      const res = await controller.checkPermission('admin', 'p1');
      expect(service.checkPermission).toHaveBeenCalledWith('admin', 'p1');
      expect(res).toEqual({ allowed: true });
    });

    it('未授权 → { allowed: false }', async () => {
      service.checkPermission.mockResolvedValue(false);
      const res = await controller.checkPermission('admin', 'p1');
      expect(res).toEqual({ allowed: false });
    });
  });
});
