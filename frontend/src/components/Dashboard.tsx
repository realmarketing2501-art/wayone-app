import React, { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Coins, Rocket, Users } from 'lucide-react';
import { DashboardProps, QualificationLevel, levelLabel } from '../types';
import * as db from '../utils/api';

export const Dashboard: React.FC<DashboardProps> = ({ userId, user, onNavigate }) => {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [levels, setLevels] = useState<QualificationLevel[]>([]);
  const [branding, setBranding] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [userStats, config] = await Promise.all([db.getUserStats(userId), db.getPublicAppConfig()]);
      setStats(userStats);
      setLevels((config.levels as QualificationLevel[]) || []);
      setBranding((config.branding as Record<string, string>) || {});
    })();
  }, [userId]);

  const userName = String(user.full_name || user.name || 'Utente');
  const level = String(user.level || 'PRE');
  const balance = Number(user.balance || 0);

  return (
    <div className="p-4 space-y-4">
      <div className="hero rounded-3xl bg-gradient-to-r from-primary/20 to-secondary/10 overflow-hidden">
        <div className="hero-content flex-col lg:flex-row justify-between w-full">
          <div>
            <div className="badge badge-primary mb-2">{branding.heroTitle || 'WAY ONE'}</div>
            <h1 className="text-3xl font-bold">Ciao {userName}</h1>
            <p className="mt-2 opacity-80 max-w-xl">{branding.heroSubtitle || 'Invest. Grow. Succeed.'}</p>
            <div className="mt-3 text-sm opacity-70">Livello attuale: <b>{levelLabel(level, levels)}</b></div>
          </div>
          <div className="card bg-base-100 shadow-xl min-w-[260px]">
            <div className="card-body">
              <div className="text-sm opacity-60">Saldo disponibile</div>
              <div className="text-3xl font-bold">{balance.toFixed(2)} USDT</div>
              <button className="btn btn-primary btn-sm mt-2" onClick={() => onNavigate('invest')}>Vai a Invest <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="card bg-base-200"><div className="card-body"><div className="flex items-center gap-2 text-sm opacity-60"><Rocket className="w-4 h-4" /> Investimenti attivi</div><div className="text-2xl font-bold">{Number(stats.activeInvestments || 0)}</div><div className="text-xs opacity-60">Volume {Number(stats.activeInvestmentVolume || 0).toFixed(2)} USDT</div></div></div>
        <div className="card bg-base-200"><div className="card-body"><div className="flex items-center gap-2 text-sm opacity-60"><Coins className="w-4 h-4" /> Guadagni accumulati</div><div className="text-2xl font-bold text-success">{Number(stats.positiveIncome || 0).toFixed(2)}</div></div></div>
        <div className="card bg-base-200"><div className="card-body"><div className="flex items-center gap-2 text-sm opacity-60"><BarChart3 className="w-4 h-4" /> Depositi confermati</div><div className="text-2xl font-bold">{Number(stats.confirmedDepositVolume || 0).toFixed(2)}</div></div></div>
        <div className="card bg-base-200"><div className="card-body"><div className="flex items-center gap-2 text-sm opacity-60"><Users className="w-4 h-4" /> Ritirati</div><div className="text-2xl font-bold">{Number(stats.completedWithdrawalVolume || 0).toFixed(2)}</div></div></div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <button className="card bg-base-200 text-left hover:bg-base-300" onClick={() => onNavigate('network')}><div className="card-body"><div className="font-semibold">Invita amici e QR</div><div className="text-sm opacity-70">Link referral, QR funzionante e metriche del team.</div></div></button>
        <button className="card bg-base-200 text-left hover:bg-base-300" onClick={() => onNavigate('deposit')}><div className="card-body"><div className="font-semibold">Deposita capitale</div><div className="text-sm opacity-70">Ricarica il saldo e sblocca i piani disponibili.</div></div></button>
        <button className="card bg-base-200 text-left hover:bg-base-300" onClick={() => onNavigate('profile')}><div className="card-body"><div className="font-semibold">Profilo e lingua</div><div className="text-sm opacity-70">Gestisci wallet salvati, lingua, sicurezza e dati personali.</div></div></button>
      </div>
    </div>
  );
};
