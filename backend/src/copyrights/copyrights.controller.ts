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
  UseGuards,
} from '@nestjs/common';
import { CreateCopyrightDto } from './dto/create-copyright.dto';
import { UpdateCopyrightDto } from './dto/update-copyright.dto';
import { CopyrightsService } from './copyrights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';

/**
 * 软著 REST 接口(全局前缀 /api,故实际路径):
 *   POST   /api/copyrights       新增
 *   GET    /api/copyrights       列表(?keyword= 按名称搜)
 *   GET    /api/copyrights/:id   查单条
 *   PATCH  /api/copyrights/:id   更新
 *   DELETE /api/copyrights/:id   删除
 */
@UseGuards(JwtAuthGuard)
@Controller('copyrights')
export class CopyrightsController {
  constructor(private readonly copyrightsService: CopyrightsService) {}

  @Post()
  create(@Body() dto: CreateCopyrightDto, @CurrentUser() user: AuthUser) {
    return this.copyrightsService.create(dto, user);
  }

  @Get()
  findAll(@Query('keyword') keyword?: string, @CurrentUser() user?: AuthUser) {
    return this.copyrightsService.findAll(keyword, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.copyrightsService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCopyrightDto, @CurrentUser() user: AuthUser) {
    return this.copyrightsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.copyrightsService.remove(id, user);
  }
}
