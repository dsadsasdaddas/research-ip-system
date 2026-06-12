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
import { CreateTransformDto } from './dto/create-transform.dto';
import { UpdateTransformDto } from './dto/update-transform.dto';
import { CreateTransformDistributionDto } from './dto/create-transform-distribution.dto';
import { UpdateTransformDistributionDto } from './dto/update-transform-distribution.dto';
import { TransformsService } from './transforms.service';
import { TransformDistributionsService } from './transform-distributions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';
import type { Response } from 'express';
import { ExportResourceDto } from '../common/dto/export-resource.dto';
import { sendExportFile } from '../common/utils/export-file';

/**
 * 成果转化 REST 接口:
 *   POST   /api/transforms
 *   GET    /api/transforms        ?keyword=交易对方
 *   GET    /api/transforms/:id
 *   PATCH  /api/transforms/:id
 *   DELETE /api/transforms/:id
 *
 * 分配记录嵌套路由:
 *   GET    /api/transforms/:transformId/distributions
 *   POST   /api/transforms/:transformId/distributions
 *   PATCH  /api/transform-distributions/:id
 *   DELETE /api/transform-distributions/:id
 */
@UseGuards(JwtAuthGuard)
@Controller('transforms')
export class TransformsController {
  constructor(
    private readonly svc: TransformsService,
    private readonly distSvc: TransformDistributionsService,
  ) {}

  @Post()
  create(@Body() dto: CreateTransformDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user);
  }

  /**
   * 导出当前(可按 keyword 过滤的)成果转化列表为 xlsx/csv,直接回传文件流下载。
   * POST /api/transforms/export { format, keyword, columns }
   */
  @Post('export')
  async exportResource(
    @Body() dto: ExportResourceDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const rows = await this.svc.exportResource({ keyword: dto.keyword }, user);
    const columns = (dto.columns ?? []).map((c) => ({
      key: c.key,
      header: c.header,
    }));
    const today = new Date().toISOString().slice(0, 10);
    await sendExportFile(res, {
      filename: `transforms_${today}.${dto.format || 'xlsx'}`,
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
    return this.svc.findAll(
      {
        keyword,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      },
      user,
    );
  }

  // ========== 分配记录嵌套路由 (必须在 :id 路由之前) ==========

  @Get(':transformId/distributions')
  listDistributions(@Param('transformId', ParseIntPipe) transformId: number) {
    return this.distSvc.findByTransform(transformId);
  }

  @Post(':transformId/distributions')
  createDistribution(
    @Param('transformId', ParseIntPipe) transformId: number,
    @Body() dto: CreateTransformDistributionDto,
  ) {
    return this.distSvc.create(transformId, dto);
  }

  // ========== 主资源 CRUD ==========

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransformDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.svc.remove(id, user);
  }
}

/**
 * 独立控制器：分配记录的更新 / 删除使用不带前缀的 /api/transform-distributions 路由。
 */
@UseGuards(JwtAuthGuard)
@Controller('transform-distributions')
export class TransformDistributionsController {
  constructor(private readonly distSvc: TransformDistributionsService) {}

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransformDistributionDto,
  ) {
    return this.distSvc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.distSvc.remove(id);
  }
}
