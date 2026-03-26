import './index.css';
import './styles.css';
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Sun, Moon, Eye, EyeOff, UserPlus, LogIn, Loader2 } from 'lucide-react';
import { Page } from './types';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { Invest } from './components/Invest';
import { Network } from './components/Network';
import { Income } from './components/Income';
import { FundPage } from './components/Fund';
import { Withdraw } from './components/Withdraw';
import { Profile } from './components/Profile';
import { TaskCenter } from './components/TaskCenter';
import { Admin } from './components/Admin';
import { Deposit } from './components/Deposit';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { UserPopupNotifications } from './components/UserPopupNotifications';
import * as api from './utils/api';

type Theme = 'dark' | 'light';
type AuthScreen = 'login' | 'register';

// ============================================================
// AUTH SCREEN
// ============================================================
const AuthScreen: React.FC<{ onLogin: (userId: string) => void; theme: Theme }> = ({ onLogin, theme }) => {
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState(() => new URLSearchParams(window.location.search).get('ref') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Compila tutti i campi'); return; }
    setLoading(true); setError('');
    const result = await api.loginUser(email, password);
    setLoading(false);
    if (result.success && result.user) {
      const uid = result.user.id as string;
      api.saveUserId(uid);
      onLogin(uid);
    } else {
      setError(result.error || 'Errore di accesso');
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) { setError('Compila tutti i campi obbligatori'); return; }
    if (password.length < 6) { setError('Password minimo 6 caratteri'); return; }
    setLoading(true); setError('');
    const result = await api.registerUser(email, password, name, referralCode || undefined);
    if (result.success && result.userId) {
      api.saveUserId(result.userId);
      setLoading(false);
      onLogin(result.userId);
    } else {
      setLoading(false);
      setError(result.error || 'Errore di registrazione');
    }
  };

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl font-bold text-primary">W1</span>
        </div>
        <h1 className="text-2xl font-bold text-base-content">WAY ONE</h1>
        <p className="text-sm text-base-content/60 mt-1">Invest. Grow. Succeed.</p>
      </div>

      <div className="card bg-base-200 w-full max-w-md shadow-xl">
        <div className="card-body">
          <div className="tabs tabs-boxed bg-base-300 mb-4">
            <button className={`tab flex-1 ${screen === 'login' ? 'tab-active' : ''}`} onClick={() => { setScreen('login'); setError(''); }}>
              <LogIn size={16} className="mr-2" /> Accedi
            </button>
            <button className={`tab flex-1 ${screen === 'register' ? 'tab-active' : ''}`} onClick={() => { setScreen('register'); setError(''); }}>
              <UserPlus size={16} className="mr-2" /> Registrati
            </button>
          </div>

          {error && <div className="alert alert-error text-sm py-2 mb-3"><span>{error}</span></div>}

          {screen === 'register' && (
            <div className="form-control mb-3">
              <label className="label"><span className="label-text">Nome completo *</span></label>
              <input type="text" className="input input-bordered w-full" placeholder="Mario Rossi" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}

          <div className="form-control mb-3">
            <label className="label"><span className="label-text">Email *</span></label>
            <input type="email" className="input input-bordered w-full" placeholder="email@esempio.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="form-control mb-3">
            <label className="label"><span className="label-text">Password *</span></label>
            <label className="input input-bordered flex items-center gap-2">
              <input type={showPassword ? 'text' : 'password'} className="grow" placeholder="Min. 6 caratteri" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (screen === 'login' ? handleLogin() : handleRegister())} />
              <button className="btn btn-ghost btn-xs" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>
          </div>

          {screen === 'register' && (
            <div className="form-control mb-3">
              <label className="label"><span className="label-text">Codice Referral (opzionale)</span></label>
              <input type="text" className="input input-bordered w-full" placeholder="Es: WO-ABC123" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} />
            </div>
          )}

          <button className={`btn btn-primary w-full mt-2 ${loading ? 'btn-disabled' : ''}`} onClick={screen === 'login' ? handleLogin : handleRegister}>
            {loading ? <><Loader2 size={18} className="animate-spin mr-2" /> Attendere...</> : screen === 'login' ? 'Accedi' : 'Crea Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('wayone_theme') as Theme) || 'dark');
  const [showPwa, setShowPwa] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const savedId = api.getSavedUserId();
      if (savedId) {
        const u = await api.getUser(savedId);
        if (u) {
          setUserId(savedId);
          setUser(u);
        } else {
          api.clearSession();
        }
      }
      setAuthReady(true);
    };
    init();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!userId) return;
    const u = await api.getUser(userId);
    if (u) setUser(u);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refreshUser();
      const interval = setInterval(refreshUser, 15000);
      return () => clearInterval(interval);
    }
  }, [userId, refreshUser]);

  const handleLogin = async (uid: string) => {
    setUserId(uid);
    const u = await api.getUser(uid);
    setUser(u);
  };

  const handleLogout = async () => {
    api.clearSession();
    setUserId(null);
    setUser(null);
    setPage('home');
  };

  useEffect(() => {
    if (userId) {
      const timer = setTimeout(() => setShowPwa(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wayone_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const navigate = (p: Page) => setPage(p);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary">W1</span>
          </div>
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-sm text-base-content/60 mt-3">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!userId || !user) {
    return (
      <>
        <button onClick={toggleTheme} className="fixed top-3 right-3 z-50 btn btn-circle btn-sm bg-base-200 border-base-300 shadow-lg">
          {theme === 'dark' ? <Sun size={16} className="text-warning" /> : <Moon size={16} className="text-primary" />}
        </button>
        <AuthScreen onLogin={handleLogin} theme={theme} />
      </>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'home': return <Dashboard userId={userId} user={user} onNavigate={navigate} onRefresh={refreshUser} />;
      case 'invest': return <Invest userId={userId} user={user} onRefresh={refreshUser} />;
      case 'network': return <Network userId={userId} user={user} />;
      case 'income': return <Income userId={userId} user={user} />;
      case 'fund': return <FundPage userId={userId} user={user} onRefresh={refreshUser} />;
      case 'withdraw': return <Withdraw userId={userId} user={user} onRefresh={refreshUser} />;
      case 'deposit': return <Deposit userId={userId} user={user} onRefresh={refreshUser} />;
      case 'profile': return <Profile userId={userId} user={user} onNavigate={navigate} onLogout={handleLogout} onRefresh={refreshUser} />;
      case 'tasks': return <TaskCenter userId={userId} user={user} onRefresh={refreshUser} />;
      case 'admin': return <Admin userId={userId} user={user} onNavigate={navigate} />;
      default: return <Dashboard userId={userId} user={user} onNavigate={navigate} onRefresh={refreshUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <button onClick={toggleTheme} className="fixed top-3 right-3 z-50 btn btn-circle btn-sm bg-base-200 border-base-300 shadow-lg hover:bg-base-300 transition-all">
        {theme === 'dark' ? <Sun size={16} className="text-warning" /> : <Moon size={16} className="text-primary" />}
      </button>
      <UserPopupNotifications userId={userId} userLevel={(user.level as string) || 'PRE'} />
      {showPwa && <PwaInstallPrompt onClose={() => setShowPwa(false)} />}
      {renderPage()}
      <BottomNav currentPage={page} onNavigate={navigate} />
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
