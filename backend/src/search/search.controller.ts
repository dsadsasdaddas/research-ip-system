import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private svc: SearchService) {}

  @Get()
  search(
    @Query('q')     q: string,
    @Query('types') types: string,
    @CurrentUser()  user: AuthUser,
  ) {
    const typeArr = types ? types.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return this.svc.search(q ?? '', typeArr, user);
  }
}
