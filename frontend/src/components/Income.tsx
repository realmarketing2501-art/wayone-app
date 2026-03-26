import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DollarSign, TrendingUp, Users, Gift, Download } from 'lucide-react';
import * as db from '../utils/api';
import { BaseProps } from '../types';

const Chart = (window as any).Chart;

type IncomeTab = 'all' | 'interest' | 'team' | 'bonus';

export const Income: React.FC<BaseProps> = ({ userId, user }) => {
  const [activeTab, setActiveTab] = useState<IncomeTab>('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; interest: number; team: number; bonus: number; daily: { date: string; amount: number }[] }>({
    total: 0, interest: 0, team: 0, bonus: 0, daily: [],
  });
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  const loadData = useCallback(async () => {
    try {
      const [incomeStats, incomeRecords] = await Promise.all([
        db.getUserIncomeStats(userId),
        db.getUserIncome(userId, 50),
      ]);
      setStats(incomeStats);
      setRecords(incomeRecords);
    } catch (e) {
      console.error('Failed to load income data:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initialize chart when stats.daily changes
  useEffect(() => {
    if (!chartRef.current || typeof Chart === 'undefined' || stats.daily.length === 0) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const dailySorted = [...stats.daily].reverse();

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: dailySorted.map(d => d.date),
        datasets: [{
          label: 'Income USDT',
          data: dailySorted.map(d => d.amount),
          borderColor: '#00c853',
          backgroundColor: 'rgba(0,200,83,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#00c853',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } } },
        },
      },
    });

    return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
  }, [stats.daily]);

  const filtered = activeTab === 'all'
    ? records
    : records.filter(r => {
        if (activeTab === 'bonus') return r.type === 'bonus' || r.type === 'task_reward';
        return r.type === activeTab;
      });

  const getTypeIcon = (type: string) => {
    if (type === 'interest') return <TrendingUp size={14} className="text-primary" />;
    if (type === 'team') return <Users size={14} className="text-info" />;
    return <Gift size={14} className="text-warning" />;
  };

  const getTypeLabel = (type: string) => {
    if (type === 'interest') return 'Interest';
    if (type === 'team') return 'Team';
    if (type === 'task_reward') return 'Task Reward';
    return 'Bonus';
  };

  const getTypeBadge = (type: string) => {
    if (type === 'interest') return 'badge-primary';
    if (type === 'team') return 'badge-info';
    return 'badge-warning';
  };

  const formatDate = (dateStr: unknown) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr as string);
      return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(dateStr);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-safe space-y-4 animate-fade-in">
      {/* Total Header */}
      <div className="card bg-gradient-to-r from-primary/20 to-primary/5">
        <div className="card-body p-4 items-center text-center">
          <p className="text-sm text-base-content/60">Reddito Cumulativo Totale</p>
          <p className="text-4xl font-extrabold text-base-content">{stats.total.toFixed(1)} <span className="text-lg font-normal text-base-content/50">USDT</span></p>
        </div>
      </div>

      {/* Income Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card bg-base-200">
          <div className="card-body p-3 items-center">
            <TrendingUp size={16} className="text-primary" />
            <p className="text-xs text-base-content/50">Interest</p>
            <p className="font-bold text-sm text-base-content">{stats.interest.toFixed(1)}</p>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body p-3 items-center">
            <Users size={16} className="text-info" />
            <p className="text-xs text-base-content/50">Team</p>
            <p className="font-bold text-sm text-base-content">{stats.team.toFixed(1)}</p>
          </div>
        </div>
        <div className="card bg-base-200">
          <div className="card-body p-3 items-center">
            <Gift size={16} className="text-warning" />
            <p className="text-xs text-base-content/50">Bonus</p>
            <p className="font-bold text-sm text-base-content">{stats.bonus.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Claim Buttons */}
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm flex-1 gap-1">
          <Download size={14} /> Incassa Interest
        </button>
        <button className="btn btn-info btn-sm flex-1 gap-1 text-info-content">
          <Download size={14} /> Incassa Team
        </button>
      </div>

      {/* Chart */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <h3 className="text-sm font-bold text-base-content mb-2">📈 Daily Income ({stats.daily.length}gg)</h3>
          <div className="chart-container">
            {stats.daily.length > 0 ? (
              <canvas ref={chartRef}></canvas>
            ) : (
              <p className="text-sm text-base-content/40 text-center py-6">Nessun dato disponibile</p>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs tabs-boxed bg-base-200">
        {(['all', 'interest', 'team', 'bonus'] as IncomeTab[]).map((t) => (
          <button key={t} className={`tab flex-1 text-xs ${activeTab === t ? 'tab-active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'all' ? 'Tutti' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Records Table */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-base-content/40">
            <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nessuna transazione</p>
          </div>
        ) : (
          filtered.map((record) => (
            <div key={record.id as string} className="flex items-center gap-3 p-3 rounded-xl bg-base-200">
              {getTypeIcon(record.type as string)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-base-content truncate">{record.description as string || getTypeLabel(record.type as string) + ' Income'}</p>
                  <span className={`badge badge-xs ${getTypeBadge(record.type as string)}`}>{getTypeLabel(record.type as string)}</span>
                </div>
                <p className="text-[10px] text-base-content/40">{formatDate(record.created_at)}</p>
              </div>
              <span className="text-sm font-bold text-success">+{(record.amount as number).toFixed(2)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
