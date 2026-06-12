import type { Response } from 'express';
import {
  generateCsvBuffer,
  generateXlsxBuffer,
  sendExportFile,
} from '../export-file';

describe('generateCsvBuffer', () => {
  it('有 columns 时用 columns,带 UTF-8 BOM 与 CRLF', () => {
    const buf = generateCsvBuffer(
      [{ key: 'a', header: '甲' }],
      [{ a: 1 }, { a: 2 }],
    );
    const txt = buf.toString('utf8');
    expect(txt.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(txt).toContain('甲');
    expect(txt).toContain('\r\n');
  });

  it('无 columns 有 rows 时用首行 key', () => {
    const buf = generateCsvBuffer([], [{ a: 1, b: 2 }]);
    expect(buf.toString('utf8')).toContain('a,b');
  });

  it('无 columns 无 rows 时仅含 BOM', () => {
    expect(generateCsvBuffer([], []).toString('utf8')).toBe('﻿');
  });

  it('转义含逗号/引号/换行的字段', () => {
    const buf = generateCsvBuffer(
      [{ key: 'v', header: 'V' }],
      [{ v: 'a,b"c\nd' }],
    );
    expect(buf.toString('utf8')).toContain('"a,b""c\nd"');
  });

  it('表头为空时回退用 key', () => {
    const buf = generateCsvBuffer([{ key: 'a', header: '' }], [{ a: 1 }]);
    const txt = buf.toString('utf8');
    expect(txt).toContain('a');
    expect(txt).toContain('1');
  });

  it('null/Date/object 单元格序列化', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    const buf = generateCsvBuffer(
      [
        { key: 'n', header: 'N' },
        { key: 'd', header: 'D' },
        { key: 'o', header: 'O' },
      ],
      [{ n: null, d, o: { x: 1 } }],
    );
    const txt = buf.toString('utf8');
    // object → JSON.stringify 后再被 CSV 转义(引号翻倍),故出现 ""x""
    expect(txt).toContain('""x""');
    expect(txt).toContain('2024'); // Date → toLocaleString(含年份)
  });
});

describe('generateXlsxBuffer', () => {
  it('生成非空 xlsx Buffer(zip PK 头)', async () => {
    const buf = await generateXlsxBuffer(
      [{ key: 'a', header: '甲' }],
      [{ a: 1 }],
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.slice(0, 2).toString('ascii')).toBe('PK');
  });

  it('无 columns 有 rows 时用首行 key', async () => {
    const buf = await generateXlsxBuffer([], [{ a: 1 }]);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('表头为空时回退用 key', async () => {
    const buf = await generateXlsxBuffer(
      [{ key: 'a', header: '' }],
      [{ a: 1 }],
    );
    expect(buf.length).toBeGreaterThan(0);
  });

  it('空 columns 空 rows 也能生成', async () => {
    const buf = await generateXlsxBuffer([], []);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});

describe('sendExportFile', () => {
  function makeRes(): Response {
    return {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      end: jest.fn(),
    } as unknown as Response;
  }

  it('csv: 设 text/csv 头 + 200 + end(Buffer)', async () => {
    const res = makeRes();
    await sendExportFile(res, {
      filename: 'a.csv',
      format: 'csv',
      columns: [{ key: 'a', header: 'A' }],
      rows: [{ a: 1 }],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('a.csv'),
    );
    expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('xlsx: 设 spreadsheetml 头', async () => {
    const res = makeRes();
    await sendExportFile(res, {
      filename: 'a.xlsx',
      format: 'xlsx',
      columns: [{ key: 'a', header: 'A' }],
      rows: [{ a: 1 }],
    });
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      expect.stringContaining('spreadsheetml'),
    );
  });

  it('format 未指定时按 xlsx 处理', async () => {
    const res = makeRes();
    await sendExportFile(res, {
      filename: 'a',
      format: '',
      columns: [],
      rows: [],
    });
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      expect.stringContaining('spreadsheetml'),
    );
  });
});
