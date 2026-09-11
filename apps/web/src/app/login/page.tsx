'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('system@algotrader.local');
  const [password, setPassword] = useState('dummy12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRegister, setIsRegister] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`http://localhost:3001/api/auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // In a real app, use HttpOnly cookies. For this phase, localStorage is sufficient.
        localStorage.setItem('accessToken', data.accessToken);
        router.push('/');
      } else {
        const err = await res.json();
        setError(err.message || 'Login failed');
      }
    } catch {
      setError('An error occurred. Make sure the API is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#121212] flex items-center justify-center p-8 text-white">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">AlgoTrader Login</h1>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Authenticating...' : (isRegister ? 'Register & Sign In' : 'Sign In')}
                    </button>
          <div className="text-center mt-4">
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-sm text-blue-400 hover:underline">
              {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}




