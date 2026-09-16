'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyStrategies() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStrategies = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return router.push('/login');

    try {
      const res = await fetch('http://localhost:3001/api/strategies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStrategies(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`http://localhost:3001/api/strategies/${id}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      
      if (res.ok) {
        await fetchStrategies();
      } else {
        alert('Failed to toggle strategy');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="min-h-screen bg-[#121212] p-8 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold">My Strategies</h1>
            <nav className="space-x-4">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
            </nav>
          </div>
          <Link 
            href="/strategy-builder" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold"
          >
            + Create New Strategy
          </Link>
        </header>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : strategies.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-lg text-gray-500">
            No strategies found. Click "Create New Strategy" to build one!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {strategies.map(strat => (
              <div key={strat.id} className={`bg-gray-900 border ${strat.enabled ? 'border-green-500/50' : 'border-gray-800'} rounded-lg p-6 flex justify-between items-center`}>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold">{strat.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded font-bold ${strat.enabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                      {strat.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    <strong className={`${strat.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{strat.action}</strong> {strat.symbol} on {strat.timeframe} timeframe
                  </p>
                  <div className="text-xs text-gray-500 mt-2">
                    Created: {new Date(strat.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={() => handleToggle(strat.id, strat.enabled)}
                    className={`px-4 py-2 rounded font-bold text-sm transition-colors ${
                      strat.enabled 
                        ? 'bg-red-900/30 text-red-500 hover:bg-red-900/50 border border-red-900/50' 
                        : 'bg-green-900/30 text-green-500 hover:bg-green-900/50 border border-green-900/50'
                    }`}
                  >
                    {strat.enabled ? 'Pause Execution' : 'Activate & Run'}
                  </button>
                  <Link href="/backtest" className="text-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">
                    Run Backtest
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
