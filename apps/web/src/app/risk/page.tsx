'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RiskManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form state
  const [tradingMode, setTradingMode] = useState('SIGNAL_ONLY');
  const [maxCapitalPerTrade, setMaxCapitalPerTrade] = useState(10000);
  const [riskPerTradePercent, setRiskPerTradePercent] = useState(1.0);
  const [maxDailyLoss, setMaxDailyLoss] = useState(5000);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(10);
  const [maxOpenPositions, setMaxOpenPositions] = useState(5);

  const fetchRiskConfig = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return router.push('/login');

    try {
      const res = await fetch('http://localhost:3001/api/risk', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTradingMode(data.tradingMode || 'SIGNAL_ONLY');
        setMaxCapitalPerTrade(Number(data.maxCapitalPerTrade) || 0);
        setRiskPerTradePercent(Number(data.riskPerTradePercent) || 1.0);
        setMaxDailyLoss(Number(data.maxDailyLoss) || 0);
        setMaxTradesPerDay(data.maxTradesPerDay || 0);
        setMaxOpenPositions(data.maxOpenPositions || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRiskConfig();
  }, [fetchRiskConfig]);

  const handleSave = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    
    const payload = {
      tradingMode,
      maxCapitalPerTrade,
      riskPerTradePercent,
      maxDailyLoss,
      maxTradesPerDay,
      maxOpenPositions
    };

    try {
      const res = await fetch('http://localhost:3001/api/risk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Risk Configuration Saved!');
      } else {
        alert('Failed to save risk configuration');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-[#121212] p-8 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold">Global Risk Management</h1>
            <nav className="space-x-4">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
            </nav>
          </div>
        </header>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-8">
          
          <section>
            <h2 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2 text-blue-400">Trading Mode</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="radio" value="SIGNAL_ONLY" checked={tradingMode === 'SIGNAL_ONLY'} onChange={(e) => setTradingMode(e.target.value)} className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-bold">Signal Only</div>
                  <div className="text-sm text-gray-400">Receive alerts, but do not execute trades automatically.</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="radio" value="PAPER_TRADING" checked={tradingMode === 'PAPER_TRADING'} onChange={(e) => setTradingMode(e.target.value)} className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-bold">Paper Trading</div>
                  <div className="text-sm text-gray-400">Simulate order execution in real-time against market data without risking capital.</div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="radio" value="AUTO_EXECUTION" checked={tradingMode === 'AUTO_EXECUTION'} onChange={(e) => setTradingMode(e.target.value)} className="w-5 h-5 text-red-500" />
                <div>
                  <div className="font-bold text-red-400">Live Auto Execution</div>
                  <div className="text-sm text-gray-400">Deploy strategies to live brokers with real money.</div>
                </div>
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2 text-yellow-400">Global Limits</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Daily Loss (₹)</label>
                <input 
                  type="number" 
                  value={maxDailyLoss} 
                  onChange={e => setMaxDailyLoss(Number(e.target.value))} 
                  className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2" 
                />
                <p className="text-xs text-gray-500 mt-1">Halt all strategies if daily loss exceeds this amount.</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Capital Per Trade (₹)</label>
                <input 
                  type="number" 
                  value={maxCapitalPerTrade} 
                  onChange={e => setMaxCapitalPerTrade(Number(e.target.value))} 
                  className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2" 
                />
                <p className="text-xs text-gray-500 mt-1">Absolute maximum position size per trade.</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Open Positions</label>
                <input 
                  type="number" 
                  value={maxOpenPositions} 
                  onChange={e => setMaxOpenPositions(Number(e.target.value))} 
                  className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2" 
                />
                <p className="text-xs text-gray-500 mt-1">Prevent new entries if you have this many active trades.</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Trades Per Day</label>
                <input 
                  type="number" 
                  value={maxTradesPerDay} 
                  onChange={e => setMaxTradesPerDay(Number(e.target.value))} 
                  className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2" 
                />
                <p className="text-xs text-gray-500 mt-1">Total limit on order volume to prevent overtrading.</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Risk Per Trade (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={riskPerTradePercent} 
                  onChange={e => setRiskPerTradePercent(Number(e.target.value))} 
                  className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2" 
                />
                <p className="text-xs text-gray-500 mt-1">Suggested risk limit for dynamic position sizing.</p>
              </div>
            </div>
          </section>
          
          <div className="flex justify-end pt-4 border-t border-gray-800">
            <button 
              onClick={handleSave} 
              disabled={loading} 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-bold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
          
        </div>
      </div>
    </main>
  );
}
