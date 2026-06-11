import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecretAccessGrant } from './entities/secret-access-grant.entity';
import { SecretAccessLog } from './entities/secret-access-log.entity';
import { SecretAccessService } from './secret-access.service';
import { SecretAccessController } from './secret-access.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SecretAccessGrant, SecretAccessLog])],
  providers: [SecretAccessService],
  controllers: [SecretAccessController],
  exports: [SecretAccessService],
})
export class SecretAccessModule {}
