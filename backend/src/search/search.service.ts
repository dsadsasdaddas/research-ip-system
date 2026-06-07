import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paper } from '../papers/entities/paper.entity';
import { Patent } from '../patents/entities/patent.entity';
import { Copyright } from '../copyrights/entities/copyright.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';

export interface SearchResultItem {
  type: 'paper' | 'patent' | 'copyright';
  typeLabel: string;
  id: number;
  title: string;
  meta: string;
  createTime: Date;
}

export interface SearchResult {
  total: number;
  items: SearchResultItem[];
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Paper)     private paperRepo: Repository<Paper>,
    @InjectRepository(Patent)    private patentRepo: Repository<Patent>,
    @InjectRepository(Copyright) private copyrightRepo: Repository<Copyright>,
  ) {}

  async search(q: string, types: string[], user: AuthUser): Promise<SearchResult> {
    if (!q.trim()) return { total: 0, items: [] };
    const kw = `%${q.trim()}%`;
    const deptId = getDeptFilter(user);
    const results: SearchResultItem[] = [];

    // ----- 论文 -----
    if (!types.length || types.includes('paper')) {
      const qb = this.paperRepo.createQueryBuilder('p')
        .where('(p.title LIKE :kw OR p.authors LIKE :kw OR p.doi LIKE :kw OR p.journal LIKE :kw)', { kw })
        .orderBy('p.publish_year', 'DESC')
        .take(30);
      if (deptId != null) qb.andWhere('p.dept_id = :did', { did: deptId });
      const rows = await qb.getMany();
      rows.forEach((r) => results.push({
        type: 'paper', typeLabel: '论文',
        id: r.id, title: r.title,
        meta: [r.authors, r.journal, r.publishYear].filter(Boolean).join(' · '),
        createTime: r.createTime,
      }));
    }

    // ----- 专利 -----
    if (!types.length || types.includes('patent')) {
      const qb = this.patentRepo.createQueryBuilder('p')
        .where('(p.name LIKE :kw OR p.inventors LIKE :kw OR p.application_no LIKE :kw OR p.grant_no LIKE :kw)', { kw })
        .orderBy('p.filing_date', 'DESC')
        .take(30);
      if (deptId != null) qb.andWhere('p.dept_id = :did', { did: deptId });
      const rows = await qb.getMany();
      rows.forEach((r) => results.push({
        type: 'patent', typeLabel: '专利',
        id: r.id, title: r.name,
        meta: [r.patentType, r.legalStatus, r.applicationNo].filter(Boolean).join(' · '),
        createTime: r.createTime,
      }));
    }

    // ----- 软著 -----
    if (!types.length || types.includes('copyright')) {
      const qb = this.copyrightRepo.createQueryBuilder('c')
        .where('(c.name LIKE :kw OR c.copyright_owner LIKE :kw OR c.registration_no LIKE :kw)', { kw })
        .orderBy('c.reg_date', 'DESC')
        .take(30);
      if (deptId != null) qb.andWhere('c.dept_id = :did', { did: deptId });
      const rows = await qb.getMany();
      rows.forEach((r) => results.push({
        type: 'copyright', typeLabel: '软著',
        id: r.id, title: r.name,
        meta: [r.copyrightOwner, r.registrationNo].filter(Boolean).join(' · '),
        createTime: r.createTime,
      }));
    }

    results.sort((a, b) => (b.createTime > a.createTime ? 1 : -1));
    return { total: results.length, items: results };
  }
}
