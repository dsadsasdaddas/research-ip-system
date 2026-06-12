import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DictionariesService } from './dictionaries.service';
import { mockRepository } from '../testing/mocks';
import type { Repository } from 'typeorm';
import type { DictionaryType } from './entities/dictionary-type.entity';
import type { DictionaryItem } from './entities/dictionary-item.entity';

describe('DictionariesService', () => {
  let service: DictionariesService;
  let typeRepo: ReturnType<typeof mockRepository>;
  let itemRepo: ReturnType<typeof mockRepository>;

  beforeEach(() => {
    typeRepo = mockRepository();
    itemRepo = mockRepository();
    service = new DictionariesService(
      typeRepo as unknown as Repository<DictionaryType>,
      itemRepo as unknown as Repository<DictionaryItem>,
    );
  });

  describe('onModuleInit / seedDefaults', () => {
    it('种子:全部不存在 → 全量写入(类型 + 项)', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      itemRepo.findOne.mockResolvedValue(null);
      await service.onModuleInit();
      // 13 个类型
      expect(typeRepo.save).toHaveBeenCalledTimes(13);
      expect(typeRepo.create).toHaveBeenCalledTimes(13);
      // 30 个字典项
      expect(itemRepo.save).toHaveBeenCalledTimes(30);
      expect(itemRepo.create).toHaveBeenCalledTimes(30);
    });

    it('种子:类型已存在 → 不再写入,但项不存在 → 写入项', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 1 });
      itemRepo.findOne.mockResolvedValue(null);
      await service.onModuleInit();
      expect(typeRepo.save).not.toHaveBeenCalled();
      expect(itemRepo.save).toHaveBeenCalledTimes(30);
    });

    it('种子:项已存在 → 不再写入该项', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      itemRepo.findOne.mockResolvedValue({ id: 99 });
      await service.onModuleInit();
      expect(itemRepo.save).not.toHaveBeenCalled();
      // 类型仍写入
      expect(typeRepo.save).toHaveBeenCalledTimes(13);
    });
  });

  describe('findTypes', () => {
    it('按 scope/code 升序返回', async () => {
      const rows = [{ id: 1, code: 'secret_level' }];
      typeRepo.find.mockResolvedValue(rows);
      await expect(service.findTypes()).resolves.toBe(rows);
      expect(typeRepo.find).toHaveBeenCalledWith({
        order: { scope: 'ASC', code: 'ASC' },
      });
    });
  });

  describe('findTypeByCode', () => {
    it('存在 → 返回', async () => {
      const t = { id: 1, code: 'x' };
      typeRepo.findOne.mockResolvedValue(t);
      await expect(service.findTypeByCode('x')).resolves.toBe(t);
      expect(typeRepo.findOne).toHaveBeenCalledWith({ where: { code: 'x' } });
    });
    it('不存在 → 404', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      await expect(service.findTypeByCode('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createType', () => {
    it('code 已存在 → 409', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(
        service.createType({ code: 'c', name: 'n' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('注入默认值(scope/isSystem/isActive/remark)并保存', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      typeRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.createType({ code: 'c', name: 'n' });
      const created = typeRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.scope).toBe('business');
      expect(created.isSystem).toBe(false);
      expect(created.isActive).toBe(true);
      expect(created.remark).toBeNull();
    });

    it('显式传值时保留显式值', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      typeRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.createType({
        code: 'c',
        name: 'n',
        scope: 'security',
        isSystem: true,
        isActive: false,
        remark: 'r',
      });
      const created = typeRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.scope).toBe('security');
      expect(created.isSystem).toBe(true);
      expect(created.isActive).toBe(false);
      expect(created.remark).toBe('r');
    });
  });

  describe('updateType', () => {
    it('存在 → Object.assign + save', async () => {
      const t = { id: 1, name: 'old', remark: null };
      typeRepo.findOne.mockResolvedValue(t);
      await service.updateType(1, { name: 'new' });
      expect((t as Record<string, unknown>).name).toBe('new');
      expect(typeRepo.save).toHaveBeenCalledWith(t);
    });
    it('不存在 → 404', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      await expect(service.updateType(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('removeType', () => {
    it('系统内置 → 400', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 1, code: 'c', isSystem: true });
      await expect(service.removeType(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
    it('类型下仍有字典项 → 400', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 1, code: 'c', isSystem: false });
      itemRepo.count.mockResolvedValue(2);
      await expect(service.removeType(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(itemRepo.count).toHaveBeenCalledWith({ where: { typeCode: 'c' } });
    });
    it('可删 → remove 并返回', async () => {
      const t = { id: 1, code: 'c', isSystem: false };
      typeRepo.findOne.mockResolvedValue(t);
      itemRepo.count.mockResolvedValue(0);
      await expect(service.removeType(1)).resolves.toEqual({
        deleted: true,
        id: 1,
      });
      expect(typeRepo.remove).toHaveBeenCalledWith(t);
    });
    it('类型不存在 → 404', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      await expect(service.removeType(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findItems', () => {
    it('无过滤条件 → 仅排序', async () => {
      const rows = [{ id: 1 }];
      itemRepo.find.mockResolvedValue(rows);
      await expect(service.findItems({})).resolves.toBe(rows);
      expect(itemRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { typeCode: 'ASC', sortOrder: 'ASC', id: 'ASC' },
      });
    });
    it('typeCode + activeOnly → 加 where 条件', async () => {
      itemRepo.find.mockResolvedValue([]);
      await service.findItems({ typeCode: 'x', activeOnly: true });
      expect(itemRepo.find).toHaveBeenCalledWith({
        where: { typeCode: 'x', isActive: true },
        order: { typeCode: 'ASC', sortOrder: 'ASC', id: 'ASC' },
      });
    });
    it('仅 typeCode', async () => {
      itemRepo.find.mockResolvedValue([]);
      await service.findItems({ typeCode: 'x' });
      expect(itemRepo.find).toHaveBeenCalledWith({
        where: { typeCode: 'x' },
        order: { typeCode: 'ASC', sortOrder: 'ASC', id: 'ASC' },
      });
    });
    it('仅 activeOnly', async () => {
      itemRepo.find.mockResolvedValue([]);
      await service.findItems({ activeOnly: true });
      expect(itemRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { typeCode: 'ASC', sortOrder: 'ASC', id: 'ASC' },
      });
    });
  });

  describe('findItem', () => {
    it('存在 → 返回', async () => {
      const it = { id: 1 };
      itemRepo.findOne.mockResolvedValue(it);
      await expect(service.findItem(1)).resolves.toBe(it);
      expect(itemRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
    it('不存在 → 404', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(service.findItem(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createItem', () => {
    it('typeCode 不存在 → 404', async () => {
      typeRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createItem({ typeCode: 'x', label: 'l', value: 'v' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('同类型下 value 已存在 → 409', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 1, code: 'x' });
      itemRepo.findOne.mockResolvedValue({ id: 9 });
      await expect(
        service.createItem({ typeCode: 'x', label: 'l', value: 'v' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(itemRepo.findOne).toHaveBeenCalledWith({
        where: { typeCode: 'x', value: 'v' },
      });
    });

    it('isDefault=true → 先清默认再保存', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 1, code: 'x' });
      itemRepo.findOne.mockResolvedValue(null);
      itemRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.createItem({
        typeCode: 'x',
        label: 'l',
        value: 'v',
        isDefault: true,
      });
      expect(itemRepo.update).toHaveBeenCalledWith(
        { typeCode: 'x', isDefault: true },
        { isDefault: false },
      );
      const created = itemRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.isDefault).toBe(true);
      expect(created.sortOrder).toBe(0);
      expect(created.color).toBeNull();
    });

    it('isDefault 未传 → 不清默认,默认值 false', async () => {
      typeRepo.findOne.mockResolvedValue({ id: 1, code: 'x' });
      itemRepo.findOne.mockResolvedValue(null);
      itemRepo.create.mockImplementation((dto: unknown) => ({
        ...(dto as object),
      }));
      await service.createItem({
        typeCode: 'x',
        label: 'l',
        value: 'v',
        sortOrder: 5,
        color: 'red',
        isSystem: true,
        isActive: false,
        remark: 'r',
      });
      expect(itemRepo.update).not.toHaveBeenCalled();
      const created = itemRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(created.isDefault).toBe(false);
      expect(created.sortOrder).toBe(5);
      expect(created.color).toBe('red');
      expect(created.isSystem).toBe(true);
      expect(created.isActive).toBe(false);
      expect(created.remark).toBe('r');
    });
  });

  describe('updateItem', () => {
    it('不存在 → 404', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(service.updateItem(1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('value 改动且新 value 已存在 → 409', async () => {
      itemRepo.findOne
        .mockResolvedValueOnce({ id: 1, typeCode: 'x', value: 'old' }) // findItem
        .mockResolvedValueOnce({ id: 9 }); // value 唯一性检查命中
      await expect(
        service.updateItem(1, { value: 'new' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(itemRepo.findOne).toHaveBeenLastCalledWith({
        where: { typeCode: 'x', value: 'new' },
      });
    });

    it('value 改动且新 value 不存在 → 通过', async () => {
      const item = { id: 1, typeCode: 'x', value: 'old' };
      itemRepo.findOne.mockResolvedValueOnce(item).mockResolvedValueOnce(null);
      await service.updateItem(1, { value: 'new' });
      expect((item as Record<string, unknown>).value).toBe('new');
      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('value 未改动 → 跳过唯一性检查', async () => {
      const item = { id: 1, typeCode: 'x', value: 'same' };
      itemRepo.findOne.mockResolvedValueOnce(item);
      await service.updateItem(1, { value: 'same' });
      // 只调用一次(findItem),没有第二次唯一性查询
      expect(itemRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('isDefault=true → 清默认后保存', async () => {
      const item = { id: 1, typeCode: 'x', value: 'v' };
      itemRepo.findOne.mockResolvedValueOnce(item);
      await service.updateItem(1, { isDefault: true });
      expect(itemRepo.update).toHaveBeenCalledWith(
        { typeCode: 'x', isDefault: true },
        { isDefault: false },
      );
      expect((item as Record<string, unknown>).isDefault).toBe(true);
    });
  });

  describe('removeItem', () => {
    it('系统内置 → 400', async () => {
      itemRepo.findOne.mockResolvedValue({ id: 1, isSystem: true });
      await expect(service.removeItem(1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
    it('可删 → remove 并返回', async () => {
      const it = { id: 1, isSystem: false };
      itemRepo.findOne.mockResolvedValue(it);
      await expect(service.removeItem(1)).resolves.toEqual({
        deleted: true,
        id: 1,
      });
      expect(itemRepo.remove).toHaveBeenCalledWith(it);
    });
    it('不存在 → 404', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(service.removeItem(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
