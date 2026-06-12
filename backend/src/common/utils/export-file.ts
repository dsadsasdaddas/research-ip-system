import * as ExcelJS from 'exceljs';
import type { Response } from 'express';

/**
 * 成果类资源(论文/专利/软著/转化)导出用的通用文件生成 + 回传工具。
 * 报表模块(reports.service)各自有同源实现,这里给资源 controller 的「导出当前列表」用。
 */
export interface ExportColumn {
  /** 行数据里的字段名(实体属性名,camelCase) */
  key: string;
  /** 表头显示文案 */
  header: string;
}

/** 没有 columns 时,退化为「取首行所有 key」作为列 */
function resolveColumns(
  columns: ExportColumn[],
  rows: readonly object[],
): ExportColumn[] {
  if (columns.length > 0) return columns;
  if (rows.length > 0)
    return Object.keys(rows[0]).map((k) => ({ key: k, header: k }));
  return [];
}

/** 生成 xlsx Buffer(exceljs) */
export async function generateXlsxBuffer(
  columns: ExportColumn[],
  rows: readonly object[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('数据');
  const cols = resolveColumns(columns, rows);
  if (cols.length > 0) {
    ws.columns = cols.map((c) => ({
      header: c.header || c.key,
      key: c.key,
      width: 20,
    }));
    rows.forEach((r) => ws.addRow(r));
  }
  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
}

/**
 * 生成 csv Buffer。手写 RFC 4180:
 *  - 开头加 UTF-8 BOM(EF BB BF),否则 Windows 下 Excel 按 GBK 解码,中文全乱码;
 *  - 行尾用 CRLF,适配 Windows Excel;
 *  - 含逗号/引号/换行的字段用双引号包裹,内部引号翻倍。
 */
export function generateCsvBuffer(
  columns: ExportColumn[],
  rows: readonly object[],
): Buffer {
  const cols = resolveColumns(columns, rows);

  const escapeCell = (raw: unknown): string => {
    let s: string;
    if (raw === null || raw === undefined) {
      s = '';
    } else if (raw instanceof Date) {
      s = raw.toLocaleString('zh-CN');
    } else if (typeof raw === 'object') {
      s = JSON.stringify(raw);
    } else {
      s = String(raw);
    }
    if (/[",\r\n]/.test(s)) {
      s = `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines: string[] = [];
  if (cols.length > 0) {
    lines.push(cols.map((c) => escapeCell(c.header || c.key)).join(','));
    rows.forEach((row) => {
      const r = row as Record<string, unknown>;
      lines.push(cols.map((c) => escapeCell(r[c.key])).join(','));
    });
  }
  const content = '﻿' + lines.join('\r\n') + (lines.length > 0 ? '\r\n' : '');
  return Buffer.from(content, 'utf8');
}

/**
 * 按格式生成文件并直接通过 Response 回传(attachment 下载)。
 * format 非 csv 一律按 xlsx 处理。rows 用 object[] 以兼容各类实体(它们没有字符串索引签名,
 * 不能直接当 Record<string,unknown> 用)。
 */
export async function sendExportFile(
  res: Response,
  opts: {
    filename: string;
    format: string;
    columns: ExportColumn[];
    rows: readonly object[];
  },
): Promise<void> {
  const ext = (opts.format || 'xlsx').toLowerCase() === 'csv' ? 'csv' : 'xlsx';
  const buf =
    ext === 'csv'
      ? generateCsvBuffer(opts.columns, opts.rows)
      : await generateXlsxBuffer(opts.columns, opts.rows);
  const mime =
    ext === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  // 显式 200:导出是文件下载而非资源创建,避免 @Post 默认的 201 让严格判断 ===200 的客户端误判失败
  res.status(200);
  res.setHeader('Content-Type', mime);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(opts.filename)}"`,
  );
  res.end(buf);
}
