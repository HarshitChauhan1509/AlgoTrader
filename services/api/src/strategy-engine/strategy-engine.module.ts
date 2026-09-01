import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { StrategyEngineService } from './strategy-engine.service';

@Module({
  imports: [RedisModule],
  providers: [StrategyEngineService],
  exports: [StrategyEngineService],
})
export class StrategyEngineModule {}
