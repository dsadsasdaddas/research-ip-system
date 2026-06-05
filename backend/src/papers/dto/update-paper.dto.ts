import { PartialType } from '@nestjs/mapped-types';
import { CreatePaperDto } from './create-paper.dto';

/**
 * 更新论文:继承 CreatePaperDto,但所有字段都变成可选
 * (PartialType 帮我们自动把每个字段标成可选,不用重写一遍)
 */
export class UpdatePaperDto extends PartialType(CreatePaperDto) {}
