import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService, AuditAction } from '../audit/audit.service';

@Controller('brokers')
@UseGuards(JwtAuthGuard)
export class BrokerController {
  constructor(
    private readonly brokerService: BrokerService,
    private readonly audit: AuditService
  ) {}

  @Get()
  async getAccounts(@Req() req: any) {
    return this.brokerService.getBrokerAccounts(req.user.userId);
  }

  @Post()
  async addAccount(@Req() req: any, @Body() body: { broker: string, displayName: string, credentials: any }) {
    const res = await this.brokerService.addOrUpdateBroker(req.user.userId, body);
    await this.audit.logEvent(req.user.userId, AuditAction.BROKER_ADDED, { broker: body.broker });
    return res;
  }

  @Delete(':id')
  async deleteAccount(@Req() req: any, @Param('id') id: string) {
    const res = await this.brokerService.deleteBroker(req.user.userId, id);
    await this.audit.logEvent(req.user.userId, AuditAction.BROKER_DELETED, { id });
    return res;
  }
}
