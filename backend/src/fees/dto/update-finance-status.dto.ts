import { IsString, IsOptional } from 'class-validator';

export class UpdateFinanceStatusDto {
  @IsString() financeStatus!: string;
  @IsOptional() @IsString() financeVoucherNo?: string;
}
