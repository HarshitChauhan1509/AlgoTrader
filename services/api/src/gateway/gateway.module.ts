import { Module } from '@nestjs/common';
import { MarketDataGateway } from './market-data.gateway';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [MarketDataGateway],
})
export class GatewayModule {}
