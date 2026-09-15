export type TradingMode = 'SIGNAL_ONLY' | 'PAPER_TRADING' | 'MANUAL_EXECUTION' | 'AUTO_EXECUTION';

export const DEFAULT_TRADING_MODE: TradingMode = 'SIGNAL_ONLY';

export * from './market-data';
import { Timeframe } from './market-data';

export interface Signal {
  id?: string;
  userId: string;
  symbol: string;
  timeframe: Timeframe;
  timestamp: Date;
  strategyId: string;
  action: 'BUY' | 'SELL';
  price: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  trailingDistance?: number;
}

export type OrderStatus = 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED' | 'REJECTED';
export type OrderType = 'MARKET' | 'LIMIT';

export interface Order {
  id: string;
  userId: string;
  strategyId?: string;
  portfolioId?: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  type: OrderType;
  quantity: number;
  price?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  trailingDistance?: number;
  brokerOrderId?: string;
  status: OrderStatus | string;
  timestamp: Date;
}





