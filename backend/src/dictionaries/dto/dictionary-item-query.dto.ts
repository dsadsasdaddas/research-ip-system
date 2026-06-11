import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DictionaryItemQueryDto {
  @IsOptional()
  @IsString()
  typeCode?: string;

  @IsOptional()
  @Transform(({ value }: { value: string | boolean | undefined }) => {
    if (value === undefined || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true';
  })
  @IsBoolean()
  activeOnly?: boolean;
}
