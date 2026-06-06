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
import { CreateCopyrightDto } from './dto/create-copyright.dto';
import { UpdateCopyrightDto } from './dto/update-copyright.dto';
import { CopyrightsService } from './copyrights.service';

/**
 * 软著 REST 接口(全局前缀 /api,故实际路径):
 *   POST   /api/copyrights       新增
 *   GET    /api/copyrights       列表(?keyword= 按名称搜)
 *   GET    /api/copyrights/:id   查单条
 *   PATCH  /api/copyrights/:id   更新
 *   DELETE /api/copyrights/:id   删除
 */
@Controller('copyrights')
export class CopyrightsController {
  constructor(private readonly copyrightsService: CopyrightsService) {}

  @Post()
  create(@Body() dto: CreateCopyrightDto) {
    return this.copyrightsService.create(dto);
  }

  @Get()
  findAll(@Query('keyword') keyword?: string) {
    return this.copyrightsService.findAll(keyword);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.copyrightsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCopyrightDto) {
    return this.copyrightsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.copyrightsService.remove(id);
  }
}
