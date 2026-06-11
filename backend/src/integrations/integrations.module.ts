import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationConfig } from './entities/integration-config.entity';
import { IntegrationLog } from './entities/integration-log.entity';
import { IntegrationMapping } from './entities/integration-mapping.entity';
import { IntegrationAlert } from './entities/integration-alert.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationConfig, IntegrationLog, IntegrationMapping, IntegrationAlert])],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule implements OnModuleInit {
  constructor(private readonly integrationsService: IntegrationsService) {}

  async onModuleInit(): Promise<void> {
    await this.integrationsService.seedDefaults();
  }
}
