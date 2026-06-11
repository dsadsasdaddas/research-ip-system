import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';
import { DepartmentsService } from './departments.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYS_ADMIN)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly svc: DepartmentsService) {}

  @Get()
  findAll(@Query('keyword') keyword?: string): Promise<Department[]> {
    return this.svc.findAll(keyword);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Department> {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDepartmentDto): Promise<Department> {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepartmentDto): Promise<Department> {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ deleted: true; id: number }> {
    return this.svc.remove(id);
  }
}
