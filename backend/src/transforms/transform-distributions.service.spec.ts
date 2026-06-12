import { NotFoundException } from '@nestjs/common';
import { TransformDistributionsService } from './transform-distributions.service';
import { mockRepository } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { TransformDistribution } from './entities/transform-distribution.entity';

describe('TransformDistributionsService', () => {
  let service: TransformDistributionsService;
  let repo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    repo = mockRepository();
    service = new TransformDistributionsService(
      repo as unknown as Repository<TransformDistribution>,
    );
  });

  describe('create', () => {
    it('比例之和 ≤ 100 → 正常保存(不警告)', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);
      await service.create(1, {
        innerRatio: 40,
        teamRatio: 30,
        personalRatio: 30,
      });
      expect(warnSpy).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      const created = repo.create.mock.calls[0][0] as Record<string, unknown>;
      expect(created.transformId).toBe(1);
    });

    it('比例之和 > 100 → 打印警告但不阻止保存', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);
      await service.create(2, {
        innerRatio: 50,
        teamRatio: 50,
        personalRatio: 50,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('超过 100%'),
      );
    });

    it('比例为 null 时按 0 计算', async () => {
      repo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => undefined);
      await service.create(3, {
        innerRatio: null,
        teamRatio: null,
        personalRatio: null,
      } as never);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('findByTransform', () => {
    it('按 transformId 查询并按 recordTime 倒序', async () => {
      repo.find.mockResolvedValue([{ id: 1 }]);
      const out = await service.findByTransform(7);
      expect(out).toEqual([{ id: 1 }]);
      expect(repo.find).toHaveBeenCalledWith({
        where: { transformId: 7 },
        order: { recordTime: 'DESC' },
      });
    });
  });

  describe('update', () => {
    it('存在 → 合并并保存', async () => {
      const entity = { id: 1, innerRatio: 10 };
      repo.findOneBy.mockResolvedValue(entity);
      await service.update(1, { innerRatio: 20 });
      expect(repo.save).toHaveBeenCalled();
      expect((entity as Record<string, unknown>).innerRatio).toBe(20);
    });

    it('不存在 → 404', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.update(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('存在 → 删除', async () => {
      repo.findOneBy.mockResolvedValue({ id: 1 });
      await expect(service.remove(1)).resolves.toEqual({
        deleted: true,
        id: 1,
      });
      expect(repo.remove).toHaveBeenCalled();
    });

    it('不存在 → 404', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
