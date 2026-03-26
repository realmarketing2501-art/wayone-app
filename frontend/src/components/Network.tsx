import React, { useEffect, useMemo, useState } from 'react';
import { Copy, QrCode, Share2, Users, WalletCards } from 'lucide-react';
import * as db from '../utils/api';
import { BaseProps, QualificationLevel, levelLabel } from '../types';

export const Network: React.FC<BaseProps> = ({ userId, user }) => {
  const [stats, setStats] = useState({ totalMembers: 0, directReferrals: 0, totalVolume: 0, levelDistribution: {} as Record<string, number> });
  const [tree, setTree] = useState<Record<string, unknown>[]>([]);
  const [levels, setLevels] = useState<QualificationLevel[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const baseUrl = window.location.origin;

  useEffect(() => {
    (async () => {
      const [networkStats, networkTree, code, config] = await Promise.all([
        db.getNetworkStats(userId),
        db.getNetworkTree(userId),
        db.getUserReferralCode(userId),
        db.getPublicAppConfig(),
      ]);
      setStats(networkStats);
      setTree(networkTree);
      setReferralCode(code);
      setLevels((config.levels as QualificationLevel[]) || []);
    })();
  }, [userId]);

  const inviteLink = useMemo(() => `${baseUrl}/?ref=${encodeURIComponent(referralCode)}`, [baseUrl, referralCode]);
  const qrSrc = useMemo(() => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`, [inviteLink]);

  return (
    <div className="p-4 space-y-4">
      <div className="hero rounded-3xl bg-base-200">
        <div className="hero-content flex-col lg:flex-row justify-between w-full">
          <div>
            <div className="badge badge-primary mb-2">Referral & Network</div>
            <h2 className="text-2xl font-bold">Invita amici, condividi QR, monitora il team</h2>
            <p className="text-sm opacity-70 mt-2">Il tuo livello attuale è {levelLabel(String(user.level || 'PRE'), levels)}.</p>
          </div>
          <div className="stats shadow bg-base-100">
            <div className="stat"><div className="stat-figure text-primary"><Users /></div><div className="stat-title">Diretti</div><div className="stat-value text-lg">{stats.directReferrals}</div></div>
            <div className="stat"><div className="stat-figure text-secondary"><WalletCards /></div><div className="stat-title">Volume team</div><div className="stat-value text-lg">{stats.totalVolume.toFixed(0)}</div></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card bg-base-200">
          <div className="card-body gap-3">
            <div className="font-semibold flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> Link invito</div>
            <input className="input input-bordered" value={inviteLink} readOnly />
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(inviteLink)}><Copy className="w-4 h-4" /> Copia link</button>
              <button className="btn btn-outline" onClick={() => navigator.clipboard.writeText(referralCode)}><Copy className="w-4 h-4" /> Copia codice</button>
            </div>
            <div className="text-xs opacity-60">Codice referral: <span className="font-mono">{referralCode}</span></div>
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body items-center text-center">
            <div className="font-semibold flex items-center gap-2"><QrCode className="w-4 h-4 text-primary" /> QR invito</div>
            <img src={qrSrc} alt="QR referral" className="w-44 h-44 rounded-2xl bg-white p-3" />
            <div className="text-xs opacity-60">Scansiona per aprire la registrazione con referral già compilato.</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card bg-base-200"><div className="card-body"><div className="text-sm opacity-60">Totale membri</div><div className="text-2xl font-bold">{stats.totalMembers}</div></div></div>
        <div className="card bg-base-200"><div className="card-body"><div className="text-sm opacity-60">Diretti</div><div className="text-2xl font-bold">{stats.directReferrals}</div></div></div>
        <div className="card bg-base-200"><div className="card-body"><div className="text-sm opacity-60">Volume team</div><div className="text-2xl font-bold">{stats.totalVolume.toFixed(2)} USDT</div></div></div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <div className="font-semibold">Livelli nel tuo team</div>
          <div className="flex flex-wrap gap-2">{Object.entries(stats.levelDistribution).map(([code, count]) => <div key={code} className="badge badge-outline">{levelLabel(code, levels)}: {count}</div>)}</div>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <div className="font-semibold">Struttura network</div>
          <div className="space-y-2">{tree.length === 0 ? <div className="text-sm opacity-60">Nessun membro nel network.</div> : tree.slice(0, 20).map((row) => (
            <div key={String(row.id)} className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-base-100 rounded-2xl p-3 text-sm">
              <div><div className="opacity-60">Nome</div><div className="font-semibold">{String(row.name || 'Utente')}</div></div>
              <div><div className="opacity-60">Livello</div><div>{levelLabel(String(row.user_level || row.level || 'PRE'), levels)}</div></div>
              <div><div className="opacity-60">Branch</div><div>{String(row.branch_position || '-')}</div></div>
              <div><div className="opacity-60">Investito</div><div>{Number(row.total_invested || 0).toFixed(2)} USDT</div></div>
              <div><div className="opacity-60">Status</div><div className="badge badge-outline">{row.is_suspended ? 'Sospeso' : 'Attivo'}</div></div>
            </div>
          ))}</div>
        </div>
      </div>
    </div>
  );
};
