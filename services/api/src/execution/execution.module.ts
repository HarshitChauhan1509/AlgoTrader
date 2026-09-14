import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RiskModule } from '../risk/risk.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExecutionService } from './execution.service';
import { ZerodhaAdapter } from './broker/zerodha.adapter';
import { BROKER_ADAPTER_TOKEN } from './broker/broker.adapter';
import { AlpacaAdapter } from './broker/alpaca.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ExecutionController } from './execution.controller';

@Module({
  imports: [RedisModule, RiskModule, PrismaModule, ConfigModule],
  controllers: [ExecutionController],
  providers: [
    ExecutionService,
    {
      provide: BROKER_ADAPTER_TOKEN,
      useFactory: (configService: ConfigService) => {
        const brokerType = configService.get<string>('BROKER_TYPE', 'zerodha');
        if (brokerType === 'alpaca') {
          return new AlpacaAdapter(configService);
        }
        return new ZerodhaAdapter();
      },
      inject: [ConfigService]
    }
  ],
  exports: [ExecutionService],
})
export class ExecutionModule {}




