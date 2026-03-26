import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDownCircle, Copy, CheckCircle, Clock, AlertTriangle, QrCode, Shield, ChevronDown, ChevronUp, ExternalLink, Info } from 'lucide-react';
import { RefreshableProps } from '../types';
import * as db from '../utils/api';

type CryptoNetwork = 'TRC20' | 'ERC20';

const networkMeta: Record<CryptoNetwork, { icon: string; label: string; shortLabel: string; desc: string; minDeposit: number; estimatedFee: string; confirmationsRequired: number }> = {
  TRC20: { icon: '🔵', label: 'TRON (TRC-20)', shortLabel: 'TRC-20', desc: 'Tron · Fee basse', minDeposit: 50, estimatedFee: '~1 USDT', confirmationsRequired: 20 },
  ERC20: { icon: '🟣', label: 'Ethereum (ERC-20)', shortLabel: 'ERC-20', desc: 'Ethereum · Sicuro', minDeposit: 50, estimatedFee: '~5-15 USDT', confirmationsRequired: 12 },
};

export const Deposit: React.FC<RefreshableProps> = ({ userId, user, onRefresh }) => {
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork>('TRC20');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'deposit' | 'history' | 'verify'>('deposit');
  const [showSteps, setShowSteps] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [wallets, setWallets] = useState<Record<CryptoNetwork, string>>({ TRC20: '', ERC20: '' });
  const [deposits, setDeposits] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [settings, userDeposits] = await Promise.all([
        db.getSettings(),
        db.getUserDeposits(userId),
      ]);
      setWallets({
        TRC20: settings['company_wallet_trc20'] || '',
        ERC20: settings['company_wallet_erc20'] || '',
      });
      setDeposits(userDeposits);
    } catch (e) {
      console.error('Failed to load deposit data', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const walletAddress = wallets[selectedNetwork];
  const meta = networkMeta[selectedNetwork];
  const numAmount = parseFloat(amount) || 0;

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard?.writeText(walletAddress).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitVerify = async () => {
    if (!txHash || numAmount <= 0) return;
    setSubmitting(true);
    try {
      const result = await db.createDeposit(userId, numAmount, selectedNetwork, txHash);
      if (result.success) {
        setSubmitted(true);
        setTxHash('');
        setAmount('');
        // Reload deposits
        const updatedDeposits = await db.getUserDeposits(userId);
        setDeposits(updatedDeposits);
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch (e) {
      console.error('Failed to create deposit', e);
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { color: 'badge-warning', icon: <Clock size={12} />, label: 'In Attesa' },
    confirming: { color: 'badge-info', icon: <Clock size={12} />, label: 'Confermando' },
    confirmed: { color: 'badge-success', icon: <CheckCircle size={12} />, label: 'Confermato' },
    rejected: { color: 'badge-error', icon: <AlertTriangle size={12} />, label: 'Rifiutato' },
    failed: { color: 'badge-error', icon: <AlertTriangle size={12} />, label: 'Fallito' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const confirmedTotal = deposits
    .filter(d => d.status === 'confirmed')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  return (
    <div className="p-4 pb-safe space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ArrowDownCircle size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-base-content">Deposito USDT</h2>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200">
        <button className={`tab flex-1 ${tab === 'deposit' ? 'tab-active' : ''}`} onClick={() => setTab('deposit')}>💰 Deposita</button>
        <button className={`tab flex-1 ${tab === 'verify' ? 'tab-active' : ''}`} onClick={() => setTab('verify')}>✅ Verifica TX</button>
        <button className={`tab flex-1 ${tab === 'history' ? 'tab-active' : ''}`} onClick={() => setTab('history')}>📋 Cronologia</button>
      </div>

      {tab === 'deposit' && (
        <div className="space-y-4">
          {/* Security Banner */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Shield size={16} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-base-content/70">
              Pagamento diretto senza intermediari. Invii USDT dal tuo wallet personale al nostro wallet aziendale. Nessun exchange coinvolto.
            </p>
          </div>

          {/* Network Selection */}
          <div className="space-y-2">
            <label className="label"><span className="label-text text-base-content/60 text-sm">Seleziona Rete</span></label>
            <div className="grid grid-cols-2 gap-2">
              {(['TRC20', 'ERC20'] as CryptoNetwork[]).map((net) => {
                const m = networkMeta[net];
                return (
                  <button
                    key={net}
                    onClick={() => setSelectedNetwork(net)}
                    className={`card p-3 text-left transition-all ${
                      selectedNetwork === net ? 'bg-primary/20 ring-2 ring-primary' : 'bg-base-200 hover:bg-base-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{m.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-base-content">{m.shortLabel}</p>
                        <p className="text-[10px] text-base-content/50">{m.desc}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-base-content/40">
                      Min: {m.minDeposit} USDT · Fee: {m.estimatedFee}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wallet Address Card */}
          <div className="card bg-base-200 glow-green">
            <div className="card-body p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-base-content">Indirizzo Wallet {meta.shortLabel}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-bold">ATTIVO</span>
              </div>

              {/* QR Code Placeholder */}
              <div className="flex justify-center">
                <div className="w-40 h-40 rounded-xl bg-white p-2 flex items-center justify-center">
                  <div className="w-full h-full rounded-lg bg-base-100 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-base-300">
                    <QrCode size={48} className="text-base-content/30" />
                    <span className="text-[9px] text-base-content/40 text-center px-2">QR Code<br/>{selectedNetwork}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <p className="text-xs text-base-content/50">Invia USDT a questo indirizzo:</p>
                <div className="flex items-center gap-2 bg-base-100 rounded-lg p-2.5">
                  <code className="text-xs font-mono text-primary flex-1 break-all">
                    {walletAddress || 'Indirizzo non configurato'}
                  </code>
                  <button onClick={handleCopy} className="btn btn-xs btn-ghost shrink-0" disabled={!walletAddress}>
                    {copied ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                <div className="text-[11px] text-base-content/60">
                  <p className="font-bold text-warning">ATTENZIONE</p>
                  <p>Invia solo <strong>USDT</strong> sulla rete <strong>{meta.label}</strong>. Inviare altri token o usare una rete diversa causerà la perdita dei fondi.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="form-control">
            <label className="label"><span className="label-text text-base-content/60">Importo da depositare (USDT)</span></label>
            <input
              type="number"
              className="input input-bordered w-full"
              placeholder={`Min ${meta.minDeposit} USDT`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {numAmount > 0 && numAmount < meta.minDeposit && (
              <label className="label"><span className="label-text-alt text-error">Minimo {meta.minDeposit} USDT</span></label>
            )}
          </div>

          {/* Info Summary */}
          {numAmount >= meta.minDeposit && (
            <div className="card bg-base-200">
              <div className="card-body p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Importo:</span>
                  <span className="font-bold text-base-content">{numAmount.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Rete:</span>
                  <span className="text-base-content">{meta.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Fee di rete stimate:</span>
                  <span className="text-base-content/70">{meta.estimatedFee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Conferme richieste:</span>
                  <span className="text-base-content">{meta.confirmationsRequired} blocchi</span>
                </div>
                <div className="border-t border-base-300 pt-2 flex justify-between">
                  <span className="font-bold text-base-content">Accredito sul conto:</span>
                  <span className="font-bold text-success">{numAmount.toFixed(2)} USDT</span>
                </div>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="card bg-base-200">
            <div className="card-body p-3">
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-bold text-base-content flex items-center gap-2">
                  <Info size={14} className="text-info" /> Come funziona
                </span>
                {showSteps ? <ChevronUp size={16} className="text-base-content/40" /> : <ChevronDown size={16} className="text-base-content/40" />}
              </button>
              {showSteps && (
                <div className="mt-3 space-y-3">
                  {[
                    { step: '1', title: 'Seleziona rete', desc: 'Scegli TRC-20 (consigliato) o ERC-20' },
                    { step: '2', title: 'Copia indirizzo', desc: 'Copia il wallet aziendale o scansiona il QR code' },
                    { step: '3', title: 'Invia USDT', desc: 'Dal tuo wallet personale invia l\'importo desiderato' },
                    { step: '4', title: 'Verifica TX', desc: 'Vai alla tab "Verifica TX" e inserisci il TX hash della transazione' },
                    { step: '5', title: 'Accredito', desc: 'Il team verificherà e accrediterà il saldo sul tuo conto' },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{s.step}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-base-content">{s.title}</p>
                        <p className="text-xs text-base-content/50">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'verify' && (
        <div className="space-y-4">
          {/* Manual TX Verification */}
          <div className="card bg-base-200">
            <div className="card-body p-4 space-y-3">
              <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                <CheckCircle size={16} className="text-success" /> Verifica Transazione
              </h3>
              <p className="text-xs text-base-content/50">
                Dopo aver inviato il deposito, inserisci il TX Hash e i dettagli per la verifica.
              </p>

              <div className="form-control">
                <label className="label"><span className="label-text text-base-content/60">TX Hash (Transaction ID)</span></label>
                <input
                  type="text"
                  className="input input-bordered w-full font-mono text-xs"
                  placeholder="Inserisci il TX hash della tua transazione..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text text-base-content/60">Importo inviato (USDT)</span></label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text text-base-content/60">Rete utilizzata</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {(['TRC20', 'ERC20'] as CryptoNetwork[]).map((net) => (
                    <button
                      key={net}
                      onClick={() => setSelectedNetwork(net)}
                      className={`btn btn-sm ${selectedNetwork === net ? 'btn-primary' : 'btn-ghost bg-base-100'}`}
                    >
                      {networkMeta[net].icon} {networkMeta[net].shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {submitted ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
                  <CheckCircle size={16} className="text-success" />
                  <div>
                    <p className="text-sm font-bold text-success">Richiesta inviata!</p>
                    <p className="text-xs text-base-content/50">Il team verificherà la transazione entro 30 minuti.</p>
                  </div>
                </div>
              ) : (
                <button
                  className={`btn btn-primary w-full ${submitting ? 'loading' : ''}`}
                  disabled={!txHash || numAmount <= 0 || submitting}
                  onClick={handleSubmitVerify}
                >
                  {submitting ? <span className="loading loading-spinner loading-sm" /> : '🔍 Invia per Verifica'}
                </button>
              )}
            </div>
          </div>

          {/* Pending Deposits */}
          {deposits.filter(d => d.status === 'pending' || d.status === 'confirming').length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-base-content/80">Depositi in attesa di conferma</h3>
              {deposits.filter(d => d.status === 'pending' || d.status === 'confirming').map((d) => {
                const s = statusConfig[d.status as string] || statusConfig.pending;
                return (
                  <div key={d.id as string} className="card bg-base-200">
                    <div className="card-body p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-base-content">{Number(d.amount).toFixed(2)} USDT</span>
                        <span className={`badge badge-sm gap-1 ${s.color}`}>
                          {s.icon} {s.label}
                        </span>
                      </div>
                      {d.tx_hash && (
                        <div className="text-xs text-base-content/40 font-mono break-all">
                          TX: {d.tx_hash as string}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="card bg-base-200">
              <div className="card-body p-3">
                <p className="text-xs text-base-content/50">Totale Depositato</p>
                <p className="text-lg font-bold text-success">
                  {confirmedTotal.toLocaleString('it-IT')} USDT
                </p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body p-3">
                <p className="text-xs text-base-content/50">N° Depositi</p>
                <p className="text-lg font-bold text-base-content">{deposits.length}</p>
              </div>
            </div>
          </div>

          {/* Records */}
          {deposits.length === 0 ? (
            <div className="text-center py-8 text-base-content/40">
              <ArrowDownCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nessun deposito effettuato</p>
            </div>
          ) : (
            deposits.map((d) => {
              const s = statusConfig[d.status as string] || statusConfig.pending;
              const dateStr = d.created_at ? new Date(d.created_at as string).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div key={d.id as string} className="card bg-base-200">
                  <div className="card-body p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-base-content">{Number(d.amount).toFixed(2)} USDT</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-base-300 text-base-content/50">{d.network as string}</span>
                      </div>
                      <span className={`badge badge-sm gap-1 ${s.color}`}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-base-content/40">
                      <span>{dateStr}</span>
                    </div>
                    {d.tx_hash && (
                      <div className="flex items-center gap-1 text-xs text-base-content/30 font-mono">
                        <span className="truncate">{d.tx_hash as string}</span>
                        <ExternalLink size={10} className="shrink-0 cursor-pointer hover:text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
