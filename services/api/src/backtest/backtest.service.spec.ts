import { Test, TestingModule } from '@nestjs/testing';
import { BacktestService } from './backtest.service';
import { Strategy } from '@stock-platform/strategy-core';

describe('BacktestService', () => {
  let service: BacktestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BacktestService],
    }).compile();

    service = module.get<BacktestService>(BacktestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('runs a backtest and returns a report', async () => {
            const strategy: Strategy = {
      id: 'strat-1',
      name: 'Always Buy',
      timeframe: '15m',
      conditions: [
        {
          indicator: 'PRICE',
          field: 'close',
          operator: '>',
          value: 1000
        }
      ],
      action: 'BUY'
    };

    const result = await service.runBacktest({
      strategy,
      symbol: 'RELIANCE',
      timeframe: '15m',
      initialBalance: 100000,
      quantityPerTrade: 10,
    });

    expect(result).toBeDefined();
    expect(result.initialBalance).toBe(100000);
    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.winningTrades + result.losingTrades).toBeGreaterThan(0);
    expect(result.trades.length).toEqual(result.totalTrades);
    
    for (let i = 0; i < result.trades.length; i++) {
      if (i % 2 === 0) {
        expect((result.trades as any[])[i].action).toBe('BUY');
      } else {
        expect((result.trades as any[])[i].action).toBe('SELL');
      }
    }
  });
});





