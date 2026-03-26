import React, { useState, useEffect } from 'react';
import { X, Bell, Gift, AlertTriangle, Info, Megaphone, Image, ChevronRight, ExternalLink, Clock, CheckCircle, Sparkles } from 'lucide-react';

// ====== TYPES ======
export interface PopupMessage {
  id: string;
  type: 'promo' | 'update' | 'alert' | 'news' | 'reward';
  title: string;
  body: string;
  imageUrl?: string;
  ctaText?: string;
  ctaAction?: string;
  target: 'all' | 'active' | 'bronze' | 'silver' | 'gold' | 'zaffiro' | 'diamante' | 'inactive';
  priority: 'low' | 'normal' | 'high' | 'critical';
  scheduledAt?: string;
  sentAt: string;
  expiresAt?: string;
  stats: { sent: number; seen: number; clicked: number; dismissed: number };
  status: 'draft' | 'scheduled' | 'sent' | 'expired';
}

// ====== MOCK POPUP DATA ======
export const mockPopups: PopupMessage[] = [
  {
    id: 'pop_001',
    type: 'promo',
    title: '🔥 Weekend Bonus +0.5%',
    body: 'Deposita entro domenica e ricevi un bonus extra dello 0.5% sul rendimento giornaliero per 7 giorni! Offerta limitata ai primi 10.000 utenti.',
    imageUrl: 'https://placehold.co/600x300/00e676/000?text=BONUS+%2B0.5%25',
    ctaText: 'Deposita Ora',
    ctaAction: 'deposit',
    target: 'all',
    priority: 'high',
    sentAt: '2026-03-25 10:00',
    expiresAt: '2026-03-30 23:59',
    stats: { sent: 387612, seen: 245890, clicked: 89234, dismissed: 156656 },
    status: 'sent',
  },
  {
    id: 'pop_002',
    type: 'update',
    title: '🆕 Aggiornamento v3.2',
    body: 'Nuove funzionalità: Dark mode migliorato, grafici income potenziati, nuovo sistema di referral QR code. Aggiorna ora!',
    ctaText: 'Scopri le novità',
    ctaAction: 'profile',
    target: 'all',
    priority: 'normal',
    sentAt: '2026-03-24 09:00',
    stats: { sent: 502847, seen: 398234, clicked: 123456, dismissed: 274778 },
    status: 'sent',
  },
  {
    id: 'pop_003',
    type: 'alert',
    title: '⚠️ Manutenzione Programmata',
    body: 'Il sistema sarà in manutenzione il 28 Marzo dalle 02:00 alle 04:00 UTC. I prelievi saranno temporaneamente sospesi.',
    target: 'all',
    priority: 'critical',
    scheduledAt: '2026-03-27 18:00',
    sentAt: '',
    expiresAt: '2026-03-28 04:00',
    stats: { sent: 0, seen: 0, clicked: 0, dismissed: 0 },
    status: 'scheduled',
  },
  {
    id: 'pop_004',
    type: 'reward',
    title: '🎁 Hai guadagnato 5 USDT!',
    body: 'Complimenti! Hai completato tutte le missioni settimanali. Il bonus di 5 USDT è stato accreditato sul tuo saldo.',
    ctaText: 'Vedi Saldo',
    ctaAction: 'home',
    target: 'active',
    priority: 'normal',
    sentAt: '2026-03-23 16:00',
    stats: { sent: 156234, seen: 134567, clicked: 98234, dismissed: 36333 },
    status: 'sent',
  },
  {
    id: 'pop_005',
    type: 'news',
    title: '📰 Nuovo Fondo Green Energy',
    body: 'Il fondo Green Energy è ora disponibile con rendimento stimato del 12% mensile. Posti limitati a 5.000 investitori.',
    imageUrl: 'https://placehold.co/600x300/ffd700/000?text=GREEN+ENERGY+FUND',
    ctaText: 'Investi Ora',
    ctaAction: 'fund',
    target: 'gold',
    priority: 'high',
    sentAt: '2026-03-22 12:00',
    stats: { sent: 19936, seen: 17234, clicked: 12456, dismissed: 4778 },
    status: 'sent',
  },
  {
    id: 'pop_006',
    type: 'promo',
    title: '💎 Offerta Diamante Esclusiva',
    body: 'Per festeggiare il tuo livello Diamante, ricevi 100 USDT bonus sul prossimo deposito superiore a 5.000 USDT!',
    imageUrl: 'https://placehold.co/600x300/9333ea/fff?text=DIAMANTE+VIP',
    ctaText: 'Riscatta Bonus',
    ctaAction: 'deposit',
    target: 'diamante',
    priority: 'high',
    sentAt: '2026-03-21 14:00',
    expiresAt: '2026-03-28 23:59',
    stats: { sent: 1135, seen: 1089, clicked: 923, dismissed: 166 },
    status: 'sent',
  },
];

