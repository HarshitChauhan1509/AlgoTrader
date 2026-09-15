import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('brokers')
@UseGuards(JwtAuthGuard)
export class BrokerController {
  constructor(private readonly brokerService: BrokerService) {}

  @Get()
  async getAccounts(@Req() req: any) {
    return this.brokerService.getBrokerAccounts(req.user.userId);
  }

  @Post()
  async addAccount(@Req() req: any, @Body() body: { broker: string, displayName: string, credentials: any }) {
    return this.brokerService.addOrUpdateBroker(req.user.userId, body);
  }

  @Delete(':id')
  async deleteAccount(@Req() req: any, @Param('id') id: string) {
    return this.brokerService.deleteBroker(req.user.userId, id);
  }
}
