import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RiskModule } from '../risk/risk.module';
import { ExecutionService } from './execution.service';

@Module({
  imports: [RedisModule, RiskModule],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}

