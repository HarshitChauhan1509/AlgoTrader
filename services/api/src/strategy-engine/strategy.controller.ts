import { Controller, Get, Post, Body, Param, Put, UseGuards, Req } from '@nestjs/common';
import { StrategyEngineService } from './strategy-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('strategies')
@UseGuards(JwtAuthGuard)
export class StrategyController {
  constructor(
    private readonly strategyEngineService: StrategyEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getStrategies(@Req() req: any) {
    return this.prisma.strategy.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async createStrategy(@Req() req: any, @Body() body: any) {
    const strategy = await this.prisma.strategy.create({
      data: {
        userId: req.user.userId,
        name: body.name,
        timeframe: body.timeframe,
        action: body.action,
        definition: body.definition,
        enabled: body.enabled || false,
      },
    });
    
    if (strategy.enabled) {
      await this.strategyEngineService.reloadActiveStrategies();
    }
    
    return strategy;
  }

  @Put(':id/toggle')
  async toggleStrategy(@Req() req: any, @Param('id') id: string, @Body() body: { enabled: boolean }) {
    const strategy = await this.prisma.strategy.update({
      where: { id, userId: req.user.userId },
      data: { enabled: body.enabled },
    });
    
    await this.strategyEngineService.reloadActiveStrategies();
    return strategy;
  }
}
