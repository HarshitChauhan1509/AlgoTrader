import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RiskModule } from '../risk/risk.module';
import { ExecutionService } from './execution.service';
import { ZerodhaAdapter } from './broker/zerodha.adapter';
import { BROKER_ADAPTER_TOKEN } from './broker/broker.adapter';

@Module({
  imports: [RedisModule, RiskModule],
  providers: [
    ExecutionService,
    { provide: BROKER_ADAPTER_TOKEN, useClass: ZerodhaAdapter }
  ],
  exports: [ExecutionService],
})
export class ExecutionModule {}


