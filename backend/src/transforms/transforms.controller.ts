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
import { CreateTransformDto } from './dto/create-transform.dto';
import { UpdateTransformDto } from './dto/update-transform.dto';
import { TransformsService } from './transforms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 成果转化 REST 接口:
 *   POST   /api/transforms
 *   GET    /api/transforms        ?keyword=交易对方
 *   GET    /api/transforms/:id
 *   PATCH  /api/transforms/:id
 *   DELETE /api/transforms/:id
 */
@UseGuards(JwtAuthGuard)
@Controller('transforms')
export class TransformsController {
  constructor(private readonly svc: TransformsService) {}

  @Post()
  create(@Body() dto: CreateTransformDto) {
    return this.svc.create(dto);
  }

  @Get()
  findAll(@Query('keyword') keyword?: string) {
    return this.svc.findAll(keyword);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransformDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
