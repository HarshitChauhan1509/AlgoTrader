/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StrategyBuilder() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('RELIANCE');
  const [timeframe, setTimeframe] = useState('15m');
  const [action, setAction] = useState('BUY');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [trailingStop, setTrailingStop] = useState('');

  const [conditions, setConditions] = useState<any[]>([
    {
      leftIndicator: 'PRICE',
      leftParams: '',
      operator: 'CROSS_ABOVE',
      rightType: 'INDICATOR',
      rightIndicator: 'SMA',
      rightParams: '14'
    }
  ]);

  const addCondition = () => {
    setConditions([...conditions, {
      leftIndicator: 'PRICE',
      leftParams: '',
      operator: '>',
      rightType: 'NUMBER',
      rightIndicator: '',
      rightParams: '100'
    }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, field: string, value: string) => {
    const newConds = [...conditions];
    newConds[idx][field] = value;
    setConditions(newConds);
  };

  const buildAST = () => {
    return conditions.map(c => {
      const cond: any = {
        indicator: c.leftIndicator,
        operator: c.operator,
      };
      
      if (c.leftParams) cond.period = parseInt(c.leftParams);

      if (c.rightType === 'INDICATOR') {
        cond.reference = {
          indicator: c.rightIndicator
        };
        if (c.rightParams) cond.reference.period = parseInt(c.rightParams);
      } else {
        cond.value = parseFloat(c.rightParams);
      }

      return cond;
    });
  };

  const handleSave = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return router.push('/login');

    const definition = {
      symbol,
      conditions: buildAST(),
      stopLossDistance: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfitDistance: takeProfit ? parseFloat(takeProfit) : undefined,
      trailingStopDistance: trailingStop ? parseFloat(trailingStop) : undefined,
    };

    try {
      const res = await fetch('http://localhost:3001/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          timeframe,
          action,
          definition,
          enabled: true
        })
      });

      if (res.ok) {
        router.push('/');
      } else {
        alert('Failed to save strategy');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving strategy');
    }
  };

  return (
    <main className="min-h-screen bg-[#121212] p-8 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold">Strategy Builder</h1>
            <nav className="space-x-4">
              <a href="/" className="text-gray-400 hover:text-white transition-colors">Dashboard</a>
            </nav>
          </div>
        </header>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Strategy Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2" placeholder="e.g. SMA Crossover" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Symbol</label>
              <select value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2">
                <option value="RELIANCE">RELIANCE</option>
                <option value="TCS">TCS</option>
                <option value="INFY">INFY</option>
                <option value="HDFCBANK">HDFCBANK</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Timeframe</label>
              <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2">
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Action</label>
              <select value={action} onChange={e => setAction(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2">
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-lg font-semibold mb-4">Entry Conditions</h3>
            <div className="space-y-4">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-gray-800 p-4 rounded border border-gray-700">
                  <div className="flex-1 flex gap-2">
                    <select value={cond.leftIndicator} onChange={e => updateCondition(idx, 'leftIndicator', e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm">
                      <option value="PRICE">PRICE</option>
                      <option value="SMA">SMA</option>
                      <option value="EMA">EMA</option>
                      <option value="RSI">RSI</option>
                    </select>
                    <input type="text" placeholder="Period (e.g. 14)" value={cond.leftParams} onChange={e => updateCondition(idx, 'leftParams', e.target.value)} className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm" />
                  </div>
                  
                  <select value={cond.operator} onChange={e => updateCondition(idx, 'operator', e.target.value)} className="bg-blue-900/50 text-blue-300 border border-blue-800 rounded px-2 py-1 text-sm font-bold">
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value="==">==</option>
                    <option value="CROSS_ABOVE">CROSSES ABOVE</option>
                    <option value="CROSS_BELOW">CROSSES BELOW</option>
                  </select>

                  <div className="flex-1 flex gap-2 justify-end">
                    <select value={cond.rightType} onChange={e => updateCondition(idx, 'rightType', e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm">
                      <option value="INDICATOR">Indicator</option>
                      <option value="NUMBER">Number</option>
                    </select>
                    {cond.rightType === 'INDICATOR' && (
                      <select value={cond.rightIndicator} onChange={e => updateCondition(idx, 'rightIndicator', e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm">
                        <option value="PRICE">PRICE</option>
                        <option value="SMA">SMA</option>
                        <option value="EMA">EMA</option>
                        <option value="RSI">RSI</option>
                      </select>
                    )}
                    <input type="text" placeholder={cond.rightType === 'INDICATOR' ? 'Period (e.g. 14)' : 'Value'} value={cond.rightParams} onChange={e => updateCondition(idx, 'rightParams', e.target.value)} className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm" />
                  </div>

                  <button onClick={() => removeCondition(idx)} className="text-red-500 hover:text-red-400 font-bold ml-2">X</button>
                </div>
              ))}
            </div>
            <button onClick={addCondition} className="mt-4 text-sm text-blue-400 hover:text-blue-300">+ Add Condition (AND)</button>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-lg font-semibold mb-4">Risk Management</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stop Loss Distance (₹)</label>
                <input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2" placeholder="e.g. 10" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Take Profit Distance (₹)</label>
                <input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2" placeholder="e.g. 20" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Trailing Stop Distance (₹)</label>
                <input type="number" value={trailingStop} onChange={e => setTrailingStop(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2" placeholder="Optional" />
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-6 flex justify-end">
            <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded">
              Save & Activate
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
