import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('portfolio')
export class PortfolioController {
  private readonly logger = new Logger(PortfolioController.name);

  constructor(private readonly portfolioService: PortfolioService) {}

  @UseGuards(JwtAuthGuard)
  @Get('metrics')
  async getMetrics(@CurrentUser() user: { sub: string }) {
    this.logger.log(`Fetching metrics for user ${user.sub}`);
    return this.portfolioService.getPortfolioMetrics(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getPortfolio(@CurrentUser() user: { sub: string }) {
    this.logger.log(`Fetching portfolio state for user ${user.sub}`);
    return this.portfolioService.getPortfolioWithPositions(user.sub);
  }
}


