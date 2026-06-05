import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { PapersService } from './papers.service';

/**
 * 论文 REST 接口(统一前缀 /papers):
 *   POST   /papers         新增论文
 *   GET    /papers         列表(?keyword=xxx 按标题搜)
 *   GET    /papers/:id     查单条
 *   PATCH  /papers/:id     更新
 *   DELETE /papers/:id     删除
 */
@Controller('papers')
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  @Post()
  create(@Body() dto: CreatePaperDto) {
    return this.papersService.create(dto);
  }

  @Get()
  findAll(@Query('keyword') keyword?: string) {
    return this.papersService.findAll(keyword);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.papersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaperDto) {
    return this.papersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.papersService.remove(id);
  }
}
