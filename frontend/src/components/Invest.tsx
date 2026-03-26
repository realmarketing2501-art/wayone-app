import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, HelpCircle, Lock, Rocket, ShieldCheck, Wallet } from 'lucide-react';
import * as db from '../utils/api';
import { RefreshableProps, InvestmentPlan, QualificationLevel, levelLabel } from '../types';

export const Invest: React.FC<RefreshableProps> = ({ userId, user, onRefresh }) => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [levels, setLevels] = useState<QualificationLevel[]>([]);
  const [faqs, setFaqs] = useState<Record<string, unknown>[]>([]);
  const [investments, setInvestments] = useState<Record<string, unknown>[]>([]);
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const userLevel = String(user.level || 'PRE');
  const balance = Number(user.balance || 0);

  useEffect(() => {
    (async () => {
      const [config, invs] = await Promise.all([db.getPublicAppConfig(), db.getUserInvestments(userId)]);
      setLevels((config.levels as QualificationLevel[]) || []);
      setPlans((config.plans as InvestmentPlan[]) || []);
      setFaqs((config.faqs as Record<string, unknown>[]) || []);
      setInvestments(invs);
      setLoading(false);
    })();
  }, [userId]);

  const levelMap = useMemo(() => Object.fromEntries(levels.map((l) => [l.code, l.sort_order])), [levels]);
  const availablePlans = useMemo(() => plans.map((plan) => ({ ...plan, locked: (levelMap[userLevel] ?? 0) < (levelMap[plan.min_level_code] ?? 0) })), [plans, levelMap, userLevel]);
  const selected = availablePlans.find((p) => p.id === planId);

  const submit = async () => {
    if (!selected) return setMsg('Seleziona un piano');
    const value = Number(amount);
    if (!value) return setMsg('Inserisci un importo valido');
    const res = await db.createInvestment(userId, selected.id, value);
    if (!res.success) return setMsg(res.error || 'Investimento non riuscito');
    setMsg(`Investimento creato: ${selected.name}`);
    setAmount('');
    setPlanId('');
    await onRefresh();
    setInvestments(await db.getUserInvestments(userId));
  };

  if (loading) return <div className="p-8 flex justify-center"><span className="loading loading-spinner" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="hero rounded-3xl bg-base-200 overflow-hidden">
        <div className="hero-content flex-col lg:flex-row justify-between w-full">
          <div>
            <div className="badge badge-primary mb-2">Invest Center</div>
            <h2 className="text-2xl font-bold">Piani dinamici, professionali e configurabili</h2>
            <p className="text-sm opacity-70 mt-2 max-w-xl">Ora i piani invest e i livelli possono vivere nel database e diventare modificabili da admin senza toccare il codice.</p>
          </div>
          <div className="stats shadow bg-base-100">
            <div className="stat"><div className="stat-figure text-primary"><Wallet /></div><div className="stat-title">Saldo</div><div className="stat-value text-lg">{balance.toFixed(2)} USDT</div></div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {availablePlans.map((plan) => (
          <button key={plan.id} className={`card text-left bg-base-200 border ${planId === plan.id ? 'border-primary' : 'border-base-300'} ${plan.locked ? 'opacity-60' : ''}`} onClick={() => !plan.locked && setPlanId(plan.id)}>
            <div className="card-body p-4">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Rocket className="w-4 h-4 text-primary" /><span className="font-semibold">{plan.name}</span></div>{plan.locked ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 text-success" />}</div>
              <p className="text-xs opacity-70">{plan.description}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><div className="opacity-60">Rendimento</div><div className="font-bold text-primary">{Number(plan.daily_rate).toFixed(2)}%/g</div></div>
                <div><div className="opacity-60">Livello min.</div><div className="font-bold">{levelLabel(plan.min_level_code, levels)}</div></div>
                <div><div className="opacity-60">Range</div><div className="font-bold">{Number(plan.min_invest)} - {Number(plan.max_invest)}</div></div>
                <div><div className="opacity-60">Durata</div><div className="font-bold">{plan.duration_days} giorni</div></div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="card bg-base-200">
        <div className="card-body gap-3">
          <div className="flex items-center gap-2 font-semibold"><BarChart3 className="w-4 h-4 text-primary" /> Crea investimento</div>
          <select className="select select-bordered" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Seleziona un piano</option>
            {availablePlans.map((p) => <option key={p.id} value={p.id} disabled={p.locked}>{p.name}</option>)}
          </select>
          <input className="input input-bordered" type="number" placeholder="Importo in USDT" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button className="btn btn-primary" onClick={submit}>Conferma investimento</button>
          {msg && <div className="text-sm opacity-80">{msg}</div>}
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex items-center gap-2 font-semibold"><Clock3 className="w-4 h-4 text-primary" /> I miei investimenti</div>
          <div className="space-y-2">
            {investments.length === 0 && <div className="text-sm opacity-60">Nessun investimento attivo.</div>}
            {investments.map((inv) => (
              <div key={String(inv.id)} className="rounded-2xl bg-base-100 p-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div><div className="opacity-60">Piano</div><div className="font-semibold">{String(inv.plan_name || inv.plan)}</div></div>
                <div><div className="opacity-60">Capitale</div><div className="font-semibold">{Number(inv.amount || 0).toFixed(2)} USDT</div></div>
                <div><div className="opacity-60">Earned</div><div className="font-semibold text-success">{Number(inv.total_earned || 0).toFixed(2)} USDT</div></div>
                <div><div className="opacity-60">Rate</div><div className="font-semibold">{Number(inv.daily_rate || 0).toFixed(2)}%</div></div>
                <div><div className="opacity-60">Status</div><div className="badge badge-outline">{String(inv.status || 'active')}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex items-center gap-2 font-semibold"><HelpCircle className="w-4 h-4 text-primary" /> FAQ Invest</div>
          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <div key={idx} className="collapse collapse-arrow bg-base-100">
                <input type="checkbox" />
                <div className="collapse-title font-medium">{String(faq.question_it || faq.question_en || 'FAQ')}</div>
                <div className="collapse-content text-sm opacity-80">{String(faq.answer_it || faq.answer_en || '')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
