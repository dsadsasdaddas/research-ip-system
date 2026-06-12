import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalFlow } from './entities/approval-flow.entity';
import { ApprovalFlowNode } from './entities/approval-flow-node.entity';
import { ApprovalInstance } from './entities/approval-instance.entity';
import { ApprovalRecord } from './entities/approval-record.entity';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalFlow,
      ApprovalFlowNode,
      ApprovalInstance,
      ApprovalRecord,
    ]),
  ],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
