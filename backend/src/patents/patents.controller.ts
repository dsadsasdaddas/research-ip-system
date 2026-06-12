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
  Res,
  UseGuards,
} from '@nestjs/common';
import { CreatePatentDto } from './dto/create-patent.dto';
import { UpdatePatentDto } from './dto/update-patent.dto';
import { PatentsService } from './patents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import type { Response } from 'express';
import { ExportResourceDto } from '../common/dto/export-resource.dto';
import { sendExportFile } from '../common/utils/export-file';

/**
 * 专利 REST 接口(全局前缀 /api,故实际路径):
 *   POST   /api/patents       新增
 *   GET    /api/patents       列表(?keyword= 按名称搜)
 *   GET    /api/patents/:id   查单条
 *   PATCH  /api/patents/:id   更新
 *   DELETE /api/patents/:id   删除
 */
@UseGuards(JwtAuthGuard)
@Controller('patents')
export class PatentsController {
  constructor(private readonly patentsService: PatentsService) {}

  @Post()
  create(@Body() dto: CreatePatentDto, @CurrentUser() user: AuthUser) {
    return this.patentsService.create(dto, user);
  }

  /**
   * 导出当前(可按 keyword 过滤的)专利列表为 xlsx/csv,直接回传文件流下载。
   * POST /api/patents/export { format, keyword, columns }
   */
  @Post('export')
  async exportResource(
    @Body() dto: ExportResourceDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const rows = await this.patentsService.exportResource(
      { keyword: dto.keyword },
      user,
    );
    const columns = (dto.columns ?? []).map((c) => ({
      key: c.key,
      header: c.header,
    }));
    const today = new Date().toISOString().slice(0, 10);
    await sendExportFile(res, {
      filename: `patents_${today}.${dto.format || 'xlsx'}`,
      format: dto.format || 'xlsx',
      columns,
      rows,
    });
  }

  @Get()
  findAll(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.patentsService.findAll(
      {
        keyword,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      },
      user,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patentsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patentsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.patentsService.remove(id, user);
  }
}
