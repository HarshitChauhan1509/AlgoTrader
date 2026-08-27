import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '../redis/redis.module';
import { MarketDataService } from './market-data.service';
import { BrokerMarketDataProvider } from './providers/broker-market-data.provider';
import { MarketDataProviderToken } from './providers/market-data.provider';
import { MockMarketDataProvider } from './providers/mock-market-data.provider';

@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: MarketDataProviderToken,
      useFactory: (configService: ConfigService) => {
        // Read configuration to decide which provider to inject
        const useMock = configService.get<string>('USE_MOCK_BROKER') !== 'false'; // Defaults to true if not specified
        return useMock ? new MockMarketDataProvider() : new BrokerMarketDataProvider();
      },
      inject: [ConfigService],
    },
    MarketDataService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
