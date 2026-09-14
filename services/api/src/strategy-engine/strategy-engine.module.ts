import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StrategyEngineService } from './strategy-engine.service';
import { StrategyController } from './strategy.controller';

@Module({
  imports: [RedisModule, PrismaModule],
  controllers: [StrategyController],
  providers: [StrategyEngineService],
  exports: [StrategyEngineService],
})
export class StrategyEngineModule {}
