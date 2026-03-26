import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpCircle, Zap, Clock, Turtle, AlertTriangle, CheckCircle } from 'lucide-react';
import * as db from '../utils/api';
import { RefreshableProps } from '../types';

type WithdrawSpeed = 'fast' | 'medium' | 'slow';

const withdrawOptions: { type: WithdrawSpeed; label: string; icon: React.ReactNode; time: string; fee: number }[] = [
  { type: 'fast', label: 'Veloce', icon: <Zap size={18} />, time: '24 ore', fee: 20 },
  { type: 'medium', label: 'Medio', icon: <Clock size={18} />, time: '48 ore', fee: 10 },
  { type: 'slow', label: 'Lento', icon: <Turtle size={18} />, time: '72 ore', fee: 5 },
];

type NetworkType = 'TRC-20' | 'ERC-20';

export const Withdraw: React.FC<RefreshableProps> = ({ userId, user, onRefresh }) => {
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('');
  const [network, setNetwork] = useState<NetworkType>('TRC-20');
  const [selectedType, setSelectedType] = useState<WithdrawSpeed>('medium');
  const [tab, setTab] = useState<'form' | 'history'>('form');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const balance = Number(user?.balance ?? 0);
  const feePercent = withdrawOptions.find(o => o.type === selectedType)!.fee;
  const numAmount = parseFloat(amount) || 0;
  const feeAmount = numAmount * (feePercent / 100);
  const netAmount = numAmount - feeAmount;

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getUserWithdrawals(userId);
      setWithdrawals(data);
    } catch (e) {
      console.error('Failed to load withdrawals', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const handleSubmit = async () => {
    if (numAmount <= 0 || !wallet || submitting) return;
    if (numAmount > balance) {
      setError('Saldo insufficiente');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await db.createWithdrawal(userId, numAmount, network, wallet, selectedType);
      setSuccess(true);
      setAmount('');
      setWallet('');
      await onRefresh();
      await loadWithdrawals();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.message || 'Errore durante il prelievo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 pb-safe space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <ArrowUpCircle size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-base-content">Prelievo</h2>
      </div>

      <div className="tabs tabs-boxed bg-base-200">
        <button className={`tab flex-1 ${tab === 'form' ? 'tab-active' : ''}`} onClick={() => setTab('form')}>Nuovo Prelievo</button>
        <button className={`tab flex-1 ${tab === 'history' ? 'tab-active' : ''}`} onClick={() => setTab('history')}>Storico</button>
      </div>

      {tab === 'form' ? (
        <div className="space-y-4">
          {/* Success alert */}
          {success && (
            <div className="alert alert-success text-sm">
              <CheckCircle size={16} />
              <span>Prelievo inviato con successo!</span>
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div className="alert alert-error text-sm">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Balance */}
          <div className="card bg-base-200">
            <div className="card-body p-3 flex-row items-center justify-between">
              <span className="text-sm text-base-content/60">Saldo disponibile</span>
              <span className="font-bold text-base-content">{balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })} USDT</span>
            </div>
          </div>

          {/* Amount */}
          <div className="form-control">
            <label className="label"><span className="label-text text-base-content/60">Importo (USDT)</span></label>
            <input
              type="number"
              className="input input-bordered w-full"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Wallet */}
          <div className="form-control">
            <label className="label"><span className="label-text text-base-content/60">Indirizzo Wallet</span></label>
            <input
              type="text"
              className="input input-bordered w-full font-mono text-sm"
              placeholder={network === 'TRC-20' ? 'TXkd7...' : '0x...'}
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            />
          </div>

          {/* Network selector */}
          <div className="form-control">
            <label className="label"><span className="label-text text-base-content/60">Network</span></label>
            <div className="grid grid-cols-2 gap-2">
              {(['TRC-20', 'ERC-20'] as NetworkType[]).map((net) => (
                <button
                  key={net}
                  onClick={() => setNetwork(net)}
                  className={`btn btn-sm ${network === net ? 'btn-primary' : 'btn-ghost bg-base-200'}`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          {/* Speed Selection */}
          <div className="space-y-2">
            <label className="label"><span className="label-text text-base-content/60">Tipo di prelievo</span></label>
            <div className="grid grid-cols-3 gap-2">
              {withdrawOptions.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className={`card p-3 text-center transition-all ${
                    selectedType === opt.type ? 'bg-primary/20 ring-2 ring-primary' : 'bg-base-200 hover:bg-base-300'
                  }`}
                >
                  <div className={`mx-auto mb-1 ${selectedType === opt.type ? 'text-primary' : 'text-base-content/50'}`}>{opt.icon}</div>
                  <p className="text-xs font-bold text-base-content">{opt.label}</p>
                  <p className="text-[10px] text-base-content/50">{opt.time}</p>
                  <p className="text-xs font-bold text-error mt-1">Fee {opt.fee}%</p>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {numAmount > 0 && (
            <div className="card bg-base-200">
              <div className="card-body p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Importo:</span>
                  <span className="text-base-content">{numAmount.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Fee ({feePercent}%):</span>
                  <span className="text-error">-{feeAmount.toFixed(2)} USDT</span>
                </div>
                <div className="border-t border-base-300 pt-2 flex justify-between">
                  <span className="font-bold text-base-content">Riceverai:</span>
                  <span className="font-bold text-success">{netAmount.toFixed(2)} USDT</span>
                </div>
              </div>
            </div>
          )}

          {numAmount > balance && (
            <div className="alert alert-warning text-xs">
              <AlertTriangle size={14} />
              <span>L'importo supera il saldo disponibile</span>
            </div>
          )}

          <button
            className={`btn btn-primary w-full ${submitting ? 'loading' : ''}`}
            disabled={numAmount <= 0 || !wallet || submitting || numAmount > balance}
            onClick={handleSubmit}
          >
            {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Conferma Prelievo'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8 text-base-content/50 text-sm">
              Nessun prelievo effettuato
            </div>
          ) : (
            withdrawals.map((w: any) => (
              <div key={w.id} className="card bg-base-200">
                <div className="card-body p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-base-content">{Number(w.amount).toFixed(2)} USDT</span>
                    <span className={`badge badge-sm ${
                      w.status === 'completed' ? 'badge-success' : w.status === 'pending' ? 'badge-warning' : w.status === 'rejected' ? 'badge-error' : 'badge-info'
                    }`}>{w.status}</span>
                  </div>
                  <div className="flex justify-between text-xs text-base-content/50">
                    <span>Fee: {Number(w.fee || 0).toFixed(2)} USDT · Netto: {Number(w.net_amount || (Number(w.amount) - Number(w.fee || 0))).toFixed(2)} USDT</span>
                    <span>{w.speed || w.type || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-base-content/40">
                    <span>{w.created_at ? new Date(w.created_at).toLocaleDateString('it-IT') : w.date || '—'}</span>
                    <span className="font-mono truncate max-w-[120px]">{w.tx_hash || '—'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
