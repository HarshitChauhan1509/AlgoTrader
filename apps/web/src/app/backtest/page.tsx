/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BacktestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form State
  const [symbol, setSymbol] = useState('RELIANCE');
  const [timeframe, setTimeframe] = useState('15m');
  const [initialBalance, setInitialBalance] = useState(100000);
  const [quantityPerTrade, setQuantityPerTrade] = useState(10);

  // Strategy Condition State
  const [indicator, setIndicator] = useState('PRICE');
  const [operator, setOperator] = useState('>');
  const [value, setValue] = useState(2500);

  const runBacktest = async () => {
    setLoading(true);
    setResult(null);

    const payload = {
      symbol,
      timeframe,
      initialBalance,
      quantityPerTrade,
      strategy: {
        id: 'strat-' + Date.now(),
        name: 'Custom Web Strategy',
        timeframe,
        conditions: [
          {
            indicator,
            field: indicator === 'PRICE' ? 'close' : undefined,
            period: indicator !== 'PRICE' ? 14 : undefined,
            operator,
            value,
          }
        ],
        action: 'BUY' // Hardcoded to BUY to simplify UI for now. The engine sells when opposite condition met, or we can handle it via stop loss. Actually the engine right now forces SELL at end or we can just rely on the test logic we implemented. Wait, our engine just buys on matched conditions. Let's just pass BUY.
      }
    };

    try {
            const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch('http://localhost:3001/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        console.error('Backtest failed', await res.text());
      }
    } catch (e) {
      console.error('Error running backtest', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#121212] p-8 text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold">AlgoTrader Dashboard</h1>
            <nav className="space-x-4">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">Live Trading</Link>
              <Link href="/backtest" className="text-white font-semibold">Backtest</Link>
            </nav>
          </div>
                  <div className="flex items-center space-x-4">
            <button onClick={() => { localStorage.removeItem('accessToken'); router.push('/login'); }} className="text-sm text-gray-400 hover:text-white">Logout</button>
          </div>
        </header>

        <div className="flex gap-6">
          {/* Configuration Panel */}
          <div className="w-1/3 bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold border-b border-gray-800 pb-2">Strategy Setup</h2>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Symbol</label>
              <select value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2">
                <option value="RELIANCE">RELIANCE</option>
                <option value="TCS">TCS</option>
                <option value="HDFCBANK">HDFCBANK</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Timeframe</label>
              <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2">
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
              </select>
            </div>

            <div className="flex gap-4">
              <div className="space-y-2 w-1/2">
                <label className="text-sm text-gray-400">Capital (₹)</label>
                <input type="number" value={initialBalance} onChange={e => setInitialBalance(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" />
              </div>
              <div className="space-y-2 w-1/2">
                <label className="text-sm text-gray-400">Qty / Trade</label>
                <input type="number" value={quantityPerTrade} onChange={e => setQuantityPerTrade(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" />
              </div>
            </div>

            <h3 className="text-md font-bold pt-4 border-t border-gray-800">Entry Condition</h3>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Indicator</label>
              <select value={indicator} onChange={e => setIndicator(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2">
                <option value="PRICE">PRICE (Close)</option>
                <option value="SMA">SMA (14)</option>
                <option value="RSI">RSI (14)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Operator</label>
              <select value={operator} onChange={e => setOperator(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2">
                <option value=">">Greater Than (&gt;)</option>
                <option value="<">Less Than (&lt;)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Threshold Value</label>
              <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" />
            </div>

            <button 
              onClick={runBacktest} 
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Running Engine...' : 'Run Backtest'}
            </button>
          </div>

          {/* Results Panel */}
          <div className="w-2/3 bg-gray-900 border border-gray-800 rounded-lg p-6 flex flex-col">
            <h2 className="text-xl font-bold border-b border-gray-800 pb-2 mb-4">Backtest Results</h2>
            
            {!result && !loading && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Configure your strategy and click "Run Backtest"
              </div>
            )}

            {loading && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-8 w-8 bg-blue-500 rounded-full mb-4"></div>
                  Simulating 1,000 historical candles...
                </div>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="text-sm text-gray-400">Net Profit</p>
                    <p className={`text-2xl font-bold ${result.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{result.netProfit.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="text-sm text-gray-400">Total Trades</p>
                    <p className="text-2xl font-bold">{result.totalTrades}</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <p className="text-sm text-gray-400">Win Rate</p>
                    <p className="text-2xl font-bold">
                      {result.totalTrades > 0 
                        ? ((result.winningTrades / (result.winningTrades + result.losingTrades)) * 100).toFixed(1) 
                        : '0'}%
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <h3 className="text-lg font-bold mb-2">Trade History</h3>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {result.trades.length === 0 ? (
                      <p className="text-gray-500 text-sm">No trades executed.</p>
                    ) : (
                      result.trades.map((trade: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-800 p-3 rounded border border-gray-700 text-sm">
                          <div>
                            <span className={`font-bold mr-2 ${trade.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                              {trade.action}
                            </span>
                            <span className="text-gray-300">{trade.quantity} Qty @ ₹{trade.price.toFixed(2)}</span>
                          </div>
                          <div className="text-gray-500">
                            {new Date(trade.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}




