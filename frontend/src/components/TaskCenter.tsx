import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Gift, CheckCircle, Circle, Filter, Trophy, Loader2 } from 'lucide-react';
import * as db from '../utils/api';
import { RefreshableProps } from '../types';

type TabFilter = 'all' | 'daily' | 'weekly' | 'one-time';

export const TaskCenter: React.FC<RefreshableProps> = ({ userId, user, onRefresh }) => {
  const [tab, setTab] = useState<TabFilter>('all');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await db.getUserTaskProgress(userId);
      setTasks(data);
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleComplete = async (taskId: string, reward: number) => {
    setCompleting(taskId);
    try {
      await db.completeTask(userId, taskId);
      setToast(`+${reward} USDT ricompensa ricevuta!`);
      setTimeout(() => setToast(null), 3000);
      await onRefresh();
      await loadTasks();
    } catch (e) {
      console.error('Failed to complete task', e);
    } finally {
      setCompleting(null);
    }
  };

  const filtered = tab === 'all' ? tasks : tasks.filter(t => t.type === tab);
  const completedCount = filtered.filter(t => t.completed).length;
  const totalRewards = tasks.filter(t => t.completed).reduce((sum: number, t: any) => sum + (Number(t.reward) || 0), 0);

  const tabLabel = (t: TabFilter) => {
    switch (t) {
      case 'all': return 'Tutti';
      case 'daily': return 'Giornaliere';
      case 'weekly': return 'Settimanali';
      case 'one-time': return 'Una tantum';
    }
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case 'daily': return <span className="badge badge-sm badge-info">Giornaliero</span>;
      case 'weekly': return <span className="badge badge-sm badge-secondary">Settimanale</span>;
      case 'one-time': return <span className="badge badge-sm badge-accent">Una tantum</span>;
      default: return <span className="badge badge-sm badge-ghost">{type}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-safe space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-base-content">Task Center</h2>
      </div>

      {/* Toast */}
      {toast && (
        <div className="alert alert-success shadow-lg animate-fade-in">
          <Trophy size={18} />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Total Rewards Summary */}
      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="card-body p-4 flex-row items-center gap-3">
          <div className="bg-warning/20 rounded-full p-2">
            <Gift size={20} className="text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-base-content/60">Ricompense Totali Guadagnate</p>
            <p className="text-lg font-bold text-warning">{totalRewards.toFixed(2)} USDT</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-base-content/60">Completate</p>
            <p className="text-sm font-bold text-success">
              {tasks.filter(t => t.completed).length}/{tasks.length}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-base-content/60">
              Progresso {tab === 'all' ? 'Totale' : tabLabel(tab)}
            </span>
            <span className="text-sm font-bold text-primary">{completedCount}/{filtered.length}</span>
          </div>
          <progress
            className="progress progress-primary w-full h-3"
            value={completedCount}
            max={filtered.length || 1}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs tabs-boxed bg-base-200">
        {(['all', 'daily', 'weekly', 'one-time'] as TabFilter[]).map((t) => (
          <button
            key={t}
            className={`tab flex-1 ${tab === t ? 'tab-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {tabLabel(t)}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-base-content/40">
            <ClipboardList size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nessun task disponibile</p>
          </div>
        )}
        {filtered.map((task) => (
          <div key={task.id} className={`card bg-base-200 ${task.completed ? 'opacity-60' : ''}`}>
            <div className="card-body p-4 gap-2">
              <div className="flex items-start gap-3">
                {task.completed ? (
                  <CheckCircle size={22} className="text-success shrink-0 mt-0.5" />
                ) : (
                  <Circle size={22} className="text-base-content/30 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${task.completed ? 'line-through text-base-content/50' : 'text-base-content'}`}>
                      {task.title}
                    </p>
                    {typeBadge(task.type)}
                  </div>
                  <p className="text-xs text-base-content/40 mt-0.5">{task.description}</p>
                  {task.completed && task.completed_at && (
                    <p className="text-xs text-success/60 mt-1">
                      ✓ Completato il {new Date(task.completed_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <Gift size={12} className="text-warning" />
                    <span className="text-xs font-bold text-warning">+{task.reward} USDT</span>
                  </div>
                  {!task.completed && (
                    <button
                      className={`btn btn-primary btn-xs ${completing === task.id ? 'loading' : ''}`}
                      disabled={completing !== null}
                      onClick={() => handleComplete(task.id, Number(task.reward) || 0)}
                    >
                      {completing === task.id ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        'Completa'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
