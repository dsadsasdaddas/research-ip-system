import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacRole } from './entities/rbac-role.entity';
import { RbacPermission } from './entities/rbac-permission.entity';
import { RbacRolePermission } from './entities/rbac-role-permission.entity';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RbacRole, RbacPermission, RbacRolePermission]),
  ],
  providers: [RbacService],
  controllers: [RbacController],
  exports: [RbacService],
})
export class RbacModule {}
