import { Controller, Post, Body, Logger } from '@nestjs/common';
import { BacktestService, BacktestRequest } from './backtest.service';

@Controller('backtest')
export class BacktestController {
  private readonly logger = new Logger(BacktestController.name);

  constructor(private readonly backtestService: BacktestService) {}

  @Post('run')
  async runBacktest(@Body() request: BacktestRequest) {
    this.logger.log(`Received backtest request for ${request.strategy?.name}`);
    return this.backtestService.runBacktest(request);
  }
}
