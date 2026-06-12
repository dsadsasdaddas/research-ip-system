import { BadRequestException } from '@nestjs/common';
import { SecretAccessController } from './secret-access.controller';
import type { SecretAccessService } from './secret-access.service';
import type { MockObject } from '../testing/mocks';

function mockService(): MockObject {
  return {
    grantAccess: jest.fn().mockResolvedValue({ id: 1 }),
    revokeAccess: jest.fn().mockResolvedValue({ id: 1, isActive: false }),
    findGrants: jest.fn().mockResolvedValue([]),
    checkAccess: jest.fn().mockResolvedValue(true),
    logAccess: jest.fn().mockResolvedValue({ id: 1 }),
  };
}

describe('SecretAccessController', () => {
  let controller: SecretAccessController;
  let service: MockObject;

  beforeEach(() => {
    service = mockService();
    controller = new SecretAccessController(
      service as unknown as SecretAccessService,
    );
  });

  it('grantAccess 委托 service', async () => {
    const dto = {
      businessType: 'paper',
      businessId: 1,
      grantUserId: 2,
    } as never;
    const user = { id: 3 } as never;
    await controller.grantAccess(dto, user);
    expect(service.grantAccess).toHaveBeenCalledWith(dto, user);
  });

  it('revokeAccess 委托 service', async () => {
    await controller.revokeAccess(7);
    expect(service.revokeAccess).toHaveBeenCalledWith(7);
  });

  it('findGrants: 都有值 → 转 businessId 为数字', async () => {
    await controller.findGrants('paper', '10');
    expect(service.findGrants).toHaveBeenCalledWith('paper', 10);
  });

  it('findGrants: 无 businessId → 传 undefined', async () => {
    await controller.findGrants('paper', undefined);
    expect(service.findGrants).toHaveBeenCalledWith('paper', undefined);
  });

  it('findGrants: 全部缺省 → 均传 undefined', async () => {
    await controller.findGrants(undefined, undefined);
    expect(service.findGrants).toHaveBeenCalledWith(undefined, undefined);
  });

  describe('checkAccess 参数校验', () => {
    it('任一参数缺失 → 400', async () => {
      await expect(
        controller.checkAccess('', '1', '2', 'view'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        controller.checkAccess('paper', '', '2', 'view'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        controller.checkAccess('paper', '1', '', 'view'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        controller.checkAccess('paper', '1', '2', ''),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(service.checkAccess).not.toHaveBeenCalled();
    });

    it('businessId 非数字 → 400', async () => {
      await expect(
        controller.checkAccess('paper', 'abc', '2', 'view'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('userId 非数字 → 400', async () => {
      await expect(
        controller.checkAccess('paper', '1', 'xyz', 'view'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('参数齐全 → 委托 service 并返回 { allowed }', async () => {
      service.checkAccess.mockResolvedValue(true);
      const out = await controller.checkAccess('paper', '10', '7', 'download');
      expect(service.checkAccess).toHaveBeenCalledWith(
        'paper',
        10,
        7,
        'download',
      );
      expect(out).toEqual({ allowed: true });
    });

    it('allowed=false 时也返回 { allowed: false }', async () => {
      service.checkAccess.mockResolvedValue(false);
      const out = await controller.checkAccess('paper', '10', '7', 'download');
      expect(out).toEqual({ allowed: false });
    });
  });

  it('logAccess 委托 service', async () => {
    const dto = {
      businessType: 'paper',
      businessId: 1,
      action: 'view',
    } as never;
    await controller.logAccess(dto);
    expect(service.logAccess).toHaveBeenCalledWith(dto);
  });
});
