import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Wallet, Globe, LogOut, ChevronRight, CheckCircle, Key, Upload, Plus, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { ProfileProps, LEVELS } from '../types';
import * as db from '../utils/api';

type QualificaLevel = keyof typeof LEVELS;

const getLevelBadgeClass = (level: string): string => {
  const map: Record<string, string> = {
    PRE: 'badge-level-pre', BRONZ: 'badge-level-bronz', SILVER: 'badge-level-silver',
    SILVER_ELITE: 'badge-level-silver-elite', GOLD: 'badge-level-gold',
    ZAFFIRO: 'badge-level-zaffiro', DIAMANTE: 'badge-level-diamante',
  };
  return map[level] || 'badge-ghost';
};

interface SavedWallet {
  address: string;
  network: string;
  label: string;
}

export const Profile: React.FC<ProfileProps> = ({ userId, user, onNavigate, onLogout, onRefresh }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  // KYC
  const [kycStatus, setKycStatus] = useState<string>((user.kyc_status as string) || 'none');
  const [kycUploading, setKycUploading] = useState(false);

  // Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Wallets
  const [savedWallets, setSavedWallets] = useState<SavedWallet[]>([]);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletNetwork, setNewWalletNetwork] = useState('TRC20');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [walletSaving, setWalletSaving] = useState(false);

  // Language
  const [language, setLanguage] = useState('it');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = useCallback(async () => {
    try {
      const code = await db.getUserReferralCode(userId);
      setReferralCode(code || '');

      // Parse saved wallets
      try {
        const wallets = user.saved_wallets ? JSON.parse(user.saved_wallets as string) : [];
        setSavedWallets(Array.isArray(wallets) ? wallets : []);
      } catch {
        setSavedWallets([]);
      }

      setKycStatus((user.kyc_status as string) || 'none');
    } catch (err) {
      console.error('Profile load error:', err);
    }
  }, [userId, user]);

  const userLevel = (user.level as string) || 'PRE';
  const levelConfig = LEVELS[userLevel] || LEVELS['PRE'];
  const userName = (user.name as string) || (user.full_name as string) || 'Utente';
  const userEmail = (user.email as string) || '';
  const userBalance = Number(user.balance || 0);
  const isAdmin = Number(user.is_admin || 0) === 1;
  const avatar = userName.charAt(0).toUpperCase();
  const registeredAt = user.created_at ? new Date(user.created_at as string).toLocaleDateString('it-IT') : '';

  const kycBadge = () => {
    switch (kycStatus) {
      case 'verified': return <span className="badge badge-success badge-sm gap-1"><CheckCircle size={10} /> Verificato</span>;
      case 'pending': return <span className="badge badge-warning badge-sm">In Attesa</span>;
      case 'rejected': return <span className="badge badge-error badge-sm">Rifiutato</span>;
      default: return <span className="badge badge-ghost badge-sm">Non Verificato</span>;
    }
  };

  const handleKycUpload = async () => {
    setKycUploading(true);
    try {
      await db.updateUser(userId, { kyc_status: 'pending' });
      setKycStatus('pending');
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('KYC upload error:', err);
    } finally {
      setKycUploading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwError('Compila tutti i campi');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Le password non corrispondono');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('La password deve avere almeno 6 caratteri');
      return;
    }

    setPwLoading(true);
    try {
      // Verify old password
      const loginResult = await db.loginUser(userEmail, oldPassword);
      if (!loginResult) {
        setPwError('Password attuale errata');
        setPwLoading(false);
        return;
      }
      await db.updateUser(userId, { password: newPassword });
      setPwSuccess('Password aggiornata con successo!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError('Errore durante l\'aggiornamento');
    } finally {
      setPwLoading(false);
    }
  };

  const handleAddWallet = async () => {
    if (!newWalletAddress.trim()) return;
    setWalletSaving(true);
    try {
      const newWallet: SavedWallet = {
        address: newWalletAddress.trim(),
        network: newWalletNetwork,
        label: newWalletLabel.trim() || newWalletNetwork,
      };
      const updated = [...savedWallets, newWallet];
      setSavedWallets(updated);
      await db.updateUser(userId, { saved_wallets: JSON.stringify(updated) });
      setNewWalletAddress('');
      setNewWalletLabel('');
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Add wallet error:', err);
    } finally {
      setWalletSaving(false);
    }
  };

  const handleRemoveWallet = async (index: number) => {
    const updated = savedWallets.filter((_, i) => i !== index);
    setSavedWallets(updated);
    try {
      await db.updateUser(userId, { saved_wallets: JSON.stringify(updated) });
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error('Remove wallet error:', err);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard?.writeText(referralCode);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="p-4 pb-safe space-y-4 animate-fade-in">
      {/* User Card */}
      <div className="card bg-base-200">
        <div className="card-body p-5 items-center text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold ${getLevelBadgeClass(userLevel)}`}>
            {avatar}
          </div>
          <h2 className="text-xl font-bold text-base-content mt-2">{userName}</h2>
          <p className="text-xs text-base-content/50">{userEmail}</p>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLevelBadgeClass(userLevel)}`}>
            {levelConfig.name}
          </span>

          {/* Balance */}
          <div className="mt-2 text-center">
            <p className="text-xs text-base-content/40 uppercase tracking-wider">Saldo</p>
            <p className="text-2xl font-bold text-base-content">${userBalance.toFixed(2)}</p>
          </div>

          {/* Referral Code */}
          {referralCode && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-base-content/40">Codice Referral:</span>
              <code className="text-sm font-mono bg-base-300 px-2 py-0.5 rounded">{referralCode}</code>
              <button onClick={copyReferralCode} className="btn btn-ghost btn-xs">
                {copiedRef ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              </button>
            </div>
          )}

          {registeredAt && (
            <p className="text-xs text-base-content/40 mt-1">Registrato il {registeredAt}</p>
          )}

          {kycStatus === 'verified' && (
            <div className="flex items-center gap-1 text-success text-xs mt-1">
              <CheckCircle size={12} /> KYC Verificato
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-1">
        {/* Security */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
          onClick={() => toggleSection('security')}
        >
          <span className="text-primary"><Shield size={18} /></span>
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content">Security Center</p>
            <p className="text-xs text-base-content/40">Password, 2FA</p>
          </div>
          <ChevronRight size={16} className={`opacity-30 transition-transform ${activeSection === 'security' ? 'rotate-90' : ''}`} />
        </div>
        {activeSection === 'security' && (
          <div className="p-4 bg-base-200 rounded-xl space-y-4 ml-2 mr-2">
            {/* Change Password */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-base-content">Cambia Password</h4>
              {pwError && <div className="alert alert-error py-2 text-xs">{pwError}</div>}
              {pwSuccess && <div className="alert alert-success py-2 text-xs">{pwSuccess}</div>}
              <div className="form-control">
                <div className="input input-bordered input-sm flex items-center gap-2">
                  <input
                    type={showOldPw ? 'text' : 'password'}
                    placeholder="Password attuale"
                    className="grow bg-transparent text-sm"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                  <button onClick={() => setShowOldPw(!showOldPw)} className="btn btn-ghost btn-xs p-0">
                    {showOldPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="form-control">
                <div className="input input-bordered input-sm flex items-center gap-2">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="Nuova password"
                    className="grow bg-transparent text-sm"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button onClick={() => setShowNewPw(!showNewPw)} className="btn btn-ghost btn-xs p-0">
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="form-control">
                <input
                  type="password"
                  placeholder="Conferma nuova password"
                  className="input input-bordered input-sm text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                className={`btn btn-primary btn-sm w-full ${pwLoading ? 'loading' : ''}`}
                onClick={handleChangePassword}
                disabled={pwLoading}
              >
                {pwLoading ? <span className="loading loading-spinner loading-xs" /> : 'Aggiorna Password'}
              </button>
            </div>

            {/* 2FA */}
            <div className="divider text-xs text-base-content/30">2FA</div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-base-content">Autenticazione a Due Fattori</p>
                <p className="text-xs text-base-content/40">Prossimamente disponibile</p>
              </div>
              <input type="checkbox" className="toggle toggle-sm toggle-primary" disabled />
            </div>
          </div>
        )}

        {/* Wallets */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
          onClick={() => toggleSection('wallets')}
        >
          <span className="text-info"><Wallet size={18} /></span>
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content">Wallet Salvati</p>
            <p className="text-xs text-base-content/40">{savedWallets.length} wallet{savedWallets.length !== 1 ? 's' : ''}</p>
          </div>
          <ChevronRight size={16} className={`opacity-30 transition-transform ${activeSection === 'wallets' ? 'rotate-90' : ''}`} />
        </div>
        {activeSection === 'wallets' && (
          <div className="p-4 bg-base-200 rounded-xl space-y-3 ml-2 mr-2">
            {savedWallets.length === 0 && (
              <p className="text-xs text-base-content/40 text-center py-2">Nessun wallet salvato</p>
            )}
            {savedWallets.map((w, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-base-300 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-base-content truncate">{w.label || w.network}</p>
                  <p className="text-xs text-base-content/40 font-mono truncate">{w.address}</p>
                  <span className="badge badge-xs badge-ghost">{w.network}</span>
                </div>
                <button onClick={() => handleRemoveWallet(i)} className="btn btn-ghost btn-xs text-error">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <div className="divider text-xs text-base-content/30">Aggiungi Wallet</div>
            <input
              type="text"
              placeholder="Indirizzo wallet"
              className="input input-bordered input-sm w-full text-sm"
              value={newWalletAddress}
              onChange={(e) => setNewWalletAddress(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="select select-bordered select-sm flex-1 text-sm"
                value={newWalletNetwork}
                onChange={(e) => setNewWalletNetwork(e.target.value)}
              >
                <option value="TRC20">TRC20</option>
                <option value="ERC20">ERC20</option>
                <option value="BEP20">BEP20</option>
                <option value="BTC">Bitcoin</option>
              </select>
              <input
                type="text"
                placeholder="Etichetta"
                className="input input-bordered input-sm flex-1 text-sm"
                value={newWalletLabel}
                onChange={(e) => setNewWalletLabel(e.target.value)}
              />
            </div>
            <button
              className={`btn btn-info btn-sm w-full gap-1 ${walletSaving ? 'loading' : ''}`}
              onClick={handleAddWallet}
              disabled={!newWalletAddress.trim() || walletSaving}
            >
              {walletSaving ? <span className="loading loading-spinner loading-xs" /> : <><Plus size={14} /> Aggiungi Wallet</>}
            </button>
          </div>
        )}

        {/* KYC */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
          onClick={() => toggleSection('kyc')}
        >
          <span className="text-warning"><Key size={18} /></span>
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content">KYC Verifica</p>
            <p className="text-xs text-base-content/40 flex items-center gap-1">
              {kycBadge()}
            </p>
          </div>
          <ChevronRight size={16} className={`opacity-30 transition-transform ${activeSection === 'kyc' ? 'rotate-90' : ''}`} />
        </div>
        {activeSection === 'kyc' && (
          <div className="p-4 bg-base-200 rounded-xl space-y-3 ml-2 mr-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-content">Stato KYC:</span>
              {kycBadge()}
            </div>
            {kycStatus === 'none' || kycStatus === 'rejected' ? (
              <div className="space-y-2">
                <p className="text-xs text-base-content/50">
                  {kycStatus === 'rejected'
                    ? 'La tua verifica è stata rifiutata. Riprova con un documento valido.'
                    : 'Carica un documento d\'identità per verificare il tuo account.'}
                </p>
                <button
                  className={`btn btn-warning btn-sm w-full gap-1`}
                  onClick={handleKycUpload}
                  disabled={kycUploading}
                >
                  {kycUploading ? <span className="loading loading-spinner loading-xs" /> : <><Upload size={14} /> Carica Documento</>}
                </button>
              </div>
            ) : kycStatus === 'pending' ? (
              <div className="alert alert-warning py-2">
                <p className="text-xs">Il tuo documento è in fase di revisione. Ti notificheremo appena sarà verificato.</p>
              </div>
            ) : (
              <div className="alert alert-success py-2">
                <p className="text-xs">Il tuo account è stato verificato con successo!</p>
              </div>
            )}
          </div>
        )}

        {/* Language */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
          onClick={() => toggleSection('language')}
        >
          <span className="text-base-content/60"><Globe size={18} /></span>
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content">Lingua</p>
            <p className="text-xs text-base-content/40">{language === 'it' ? 'Italiano' : 'English'}</p>
          </div>
          <ChevronRight size={16} className={`opacity-30 transition-transform ${activeSection === 'language' ? 'rotate-90' : ''}`} />
        </div>
        {activeSection === 'language' && (
          <div className="p-4 bg-base-200 rounded-xl space-y-2 ml-2 mr-2">
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-300">
              <input
                type="radio"
                name="language"
                className="radio radio-sm radio-primary"
                checked={language === 'it'}
                onChange={() => setLanguage('it')}
              />
              <span className="text-sm">🇮🇹 Italiano</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-300">
              <input
                type="radio"
                name="language"
                className="radio radio-sm radio-primary"
                checked={language === 'en'}
                onChange={() => setLanguage('en')}
              />
              <span className="text-sm">🇬🇧 English</span>
            </label>
          </div>
        )}
      </div>

      {/* Admin Button - only if admin */}
      {isAdmin && (
        <button onClick={() => onNavigate('admin')} className="btn btn-outline btn-warning w-full gap-2">
          🔐 Pannello Admin
        </button>
      )}

      {/* Logout */}
      <button className="btn btn-ghost btn-sm w-full text-error gap-1 mt-4" onClick={onLogout}>
        <LogOut size={16} /> Logout
      </button>
    </div>
  );
};
