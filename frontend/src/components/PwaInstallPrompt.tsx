import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Wifi, Shield, Zap, Bell, ChevronDown } from 'lucide-react';

interface PwaInstallPromptProps {
  onClose: () => void;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ onClose }) => {
  const [step, setStep] = useState<'main' | 'instructions'>('main');
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 50);
  }, []);

  const handleClose = () => {
    setAnimateIn(false);
    setTimeout(onClose, 300);
  };

  const handleInstall = () => {
    setStep('instructions');
  };

  const features = [
    { icon: <Zap size={18} className="text-warning" />, text: 'Accesso istantaneo dalla Home' },
    { icon: <Bell size={18} className="text-info" />, text: 'Notifiche push sui rendimenti' },
    { icon: <Wifi size={18} className="text-success" />, text: 'Funziona anche offline' },
    { icon: <Shield size={18} className="text-error" />, text: 'Sicurezza avanzata con 2FA' },
  ];

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-all duration-300 ${animateIn ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`}>
      <div className={`w-full max-w-md mx-auto transition-all duration-300 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        {/* Main card */}
        <div className="bg-base-200 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-base-300">
          {/* Drag handle (mobile style) */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-base-300"></div>
          </div>

          {step === 'main' ? (
            <div className="p-5 pb-8">
              {/* Close button */}
              <button onClick={handleClose} className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle">
                <X size={18} />
              </button>

              {/* App Icon */}
              <div className="flex flex-col items-center mb-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-success/20 to-warning/20 border-2 border-success/30 flex items-center justify-center mb-3 shadow-lg">
                  <span className="text-3xl font-black tracking-tight">W<span className="text-success">1</span></span>
                </div>
                <h2 className="text-xl font-bold text-base-content">Installa WAY ONE</h2>
                <p className="text-sm text-base-content/60 mt-1">Aggiungi alla schermata Home</p>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-base-100 rounded-xl px-4 py-3">
                    <div className="flex-shrink-0">{f.icon}</div>
                    <span className="text-sm font-medium text-base-content">{f.text}</span>
                  </div>
                ))}
              </div>

              {/* Platform selector */}
              <div className="flex gap-2 mb-4">
                {(['android', 'ios', 'desktop'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex-1 btn btn-sm ${platform === p ? 'btn-primary' : 'btn-ghost bg-base-100'}`}
                  >
                    {p === 'android' ? '🤖 Android' : p === 'ios' ? '🍎 iOS' : '💻 Desktop'}
                  </button>
                ))}
              </div>

              {/* Install Button */}
              <button onClick={handleInstall} className="btn btn-success btn-block gap-2 text-lg h-14 rounded-xl shadow-lg">
                <Download size={22} />
                Installa App
              </button>

              {/* Skip */}
              <button onClick={handleClose} className="btn btn-ghost btn-sm btn-block mt-3 text-base-content/50">
                Non ora, continua sul browser
              </button>
            </div>
          ) : (
            <div className="p-5 pb-8">
              {/* Instructions per platform */}
              <button onClick={() => setStep('main')} className="btn btn-ghost btn-sm mb-3">
                ← Indietro
              </button>

              <div className="flex items-center gap-3 mb-5">
                <Smartphone size={28} className="text-success" />
                <div>
                  <h3 className="font-bold text-lg text-base-content">
                    {platform === 'ios' ? 'Installa su iPhone/iPad' :
                     platform === 'android' ? 'Installa su Android' : 'Installa su Desktop'}
                  </h3>
                  <p className="text-xs text-base-content/50">Segui questi semplici passaggi</p>
                </div>
              </div>

              {platform === 'ios' ? (
                <div className="space-y-4">
                  <StepItem n={1} text="Apri WAY ONE in Safari" />
                  <StepItem n={2} text={"Tocca il pulsante Condividi (icona quadrato con freccia)"} />
                  <StepItem n={3} text={"Scorri e seleziona Aggiungi alla schermata Home"} />
                  <StepItem n={4} text={"Tocca Aggiungi in alto a destra"} />
                  <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 mt-3">
                    <p className="text-xs text-warning font-medium">⚠️ Deve essere aperto in Safari. Chrome su iOS non supporta PWA.</p>
                  </div>
                </div>
              ) : platform === 'android' ? (
                <div className="space-y-4">
                  <StepItem n={1} text="Apri WAY ONE in Chrome" />
                  <StepItem n={2} text={"Tocca i tre puntini in alto a destra"} />
                  <StepItem n={3} text={"Seleziona Installa app o Aggiungi a schermata Home"} />
                  <StepItem n={4} text={"Conferma toccando Installa"} />
                  <div className="bg-success/10 border border-success/30 rounded-xl p-3 mt-3">
                    <p className="text-xs text-success font-medium">✅ L'app verrà aggiunta automaticamente alla schermata Home!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <StepItem n={1} text="Apri WAY ONE in Chrome o Edge" />
                  <StepItem n={2} text={"Cerca l'icona di installazione nella barra degli indirizzi"} />
                  <StepItem n={3} text={"Clicca Installa nel popup"} />
                  <StepItem n={4} text={"L'app si aprirà in una finestra dedicata"} />
                  <div className="bg-info/10 border border-info/30 rounded-xl p-3 mt-3">
                    <p className="text-xs text-info font-medium">{"💡 Puoi anche usare il menu → Installa WAY ONE"}</p>
                  </div>
                </div>
              )}

              {/* Done button */}
              <button onClick={handleClose} className="btn btn-success btn-block gap-2 mt-6 h-12 rounded-xl">
                ✅ Fatto, ho installato!
              </button>
              <button onClick={handleClose} className="btn btn-ghost btn-sm btn-block mt-2 text-base-content/50">
                Lo farò dopo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StepItem: React.FC<{ n: number; text: string }> = ({ n, text }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-bold text-success">{n}</span>
    </div>
    <p className="text-sm text-base-content pt-1">{text}</p>
  </div>
);
