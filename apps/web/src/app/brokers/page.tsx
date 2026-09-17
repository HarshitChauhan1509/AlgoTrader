/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BrokerConnections() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [broker, setBroker] = useState('alpaca');
  const [displayName, setDisplayName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const fetchAccounts = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return router.push('/login');

    const res = await fetch('http://localhost:3001/api/brokers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setAccounts(await res.json());
  }, [router]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleSave = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    
    const payload = {
      broker,
      displayName,
      credentials: { apiKey, apiSecret }
    };

    try {
      const res = await fetch('http://localhost:3001/api/brokers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowModal(false);
        setDisplayName('');
        setApiKey('');
        setApiSecret('');
        await fetchAccounts();
      } else {
        alert('Failed to save broker account');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this broker?')) return;
    
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`http://localhost:3001/api/brokers/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      await fetchAccounts();
    }
  };

  return (
    <main className="min-h-screen bg-transparent p-8 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-white/[0.08] pb-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold">Broker Connections</h1>
            <nav className="space-x-4">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
            </nav>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all shadow-sm text-white px-4 py-2 rounded-xl font-bold"
          >
            + Connect Broker
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.length === 0 ? (
            <div className="col-span-2 text-center py-12 glass-panel rounded-2xl text-gray-500">
              No brokers connected. Click 'Connect Broker' to link your trading account.
            </div>
          ) : (
            accounts.map(acc => (
              <div key={acc.id} className="glass-panel rounded-2xl p-6 relative">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{acc.displayName}</h3>
                    <p className="text-sm text-blue-400 uppercase tracking-widest">{acc.broker}</p>
                  </div>
                  <button onClick={() => handleDelete(acc.id)} className="text-red-500 hover:text-red-400 font-bold">
                    Disconnect
                  </button>
                </div>
                <div className="text-sm text-gray-500 mt-4">
                  Connected on {new Date(acc.connectedAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-transparent/70 flex items-center justify-center z-50">
            <div className="bg-white/[0.02] border border-gray-700 p-6 rounded-2xl w-[400px]">
              <h2 className="text-xl font-bold mb-4 border-b border-white/[0.08] pb-2">Link Broker Account</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Broker</label>
                  <select value={broker} onChange={e => setBroker(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
                    <option value="alpaca">Alpaca Markets</option>
                    <option value="zerodha">Zerodha Kite (Coming Soon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                  <input type="text" placeholder="e.g. Alpaca Paper Trading" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">API Key</label>
                  <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">API Secret</label>
                  <input type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleSave} disabled={loading} className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all shadow-sm text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50">
                  {loading ? 'Saving...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
