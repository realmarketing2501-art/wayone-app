import React, { useState, useEffect, useCallback } from 'react';
import { Info, CheckCircle, AlertTriangle, Gift, X } from 'lucide-react';
import * as db from '../utils/api';

interface PopupNotificationsProps {
  userId: string;
  userLevel: string;
}

interface Popup {
  id: string;
  title: string;
  message: string;
  image_url?: string;
  button_text?: string;
  button_url?: string;
  type?: string;
  priority?: number;
}

const typeConfig: Record<string, { icon: React.ReactNode; badgeClass: string }> = {
  info: { icon: <Info className="w-6 h-6" />, badgeClass: 'text-info' },
  success: { icon: <CheckCircle className="w-6 h-6" />, badgeClass: 'text-success' },
  warning: { icon: <AlertTriangle className="w-6 h-6" />, badgeClass: 'text-warning' },
  promo: { icon: <Gift className="w-6 h-6" />, badgeClass: 'text-amber-400' },
};

export const UserPopupNotifications: React.FC<PopupNotificationsProps> = ({ userId, userLevel }) => {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await db.getActivePopups(userLevel);
        if (!cancelled) {
          setPopups(data as unknown as Popup[]);
        }
      } catch (e) {
        console.error('Failed to load popups:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userLevel]);

  const dismiss = useCallback((popupId: string) => {
    setDismissedIds(prev => new Set([...prev, popupId]));
  }, []);

  const handleAction = useCallback((popup: Popup) => {
    if (popup.button_url) {
      window.open(popup.button_url, '_blank', 'noopener');
    }
    dismiss(popup.id);
  }, [dismiss]);

  // Filter out dismissed popups
  const activePopups = popups.filter(p => !dismissedIds.has(p.id));
  const currentPopup = activePopups.length > 0 ? activePopups[0] : null;

  if (loading || !currentPopup) return null;

  const config = typeConfig[currentPopup.type || 'info'] || typeConfig.info;

  return (
    <div className="modal modal-open modal-bottom sm:modal-middle z-50">
      <div className="modal-backdrop bg-base-300/60 backdrop-blur-sm" onClick={() => dismiss(currentPopup.id)} />
      <div className="modal-box relative animate-[fadeInUp_0.3s_ease-out] max-w-md">
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
          onClick={() => dismiss(currentPopup.id)}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Type icon & title */}
        <div className="flex items-center gap-3 mb-4 pr-8">
          <span className={config.badgeClass}>{config.icon}</span>
          <h3 className="font-bold text-lg">{currentPopup.title}</h3>
        </div>

        {/* Image */}
        {currentPopup.image_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={currentPopup.image_url}
              alt={currentPopup.title}
              className="w-full h-auto max-h-60 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Message (supports multiline) */}
        <p className="text-base-content/80 whitespace-pre-line mb-4">
          {currentPopup.message}
        </p>

        {/* Counter if multiple */}
        {activePopups.length > 1 && (
          <p className="text-xs text-base-content/50 mb-3">
            {activePopups.length - 1} {activePopups.length - 1 === 1 ? 'altra notifica' : 'altre notifiche'}
          </p>
        )}

        {/* Actions */}
        <div className="modal-action mt-2">
          {currentPopup.button_text ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => dismiss(currentPopup.id)}>
                Chiudi
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => handleAction(currentPopup)}>
                {currentPopup.button_text}
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => dismiss(currentPopup.id)}>
              Ho capito
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