// Sample images for admin to choose from
export const sampleImages = [
  { label: 'Bonus Verde', url: 'https://placehold.co/600x300/00e676/000?text=BONUS' },
  { label: 'Gold Promo', url: 'https://placehold.co/600x300/ffd700/000?text=GOLD+PROMO' },
  { label: 'Alert Rosso', url: 'https://placehold.co/600x300/ef4444/fff?text=ALERT' },
  { label: 'News Blu', url: 'https://placehold.co/600x300/3b82f6/fff?text=NEWS' },
  { label: 'VIP Viola', url: 'https://placehold.co/600x300/9333ea/fff?text=VIP' },
  { label: 'Custom URL...', url: '' },
];

// ====== USER-FACING POPUP COMPONENT ======
export const UserPopupNotification: React.FC<{
  popup: PopupMessage;
  onClose: () => void;
  onAction: (action: string) => void;
}> = ({ popup, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const typeConfig: Record<string, { icon: React.ReactNode; accent: string; glow: string }> = {
    promo: { icon: <Gift size={18} />, accent: 'text-success', glow: 'shadow-success/20' },
    update: { icon: <Info size={18} />, accent: 'text-info', glow: 'shadow-info/20' },
    alert: { icon: <AlertTriangle size={18} />, accent: 'text-warning', glow: 'shadow-warning/20' },
    news: { icon: <Megaphone size={18} />, accent: 'text-primary', glow: 'shadow-primary/20' },
    reward: { icon: <Sparkles size={18} />, accent: 'text-warning', glow: 'shadow-warning/20' },
  };

  const cfg = typeConfig[popup.type] || typeConfig.news;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`}>
      <div className={`w-full max-w-sm transition-all duration-300 ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'}`}>
        <div className={`card bg-base-200 shadow-2xl ${cfg.glow} overflow-hidden`}>
          {/* Close button */}
          <button onClick={handleClose} className="absolute top-2 right-2 z-10 btn btn-circle btn-ghost btn-xs bg-base-300/80 hover:bg-base-300">
            <X size={14} />
          </button>

          {/* Image */}
          {popup.imageUrl && (
            <div className="relative w-full h-36 bg-base-300 overflow-hidden">
              <img
                src={popup.imageUrl}
                alt=""
                className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
              />
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="loading loading-spinner loading-md text-primary" />
                </div>
              )}
              {/* Type badge overlay */}
              <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-base-300/90 ${cfg.accent}`}>
                <span className="flex items-center gap-1">{cfg.icon} {popup.type.toUpperCase()}</span>
              </div>
            </div>
          )}

          <div className="card-body p-4 space-y-3">
            {/* Title with icon if no image */}
            {!popup.imageUrl && (
              <div className={`flex items-center gap-2 ${cfg.accent}`}>
                {cfg.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{popup.type}</span>
              </div>
            )}

            <h3 className="text-base font-bold text-base-content leading-tight">{popup.title}</h3>
            <p className="text-xs text-base-content/70 leading-relaxed">{popup.body}</p>

            {/* Priority indicator for critical */}
            {popup.priority === 'critical' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-error/10 border border-error/20">
                <AlertTriangle size={12} className="text-error" />
                <span className="text-[10px] text-error font-bold">URGENTE</span>
              </div>
            )}

            {/* CTA Button */}
            <div className="flex gap-2 pt-1">
              {popup.ctaText && (
                <button
                  onClick={() => { onAction(popup.ctaAction || 'home'); handleClose(); }}
                  className="btn btn-primary btn-sm flex-1 gap-1"
                >
                  {popup.ctaText} <ChevronRight size={14} />
                </button>
              )}
              <button onClick={handleClose} className="btn btn-ghost btn-sm flex-1 text-base-content/50">
                Chiudi
              </button>
            </div>

            {/* Expiry */}
            {popup.expiresAt && (
              <p className="text-[9px] text-base-content/30 text-center flex items-center justify-center gap-1">
                <Clock size={9} /> Scade: {popup.expiresAt}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ====== USER POPUP MANAGER (wraps multiple popups in queue) ======
export const UserPopupManager: React.FC<{
  onNavigate: (page: string) => void;
}> = ({ onNavigate }) => {
  const [queue, setQueue] = useState<PopupMessage[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Simulate: show active sent popups after delay
    const timer = setTimeout(() => {
      const active = mockPopups.filter(p => p.status === 'sent').slice(0, 2);
      setQueue(active);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const currentPopup = queue.find(p => !dismissed.has(p.id));

  if (!currentPopup) return null;

  return (
    <UserPopupNotification
      popup={currentPopup}
      onClose={() => setDismissed(prev => new Set(prev).add(currentPopup.id))}
      onAction={(action) => {
        onNavigate(action);
        setDismissed(prev => new Set(prev).add(currentPopup.id));
      }}
    />
  );
};
