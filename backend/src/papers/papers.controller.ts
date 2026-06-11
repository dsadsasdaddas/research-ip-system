import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreatePaperDto } from './dto/create-paper.dto';
import { UpdatePaperDto } from './dto/update-paper.dto';
import { PapersService } from './papers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';

/**
 * 论文 REST 接口(全局前缀 /api 见 main.ts,故实际路径如下):
 *   POST   /api/papers         新增论文
 *   GET    /api/papers         列表(?keyword=xxx 按标题搜)
 *   GET    /api/papers/:id     查单条
 *   PATCH  /api/papers/:id     更新
 *   DELETE /api/papers/:id     删除
 */
@UseGuards(JwtAuthGuard)
@Controller('papers')
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  @Post()
  create(@Body() dto: CreatePaperDto, @CurrentUser() user: AuthUser) {
    return this.papersService.create(dto, user);
  }

  @Get()
  findAll(@Query('keyword') keyword?: string, @CurrentUser() user?: AuthUser) {
    return this.papersService.findAll(keyword, user);
  }

  /**
   * DOI 自动补全:按 DOI 从 CrossRef 查询元数据并返回可直接填入表单的字段。
   * 路由必须在 :id 之前,否则 'doi-lookup' 会被当作 id 参数。
   * GET /api/papers/doi-lookup?doi=10.xxxx/xxxxx
   */
  @Get('doi-lookup')
  doiLookup(@Query('doi') doi?: string) {
    if (!doi) throw new BadRequestException('请提供 doi 查询参数');
    return this.papersService.doiLookup(doi);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.papersService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaperDto, @CurrentUser() user: AuthUser) {
    return this.papersService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.papersService.remove(id, user);
  }
}
