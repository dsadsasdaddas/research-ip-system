import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * 成果类资源「导出当前列表」的请求体(papers/patents/copyrights/transforms 共用)。
 *   - format:  xlsx | csv,缺省 xlsx
 *   - keyword: 与列表搜索同义,空表示导出全部(仍受部门/密级隔离约束)
 *   - columns: 可选,前端把表格列配置 {key,header} 传过来做表头(中文);不传则后端退化为全字段
 *
 * 全局 ValidationPipe 是 { whitelist: true, transform: true },故每个要保留的字段都必须带装饰器
 * (否则被 whitelist 剥掉),嵌套数组靠 @Type(() => ExportColumnDto) 转换。
 */
export class ExportColumnDto {
  @IsString()
  key!: string;

  @IsString()
  header!: string;
}

export class ExportResourceDto {
  @IsOptional()
  @IsIn(['xlsx', 'csv'])
  format?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExportColumnDto)
  columns?: ExportColumnDto[];
}
