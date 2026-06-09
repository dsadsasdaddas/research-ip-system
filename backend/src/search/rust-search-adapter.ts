import { Injectable } from '@nestjs/common';
import { createRequire } from 'module';
import { join } from 'path';

export type RustSearchDocType = 'paper' | 'patent' | 'copyright';

export interface RustSearchDoc {
  id: number;
  type: RustSearchDocType;
  title: string;
  content: string;
}

export interface RustSearchHit {
  id: number;
  type: RustSearchDocType;
  title: string;
  score: number;
}

interface RustSearchNativeModule {
  search(docsJson: string, keyword: string): string;
}

function isRustSearchNativeModule(value: unknown): value is RustSearchNativeModule {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { search?: unknown };
  return typeof candidate.search === 'function';
}

function isRustSearchHit(value: unknown): value is RustSearchHit {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<RustSearchHit>;
  return (
    typeof candidate.id === 'number' &&
    (candidate.type === 'paper' || candidate.type === 'patent' || candidate.type === 'copyright') &&
    typeof candidate.title === 'string' &&
    typeof candidate.score === 'number'
  );
}

@Injectable()
export class RustSearchAdapter {
  private readonly nativeModule: RustSearchNativeModule;

  constructor() {
    const requireNative = createRequire(__filename);
    const addonPath = join(process.cwd(), 'native', 'search-engine', 'index.node');
    const loadedModule: unknown = requireNative(addonPath);

    if (!isRustSearchNativeModule(loadedModule)) {
      throw new Error(`Invalid Rust search addon exports: ${addonPath}`);
    }

    this.nativeModule = loadedModule;
  }

  search(docs: RustSearchDoc[], keyword: string): RustSearchHit[] {
    const raw = this.nativeModule.search(JSON.stringify(docs), keyword);
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('Rust search returned non-array JSON');
    }

    return parsed.filter(isRustSearchHit);
  }
}
