import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine, Bell, Settings, Search, Check, X, Trash2, Plus, RefreshCw, ShieldAlert, Eye, EyeOff, Key, Wifi, WifiOff, Mail, Coins, Globe } from 'lucide-react';
import * as db from '../utils/api';
import { AdminProps, LEVELS } from '../types';

type Tab = 'dashboard' | 'users' | 'deposits' | 'withdrawals' | 'popups' | 'settings' | 'apikeys';

// ─── Dashboard Tab ───
const DashboardTab: React.FC<{ stats: Record<string, unknown> | null }> = ({ stats }) => {
  if (!stats) return <div className="flex justify-center p-8"><span className="loading loading-spinner" /></div>;
  const kpi = (label: string, value: string | number, cls = '') => (
    <div className="card bg-base-200 p-4"><div className="text-xs opacity-60">{label}</div><div className={`text-xl font-bold ${cls}`}>{value}</div></div>
  );
  const levelDist = (stats.levelDistribution as Record<string, unknown>[]) || [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpi('Utenti Totali', stats.totalUsers as number)}
        {kpi('Utenti Attivi', stats.activeUsers as number)}
        {kpi('Totale Depositato', `$${Number(stats.totalDeposited || 0).toFixed(2)}`, 'text-success')}
        {kpi('Totale Prelevato', `$${Number(stats.totalWithdrawn || 0).toFixed(2)}`, 'text-error')}
        {kpi('Profitto Piattaforma', `$${Number(stats.platformProfit || 0).toFixed(2)}`, 'text-primary')}
        {kpi('Prelievi Pendenti', `${stats.pendingWithdrawalsCount} ($${Number(stats.pendingWithdrawalsTotal || 0).toFixed(2)})`, 'text-warning')}
        {kpi('Depositi Pendenti', stats.pendingDepositsCount as number, 'text-warning')}
        {kpi('KYC Pendenti', stats.pendingKycCount as number)}
        {kpi('Iscrizioni (24h)', stats.recentSignups as number, 'text-info')}
      </div>
      {levelDist.length > 0 && (
        <div className="card bg-base-200 p-4">
          <div className="text-sm font-semibold mb-2">Distribuzione Livelli</div>
          <div className="flex flex-wrap gap-2">
            {levelDist.map((l: any, i: number) => (
              <div key={i} className="badge badge-outline gap-1">{LEVELS[l.level]?.name || l.level}: {l.cnt}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Users Tab ───
const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [levelF, setLevelF] = useState('');
  const [statusF, setStatusF] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await db.getAllUsers(limit, page * limit, search, levelF, statusF);
    setUsers(res.users); setTotal(res.total); setLoading(false);
  }, [search, levelF, statusF, page]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (u: Record<string, unknown>) => {
    const newStatus = u.status === 'active' ? 'banned' : 'active';
    await db.updateUser(u.id as string, { status: newStatus });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input className="input input-sm input-bordered flex-1 min-w-[150px]" placeholder="Cerca utente..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        <select className="select select-sm select-bordered" value={levelF} onChange={e => { setLevelF(e.target.value); setPage(0); }}>
          <option value="">Tutti i livelli</option>
          {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <select className="select select-sm select-bordered" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(0); }}>
          <option value="">Tutti gli stati</option>
          <option value="active">Attivo</option>
          <option value="banned">Sospeso</option>
        </select>
      </div>
      <div className="text-xs opacity-60">{total} utenti trovati</div>
      {loading ? <div className="flex justify-center p-4"><span className="loading loading-spinner" /></div> : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id as string} className="card bg-base-200 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{u.name as string}</div>
                  <div className="text-xs opacity-60 truncate">{u.email as string}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className={`badge badge-xs ${LEVELS[u.level as string]?.color || ''}`}>{LEVELS[u.level as string]?.name || u.level}</span>
                    <span className={`badge badge-xs ${u.status === 'active' ? 'badge-success' : 'badge-error'}`}>{u.status as string}</span>
                    <span className="badge badge-xs badge-ghost">${Number(u.balance || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className={`btn btn-xs ${u.status === 'active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(u)}>
                    {u.status === 'active' ? 'Sospendi' : 'Attiva'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <button className="btn btn-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
          <span className="text-xs self-center">Pag. {page + 1}/{Math.ceil(total / limit)}</span>
          <button className="btn btn-xs" disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      )}
    </div>
  );
};

// ─── Deposits Tab ───
const DepositsTab: React.FC = () => {
  const [sub, setSub] = useState<'pending' | 'all'>('pending');
  const [deposits, setDeposits] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setDeposits(await db.getAllDeposits(sub === 'pending' ? 'pending' : ''));
    setLoading(false);
  }, [sub]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => { await db.approveDeposit(id); load(); };
  const reject = async (id: string) => { await db.rejectDeposit(id); load(); };

  return (
    <div className="space-y-3">
      <div className="tabs tabs-boxed tabs-xs">
        <button className={`tab ${sub === 'pending' ? 'tab-active' : ''}`} onClick={() => setSub('pending')}>Pendenti</button>
        <button className={`tab ${sub === 'all' ? 'tab-active' : ''}`} onClick={() => setSub('all')}>Tutti</button>
      </div>
      {loading ? <div className="flex justify-center p-4"><span className="loading loading-spinner" /></div> : deposits.length === 0 ? (
        <div className="text-center text-sm opacity-60 py-6">Nessun deposito</div>
      ) : (
        <div className="space-y-2">
          {deposits.map(d => (
            <div key={d.id as string} className="card bg-base-200 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{d.user_name as string || 'N/A'}</div>
                  <div className="text-xs opacity-60">{d.user_email as string}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className="badge badge-xs badge-success">${Number(d.amount).toFixed(2)}</span>
                    <span className="badge badge-xs badge-ghost">{d.network as string}</span>
                    <span className={`badge badge-xs ${d.status === 'pending' ? 'badge-warning' : d.status === 'confirmed' ? 'badge-success' : 'badge-error'}`}>{d.status as string}</span>
                  </div>
                  {d.tx_hash && <div className="text-[10px] opacity-40 mt-1 truncate max-w-[200px]">TX: {d.tx_hash as string}</div>}
                  <div className="text-[10px] opacity-40">{new Date(d.created_at as string).toLocaleString()}</div>
                </div>
                {d.status === 'pending' && (
                  <div className="flex gap-1">
                    <button className="btn btn-xs btn-success" onClick={() => approve(d.id as string)}><Check className="w-3 h-3" /></button>
                    <button className="btn btn-xs btn-error" onClick={() => reject(d.id as string)}><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Withdrawals Tab ───
const WithdrawalsTab: React.FC = () => {
  const [sub, setSub] = useState<'pending' | 'all'>('pending');
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [txInput, setTxInput] = useState<Record<string, string>>({});
  const [rejectInput, setRejectInput] = useState<Record<string, string>>({});
  const [showReject, setShowReject] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await db.getAllWithdrawals(sub === 'pending' ? 'pending' : ''));
    setLoading(false);
  }, [sub]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    const tx = txInput[id]?.trim();
    if (!tx) { alert('Inserisci TX hash'); return; }
    await db.approveWithdrawal(id, tx);
    load();
  };

  const reject = async (id: string) => {
    const reason = rejectInput[id]?.trim() || 'Rifiutato dall\'admin';
    await db.rejectWithdrawal(id, reason);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="tabs tabs-boxed tabs-xs">
        <button className={`tab ${sub === 'pending' ? 'tab-active' : ''}`} onClick={() => setSub('pending')}>Pendenti</button>
        <button className={`tab ${sub === 'all' ? 'tab-active' : ''}`} onClick={() => setSub('all')}>Tutti</button>
      </div>
      {loading ? <div className="flex justify-center p-4"><span className="loading loading-spinner" /></div> : items.length === 0 ? (
        <div className="text-center text-sm opacity-60 py-6">Nessun prelievo</div>
      ) : (
        <div className="space-y-2">
          {items.map(w => {
            const id = w.id as string;
            return (
              <div key={id} className="card bg-base-200 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{w.user_name as string || 'N/A'}</div>
                    <div className="text-xs opacity-60">{w.user_email as string}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <span className="badge badge-xs badge-error">${Number(w.amount).toFixed(2)}</span>
                      <span className="badge badge-xs badge-ghost">Netto: ${Number(w.net_amount).toFixed(2)}</span>
                      <span className="badge badge-xs badge-ghost">Fee: ${Number(w.fee_amount).toFixed(2)}</span>
                      <span className="badge badge-xs badge-info">{w.speed as string}</span>
                      <span className={`badge badge-xs ${w.status === 'pending' ? 'badge-warning' : w.status === 'approved' ? 'badge-success' : 'badge-error'}`}>{w.status as string}</span>
                    </div>
                    <div className="text-[10px] opacity-40 mt-1 truncate max-w-[220px]">Wallet: {w.wallet_address as string}</div>
                    <div className="text-[10px] opacity-40">{new Date(w.created_at as string).toLocaleString()}</div>
                  </div>
                </div>
                {w.status === 'pending' && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <input className="input input-xs input-bordered flex-1" placeholder="TX Hash..." value={txInput[id] || ''} onChange={e => setTxInput(p => ({ ...p, [id]: e.target.value }))} />
                      <button className="btn btn-xs btn-success" onClick={() => approve(id)}><Check className="w-3 h-3" /> Approva</button>
                    </div>
                    {showReject[id] ? (
                      <div className="flex gap-1">
                        <input className="input input-xs input-bordered flex-1" placeholder="Motivo rifiuto..." value={rejectInput[id] || ''} onChange={e => setRejectInput(p => ({ ...p, [id]: e.target.value }))} />
                        <button className="btn btn-xs btn-error" onClick={() => reject(id)}>Conferma</button>
                      </div>
                    ) : (
                      <button className="btn btn-xs btn-outline btn-error" onClick={() => setShowReject(p => ({ ...p, [id]: true }))}><X className="w-3 h-3" /> Rifiuta</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Popups Tab ───
const PopupsTab: React.FC = () => {
  const [popups, setPopups] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', imageUrl: '', buttonText: '', buttonUrl: '', type: 'info', target: 'all', targetLevel: '', priority: 0, showOnce: true, expiresAt: '' });

  const load = useCallback(async () => { setLoading(true); setPopups(await db.getAllPopups()); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title || !form.message) return;
    await db.createPopupNotification(form);
    setForm({ title: '', message: '', imageUrl: '', buttonText: '', buttonUrl: '', type: 'info', target: 'all', targetLevel: '', priority: 0, showOnce: true, expiresAt: '' });
    setShowForm(false);
    load();
  };

  const toggle = async (id: string, current: string) => {
    await db.updatePopupStatus(id, current === 'active' ? 'inactive' : 'active');
    load();
  };

  const del = async (id: string) => { await db.deletePopup(id); load(); };

  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <button className="btn btn-sm btn-primary" onClick={() => setShowForm(!showForm)}><Plus className="w-3 h-3" /> Nuovo Popup</button>
      {showForm && (
        <div className="card bg-base-200 p-3 space-y-2">
          <input className="input input-sm input-bordered w-full" placeholder="Titolo *" value={form.title} onChange={e => upd('title', e.target.value)} />
          <textarea className="textarea textarea-bordered textarea-sm w-full" rows={2} placeholder="Messaggio *" value={form.message} onChange={e => upd('message', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input input-sm input-bordered" placeholder="URL Immagine" value={form.imageUrl} onChange={e => upd('imageUrl', e.target.value)} />
            <input className="input input-sm input-bordered" placeholder="Testo Bottone" value={form.buttonText} onChange={e => upd('buttonText', e.target.value)} />
            <input className="input input-sm input-bordered" placeholder="URL Bottone" value={form.buttonUrl} onChange={e => upd('buttonUrl', e.target.value)} />
            <select className="select select-sm select-bordered" value={form.type} onChange={e => upd('type', e.target.value)}>
              <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="promo">Promo</option>
            </select>
            <select className="select select-sm select-bordered" value={form.target} onChange={e => upd('target', e.target.value)}>
              <option value="all">Tutti</option><option value="level">Per livello</option>
            </select>
            {form.target === 'level' && (
              <select className="select select-sm select-bordered" value={form.targetLevel} onChange={e => upd('targetLevel', e.target.value)}>
                <option value="">Seleziona livello</option>
                {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            )}
            <input className="input input-sm input-bordered" type="number" placeholder="Priorità" value={form.priority} onChange={e => upd('priority', Number(e.target.value))} />
            <input className="input input-sm input-bordered" type="datetime-local" placeholder="Scade il" value={form.expiresAt} onChange={e => upd('expiresAt', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="checkbox checkbox-sm" checked={form.showOnce} onChange={e => upd('showOnce', e.target.checked)} />
            <span className="text-xs">Mostra una sola volta</span>
          </label>
          <button className="btn btn-sm btn-primary w-full" onClick={create}>Crea Popup</button>
        </div>
      )}
      {loading ? <div className="flex justify-center p-4"><span className="loading loading-spinner" /></div> : popups.length === 0 ? (
        <div className="text-center text-sm opacity-60 py-6">Nessun popup</div>
      ) : (
        <div className="space-y-2">
          {popups.map(p => (
            <div key={p.id as string} className="card bg-base-200 p-3 flex flex-row items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{p.title as string}</div>
                <div className="text-xs opacity-60 truncate">{p.message as string}</div>
                <div className="flex gap-1 mt-1">
                  <span className={`badge badge-xs ${p.status === 'active' ? 'badge-success' : 'badge-ghost'}`}>{p.status as string}</span>
                  <span className="badge badge-xs badge-outline">{p.type as string}</span>
                  <span className="badge badge-xs badge-outline">{p.target as string}{p.target_level ? `: ${p.target_level}` : ''}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="btn btn-xs btn-outline" onClick={() => toggle(p.id as string, p.status as string)}>
                  {p.status === 'active' ? 'Disattiva' : 'Attiva'}
                </button>
                <button className="btn btn-xs btn-error btn-outline" onClick={() => del(p.id as string)}><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Settings Tab ───
const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [levels, setLevels] = useState<Record<string, unknown>[]>([]);
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [edited, setEdited] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [s, l, p] = await Promise.all([db.getSettings(), db.getAdminLevels(), db.getAdminInvestmentPlans()]);
    setSettings(s);
    setLevels(l);
    setPlans(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSetting = async (key: string) => {
    await db.updateSetting(key, edited[key] ?? settings[key]);
    setEdited((prev) => { const next = { ...prev }; delete next[key]; return next; });
    await load();
  };

  const saveLevel = async (level: Record<string, unknown>) => {
    const payload = { ...level, daily_rate: Number(level.daily_rate), network_bonus: Number(level.network_bonus), required_direct: Number(level.required_direct), required_total_team: Number(level.required_total_team), sort_order: Number(level.sort_order) };
    await db.updateAdminLevel(String(level.code), payload);
    await load();
  };

  const savePlan = async (plan: Record<string, unknown>) => {
    const payload = { ...plan, daily_rate: Number(plan.daily_rate), min_invest: Number(plan.min_invest), max_invest: Number(plan.max_invest), duration_days: Number(plan.duration_days), sort_order: Number(plan.sort_order) };
    await db.updateAdminInvestmentPlan(String(plan.id), payload);
    await load();
  };

  if (loading) return <div className="flex justify-center p-8"><span className="loading loading-spinner" /></div>;

  return (
    <div className="space-y-4">
      <div className="card bg-base-200 p-3 space-y-3">
        <div className="text-sm font-semibold">Parametri piattaforma</div>
        {Object.keys(settings).sort().map((key) => (
          <div key={key} className="flex gap-2 items-center">
            <label className="w-40 text-xs opacity-60 truncate">{key}</label>
            <input className="input input-xs input-bordered flex-1" value={edited[key] ?? settings[key] ?? ''} onChange={(e) => setEdited((prev) => ({ ...prev, [key]: e.target.value }))} />
            <button className="btn btn-xs btn-primary" onClick={() => saveSetting(key)}>Salva</button>
          </div>
        ))}
      </div>

      <div className="card bg-base-200 p-3 space-y-3">
        <div className="flex items-center justify-between"><div className="text-sm font-semibold">Livelli qualifica</div><button className="btn btn-xs" onClick={async () => { await db.createAdminLevel({ code: `NEW_${Date.now()}`, name: 'Nuovo livello', description: '', daily_rate: 0.01, network_bonus: 0, required_direct: 0, required_total_team: 0, sort_order: levels.length + 1, icon: 'Shield', color: 'badge-neutral', is_active: true }); await load(); }}>Aggiungi livello</button></div>
        {levels.map((level, idx) => (
          <div key={String(level.code)} className="rounded-2xl bg-base-100 p-3 grid md:grid-cols-8 gap-2 text-xs">
            <input className="input input-xs input-bordered" value={String(level.code || '')} onChange={(e) => setLevels((prev) => prev.map((item, i) => i === idx ? { ...item, code: e.target.value.toUpperCase() } : item))} />
            <input className="input input-xs input-bordered" value={String(level.name || '')} onChange={(e) => setLevels((prev) => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(level.daily_rate || '')} onChange={(e) => setLevels((prev) => prev.map((item, i) => i === idx ? { ...item, daily_rate: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(level.network_bonus || '')} onChange={(e) => setLevels((prev) => prev.map((item, i) => i === idx ? { ...item, network_bonus: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(level.required_direct || '')} onChange={(e) => setLevels((prev) => prev.map((item, i) => i === idx ? { ...item, required_direct: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(level.required_total_team || '')} onChange={(e) => setLevels((prev) => prev.map((item, i) => i === idx ? { ...item, required_total_team: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(level.sort_order || '')} onChange={(e) => setLevels((prev) => prev.map((item, i) => i === idx ? { ...item, sort_order: e.target.value } : item))} />
            <button className="btn btn-xs btn-primary" onClick={() => saveLevel(level)}>Salva</button>
          </div>
        ))}
      </div>

      <div className="card bg-base-200 p-3 space-y-3">
        <div className="flex items-center justify-between"><div className="text-sm font-semibold">Piani investimento</div><button className="btn btn-xs" onClick={async () => { await db.createAdminInvestmentPlan({ slug: `new-plan-${Date.now()}`, name: 'Nuovo piano', description: '', plan_type: 'solo', daily_rate: 0.01, min_invest: 50, max_invest: 100, min_level_code: 'PRE', duration_days: 30, sort_order: plans.length + 1, icon: 'TrendingUp', is_active: true }); await load(); }}>Aggiungi piano</button></div>
        {plans.map((plan, idx) => (
          <div key={String(plan.id)} className="rounded-2xl bg-base-100 p-3 grid md:grid-cols-9 gap-2 text-xs">
            <input className="input input-xs input-bordered" value={String(plan.slug || '')} onChange={(e) => setPlans((prev) => prev.map((item, i) => i === idx ? { ...item, slug: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(plan.name || '')} onChange={(e) => setPlans((prev) => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(plan.daily_rate || '')} onChange={(e) => setPlans((prev) => prev.map((item, i) => i === idx ? { ...item, daily_rate: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(plan.min_invest || '')} onChange={(e) => setPlans((prev) => prev.map((item, i) => i === idx ? { ...item, min_invest: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(plan.max_invest || '')} onChange={(e) => setPlans((prev) => prev.map((item, i) => i === idx ? { ...item, max_invest: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(plan.min_level_code || '')} onChange={(e) => setPlans((prev) => prev.map((item, i) => i === idx ? { ...item, min_level_code: e.target.value.toUpperCase() } : item))} />
            <input className="input input-xs input-bordered" value={String(plan.duration_days || '')} onChange={(e) => setPlans((prev) => prev.map((item, i) => i === idx ? { ...item, duration_days: e.target.value } : item))} />
            <input className="input input-xs input-bordered" value={String(plan.sort_order || '')} onChange={(e) => setPlans((prev) => prev.map((item, i) => i === idx ? { ...item, sort_order: e.target.value } : item))} />
            <button className="btn btn-xs btn-primary" onClick={() => savePlan(plan)}>Salva</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── API Keys Tab ───────────────────────────────────────────────────────────
interface ApiKeyField {
  key: string;
  label: string;
  placeholder: string;
  hint: string;
  link?: string;
}

interface ApiKeyGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  fields: ApiKeyField[];
}

const API_KEY_GROUPS: ApiKeyGroup[] = [
  {
    id: 'blockchain_tron',
    title: 'Blockchain — TRC-20 (Tron/USDT)',
    icon: <Coins className="w-4 h-4" />,
    color: 'text-warning',
    fields: [
      { key: 'tron_api_key', label: 'TronGrid API Key', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', hint: 'Ottieni su trongrid.io → Crea progetto', link: 'https://www.trongrid.io' },
      { key: 'company_wallet_trc20', label: 'Wallet Aziendale TRC-20', placeholder: 'TXxxxxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Indirizzo Tron dove ricevere i depositi USDT TRC-20' },
    ],
  },
  {
    id: 'blockchain_eth',
    title: 'Blockchain — ERC-20 (Ethereum/USDT)',
    icon: <Globe className="w-4 h-4" />,
    color: 'text-primary',
    fields: [
      { key: 'infura_api_key', label: 'Infura API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Ottieni su infura.io → Crea progetto Ethereum Mainnet', link: 'https://www.infura.io' },
      { key: 'company_wallet_erc20', label: 'Wallet Aziendale ERC-20', placeholder: '0xYourEthereumWalletAddress', hint: 'Indirizzo Ethereum dove ricevere i depositi USDT ERC-20' },
    ],
  },
  {
    id: 'email',
    title: 'Email — SendGrid',
    icon: <Mail className="w-4 h-4" />,
    color: 'text-info',
    fields: [
      { key: 'sendgrid_api_key', label: 'SendGrid API Key', placeholder: 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx', hint: 'Ottieni su sendgrid.com → Settings → API Keys', link: 'https://app.sendgrid.com/settings/api_keys' },
      { key: 'email_from', label: 'Email Mittente', placeholder: 'noreply@tuodominio.com', hint: 'Deve corrispondere a un dominio verificato su SendGrid' },
    ],
  },
];

const SENSITIVE_KEYS = ['tron_api_key', 'infura_api_key', 'sendgrid_api_key'];

const ApiKeysTab: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getSettings().then(s => { setSettings(s); setLoading(false); });
  }, []);

  const toggleVisibility = (key: string) =>
    setVisible(v => ({ ...v, [key]: !v[key] }));

  const handleSave = async (key: string) => {
    const val = edited[key];
    if (val === undefined) return;
    setSaving(key);
    try {
      await db.updateSetting(key, val);
      setSettings(s => ({ ...s, [key]: val }));
      setEdited(e => { const n = { ...e }; delete n[key]; return n; });
      setSaved(s => ({ ...s, [key]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000);
    } catch {
      // error
    }
    setSaving(null);
  };

  const handleSaveGroup = async (fields: ApiKeyField[]) => {
    for (const f of fields) {
      if (edited[f.key] !== undefined) await handleSave(f.key);
    }
  };

  const isKeySet = (key: string) => !!(settings[key] && settings[key].length > 4);
  const hasUnsaved = (fields: ApiKeyField[]) => fields.some(f => edited[f.key] !== undefined);

  if (loading) return <div className="flex justify-center p-8"><span className="loading loading-spinner" /></div>;

  return (
    <div className="space-y-4 pb-8">
      {/* Header info */}
      <div className="alert bg-base-200 border border-base-300 text-xs py-2">
        <Key className="w-4 h-4 shrink-0 text-warning" />
        <span>Le chiavi sono salvate nel database cifrato. Non serve modificare il codice o riavviare il server.</span>
      </div>

      {API_KEY_GROUPS.map(group => (
        <div key={group.id} className="card bg-base-200 shadow">
          {/* Group header */}
          <div className="card-body p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={group.color}>{group.icon}</span>
                <span className="font-semibold text-sm">{group.title}</span>
              </div>
              {/* Group status dots */}
              <div className="flex gap-1">
                {group.fields.map(f => (
                  <span key={f.key} className="tooltip" data-tip={f.label}>
                    {isKeySet(f.key)
                      ? <Wifi className="w-3.5 h-3.5 text-success" />
                      : <WifiOff className="w-3.5 h-3.5 text-error/50" />}
                  </span>
                ))}
              </div>
            </div>

            <div className="divider my-0 py-0 h-px" />

            {/* Fields */}
            {group.fields.map(field => {
              const isSensitive = SENSITIVE_KEYS.includes(field.key);
              const isVisible = visible[field.key] || !isSensitive;
              const currentVal = edited[field.key] ?? settings[field.key] ?? '';
              const isDirty = edited[field.key] !== undefined;
              const isSet = isKeySet(field.key);

              return (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium opacity-80">{field.label}</label>
                    <div className="flex items-center gap-1">
                      {isSet && !isDirty && (
                        <span className="badge badge-success badge-xs">Configurata</span>
                      )}
                      {!isSet && !isDirty && (
                        <span className="badge badge-error badge-xs opacity-60">Non impostata</span>
                      )}
                      {isDirty && (
                        <span className="badge badge-warning badge-xs">Modificata</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        className={`input input-sm input-bordered w-full pr-9 font-mono text-xs ${isDirty ? 'border-warning' : ''}`}
                        placeholder={field.placeholder}
                        value={currentVal}
                        onChange={e => setEdited(ed => ({ ...ed, [field.key]: e.target.value }))}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {isSensitive && (
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                          onClick={() => toggleVisibility(field.key)}
                          type="button"
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    <button
                      className={`btn btn-sm shrink-0 ${saved[field.key] ? 'btn-success' : isDirty ? 'btn-warning' : 'btn-ghost'}`}
                      disabled={!isDirty || saving === field.key}
                      onClick={() => handleSave(field.key)}
                    >
                      {saving === field.key
                        ? <span className="loading loading-spinner loading-xs" />
                        : saved[field.key]
                          ? <Check className="w-3.5 h-3.5" />
                          : <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="text-xs opacity-40 pl-1">
                    {field.hint}
                    {field.link && (
                      <a href={field.link} target="_blank" rel="noopener noreferrer" className="ml-1 link link-primary opacity-70">
                        → Apri sito
                      </a>
                    )}
                  </p>
                </div>
              );
            })}

            {/* Save all in group button */}
            {hasUnsaved(group.fields) && (
              <button
                className="btn btn-sm btn-warning w-full mt-2"
                onClick={() => handleSaveGroup(group.fields)}
                disabled={saving !== null}
              >
                {saving ? <span className="loading loading-spinner loading-xs" /> : null}
                Salva tutto il gruppo
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Test connection hints */}
      <div className="card bg-base-200 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-base-content/40" />
          <span className="text-xs font-semibold opacity-60">Come verificare che funzioni</span>
        </div>
        <ul className="text-xs opacity-50 space-y-1 pl-2">
          <li>• <b>TronGrid:</b> il cron job di monitoraggio depositi parte ogni 2 minuti automaticamente</li>
          <li>• <b>Infura:</b> i depositi ERC-20 vengono rilevati in tempo reale tramite WebSocket</li>
          <li>• <b>SendGrid:</b> esegui un reset password o registrazione per testare l'email</li>
          <li>• Controlla i log del server: <code className="bg-base-300 px-1 rounded">pm2 logs wayone-api</code></li>
        </ul>
      </div>
    </div>
  );
};

// ─── Main Admin Component ───
export const Admin: React.FC<AdminProps> = ({ userId, user, onNavigate }) => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (tab === 'dashboard') {
      db.getAdminDashboardStats().then(setStats);
    }
  }, [tab]);

  if (!(user.is_admin === true || Number(user.is_admin || 0) === 1)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <ShieldAlert className="w-12 h-12 text-error" />
        <div className="text-lg font-bold">Accesso Negato</div>
        <div className="text-sm opacity-60">Non hai i permessi di amministratore.</div>
        <button className="btn btn-sm btn-primary" onClick={() => onNavigate('home')}>Torna alla Home</button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'users', label: 'Utenti', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'deposits', label: 'Depositi', icon: <ArrowDownToLine className="w-3.5 h-3.5" /> },
    { id: 'withdrawals', label: 'Prelievi', icon: <ArrowUpFromLine className="w-3.5 h-3.5" /> },
    { id: 'popups', label: 'Popup', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
    { id: 'apikeys', label: 'API Keys', icon: <Key className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">🛡️ Admin Panel</h2>
        {tab === 'dashboard' && (
          <button className="btn btn-xs btn-ghost" onClick={() => { setStats(null); db.getAdminDashboardStats().then(setStats); }}>
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} className={`btn btn-xs gap-1 ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.id)}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab stats={stats} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'deposits' && <DepositsTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'popups' && <PopupsTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'apikeys' && <ApiKeysTab />}
    </div>
  );
};
