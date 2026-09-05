'use client';

import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    // 1. Initialize Lightweight Chart
    if (chartContainerRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: { background: { color: '#222' }, textColor: '#DDD' },
        grid: {
          vertLines: { color: '#444' },
          horzLines: { color: '#444' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
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

      // Handle Resize
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
    // 2. Connect to WebSocket Gateway
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe', { symbol, timeframe });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // 3. Handle incoming live market data
    socket.on('candle', (data: any) => {
      if (seriesRef.current) {
        // lightweight-charts expects time as unix timestamp in seconds for timestamps
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

    return () => {
      socket.emit('unsubscribe', { symbol, timeframe });
      socket.disconnect();
    };
  }, [symbol, timeframe]);

  return (
    <main className="min-h-screen bg-[#121212] p-8 text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold">AlgoTrader Dashboard</h1>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-400">{isConnected ? 'Connected to Market Data' : 'Disconnected'}</span>
          </div>
        </header>

        <div className="flex gap-4 mb-4">
          <select 
            value={symbol} 
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-4 py-2"
          >
            <option value="RELIANCE">RELIANCE</option>
            <option value="TCS">TCS</option>
            <option value="HDFCBANK">HDFCBANK</option>
          </select>
          
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-4 py-2"
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
          </select>
        </div>

        <div 
          ref={chartContainerRef} 
          className="w-full h-[500px] border border-gray-800 rounded-lg overflow-hidden" 
        />
      </div>
    </main>
  );
}
