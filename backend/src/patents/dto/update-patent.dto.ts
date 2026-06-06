import { PartialType } from '@nestjs/mapped-types';
import { CreatePatentDto } from './create-patent.dto';

/** 更新专利:所有字段都可选(只传要改的) */
export class UpdatePatentDto extends PartialType(CreatePatentDto) {}
