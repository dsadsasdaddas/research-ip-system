import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchLogsService } from './search-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { QuerySearchLogDto } from './dto/query-search-log.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('search-logs')
export class SearchLogsController {
  constructor(private svc: SearchLogsService) {}

  @Get()
  @Roles(UserRole.SYS_ADMIN)
  findAll(@Query() query: QuerySearchLogDto) {
    return this.svc.findAll({
      keyword: query.keyword,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('hot-keywords')
  hotKeywords(@Query('limit') limit?: string) {
    return this.svc.findHotKeywords(limit ? +limit : 10);
  }
}
