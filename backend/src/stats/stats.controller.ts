import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** GET /api/stats — 统计看板所有数据一次返回 */
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Get()
  getAll() {
    return this.svc.getAll();
  }
}
