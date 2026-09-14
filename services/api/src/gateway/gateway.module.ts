import { Module } from '@nestjs/common';
import { MarketDataGateway } from './market-data.gateway';
import { RedisModule } from '../redis/redis.module';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [RedisModule, MarketDataModule],
  providers: [MarketDataGateway],
})
export class GatewayModule {}
