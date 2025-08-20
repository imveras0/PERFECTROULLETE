import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import iphone from "@/assets/iphone.png";
import galaxy from "@/assets/galaxy.png";
import voucher from "@/assets/voucher.png";
import choro from "@/assets/choro.png";
import presente from "@/assets/presente.png";
import premio777 from "@/assets/777.png";
import frame from "@/assets/tiger-bull-frame.png"; // ok manter

interface RouletteSegment {
  id: number;
  image: string;
  name: string;
  isWinner: boolean;
}

const segments: RouletteSegment[] = [
  { id: 1, image: iphone,    name: "iPhone 16 Pro Max",        isWinner: true  },
  { id: 2, image: galaxy,    name: "Samsung Galaxy S25 Ultra", isWinner: false },
  { id: 3, image: voucher,   name: "Voucher Especial",          isWinner: false },
  { id: 4, image: choro,     name: "Emoji Choro",               isWinner: false },
  { id: 5, image: premio777, name: "Prêmio R$777",              isWinner: false },
  { id: 6, image: presente,  name: "Presente Surpresa",         isWinner: false },
];

interface LuxuryRouletteProps {
  onWin: () => void;
  showHeader?: boolean;
}

export const LuxuryRoulette: React.FC<LuxuryRouletteProps> = ({
  onWin,
  showHeader = true,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  // ===== VISUAL =====
  const ANGLE_ZERO_AT_TOP = -60; // 12h
  const VISUAL_OFFSET     =  30; // ajuste fino visual
  const SEG_ANGLE         = 360 / segments.length;

  const ICON_SIZE_PX = 88;
  const RADIUS_RATIO = 0.30;

  const PLATE_OUT_R   = 46;
  const PLATE_IN_R    = 23;
  const PLATE_GAP_DEG = 10;

  const PULSE_SPEED_S        = 1.8;
  const PULSE_DELAY_STEP_S   = 0.12;
  const PULSE_WHILE_SPINNING = true;

  // ===== NOVO: linhas divisórias das fatias =====
  const SEPARATOR_WIDTH_DEG = 3.2;                 // espessura do risco (em graus)
  const INNER_HOLE_RATIO    = 0.36;                // “furo” no centro para não cruzar o botão
  const SEPARATOR_COLOR     = "rgba(255,236,170,.95)"; // dourado
  // ==============================================

  // ===== ÁUDIO – spin + vitória (já existente no seu arquivo) =====
  const SPIN_MS   = 4000;
  const WHOOSH_VOL = 0.18;
  const TICK_VOL   = 0.22;
  const CLACK_VOL  = 0.40;

  const AMB_MASTER_VOL = 0.08;
  const BPM = 126;
  const SPB = 60 / BPM;
  const SIXTEENTH = SPB / 4;
  const CHORD_CHANGE_BARS = 1;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickBufRef  = useRef<AudioBuffer | null>(null);

  const whooshRef = useRef<{ src?: AudioBufferSourceNode; gain?: GainNode; filter?: BiquadFilterNode; }>({});
  const tickTimerRef = useRef<number | null>(null);
  const spinTimerRef = useRef<number | null>(null);

  const ambientRef = useRef<{ started?: boolean; master?: GainNode; schedId?: number; nextTime?: number; step?: number; bar?: number; }>({});

  const ensureCtx = async () => {
    if (typeof window === "undefined") return null;
    // @ts-ignore safari
    const AC: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtxRef.current) audioCtxRef.current = new AC();
    if (audioCtxRef.current.state === "suspended") { try { await audioCtxRef.current.resume(); } catch {} }
    return audioCtxRef.current!;
  };

  const createNoiseBuffer = (ctx: AudioContext, seconds = 2) => {
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  };

  const ensureTickBuffer = async () => {
    if (tickBufRef.current) return tickBufRef.current;
    const ctx = await ensureCtx(); if (!ctx) return null;
    const len = Math.floor(ctx.sampleRate * 0.02);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = 1 - i / len;
      ch[i] = (Math.random() * 2 - 1) * t * t;
    }
    tickBufRef.current = buf; return buf;
  };

  const playTick = async (volume = TICK_VOL) => {
    const ctx = await ensureCtx(); if (!ctx) return;
    const buf = await ensureTickBuffer(); if (!buf) return;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200;
    const peak = ctx.createBiquadFilter(); peak.type = "peaking"; peak.frequency.value = 3000; peak.Q.value = 1.2; peak.gain.value = 6;
    const g = ctx.createGain(); g.gain.value = volume;
    src.connect(hp).connect(peak).connect(g).connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.03);
  };

  const startWhoosh = async (totalMs: number) => {
    const ctx = await ensureCtx(); if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = createNoiseBuffer(ctx, 2); src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 950; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = WHOOSH_VOL;
    g.gain.linearRampToValueAtTime(0.10, ctx.currentTime + totalMs / 1000);
    src.connect(bp).connect(g).connect(ctx.destination); src.start();
    whooshRef.current = { src, gain: g, filter: bp };
  };
  const stopWhoosh = () => { try { whooshRef.current.src?.stop(); } catch {} whooshRef.current = {}; };

  const playClack = async () => {
    const ctx = await ensureCtx(); if (!ctx) return;
    const osc = ctx.createOscillator(); osc.type = "square"; osc.frequency.setValueAtTime(220, ctx.currentTime);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(CLACK_VOL, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    osc.connect(g).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
  };

  const playWinFanfare = async () => {
    const ctx = await ensureCtx(); if (!ctx) return;
    const beep = (f: number, dur = 0.18, vol = 0.75, type: OscillatorType = "triangle", when = 0) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = type; osc.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime + when);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(ctx.currentTime + when); osc.stop(ctx.currentTime + when + dur + 0.02);
    };
    const seq = [440, 523.25, 659.25, 523.25, 659.25, 880];
    seq.forEach((f, i) => beep(f, 0.2, 0.8, i % 2 ? "square" : "triangle", i * 0.12));
  };

  // ===== Música ambiente (mantida) =====
  const startAmbientIfNeeded = async () => {
    if (ambientRef.current.started) return;
    const ctx = await ensureCtx(); if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const envGain = (g: GainNode, t0: number, a = 0.004, d = 0.12, peak = 1) => {
      g.gain.cancelScheduledValues(t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    };

    const scheduleKick = (time: number) => {
      const o = ctx.createOscillator(); o.type = "sine";
      const g = ctx.createGain(); o.connect(g).connect(master);
      o.frequency.setValueAtTime(140, time);
      o.frequency.exponentialRampToValueAtTime(50, time + 0.12);
      envGain(g, time, 0.002, 0.14, 1.0);
      o.start(time); o.stop(time + 0.18);
    };

    const scheduleSnare = (time: number) => {
      const noise = ctx.createBufferSource(); noise.buffer = createNoiseBuffer(ctx, 0.2);
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2000; bp.Q.value = 0.8;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1000;
      const g = ctx.createGain(); noise.connect(bp).connect(hp).connect(g).connect(master);
      envGain(g, time, 0.001, 0.12, 0.9);
      noise.start(time); noise.stop(time + 0.16);

      const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(180, time);
      const g2 = ctx.createGain(); envGain(g2, time, 0.002, 0.09, 0.4);
      o.connect(g2).connect(master); o.start(time); o.stop(time + 0.12);
    };

    const scheduleHat = (time: number, open = false) => {
      const n = ctx.createBufferSource(); n.buffer = createNoiseBuffer(ctx, 0.2);
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000;
      const g = ctx.createGain(); n.connect(hp).connect(g).connect(master);
      envGain(g, time, 0.001, open ? 0.15 : 0.05, open ? 0.5 : 0.35);
      n.start(time); n.stop(time + (open ? 0.2 : 0.08));
    };

    const scheduleBass = (time: number, freq: number) => {
      const o = ctx.createOscillator(); o.type = "sawtooth";
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
      const g = ctx.createGain(); o.connect(lp).connect(g).connect(master);
      o.frequency.setValueAtTime(freq, time);
      envGain(g, time, 0.005, 0.18, 0.6);
      o.start(time); o.stop(time + 0.22);
    };

    const scheduleChord = (time: number, triad: number[]) => {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500; lp.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.value = 0.8; g.connect(master);
      triad.forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? "square" : "triangle";
        const og = ctx.createGain();
        o.frequency.setValueAtTime(f, time);
        og.connect(lp); o.connect(og);
        envGain(og, time, 0.004, 0.25, 0.7);
        o.start(time); o.stop(time + 0.28);
      });
      lp.connect(master);
    };

    const CHORDS = [
      [220.00, 277.18, 329.63],
      [174.61, 220.00, 261.63],
      [196.00, 246.94, 293.66],
      [164.81, 196.00, 246.94],
    ];

    let step = 0, bar = 0;
    let nextTime = ctx.currentTime + 0.05;
    const scheduleAhead = 0.12;

    const tick = () => {
      while (nextTime < ctx.currentTime + scheduleAhead) {
        const isBeat = step % 4 === 0;
        const chordIndex = Math.floor(bar / CHORD_CHANGE_BARS) % CHORDS.length;
        const chord = CHORDS[chordIndex];

        if (step % 4 === 0) scheduleKick(nextTime);
        if (step === 4 || step === 12) scheduleSnare(nextTime);
        scheduleHat(nextTime, step % 4 === 2);

        if (isBeat) scheduleBass(nextTime, chord[0] / 2);
        if (step === 0) scheduleChord(nextTime, chord);

        step = (step + 1) % 16;
        if (step === 0) bar++;
        nextTime += SIXTEENTH;
      }
    };

    const id = window.setInterval(tick, 25);
    master.gain.exponentialRampToValueAtTime(AMB_MASTER_VOL, ctx.currentTime + 1.0);
    ambientRef.current = { started: true, master, schedId: id, nextTime, step, bar };
  };

  const stopAmbient = () => {
    const a = ambientRef.current;
    try { if (a.schedId) clearInterval(a.schedId); if (a.master) a.master.gain.value = 0; } catch {}
    ambientRef.current = {};
  };

  // ===== tamanho/ícones =====
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [radiusPx, setRadiusPx] = useState(120);

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const compute = () => {
      const d = el.getBoundingClientRect().width;
      setRadiusPx(Math.max(40, d * RADIUS_RATIO));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const centerAngles = useMemo(
    () => segments.map((_, i) => i * SEG_ANGLE + SEG_ANGLE / 2 + ANGLE_ZERO_AT_TOP + VISUAL_OFFSET),
    []
  );

  const pt = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${50 + r * Math.cos(rad)}% ${50 + r * Math.sin(rad)}%`;
  };

  // tenta iniciar ambiente ao entrar (respeitando políticas do browser)
  useEffect(() => {
    let disposed = false;
    const attempt = async () => {
      if (disposed) return;
      await startAmbientIfNeeded();
      const ctx = await ensureCtx();
      if (!ctx) return;
      if (ctx.state !== "running") { try { await ctx.resume(); } catch {} }
    };
    void attempt();
    const unlock = () => { void attempt(); };
    const events = ["pointerdown","pointermove","touchstart","wheel","keydown","scroll","click"];
    events.forEach(ev => window.addEventListener(ev, unlock, { passive: true, once: true }));
    return () => { disposed = true; events.forEach(ev => window.removeEventListener(ev, unlock as any)); };
  }, []);

  const spinRoulette = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    void startWhoosh(SPIN_MS);
    startTickSchedule(SPIN_MS);

    const winIdx = 0; // iPhone
    const baseRotation = 360 * 5;
    const targetRotation = baseRotation + (0 - centerAngles[winIdx]);
    setRotation(targetRotation);

    spinTimerRef.current = window.setTimeout(async () => {
      setIsSpinning(false);
      stopTicks();
      stopWhoosh();
      await playClack();
      if (segments[winIdx].isWinner) await playWinFanfare();
      onWin();
    }, SPIN_MS);
  };

  const startTickSchedule = (totalMs: number) => {
    const t0 = performance.now();
    let interval = 60;
    let nextAt = t0;
    const loop = () => {
      const now = performance.now();
      const elapsed = now - t0;
      if (now >= nextAt && elapsed <= totalMs - 120) {
        const vol = TICK_VOL * (1 - 0.35 * (elapsed / totalMs));
        void playTick(vol);
        interval *= 1.06;
        nextAt = now + interval;
      }
      if (elapsed < totalMs) {
        tickTimerRef.current = window.requestAnimationFrame(loop);
      }
    };
    tickTimerRef.current = window.requestAnimationFrame(loop);
  };

  const stopTicks = () => {
    if (tickTimerRef.current != null) {
      cancelAnimationFrame(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      stopTicks(); stopWhoosh(); stopAmbient();
      try { audioCtxRef.current?.close?.(); } catch {}
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <style>{`
        @keyframes prizePulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(0,0,0,1)); }
          50%      { transform: scale(1.08); filter: drop-shadow(0 0 20px rgba(255,255,255,1)); }
        }
      `}</style>

      {showHeader && (
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            🎁 Sorteio Grátis – Ganhe um Celular 📱
          </h1>
          <p className="text-gray-300 mt-2">Gire a roleta dourada e concorra a prêmios exclusivos!</p>
        </div>
      )}

      {/* Roleta */}
      <div className="relative flex items-center justify-center">
        <div
          ref={wheelRef}
          className="relative w-80 h-80 md:w-96 md:h-96 rounded-full border-8 border-yellow-400 shadow-xl p-2"
          style={{ background: "radial-gradient(60% 60% at 50% 45%, rgba(89,0,253,1), rgba(255,0,0,0.8) 60%, rgba(0,0,0,1) 100%)" }}
        >
          {/* Ponteiro */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-30">
            <div className="w-6 h-8 bg-yellow-400 shadow-lg" style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
          </div>

          {/* Disco que gira */}
          <div
            className="w-full h-full rounded-full relative overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? "transform 4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
              willChange: "transform",
              background: "radial-gradient(closest-side, rgba(255,0,0,1) 72%, rgba(255,238,0,1) 74%, rgba(255,0,0,1) 100%)",
            }}
          >
            {/* Aro interno fino */}
            <div
              className="absolute inset-[8%] rounded-full pointer-events-none"
              style={{ border: "2px solid rgba(255,0,0,1)", boxShadow: "inset 0 0 18px rgba(255,51,0,1), inset 0 0 2px rgba(9,255,0,1)" }}
            />

            {/* Placas por fatia */}
            {segments.map((_, index) => {
              const start = index * SEG_ANGLE + ANGLE_ZERO_AT_TOP + VISUAL_OFFSET + PLATE_GAP_DEG / 2;
              const end = start + SEG_ANGLE - PLATE_GAP_DEG;
              const clip = `polygon(${pt(PLATE_IN_R, start)}, ${pt(PLATE_OUT_R, start)}, ${pt(PLATE_OUT_R, end)}, ${pt(PLATE_IN_R, end)})`;
              const glossy = "linear-gradient(180deg, rgba(255,0,0,1), rgba(247,189,0,1))";
              return (
                <div key={`plate-${index}`} className="absolute inset-0" style={{ clipPath: clip }}>
                  <div
                    className="w-full h-full"
                    style={{
                      background: glossy,
                      boxShadow: "inset 0 1px 0 rgba(248,223,0,0.97), inset 0 -24px 40px rgba(255,230,0,1), 0 6px 18px rgba(255,0,0,1)",
                      backgroundImage: "radial-gradient(120% 120% at 50% -10%, rgba(255,255,255,1), rgba(248,21,21,1) 40%)",
                      backdropFilter: "blur(0.2px)",
                    }}
                  />
                </div>
              );
            })}

            {/* ===== DIVISÕES (novas) ===== */}
            <div
              className="absolute inset-[8%] rounded-full pointer-events-none z-10"
              style={{
                background: `repeating-conic-gradient(
                  from ${ANGLE_ZERO_AT_TOP + VISUAL_OFFSET}deg,
                  ${SEPARATOR_COLOR} 0deg,
                  ${SEPARATOR_COLOR} ${SEPARATOR_WIDTH_DEG}deg,
                  transparent ${SEPARATOR_WIDTH_DEG}deg,
                  transparent ${SEG_ANGLE}deg
                )`,
                WebkitMask: `radial-gradient(circle at center,
                  transparent 0 ${INNER_HOLE_RATIO * 100}%,
                  #000 ${INNER_HOLE_RATIO * 100}%
                )`,
                mask: `radial-gradient(circle at center,
                  transparent 0 ${INNER_HOLE_RATIO * 100}%,
                  #000 ${INNER_HOLE_RATIO * 100}%
                )`,
                filter: "drop-shadow(0 0 6px rgba(255,200,70,.45))",
                opacity: 0.95,
              }}
            />
            {/* =========================== */}

            {/* Ícones */}
            {segments.map((seg, i) => {
              const a = centerAngles[i];
              return (
                <div
                  key={`icon-${seg.id}`}
                  className="absolute left-1/2 top-1/2 z-20 pointer-events-none select-none"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-${radiusPx}px) rotate(${-a}deg)`,
                    transformOrigin: "50% 50%",
                  }}
                >
                  <img
                    src={seg.image}
                    alt={seg.name}
                    style={{
                      width: ICON_SIZE_PX,
                      height: ICON_SIZE_PX,
                      objectFit: "contain",
                      animation: `prizePulse ${PULSE_SPEED_S}s ease-in-out infinite`,
                      animationDelay: `${i * PULSE_DELAY_STEP_S}s`,
                      animationPlayState: isSpinning && !PULSE_WHILE_SPINNING ? "paused" : "running",
                    }}
                    className="drop-shadow-[0_0_12px_rgba(255,215,0,0.9)]"
                    draggable={false}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Botão central */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <Button
              variant="luxury"
              size="lg"
              onClick={spinRoulette}
              disabled={isSpinning}
              className="w-20 h-20 rounded-full font-bold bg-yellow-400 hover:bg-yellow-500 shadow-xl"
            >
              {isSpinning ? "🎲" : "GIRAR!"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
