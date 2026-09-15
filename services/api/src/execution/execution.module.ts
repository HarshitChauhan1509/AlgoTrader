import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RiskModule } from '../risk/risk.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { BrokerModule } from '../broker/broker.module';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { BrokerAdapterFactory } from './broker/broker-adapter.factory';

@Module({
  imports: [RedisModule, RiskModule, PrismaModule, ConfigModule, BrokerModule],
  controllers: [ExecutionController],
  providers: [
    ExecutionService,
    BrokerAdapterFactory
  ],
  exports: [ExecutionService],
})
export class ExecutionModule {}
