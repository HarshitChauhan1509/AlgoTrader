export type TradingMode = 'SIGNAL_ONLY' | 'PAPER_TRADING' | 'MANUAL_EXECUTION' | 'AUTO_EXECUTION';

export const DEFAULT_TRADING_MODE: TradingMode = 'SIGNAL_ONLY';

export * from './market-data';

export interface Signal {
  symbol: string;
  timeframe: Timeframe;
  timestamp: Date;
  strategyId: string;
  action: 'BUY' | 'SELL';
  price: number;
}

export type OrderStatus = 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED' | 'REJECTED';
export type OrderType = 'MARKET' | 'LIMIT';

export interface Order {
  id: string;
  strategyId?: string;
  portfolioId?: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  type: OrderType;
  quantity: number;
  price?: number;
  status: OrderStatus;
  timestamp: Date;
}

