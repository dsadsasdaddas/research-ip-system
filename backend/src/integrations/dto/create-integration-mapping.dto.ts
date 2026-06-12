import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateIntegrationMappingDto {
  @IsString()
  integrationType!: string;

  @IsString()
  businessModule!: string;

  @IsString()
  externalField!: string;

  @IsString()
  internalField!: string;

  @IsOptional()
  @IsString()
  transformRule?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
