/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { io, Socket } from 'socket.io-client';

export default function Home() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [symbol, setSymbol] = useState('RELIANCE');
  const [timeframe, setTimeframe] = useState('15m');
  const [isConnected, setIsConnected] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch (e) {
      console.error('Failed to fetch portfolio', e);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchPortfolio();
  }, [fetchPortfolio]);

  useEffect(() => {
    if (chartContainerRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: { background: { color: '#222' }, textColor: '#DDD' },
        grid: {
          vertLines: { color: '#444' },
          horzLines: { color: '#444' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 600,
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe', { symbol, timeframe });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('candle', (data: any) => {
      if (seriesRef.current) {
        const time = Math.floor(new Date(data.timestamp).getTime() / 1000);
        seriesRef.current.update({
          time: time as any,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        });
      }
    });

    socket.on('orderUpdate', (order: any) => {
      setOrders(prev => {
        const existing = prev.findIndex(o => o.id === order.id);
        if (existing >= 0) {
          const newOrders = [...prev];
          newOrders[existing] = order;
          return newOrders;
        }
        return [order, ...prev];
      });

      // Refresh portfolio if an order was executed
      if (order.status === 'EXECUTED') {
        // Small delay to ensure DB transaction committed before we fetch
        setTimeout(() => fetchPortfolio(), 500);
      }
    });

    return () => {
      socket.emit('unsubscribe', { symbol, timeframe });
      socket.disconnect();
    };
  }, [symbol, timeframe, fetchPortfolio]);

  return (
    <main className="min-h-screen bg-[#121212] p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold">AlgoTrader Dashboard</h1>
            <nav className="space-x-4">
              <a href="/" className="text-white font-semibold">Live Trading</a>
              <a href="/backtest" className="text-gray-400 hover:text-white transition-colors">Backtest</a>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-400">{isConnected ? 'Connected to Market Data' : 'Disconnected'}</span>
          </div>
        </header>

        {/* Portfolio Banner */}
        {portfolio && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Available Margin</p>
              <p className="text-2xl font-bold text-green-400">₹{portfolio.currentBalance.toLocaleString()}</p>
            </div>
            <div className="flex space-x-4">
              {portfolio.positions?.map((pos: any) => (
                <div key={pos.id} className="bg-gray-800 px-4 py-2 rounded border border-gray-700 text-sm">
                  <p className="font-bold text-gray-200">{pos.symbol}</p>
                  <p className="text-gray-400">{pos.quantity} Qty @ ₹{pos.averagePrice}</p>
                </div>
              ))}
              {portfolio.positions?.length === 0 && (
                <div className="text-gray-500 text-sm py-2">No active positions</div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-4">
          <select 
            value={symbol} 
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="RELIANCE">RELIANCE</option>
            <option value="TCS">TCS</option>
            <option value="HDFCBANK">HDFCBANK</option>
          </select>
          
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
          </select>
        </div>

        <div className="flex gap-6">
          <div className="flex-grow">
            <div 
              ref={chartContainerRef} 
              className="w-full h-[600px] border border-gray-800 rounded-lg overflow-hidden" 
            />
          </div>
          
          <div className="w-80 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-lg p-4 h-[600px] flex flex-col">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">Recent Orders</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {orders.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-10">No orders yet</p>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="bg-gray-800 p-3 rounded text-sm border border-gray-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold ${o.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                        {o.action} {o.symbol}
                      </span>
                      <span className="text-gray-400">{o.quantity} qty</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`px-2 py-0.5 rounded ${o.status === 'EXECUTED' ? 'bg-green-900/50 text-green-400' : o.status === 'REJECTED' || o.status === 'FAILED' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                        {o.status}
                      </span>
                      <span className="text-gray-500">{new Date(o.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

