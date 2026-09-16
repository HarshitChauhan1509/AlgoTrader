import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { RiskService } from './risk.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('risk')
@UseGuards(JwtAuthGuard)
export class RiskController {
  constructor(
    private readonly riskService: RiskService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async getRiskConfig(@Req() req: any) {
    let config = await this.prisma.riskConfiguration.findUnique({
      where: { userId: req.user.userId }
    });

    if (!config) {
      config = await this.prisma.riskConfiguration.create({
        data: { userId: req.user.userId }
      });
    }

    return config;
  }

  @Put()
  async updateRiskConfig(@Req() req: any, @Body() body: any) {
    
    const result = await this.prisma.riskConfiguration.update({
      where: { userId: req.user.userId },
      data: {
        tradingMode: body.tradingMode,
        maxCapitalPerTrade: body.maxCapitalPerTrade,
        riskPerTradePercent: body.riskPerTradePercent,
        maxDailyLoss: body.maxDailyLoss,
        maxTradesPerDay: body.maxTradesPerDay,
        maxOpenPositions: body.maxOpenPositions,
      }
    });

    await this.audit.logEvent(req.user.userId, AuditAction.RISK_CONFIG_UPDATED, { changes: body });
    return result;

  }
}
