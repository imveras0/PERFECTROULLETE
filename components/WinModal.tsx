import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import iphone16 from '@/assets/iphone-16-pro-max.png';
import goldenEggs from '@/assets/golden-eggs.png';

interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({ isOpen, onClose }) => {
  const [showEggs, setShowEggs] = useState(false);
  const [selectedEgg, setSelectedEgg] = useState<number | null>(null);
  const [showFinalPrize, setShowFinalPrize] = useState(false);

  // ---------- SOM "CRACK" DO OVO (robusto e alto) ----------
  const getAudioContext = () => {
    const AnyWin = window as any;
    const Ctx = AnyWin.AudioContext || AnyWin.webkitAudioContext;
    if (!Ctx) return null;
    if (!AnyWin.__egg_ac) AnyWin.__egg_ac = new Ctx(); // singleton
    return AnyWin.__egg_ac as AudioContext;
  };

  const playEggSound = () => {
    try {
      const ac = getAudioContext();
      if (!ac) return;
      if (ac.state === 'suspended') ac.resume();

      const now = ac.currentTime;

      // master (volume geral)
      const master = ac.createGain();
      master.gain.setValueAtTime(0.95, now);
      master.connect(ac.destination);

      // 1) Dois estalos curtinhos (cliques com queda de pitch)
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.035;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200 - i * 250, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);
        g.gain.setValueAtTime(0.7, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + 0.08);
      }

      // 2) Rajada de ruído (casca quebrando)
      const noiseDur = 0.22;
      const noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * noiseDur), ac.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const noise = ac.createBufferSource();
      noise.buffer = noiseBuf;

      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3000;
      bp.Q.value = 1.0;

      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 700;

      const nGain = ac.createGain();
      const nt = now + 0.015;
      nGain.gain.setValueAtTime(0, nt);
      nGain.gain.linearRampToValueAtTime(1.0, nt + 0.012);
      nGain.gain.exponentialRampToValueAtTime(0.0001, nt + 0.18);

      noise.connect(bp);
      bp.connect(hp);
      hp.connect(nGain);
      nGain.connect(master);

      noise.start(nt);
      noise.stop(nt + noiseDur);

      // 3) Tinido curto dos cacos (triângulo bem rápido)
      const chT = now + 0.07;
      const ch = ac.createOscillator();
      const chG = ac.createGain();
      ch.type = 'triangle';
      ch.frequency.setValueAtTime(2400, chT);
      ch.frequency.exponentialRampToValueAtTime(900, chT + 0.11);
      chG.gain.setValueAtTime(0.28, chT);
      chG.gain.exponentialRampToValueAtTime(0.0001, chT + 0.11);
      ch.connect(chG);
      chG.connect(master);
      ch.start(chT);
      ch.stop(chT + 0.12);

      // 4) “Thump” curtinho (impacto) – sine grave
      const thT = now + 0.02;
      const th = ac.createOscillator();
      const thG = ac.createGain();
      th.type = 'sine';
      th.frequency.setValueAtTime(140, thT);
      th.frequency.exponentialRampToValueAtTime(70, thT + 0.09);
      thG.gain.setValueAtTime(0.25, thT);
      thG.gain.exponentialRampToValueAtTime(0.0001, thT + 0.12);
      th.connect(thG);
      thG.connect(master);
      th.start(thT);
      th.stop(thT + 0.12);
    } catch {
      // se o browser bloquear ou não suportar, só ignora
    }
  };
  // ---------------------------------------------------------

  const handleContinue = () => {
    setShowEggs(true);
  };

  const handleEggSelect = (eggIndex: number) => {
    setSelectedEgg(eggIndex);
    playEggSound();

    // Simular quebra do ovo
    setTimeout(() => {
      setShowFinalPrize(true);
    }, 1000);
  };

  const handleFinalRedirect = () => {
    // Redirecionar para o link fornecido
    window.location.href = 'https://viralizeishop.online/iphone16';
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-card via-secondary to-card border-2 border-accent shadow-luxury">
        {!showEggs && !showFinalPrize && (
          <div className="text-center space-y-6 p-6">
            <div className="animate-pulse-gold">
              <img 
                src={iphone16} 
                alt="iPhone 16 Pro Max" 
                className="w-32 h-32 mx-auto object-contain drop-shadow-xl"
              />
            </div>
            
            <h2 className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent">
              🎉 Parabéns!
            </h2>
            
            <p className="text-foreground text-lg font-semibold">
              Você ganhou a chance de um prêmio exclusivo!
            </p>
            
            <p className="text-muted-foreground">
              Agora escolha um dos ovos dourados para descobrir seu prêmio final!
            </p>
            
            <Button 
              variant="luxury" 
              size="lg" 
              onClick={handleContinue}
              className="w-full"
            >
              CONTINUAR 🥚
            </Button>
          </div>
        )}

        {showEggs && !showFinalPrize && (
          <div className="text-center space-y-6 p-6">
            <h3 className="text-xl font-bold text-foreground">
              Escolha um ovo dourado!
            </h3>
            
            <div className="flex justify-center space-x-4">
              {[0, 1, 2].map((eggIndex) => (
                <button
                  key={eggIndex}
                  onClick={() => handleEggSelect(eggIndex)}
                  disabled={selectedEgg !== null}
                  className={`relative transition-all duration-300 ${
                    selectedEgg === eggIndex 
                      ? 'scale-110 animate-pulse-gold' 
                      : selectedEgg !== null 
                        ? 'opacity-50 scale-95' 
                        : 'hover:scale-105 animate-float'
                  }`}
                  style={{ animationDelay: `${eggIndex * 0.5}s` }}
                >
                  <div className="w-20 h-24 bg-gold-gradient rounded-full shadow-gold border-2 border-accent flex items-center justify-center text-2xl">
                    🥚
                  </div>
                  {selectedEgg === eggIndex && (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
                      🔨
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground">
              Toque em um ovo para martelá-lo!
            </p>
          </div>
        )}

        {showFinalPrize && (
          <div className="text-center space-y-6 p-6">
            <div className="animate-bounce">
              <img 
                src={iphone16} 
                alt="iPhone 16 Pro Max - Prêmio Final" 
                className="w-40 h-40 mx-auto object-contain drop-shadow-2xl"
              />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold bg-gold-gradient bg-clip-text text-transparent animate-glow">
                🏆 PRÊMIO REVELADO!
              </h2>
              <h3 className="text-xl font-semibold text-foreground">
                iPhone 16 Pro Max
              </h3>
            </div>
            
            <div className="bg-luxury-gradient p-4 rounded-lg border border-accent">
              <p className="text-foreground font-semibold mb-2">
                🎊 Parabéns! Você foi selecionado!
              </p>
              <p className="text-sm text-muted-foreground">
                Complete o processo para receber seu prêmio exclusivo
              </p>
            </div>
            
            <Button 
              variant="luxury" 
              size="lg" 
              onClick={handleFinalRedirect}
              className="w-full text-lg font-bold animate-pulse-gold"
            >
              RESGATAR PRÊMIO 🎁
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
