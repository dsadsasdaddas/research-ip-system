import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ApprovalFlow } from './entities/approval-flow.entity';
import { ApprovalFlowNode } from './entities/approval-flow-node.entity';
import { ApprovalInstance } from './entities/approval-instance.entity';
import { ApprovalRecord } from './entities/approval-record.entity';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { CreateNodeDto } from './dto/create-node.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { ApproveActionDto } from './dto/approve-action.dto';
import type { AuthUser } from '../auth/types/auth-user.interface';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalFlow) private flowRepo: Repository<ApprovalFlow>,
    @InjectRepository(ApprovalFlowNode) private nodeRepo: Repository<ApprovalFlowNode>,
    @InjectRepository(ApprovalInstance) private instanceRepo: Repository<ApprovalInstance>,
    @InjectRepository(ApprovalRecord) private recordRepo: Repository<ApprovalRecord>,
    private dataSource: DataSource,
  ) {}

  // ==================== 流程定义管理 ====================

  /** 创建审批流程定义 */
  async createFlow(dto: CreateFlowDto): Promise<ApprovalFlow> {
    return this.flowRepo.save(this.flowRepo.create(dto));
  }

  /** 更新审批流程定义 */
  async updateFlow(id: number, dto: UpdateFlowDto): Promise<ApprovalFlow | null> {
    await this.flowRepo.update(id, dto);
    return this.flowRepo.findOneBy({ id });
  }

  /** 查询流程列表,可按 businessType 过滤 */
  async findAllFlows(businessType?: string): Promise<ApprovalFlow[]> {
    const where: Record<string, unknown> = {};
    if (businessType) where.businessType = businessType;
    return this.flowRepo.find({ where, order: { createTime: 'DESC' } });
  }

  /** 查询单个流程详情(含节点) */
  async findOneFlow(id: number): Promise<ApprovalFlow | null> {
    const flow = await this.flowRepo.findOneBy({ id });
    if (!flow) return null;
    const nodes = await this.nodeRepo.find({
      where: { flowId: id },
      order: { nodeOrder: 'ASC' },
    });
    return { ...flow, nodes } as ApprovalFlow & { nodes: ApprovalFlowNode[] };
  }

  /** 删除流程(系统内置不可删除) */
  async removeFlow(id: number): Promise<{ success: boolean }> {
    const flow = await this.flowRepo.findOneBy({ id });
    if (!flow) throw new NotFoundException('流程不存在');
    if (flow.isSystem) throw new BadRequestException('系统内置流程不可删除');
    await this.nodeRepo.delete({ flowId: id });
    await this.flowRepo.delete(id);
    return { success: true };
  }

  // ==================== 流程节点管理 ====================

  /** 添加流程节点 */
  async addNode(flowId: number, dto: CreateNodeDto): Promise<ApprovalFlowNode> {
    const flow = await this.flowRepo.findOneBy({ id: flowId });
    if (!flow) throw new NotFoundException('流程不存在');
    return this.nodeRepo.save(this.nodeRepo.create({ ...dto, flowId }));
  }

  /** 更新流程节点 */
  async updateNode(id: number, dto: Partial<CreateNodeDto>): Promise<ApprovalFlowNode | null> {
    await this.nodeRepo.update(id, dto);
    return this.nodeRepo.findOneBy({ id });
  }

  /** 删除流程节点 */
  async removeNode(id: number): Promise<{ success: boolean }> {
    await this.nodeRepo.delete(id);
    return { success: true };
  }

  // ==================== 审批实例生命周期 ====================

  /**
   * 提交审批 —— 查找匹配的流程,创建实例,生成提交记录
   * 同时更新业务表的 approval_status = 'submitted'
   */
  async submitForApproval(dto: SubmitApprovalDto, user: AuthUser): Promise<ApprovalInstance> {
    // 1. 查找匹配的审批流程(按 businessType, 优先匹配 secretLevel)
    const qb = this.flowRepo.createQueryBuilder('f')
      .where('f.business_type = :bt', { bt: dto.businessType })
      .andWhere('f.is_active = :active', { active: true });

    const flows = await qb.getMany();
    if (flows.length === 0) {
      throw new BadRequestException(`未找到业务类型 [${dto.businessType}] 对应的审批流程`);
    }

    // 优先选择精确匹配 secretLevel 的流程,否则选通用的(secretLevel IS NULL)
    let flow = flows.find(f => f.secretLevel != null) ?? flows.find(f => f.secretLevel == null);
    if (!flow) flow = flows[0];

    // 2. 获取流程的节点列表(按 nodeOrder 排序)
    const nodes = await this.nodeRepo.find({
      where: { flowId: flow.id },
      order: { nodeOrder: 'ASC' },
    });
    if (nodes.length === 0) {
      throw new BadRequestException(`流程 [${flow.flowName}] 没有配置审批节点`);
    }

    const firstNode = nodes[0];

    // 3. 创建审批实例
    const instance = this.instanceRepo.create({
      flowId: flow.id,
      businessType: dto.businessType,
      businessId: dto.businessId,
      title: dto.title,
      submitUserId: user.id,
      submitUsername: user.realName ?? user.username,
      deptId: user.deptId ?? null,
      currentNodeId: firstNode.id,
      status: 'pending',
      remark: dto.remark ?? null,
    });
    const saved = await this.instanceRepo.save(instance);

    // 4. 创建提交记录
    await this.recordRepo.save(this.recordRepo.create({
      instanceId: saved.id,
      nodeId: firstNode.id,
      action: 'submit',
      opinion: dto.remark ?? null,
      operatorId: user.id,
      operatorName: user.realName ?? user.username,
      nextNodeId: firstNode.id,
    }));

    // 5. 更新业务表的审批状态
    await this.updateBusinessStatus(dto.businessType, dto.businessId, 'submitted');

    return saved;
  }

  /**
   * 审批通过 —— 验证审批人身份,记录操作,推进到下一节点或完成
   */
  async approve(instanceId: number, nodeId: number, dto: ApproveActionDto, user: AuthUser): Promise<ApprovalInstance> {
    const instance = await this.instanceRepo.findOneBy({ id: instanceId });
    if (!instance) throw new NotFoundException('审批实例不存在');
    if (instance.status !== 'pending') throw new BadRequestException('当前实例不在待审批状态');

    // 验证当前节点
    if (instance.currentNodeId !== nodeId) {
      throw new BadRequestException('当前审批节点不匹配');
    }

    const currentNode = await this.nodeRepo.findOneBy({ id: nodeId });
    if (!currentNode) throw new NotFoundException('审批节点不存在');

    // 验证审批人身份
    this.verifyApprover(currentNode, user);

    // 查找下一节点
    const allNodes = await this.nodeRepo.find({
      where: { flowId: instance.flowId },
      order: { nodeOrder: 'ASC' },
    });
    const currentIndex = allNodes.findIndex(n => n.id === nodeId);
    const nextNode = currentIndex < allNodes.length - 1 ? allNodes[currentIndex + 1] : null;

    if (nextNode) {
      // 推进到下一节点
      await this.instanceRepo.update(instanceId, {
        currentNodeId: nextNode.id,
      });

      await this.recordRepo.save(this.recordRepo.create({
        instanceId,
        nodeId,
        action: 'approve',
        opinion: dto.opinion ?? null,
        operatorId: user.id,
        operatorName: user.realName ?? user.username,
        nextNodeId: nextNode.id,
      }));
    } else {
      // 全部节点通过,审批完成
      await this.instanceRepo.update(instanceId, {
        status: 'approved',
        currentNodeId: null,
        finishTime: new Date(),
      });

      await this.recordRepo.save(this.recordRepo.create({
        instanceId,
        nodeId,
        action: 'approve',
        opinion: dto.opinion ?? null,
        operatorId: user.id,
        operatorName: user.realName ?? user.username,
        nextNodeId: null,
      }));

      // 更新业务表审批状态
      await this.updateBusinessStatus(instance.businessType, instance.businessId, 'approved');
    }

    return this.instanceRepo.findOneBy({ id: instanceId }) as Promise<ApprovalInstance>;
  }

  /**
   * 驳回 —— 整个审批被拒绝
   */
  async reject(instanceId: number, nodeId: number, dto: ApproveActionDto, user: AuthUser): Promise<ApprovalInstance> {
    const instance = await this.instanceRepo.findOneBy({ id: instanceId });
    if (!instance) throw new NotFoundException('审批实例不存在');
    if (instance.status !== 'pending') throw new BadRequestException('当前实例不在待审批状态');

    const currentNode = await this.nodeRepo.findOneBy({ id: nodeId });
    if (!currentNode) throw new NotFoundException('审批节点不存在');

    if (!currentNode.allowReject) {
      throw new BadRequestException('当前节点不允许驳回');
    }

    this.verifyApprover(currentNode, user);

    await this.instanceRepo.update(instanceId, {
      status: 'rejected',
      currentNodeId: null,
      finishTime: new Date(),
    });

    await this.recordRepo.save(this.recordRepo.create({
      instanceId,
      nodeId,
      action: 'reject',
      opinion: dto.opinion ?? null,
      operatorId: user.id,
      operatorName: user.realName ?? user.username,
    }));

    await this.updateBusinessStatus(instance.businessType, instance.businessId, 'rejected');

    return this.instanceRepo.findOneBy({ id: instanceId }) as Promise<ApprovalInstance>;
  }

  /**
   * 退回上一节点
   */
  async returnToPrevious(instanceId: number, nodeId: number, dto: ApproveActionDto, user: AuthUser): Promise<ApprovalInstance> {
    const instance = await this.instanceRepo.findOneBy({ id: instanceId });
    if (!instance) throw new NotFoundException('审批实例不存在');
    if (instance.status !== 'pending') throw new BadRequestException('当前实例不在待审批状态');

    const currentNode = await this.nodeRepo.findOneBy({ id: nodeId });
    if (!currentNode) throw new NotFoundException('审批节点不存在');

    this.verifyApprover(currentNode, user);

    // 查找所有节点,找到上一个
    const allNodes = await this.nodeRepo.find({
      where: { flowId: instance.flowId },
      order: { nodeOrder: 'ASC' },
    });
    const currentIndex = allNodes.findIndex(n => n.id === nodeId);
    if (currentIndex <= 0) {
      throw new BadRequestException('已经是第一个节点,无法退回');
    }

    const prevNode = allNodes[currentIndex - 1];

    await this.instanceRepo.update(instanceId, {
      currentNodeId: prevNode.id,
    });

    await this.recordRepo.save(this.recordRepo.create({
      instanceId,
      nodeId,
      action: 'return',
      opinion: dto.opinion ?? null,
      operatorId: user.id,
      operatorName: user.realName ?? user.username,
      nextNodeId: prevNode.id,
    }));

    return this.instanceRepo.findOneBy({ id: instanceId }) as Promise<ApprovalInstance>;
  }

  /**
   * 撤销审批 —— 只有提交人可以撤销
   */
  async cancel(instanceId: number, user: AuthUser): Promise<ApprovalInstance> {
    const instance = await this.instanceRepo.findOneBy({ id: instanceId });
    if (!instance) throw new NotFoundException('审批实例不存在');

    if (instance.submitUserId !== user.id) {
      throw new ForbiddenException('只有提交人可以撤销审批');
    }
    if (instance.status !== 'pending') {
      throw new BadRequestException('只有待审批状态可以撤销');
    }

    await this.instanceRepo.update(instanceId, {
      status: 'cancelled',
      currentNodeId: null,
      finishTime: new Date(),
    });

    await this.recordRepo.save(this.recordRepo.create({
      instanceId,
      action: 'cancel',
      operatorId: user.id,
      operatorName: user.realName ?? user.username,
    }));

    await this.updateBusinessStatus(instance.businessType, instance.businessId, 'cancelled');

    return this.instanceRepo.findOneBy({ id: instanceId }) as Promise<ApprovalInstance>;
  }

  // ==================== 审批查询 ====================

  /** 查询我的待审批(当前节点审批人是我的) */
  async findMyPending(user: AuthUser): Promise<ApprovalInstance[]> {
    // 先找到匹配用户角色的节点
    const nodes = await this.nodeRepo.find({
      where: [
        { approverUserId: user.id },
        { approverRole: user.role },
      ],
    });
    const nodeIds = nodes.map(n => n.id);
    if (nodeIds.length === 0) return [];

    return this.instanceRepo.find({
      where: {
        currentNodeId: In(nodeIds),
        status: 'pending',
      },
      order: { submitTime: 'DESC' },
    });
  }

  /** 查询我提交的审批 */
  async findMySubmitted(user: AuthUser): Promise<ApprovalInstance[]> {
    return this.instanceRepo.find({
      where: { submitUserId: user.id },
      order: { submitTime: 'DESC' },
    });
  }

  /** 按业务查询审批实例及全部审批记录 */
  async findByBusiness(businessType: string, businessId: number): Promise<{
    instance: ApprovalInstance | null;
    records: ApprovalRecord[];
  }> {
    const instance = await this.instanceRepo.findOne({
      where: { businessType, businessId },
      order: { submitTime: 'DESC' },
    });
    if (!instance) return { instance: null, records: [] };

    const records = await this.recordRepo.find({
      where: { instanceId: instance.id },
      order: { operateTime: 'ASC' },
    });
    return { instance, records };
  }

  /** 获取审批实例详情(含流程、节点、记录) */
  async getInstanceDetail(instanceId: number): Promise<{
    instance: ApprovalInstance | null;
    flow: ApprovalFlow | null;
    nodes: ApprovalFlowNode[];
    records: ApprovalRecord[];
  }> {
    const instance = await this.instanceRepo.findOneBy({ id: instanceId });
    if (!instance) return { instance: null, flow: null, nodes: [], records: [] };

    const flow = await this.flowRepo.findOneBy({ id: instance.flowId });
    const nodes = await this.nodeRepo.find({
      where: { flowId: instance.flowId },
      order: { nodeOrder: 'ASC' },
    });
    const records = await this.recordRepo.find({
      where: { instanceId },
      order: { operateTime: 'ASC' },
    });

    return { instance, flow, nodes, records };
  }

  // ==================== 私有方法 ====================

  /** 更新业务表的审批状态 */
  private async updateBusinessStatus(businessType: string, businessId: number, status: string): Promise<void> {
    // 深度防御:businessType 拼入 SQL,即便入口 SubmitApprovalDto 已用 @IsIn 校验,
    // 此处仍做白名单兜底,防止未来新增调用点绕过校验。
    const allowedTypes = ['paper', 'patent', 'copyright', 'transform', 'fee', 'secret'];
    if (!allowedTypes.includes(businessType)) {
      throw new BadRequestException(`非法的业务类型: ${businessType}`);
    }
    // 其余参数用占位符,无注入风险;原生 SQL 避开 QueryBuilder 的
    // 实体属性名(camelCase)与列名(snake_case)映射问题。
    await this.dataSource.query(
      `UPDATE \`${businessType}\` SET approval_status = ? WHERE id = ?`,
      [status, businessId],
    );
  }

  /** 验证当前用户是否为该节点的审批人 */
  private verifyApprover(node: ApprovalFlowNode, user: AuthUser): void {
    const matchByRole = node.approverRole != null && node.approverRole === user.role;
    const matchByUser = node.approverUserId != null && node.approverUserId === user.id;
    if (!matchByRole && !matchByUser) {
      throw new ForbiddenException('您不是当前节点的审批人');
    }
  }
}
