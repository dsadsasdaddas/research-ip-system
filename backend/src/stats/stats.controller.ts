import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

/** GET /api/stats — 统计看板所有数据一次返回 */
@Controller('stats')
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Get()
  getAll() {
    return this.svc.getAll();
  }
}
