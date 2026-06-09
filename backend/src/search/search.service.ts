import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paper } from '../papers/entities/paper.entity';
import { Patent } from '../patents/entities/patent.entity';
import { Copyright } from '../copyrights/entities/copyright.entity';
import type { AuthUser } from '../auth/types/auth-user.interface';
import { getDeptFilter } from '../common/utils/dept-filter';
import { RustSearchAdapter, RustSearchDoc, RustSearchDocType } from './rust-search-adapter';

export interface SearchResultItem {
  type: 'paper' | 'patent' | 'copyright';
  typeLabel: string;
  id: number;
  title: string;
  meta: string;
  createTime: Date;
  score: number;
}

export interface SearchResult {
  engine: 'rust';
  elapsedMs: number;
  total: number;
  items: SearchResultItem[];
}

interface IndexedSearchItem {
  doc: RustSearchDoc;
  result: SearchResultItem;
}

function isRequestedType(types: string[], type: RustSearchDocType): boolean {
  return types.length === 0 || types.includes(type);
}

function joinContent(parts: Array<string | number | null | undefined>): string {
  return parts.filter((part) => part !== null && part !== undefined && part !== '').join(' ');
}

function keyOf(type: RustSearchDocType, id: number): string {
  return `${type}:${id}`;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Paper) private paperRepo: Repository<Paper>,
    @InjectRepository(Patent) private patentRepo: Repository<Patent>,
    @InjectRepository(Copyright) private copyrightRepo: Repository<Copyright>,
    private readonly rustSearch: RustSearchAdapter,
  ) {}

  async search(q: string, types: string[], user: AuthUser): Promise<SearchResult> {
    const keyword = q.trim();
    if (!keyword) return { engine: 'rust', elapsedMs: 0, total: 0, items: [] };

    const startedAt = process.hrtime.bigint();
    const indexedItems = await this.loadIndexedItems(types, user);
    const docs = indexedItems.map((item) => item.doc);
    const byKey = new Map(indexedItems.map((item) => [keyOf(item.doc.type, item.doc.id), item.result]));

    const hits = this.rustSearch.search(docs, keyword);
    const items = hits
      .map((hit) => {
        const result = byKey.get(keyOf(hit.type, hit.id));
        return result ? { ...result, score: hit.score } : null;
      })
      .filter((item): item is SearchResultItem => item !== null)
      .slice(0, 50);

    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    return { engine: 'rust', elapsedMs, total: items.length, items };
  }

  private async loadIndexedItems(types: string[], user: AuthUser): Promise<IndexedSearchItem[]> {
    const deptId = getDeptFilter(user);
    const items: IndexedSearchItem[] = [];

    if (isRequestedType(types, 'paper')) {
      const qb = this.paperRepo.createQueryBuilder('p').orderBy('p.publish_year', 'DESC');
      if (deptId != null) qb.andWhere('p.dept_id = :did', { did: deptId });
      const rows = await qb.getMany();
      rows.forEach((row) => items.push(this.indexPaper(row)));
    }

    if (isRequestedType(types, 'patent')) {
      const qb = this.patentRepo.createQueryBuilder('p').orderBy('p.filing_date', 'DESC');
      if (deptId != null) qb.andWhere('p.dept_id = :did', { did: deptId });
      const rows = await qb.getMany();
      rows.forEach((row) => items.push(this.indexPatent(row)));
    }

    if (isRequestedType(types, 'copyright')) {
      const qb = this.copyrightRepo.createQueryBuilder('c').orderBy('c.register_date', 'DESC');
      if (deptId != null) qb.andWhere('c.dept_id = :did', { did: deptId });
      const rows = await qb.getMany();
      rows.forEach((row) => items.push(this.indexCopyright(row)));
    }

    return items;
  }

  private indexPaper(row: Paper): IndexedSearchItem {
    const type: RustSearchDocType = 'paper';
    const title = row.title;
    const meta = [row.authors, row.journal, row.publishYear].filter(Boolean).join(' · ');
    return {
      doc: {
        type,
        id: row.id,
        title,
        content: joinContent([
          row.title,
          row.doi,
          row.firstAuthor,
          row.correspondingAuthor,
          row.authors,
          row.outerAuthors,
          row.cooperateUnit,
          row.journal,
          row.issnCn,
          row.volumePage,
          row.publishYear,
          row.includedType,
          row.partition,
          row.status,
          row.summary,
          row.secretLevel,
          row.dependProject,
        ]),
      },
      result: { type, typeLabel: '论文', id: row.id, title, meta, createTime: row.createTime, score: 0 },
    };
  }

  private indexPatent(row: Patent): IndexedSearchItem {
    const type: RustSearchDocType = 'patent';
    const title = row.name;
    const meta = [row.patentType, row.legalStatus, row.applicationNo].filter(Boolean).join(' · ');
    return {
      doc: {
        type,
        id: row.id,
        title,
        content: joinContent([
          row.name,
          row.inventors,
          row.outerInventors,
          row.patentee,
          row.applicationNo,
          row.grantNo,
          row.filingDate,
          row.grantDate,
          row.patentType,
          row.country,
          row.nextFeeDate,
          row.agency,
          row.legalStatus,
          row.pctStage,
          row.nationalStage,
          row.entryDate,
          row.patentMark,
          row.dependProject,
          row.fundSource,
          row.secretLevel,
        ]),
      },
      result: { type, typeLabel: '专利', id: row.id, title, meta, createTime: row.createTime, score: 0 },
    };
  }

  private indexCopyright(row: Copyright): IndexedSearchItem {
    const type: RustSearchDocType = 'copyright';
    const title = row.name;
    const meta = [row.copyrightOwner, row.registrationNo].filter(Boolean).join(' · ');
    return {
      doc: {
        type,
        id: row.id,
        title,
        content: joinContent([
          row.name,
          row.copyrightOwner,
          row.registrationNo,
          row.publishDate,
          row.registerDate,
          row.version,
          row.softwareType,
          row.softwareIntro,
          row.runEnv,
          row.cooperateUnit,
          row.dependProject,
          row.secretLevel,
        ]),
      },
      result: { type, typeLabel: '软著', id: row.id, title, meta, createTime: row.createTime, score: 0 },
    };
  }
}
