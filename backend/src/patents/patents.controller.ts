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
import { CreatePatentDto } from './dto/create-patent.dto';
import { UpdatePatentDto } from './dto/update-patent.dto';
import { PatentsService } from './patents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';

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

  @Get()
  findAll(@Query('keyword') keyword?: string, @CurrentUser() user?: AuthUser) {
    return this.patentsService.findAll(keyword, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.patentsService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatentDto, @CurrentUser() user: AuthUser) {
    return this.patentsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.patentsService.remove(id, user);
  }
}
