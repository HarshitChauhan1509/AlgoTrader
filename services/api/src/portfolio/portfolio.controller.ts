import { Controller, Get, Logger } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  private readonly logger = new Logger(PortfolioController.name);

  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async getPortfolio() {
    this.logger.log('Fetching default portfolio state for dashboard');
    return this.portfolioService.getDefaultPortfolioWithPositions();
  }
}
