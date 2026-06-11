import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { CreateDictionaryTypeDto } from './dto/create-dictionary-type.dto';
import { DictionaryItemQueryDto } from './dto/dictionary-item-query.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import { UpdateDictionaryTypeDto } from './dto/update-dictionary-type.dto';
import { DictionariesService } from './dictionaries.service';
import { DictionaryItem } from './entities/dictionary-item.entity';
import { DictionaryType } from './entities/dictionary-type.entity';

@UseGuards(JwtAuthGuard)
@Controller('dictionaries')
export class DictionariesController {
  constructor(private readonly svc: DictionariesService) {}

  @Get('types')
  findTypes(): Promise<DictionaryType[]> {
    return this.svc.findTypes();
  }

  @Get('types/:code')
  findType(@Param('code') code: string): Promise<DictionaryType> {
    return this.svc.findTypeByCode(code);
  }

  @Post('types')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  createType(@Body() dto: CreateDictionaryTypeDto): Promise<DictionaryType> {
    return this.svc.createType(dto);
  }

  @Patch('types/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  updateType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictionaryTypeDto): Promise<DictionaryType> {
    return this.svc.updateType(id, dto);
  }

  @Delete('types/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  removeType(@Param('id', ParseIntPipe) id: number): Promise<{ deleted: true; id: number }> {
    return this.svc.removeType(id);
  }

  @Get('items')
  findItems(@Query() query: DictionaryItemQueryDto): Promise<DictionaryItem[]> {
    return this.svc.findItems(query);
  }

  @Get('items/:id')
  findItem(@Param('id', ParseIntPipe) id: number): Promise<DictionaryItem> {
    return this.svc.findItem(id);
  }

  @Post('items')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  createItem(@Body() dto: CreateDictionaryItemDto): Promise<DictionaryItem> {
    return this.svc.createItem(dto);
  }

  @Patch('items/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  updateItem(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictionaryItemDto): Promise<DictionaryItem> {
    return this.svc.updateItem(id, dto);
  }

  @Delete('items/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYS_ADMIN)
  removeItem(@Param('id', ParseIntPipe) id: number): Promise<{ deleted: true; id: number }> {
    return this.svc.removeItem(id);
  }
}
