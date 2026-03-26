import React, { useState, useEffect, useCallback } from 'react';
import { Landmark, Clock, DollarSign, TrendingUp, X } from 'lucide-react';
import * as db from '../utils/api';
import { RefreshableProps } from '../types';

type FundTab = 'issuing' | 'to_be_issued' | 'sold_out' | 'ended';

const tabLabels: Record<FundTab, string> = {
  issuing: 'In Raccolta',
  to_be_issued: 'Prossimamente',
  sold_out: 'Esaurito',
  ended: 'Terminato',
};

export const FundPage: React.FC<RefreshableProps> = ({ userId, user, onRefresh }) => {
  const [tab, setTab] = useState<FundTab>('issuing');
  const [funds, setFunds] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState<Record<string, unknown> | null>(null);
  const [amount, setAmount] = useState('');
  const [investing, setInvesting] = useState(false);
  const [error, setError] = useState('');

  const loadFunds = useCallback(async () => {
    try {
      const data = await db.getAvailableFunds();
      setFunds(data);
    } catch (e) {
      console.error('Error loading funds:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  const filtered = funds.filter(f => f.status === tab);
  const balance = (user.balance as number) || 0;

  const handleInvest = async () => {
    if (!selectedFund) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Inserisci un importo valido');
      return;
    }
    const minInv = selectedFund.min_investment as number;
    const maxInv = selectedFund.max_investment as number;
    if (amt < minInv) {
      setError(`Minimo: ${minInv} USDT`);
      return;
    }
    if (amt > maxInv) {
      setError(`Massimo: ${maxInv} USDT`);
      return;
    }
    if (amt > balance) {
      setError('Saldo insufficiente');
      return;
    }

    setInvesting(true);
    setError('');
    try {
      const result = await db.investInFund(userId, selectedFund.id as string, amt);
      if (result.success) {
        setSelectedFund(null);
        setAmount('');
        await onRefresh();
        await loadFunds();
      } else {
        setError(result.error || 'Errore nell\'investimento');
      }
    } catch (e) {
      setError('Errore nell\'investimento');
    } finally {
      setInvesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-safe space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Landmark size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-base-content">Fondi Speciali</h2>
      </div>

      <div className="tabs tabs-boxed bg-base-200">
        {(Object.keys(tabLabels) as FundTab[]).map((t) => (
          <button key={t} className={`tab flex-1 text-xs ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-base-content/40">
          <Landmark size={40} className="mx-auto mb-2 opacity-30" />
          <p>Nessun fondo in questa categoria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((fund) => {
            const currentAmount = (fund.current_amount as number) || 0;
            const targetAmount = (fund.target_amount as number) || 1;
            const fillPercent = Math.round((currentAmount / targetAmount) * 100);
            const canBuy = fund.status === 'issuing';
            const dailyRate = fund.daily_rate as number;
            const duration = fund.duration_days as number;
            const totalReturn = dailyRate && duration ? (dailyRate * duration).toFixed(1) : '0';
            const minInvest = fund.min_investment as number;
            const maxInvest = fund.max_investment as number;

            return (
              <div key={fund.id as string} className="card bg-base-200">
                <div className="card-body p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-base-content">{fund.name as string}</span>
                      {fund.badge && (
                        <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${
                          (fund.badge as string) === 'Special Fund' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'
                        }`}>
                          {fund.badge as string}
                        </span>
                      )}
                    </div>
                  </div>

                  {fund.description && (
                    <p className="text-xs text-base-content/60">{fund.description as string}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-base-content/50 text-xs"><TrendingUp size={12} />Rendimento</div>
                      <p className="font-bold text-primary text-sm">{totalReturn}%</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-base-content/50 text-xs"><Clock size={12} />Durata</div>
                      <p className="font-bold text-base-content text-sm">{duration}g</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-base-content/50 text-xs"><DollarSign size={12} />Range</div>
                      <p className="font-bold text-base-content text-sm">{minInvest}-{maxInvest?.toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-base-content/50 mb-1">
                      <span>{currentAmount.toLocaleString()} / {targetAmount.toLocaleString()} USDT</span>
                      <span>{fillPercent}%</span>
                    </div>
                    <progress className="progress progress-primary w-full h-2" value={currentAmount} max={targetAmount} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-base-content/40">
                    <span>
                      {fund.start_date ? `📅 ${fund.start_date}` : ''}
                      {fund.start_date && fund.end_date ? ' → ' : ''}
                      {fund.end_date ? `${fund.end_date}` : ''}
                    </span>
                    {canBuy && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSelectedFund(fund);
                          setAmount('');
                          setError('');
                        }}
                      >
                        Investi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Investment Modal */}
      {selectedFund && (
        <div className="modal modal-open">
          <div className="modal-box bg-base-100">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setSelectedFund(null)}
            >
              <X size={18} />
            </button>

            <h3 className="font-bold text-lg mb-1">Investi in {selectedFund.name as string}</h3>
            {selectedFund.description && (
              <p className="text-xs text-base-content/60 mb-4">{selectedFund.description as string}</p>
            )}

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Il tuo saldo</span>
                <span className="font-bold text-primary">{balance.toFixed(2)} USDT</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Min / Max</span>
                <span className="font-semibold">
                  {(selectedFund.min_investment as number)} - {(selectedFund.max_investment as number)?.toLocaleString()} USDT
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Rendimento giornaliero</span>
                <span className="font-semibold text-success">{selectedFund.daily_rate as number}%</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/60">Durata</span>
                <span className="font-semibold">{selectedFund.duration_days as number} giorni</span>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Importo (USDT)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  placeholder={`Min: ${selectedFund.min_investment}`}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  min={selectedFund.min_investment as number}
                  max={selectedFund.max_investment as number}
                />
              </div>

              {error && (
                <div className="alert alert-error text-sm py-2">
                  <span>{error}</span>
                </div>
              )}

              <button
                className={`btn btn-primary w-full ${investing ? 'loading' : ''}`}
                onClick={handleInvest}
                disabled={investing || !amount}
              >
                {investing ? <span className="loading loading-spinner loading-sm" /> : 'Conferma Investimento'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setSelectedFund(null)} />
        </div>
      )}
    </div>
  );
};
