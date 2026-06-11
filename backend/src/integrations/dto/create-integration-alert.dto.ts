import { IsOptional, IsString } from 'class-validator';

export class CreateIntegrationAlertDto {
  @IsString()
  integrationType!: string;

  @IsOptional() @IsString()
  alertLevel?: string;

  @IsString()
  title!: string;

  @IsOptional() @IsString()
  content?: string | null;
}

export class HandleIntegrationAlertDto {
  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  handlerName?: string | null;
}
