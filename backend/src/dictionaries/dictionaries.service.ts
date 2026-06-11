import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { CreateDictionaryTypeDto } from './dto/create-dictionary-type.dto';
import { DictionaryItemQueryDto } from './dto/dictionary-item-query.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import { UpdateDictionaryTypeDto } from './dto/update-dictionary-type.dto';
import { DictionaryItem } from './entities/dictionary-item.entity';
import { DictionaryType } from './entities/dictionary-type.entity';

interface DictionaryTypeSeed {
  code: string;
  name: string;
  scope: string;
  remark: string;
}

interface DictionaryItemSeed {
  typeCode: string;
  label: string;
  value: string;
  sortOrder: number;
  color: string | null;
  isDefault?: boolean;
}

@Injectable()
export class DictionariesService implements OnModuleInit {
  constructor(
    @InjectRepository(DictionaryType) private readonly typeRepo: Repository<DictionaryType>,
    @InjectRepository(DictionaryItem) private readonly itemRepo: Repository<DictionaryItem>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  findTypes(): Promise<DictionaryType[]> {
    return this.typeRepo.find({ order: { scope: 'ASC', code: 'ASC' } });
  }

  async findTypeByCode(code: string): Promise<DictionaryType> {
    const type = await this.typeRepo.findOne({ where: { code } });
    if (!type) throw new NotFoundException(`字典类型 ${code} 不存在`);
    return type;
  }

  async createType(dto: CreateDictionaryTypeDto): Promise<DictionaryType> {
    const exists = await this.typeRepo.findOne({ where: { code: dto.code } });
    if (exists) throw new ConflictException('字典类型编码已存在');
    return this.typeRepo.save(this.typeRepo.create({
      code: dto.code,
      name: dto.name,
      scope: dto.scope ?? 'business',
      isSystem: dto.isSystem ?? false,
      isActive: dto.isActive ?? true,
      remark: dto.remark ?? null,
    }));
  }

  async updateType(id: number, dto: UpdateDictionaryTypeDto): Promise<DictionaryType> {
    const type = await this.findTypeById(id);
    Object.assign(type, dto);
    return this.typeRepo.save(type);
  }

  async removeType(id: number): Promise<{ deleted: true; id: number }> {
    const type = await this.findTypeById(id);
    if (type.isSystem) throw new BadRequestException('系统内置字典类型不能删除');
    const itemCount = await this.itemRepo.count({ where: { typeCode: type.code } });
    if (itemCount > 0) throw new BadRequestException('该字典类型下仍有字典项，不能删除');
    await this.typeRepo.remove(type);
    return { deleted: true, id };
  }

  findItems(query: DictionaryItemQueryDto): Promise<DictionaryItem[]> {
    return this.itemRepo.find({
      where: {
        ...(query.typeCode ? { typeCode: query.typeCode } : {}),
        ...(query.activeOnly ? { isActive: true } : {}),
      },
      order: { typeCode: 'ASC', sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findItem(id: number): Promise<DictionaryItem> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`字典项 #${id} 不存在`);
    return item;
  }

  async createItem(dto: CreateDictionaryItemDto): Promise<DictionaryItem> {
    await this.findTypeByCode(dto.typeCode);
    const exists = await this.itemRepo.findOne({ where: { typeCode: dto.typeCode, value: dto.value } });
    if (exists) throw new ConflictException('该字典类型下 value 已存在');
    if (dto.isDefault) await this.clearDefault(dto.typeCode);
    return this.itemRepo.save(this.itemRepo.create({
      typeCode: dto.typeCode,
      label: dto.label,
      value: dto.value,
      sortOrder: dto.sortOrder ?? 0,
      color: dto.color ?? null,
      isDefault: dto.isDefault ?? false,
      isSystem: dto.isSystem ?? false,
      isActive: dto.isActive ?? true,
      remark: dto.remark ?? null,
    }));
  }

  async updateItem(id: number, dto: UpdateDictionaryItemDto): Promise<DictionaryItem> {
    const item = await this.findItem(id);
    if (dto.value && dto.value !== item.value) {
      const exists = await this.itemRepo.findOne({ where: { typeCode: item.typeCode, value: dto.value } });
      if (exists) throw new ConflictException('该字典类型下 value 已存在');
    }
    if (dto.isDefault) await this.clearDefault(item.typeCode);
    Object.assign(item, dto);
    return this.itemRepo.save(item);
  }

  async removeItem(id: number): Promise<{ deleted: true; id: number }> {
    const item = await this.findItem(id);
    if (item.isSystem) throw new BadRequestException('系统内置字典项不能删除，可停用');
    await this.itemRepo.remove(item);
    return { deleted: true, id };
  }

  private async findTypeById(id: number): Promise<DictionaryType> {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException(`字典类型 #${id} 不存在`);
    return type;
  }

  private async clearDefault(typeCode: string): Promise<void> {
    await this.itemRepo.update({ typeCode, isDefault: true }, { isDefault: false });
  }

  private async seedDefaults(): Promise<void> {
    const types: DictionaryTypeSeed[] = [
      { code: 'secret_level', name: '密级', scope: 'security', remark: '成果和附件密级' },
      { code: 'paper_status', name: '论文状态', scope: 'business', remark: '论文成果状态' },
      { code: 'paper_included_type', name: '论文收录类型', scope: 'business', remark: 'SCI/EI/CSCD 等' },
      { code: 'paper_partition', name: '中科院分区', scope: 'business', remark: '论文分区' },
      { code: 'patent_type', name: '专利类型', scope: 'business', remark: '发明/实用新型/外观设计/PCT' },
      { code: 'patent_legal_status', name: '专利法律状态', scope: 'business', remark: '申请中/授权/失效/驳回' },
      { code: 'patent_mark', name: '专利标识', scope: 'security', remark: '普通专利/国防专利/涉密专利' },
      { code: 'fee_type', name: '费用类型', scope: 'business', remark: '申请费/年费/代理费等' },
      { code: 'fee_status', name: '费用状态', scope: 'business', remark: '待缴费/已缴费/已逾期/已取消' },
      { code: 'remind_level', name: '提醒等级', scope: 'business', remark: '普通/重要/紧急' },
      { code: 'transform_type', name: '转化类型', scope: 'business', remark: '技术转让/许可/作价入股' },
      { code: 'transform_status', name: '转化节点', scope: 'business', remark: '合同签订/收款/开票/完成等' },
      { code: 'result_type', name: '成果类型', scope: 'business', remark: '论文/专利/软著/转化' },
    ];

    for (const type of types) {
      const exists = await this.typeRepo.findOne({ where: { code: type.code } });
      if (!exists) await this.typeRepo.save(this.typeRepo.create({ ...type, isSystem: true, isActive: true }));
    }

    const items: DictionaryItemSeed[] = [
      { typeCode: 'secret_level', label: '公开', value: '公开', sortOrder: 1, color: 'info', isDefault: true },
      { typeCode: 'secret_level', label: '内部', value: '内部', sortOrder: 2, color: 'warning' },
      { typeCode: 'secret_level', label: '涉密', value: '涉密', sortOrder: 3, color: 'danger' },
      { typeCode: 'paper_status', label: '在线发表', value: '在线发表', sortOrder: 1, color: 'success', isDefault: true },
      { typeCode: 'paper_status', label: '正式出版', value: '正式出版', sortOrder: 2, color: 'primary' },
      { typeCode: 'paper_included_type', label: 'SCI', value: 'SCI', sortOrder: 1, color: 'success' },
      { typeCode: 'paper_included_type', label: 'EI', value: 'EI', sortOrder: 2, color: 'success' },
      { typeCode: 'paper_included_type', label: 'CSCD', value: 'CSCD', sortOrder: 3, color: 'info' },
      { typeCode: 'paper_included_type', label: 'CSSCI', value: 'CSSCI', sortOrder: 4, color: 'info' },
      { typeCode: 'paper_included_type', label: '中文核心', value: '中文核心', sortOrder: 5, color: 'info' },
      { typeCode: 'paper_included_type', label: '其他', value: '其他', sortOrder: 99, color: 'info', isDefault: true },
      { typeCode: 'paper_partition', label: '一区', value: '一区', sortOrder: 1, color: 'success' },
      { typeCode: 'paper_partition', label: '二区', value: '二区', sortOrder: 2, color: 'primary' },
      { typeCode: 'paper_partition', label: '三区', value: '三区', sortOrder: 3, color: 'warning' },
      { typeCode: 'paper_partition', label: '四区', value: '四区', sortOrder: 4, color: 'info' },
      { typeCode: 'patent_type', label: '发明', value: '发明', sortOrder: 1, color: 'success', isDefault: true },
      { typeCode: 'patent_type', label: '实用新型', value: '实用新型', sortOrder: 2, color: 'primary' },
      { typeCode: 'patent_type', label: '外观设计', value: '外观设计', sortOrder: 3, color: 'info' },
      { typeCode: 'patent_type', label: 'PCT', value: 'PCT', sortOrder: 4, color: 'warning' },
      { typeCode: 'patent_legal_status', label: '申请中', value: '申请中', sortOrder: 1, color: 'warning', isDefault: true },
      { typeCode: 'patent_legal_status', label: '授权', value: '授权', sortOrder: 2, color: 'success' },
      { typeCode: 'patent_legal_status', label: '失效', value: '失效', sortOrder: 3, color: 'danger' },
      { typeCode: 'patent_legal_status', label: '驳回', value: '驳回', sortOrder: 4, color: 'danger' },
      { typeCode: 'fee_status', label: '待缴费', value: 'pending', sortOrder: 1, color: 'warning', isDefault: true },
      { typeCode: 'fee_status', label: '已缴费', value: 'paid', sortOrder: 2, color: 'success' },
      { typeCode: 'fee_status', label: '已逾期', value: 'overdue', sortOrder: 3, color: 'danger' },
      { typeCode: 'fee_status', label: '已取消', value: 'cancelled', sortOrder: 4, color: 'info' },
      { typeCode: 'remind_level', label: '普通', value: '普通', sortOrder: 1, color: 'info', isDefault: true },
      { typeCode: 'remind_level', label: '重要', value: '重要', sortOrder: 2, color: 'warning' },
      { typeCode: 'remind_level', label: '紧急', value: '紧急', sortOrder: 3, color: 'danger' },
    ];

    for (const item of items) {
      const exists = await this.itemRepo.findOne({ where: { typeCode: item.typeCode, value: item.value } });
      if (!exists) await this.itemRepo.save(this.itemRepo.create({ ...item, isSystem: true, isActive: true, remark: null, isDefault: item.isDefault ?? false }));
    }
  }
}
