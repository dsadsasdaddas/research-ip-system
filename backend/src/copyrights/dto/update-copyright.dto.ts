import { PartialType } from '@nestjs/mapped-types';
import { CreateCopyrightDto } from './create-copyright.dto';

/** 更新软著:所有字段都可选(只传要改的) */
export class UpdateCopyrightDto extends PartialType(CreateCopyrightDto) {}
