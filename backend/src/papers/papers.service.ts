import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { Paper } from './entities/paper.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';
import { getSecretLevels } from '../common/utils/secret-filter';
import { escapeLike } from '../common/utils/escape-like';
import { paginate, type PageResult } from '../common/utils/pagination';
import type { BaseListQuery } from '../common/types/index';

/**
 * 论文业务逻辑:真正读写数据库的地方。
 */
@Injectable()
export class PapersService {
  constructor(
    // 注入"论文仓库(Repository)",用它来增删改查 paper 表
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
  ) {}

  /** 新增论文（DOI 唯一性校验 + 归属字段从 user 注入） */
  async create(dto: CreatePaperDto, user: AuthUser) {
    if (dto.doi) {
      const existing = await this.paperRepo.findOne({
        where: { doi: dto.doi },
      });
      if (existing) throw new ConflictException(`DOI "${dto.doi}" 已存在`);
    }
    const { deptId: _ignored, createUser: _ignored2, ...safeDto } = dto;
    void _ignored;
    void _ignored2;
    const paper = this.paperRepo.create({
      ...safeDto,
      deptId: user.deptId ?? null,
      createUser: user.username,
    });
    return this.paperRepo.save(paper);
  }

  /** 列表/导出共用的过滤条件(部门隔离 + 密级 + keyword 按标题) */
  private listQuery(query: BaseListQuery, user?: AuthUser) {
    const deptId = user ? getDeptFilter(user) : undefined;
    const allowedLevels = user ? getSecretLevels(user) : ['公开'];
    const qb = this.paperRepo.createQueryBuilder('p');
    if (deptId != null) qb.andWhere('p.deptId = :deptId', { deptId });
    qb.andWhere('p.secretLevel IN (:...levels)', { levels: allowedLevels });
    if (query.keyword)
      qb.andWhere('p.title LIKE :kw', { kw: `%${escapeLike(query.keyword)}%` });
    return qb;
  }

  /** 查询列表(分页);部门隔离角色只返回本部门;按密级过滤 */
  findAll(query: BaseListQuery, user?: AuthUser): Promise<PageResult<Paper>> {
    return paginate(
      this.listQuery(query, user).orderBy('p.createTime', 'DESC'),
      query.page,
      query.pageSize,
    );
  }

  /** 导出:与列表同样的过滤,但不分页、最多取 10000 行 */
  async exportResource(
    query: BaseListQuery,
    user?: AuthUser,
  ): Promise<Paper[]> {
    return this.listQuery(query, user)
      .orderBy('p.createTime', 'DESC')
      .take(10000)
      .getMany();
  }

  /** 查单条;不存在抛 404；检查密级权限 */
  async findOne(id: number, user?: AuthUser) {
    const paper = await this.paperRepo.findOne({ where: { id } });
    if (!paper) {
      throw new NotFoundException(`论文 #${id} 不存在`);
    }
    if (user) {
      const allowedLevels = getSecretLevels(user);
      const deptId = getDeptFilter(user);
      if (
        !allowedLevels.includes(paper.secretLevel ?? '公开') ||
        (deptId != null && paper.deptId !== deptId)
      ) {
        throw new NotFoundException(`论文 #${id} 不存在`);
      }
    }
    return paper;
  }

  /** 更新 */
  async update(id: number, dto: UpdatePaperDto, user?: AuthUser) {
    const paper = await this.findOne(id, user); // 先确认存在并校验权限
    const {
      deptId: ignoredDeptId,
      createUser: ignoredCreateUser,
      ...safeDto
    } = dto;
    void ignoredDeptId;
    void ignoredCreateUser;
    Object.assign(paper, safeDto); // 合并改动，归属字段不接受前端覆盖
    return this.paperRepo.save(paper);
  }

  /** 删除 */
  async remove(id: number, user?: AuthUser) {
    const paper = await this.findOne(id, user);
    await this.paperRepo.remove(paper);
    return { deleted: true, id };
  }

  /**
   * 通过 DOI 从 CrossRef API 查询论文元数据并映射到本系统字段。
   * CrossRef 文档: https://api.crossref.org/swagger-ui/index.html
   */
  async doiLookup(doi: string) {
    if (!doi) throw new BadRequestException('doi 不能为空');

    interface CrossRefMessage {
      DOI?: string;
      title?: string[];
      author?: Array<{ given?: string; family?: string }>;
      'container-title'?: string[];
      ISSN?: string[];
      volume?: string;
      issue?: string;
      page?: string;
      abstract?: string;
      'is-referenced-by-count'?: number;
      published?: { 'date-parts': number[][] };
      'published-print'?: { 'date-parts': number[][] };
    }
    interface CrossRefApiResponse {
      message?: CrossRefMessage;
    }

    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    let json: CrossRefApiResponse;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ResearchMIS/1.0 (mailto:admin@example.com)' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404)
        throw new NotFoundException(`DOI "${doi}" 未找到`);
      if (!res.ok) throw new BadRequestException(`CrossRef 返回 ${res.status}`);
      json = (await res.json()) as CrossRefApiResponse;
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException)
        throw e;
      throw new BadRequestException(
        '请求 CrossRef 失败: ' + (e as Error).message,
      );
    }

    const m = json?.message;
    if (!m) throw new BadRequestException('CrossRef 返回数据异常');

    // ---- 作者列表 ----
    const authors: Array<{ given?: string; family?: string }> = m.author ?? [];
    const authorNames = authors.map((a) =>
      [a.given, a.family].filter(Boolean).join(' '),
    );
    const firstAuthor = authorNames[0] ?? '';

    // ---- 卷期页码 ----
    const parts = [
      m.volume ? `Vol.${m.volume}` : '',
      m.issue ? `(${m.issue})` : '',
      m.page ? `, ${m.page}` : '',
    ].filter(Boolean);
    const volumePage = parts.join('');

    // ---- 摘要(去掉 JATS XML 标签) ----
    const rawAbstract: string = m.abstract ?? '';
    const summary = rawAbstract.replace(/<[^>]+>/g, '').trim();

    // ---- 发表年份 ----
    const publishYear: number | null =
      m.published?.['date-parts']?.[0]?.[0] ??
      m['published-print']?.['date-parts']?.[0]?.[0] ??
      null;

    return {
      doi: m.DOI ?? doi,
      title: m.title?.[0] ?? '',
      firstAuthor,
      authors: authorNames.join(', '),
      journal: m['container-title']?.[0] ?? '',
      issnCn: m.ISSN?.[0] ?? '',
      volumePage,
      publishYear,
      citationCount: m['is-referenced-by-count'] ?? 0,
      summary,
    };
  }
}
