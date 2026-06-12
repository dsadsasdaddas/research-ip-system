import { NotFoundException } from '@nestjs/common';
import { SecretAccessService } from './secret-access.service';
import { mockRepository, mockAuthUser } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { SecretAccessGrant } from './entities/secret-access-grant.entity';
import type { SecretAccessLog } from './entities/secret-access-log.entity';
import { UserRole } from '../users/entities/user.entity';

function iso(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

describe('SecretAccessService', () => {
  let service: SecretAccessService;
  let grantRepo: ReturnType<typeof mockRepository>;
  let logRepo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    grantRepo = mockRepository();
    logRepo = mockRepository();
    service = new SecretAccessService(
      grantRepo as unknown as Repository<SecretAccessGrant>,
      logRepo as unknown as Repository<SecretAccessLog>,
    );
  });

  describe('grantAccess', () => {
    it('有起止时间 → 转 Date 并注入 grantedBy/name', async () => {
      grantRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const user = mockAuthUser(UserRole.SECRET_ADMIN, 3, {
        username: 'alice',
      });
      await service.grantAccess(
        {
          businessType: 'paper',
          businessId: 10,
          grantUserId: 99,
          startTime: '2024-01-01',
          endTime: '2024-12-31',
        },
        user,
      );
      const created = grantRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.startTime).toBeInstanceOf(Date);
      expect(created.endTime).toBeInstanceOf(Date);
      expect(created.grantedBy).toBe(user.id);
      expect(created.grantedByName).toBe('alice');
      expect(grantRepo.save).toHaveBeenCalled();
    });

    it('无起止时间 → startTime/endTime 为 null', async () => {
      grantRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const user = mockAuthUser(UserRole.SYS_ADMIN, 1);
      await service.grantAccess(
        { businessType: 'patent', businessId: 1, grantUserId: 2 },
        user,
      );
      const created = grantRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.startTime).toBeNull();
      expect(created.endTime).toBeNull();
    });
  });

  describe('revokeAccess', () => {
    it('存在 → 设 isActive=false 并保存', async () => {
      const g = { id: 1, isActive: true } as SecretAccessGrant;
      grantRepo.findOneBy.mockResolvedValue(g);
      grantRepo.save.mockResolvedValue(g);
      const out = await service.revokeAccess(1);
      expect(g.isActive).toBe(false);
      expect(out).toBe(g);
    });

    it('不存在 → 404', async () => {
      grantRepo.findOneBy.mockResolvedValue(null);
      await expect(service.revokeAccess(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findGrants', () => {
    it('无参数 → 空 where', async () => {
      grantRepo.find.mockResolvedValue([]);
      await service.findGrants();
      expect(grantRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createTime: 'DESC' },
      });
    });

    it('businessType + businessId 都给 → where 含两者', async () => {
      grantRepo.find.mockResolvedValue([]);
      await service.findGrants('paper', 10);
      expect(grantRepo.find).toHaveBeenCalledWith({
        where: { businessType: 'paper', businessId: 10 },
        order: { createTime: 'DESC' },
      });
    });

    it('仅 businessType → where 仅含 type', async () => {
      grantRepo.find.mockResolvedValue([]);
      await service.findGrants('paper');
      expect(grantRepo.find).toHaveBeenCalledWith({
        where: { businessType: 'paper' },
        order: { createTime: 'DESC' },
      });
    });

    it('businessId 为 NaN → 不加入 where', async () => {
      grantRepo.find.mockResolvedValue([]);
      await service.findGrants('paper', Number.NaN);
      expect(grantRepo.find).toHaveBeenCalledWith({
        where: { businessType: 'paper' },
        order: { createTime: 'DESC' },
      });
    });
  });

  describe('checkAccess', () => {
    it('无任何授权 → false', async () => {
      grantRepo.find.mockResolvedValue([]);
      const out = await service.checkAccess('paper', 1, 7, 'view');
      expect(out).toBe(false);
    });

    it('startTime 在未来 → 该授权不计入', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'manage', startTime: iso(1), endTime: iso(10) },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'view')).toBe(false);
    });

    it('endTime 已过期 → 该授权不计入', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'manage', startTime: iso(-10), endTime: iso(-1) },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'view')).toBe(false);
    });

    it('manage 范围 + 任意 action → true', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'manage', startTime: null, endTime: null },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'delete')).toBe(true);
    });

    it('download 范围 + action=download → true', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'download', startTime: null, endTime: null },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'download')).toBe(true);
    });

    it('download 范围 + action=view → true', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'download', startTime: null, endTime: null },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'view')).toBe(true);
    });

    it('download 范围 + action=preview → true', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'download', startTime: null, endTime: null },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'preview')).toBe(true);
    });

    it('download 范围 + action=manage → false(范围不足)', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'download', startTime: null, endTime: null },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'manage')).toBe(false);
    });

    it('read 范围 + action=view → true', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'read', startTime: null, endTime: null },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'view')).toBe(true);
    });

    it('read 范围 + action=preview → true', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'read', startTime: null, endTime: null },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'preview')).toBe(true);
    });

    it('read 范围 + action=download → false', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'read', startTime: null, endTime: null },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'download')).toBe(false);
    });

    it('未知 grantScope → false', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'whatever', startTime: null, endTime: null },
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'view')).toBe(false);
    });

    it('多条授权,任一满足 → true', async () => {
      grantRepo.find.mockResolvedValue([
        { grantScope: 'read', startTime: null, endTime: null }, // 不满足 download
        { grantScope: 'manage', startTime: iso(-1), endTime: iso(1) }, // 满足
      ]);
      expect(await service.checkAccess('paper', 1, 7, 'download')).toBe(true);
    });
  });

  describe('logAccess', () => {
    it('创建并保存日志', async () => {
      logRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const out = await service.logAccess({
        businessType: 'paper',
        businessId: 1,
        action: 'view',
      });
      expect(logRepo.create).toHaveBeenCalled();
      expect(logRepo.save).toHaveBeenCalled();
      expect(out).toEqual({
        businessType: 'paper',
        businessId: 1,
        action: 'view',
      });
    });
  });
});
