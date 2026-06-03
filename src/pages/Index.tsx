import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import Cabinet from "./Cabinet";

/* ─── Types ─────────────────────────────────────────────── */
type RecordingState = "idle" | "recording" | "paused" | "done";

interface Track {
  id: number;
  name: string;
  color: string;
  icon: string;
  type: string;
  hasAudio: boolean;
  url?: string;
  duration?: string;
  waveform?: number[];
  fx: string[];
  muted: boolean;
  solo: boolean;
  volume: number;
}

/* ─── Waveform bar ───────────────────────────────────────── */
const WaveBar = ({ val, color, live }: { val: number; color: string; live?: boolean }) => (
  <div className="flex-1 flex flex-col justify-center" style={{ height: "100%" }}>
    <div style={{
      height: `${Math.max(4, val)}%`,
      background: color,
      borderRadius: 2,
      transition: live ? "height 0.05s" : "none",
      opacity: 0.85,
    }} />
  </div>
);

/* ─── Track waveform display ─────────────────────────────── */
const TrackWave = ({ waveform, color, playing }: { waveform: number[]; color: string; playing?: boolean }) => (
  <div className="flex items-center gap-[1.5px]" style={{ height: 40, flex: 1, overflow: "hidden" }}>
    {waveform.map((v, i) => (
      <WaveBar key={i} val={v} color={playing ? color : color + "99"} />
    ))}
  </div>
);

/* ─── Web Audio helpers ──────────────────────────────────── */
let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext();
  }
  if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  return sharedAudioCtx;
};

const playTone = (freq: number, type: OscillatorType = "sawtooth", duration = 0.5, vol = 0.4) => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

const NOTES: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880,
  "C#3": 138.59, "D#3": 155.56, "F#3": 185, "G#3": 207.65, "A#3": 233.08,
  "C#4": 277.18, "D#4": 311.13, "F#4": 369.99, "G#4": 415.3, "A#4": 466.16,
  "C#5": 554.37, "D#5": 622.25, "F#5": 739.99, "G#5": 830.61, "A#5": 932.33,
};

/* ─── Guitar/Bass instrument panel ──────────────────────── */
const STRING_PRESETS: Record<string, { strings: string[]; type: OscillatorType; label: string }> = {
  guitar: { strings: ["E2", "A2", "D3", "G3", "B3", "E4"], type: "sawtooth", label: "Гитара" },
  bass: { strings: ["E1", "A1", "D2", "G2"], type: "sawtooth", label: "Бас" },
};

// E1, A1, D2 not in NOTES map — add them:
const EXTRA: Record<string, number> = { E1: 41.2, A1: 55, D2: 73.42, E2: 82.41, A2: 110, B3: 246.94 };
const allNotes = { ...NOTES, ...EXTRA };

const GuitarPanel = ({ type, onClose }: { type: "guitar" | "bass"; onClose: () => void }) => {
  const preset = STRING_PRESETS[type];
  const [pressed, setPressed] = useState<string | null>(null);
  const frets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const fretMultiplier = (fret: number) => Math.pow(2, fret / 12);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden" style={{ background: "#0a1520", maxHeight: "70vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="font-bold text-lg" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif" }}>{preset.label}</span>
          <button onClick={onClose}><Icon name="X" size={20} style={{ color: "#4a6070" }} /></button>
        </div>

        {/* Fretboard */}
        <div className="px-3 pb-6 overflow-x-auto">
          <div className="relative" style={{ minWidth: 420 }}>
            {/* Fret numbers */}
            <div className="flex mb-1 ml-12">
              {frets.map(f => (
                <div key={f} className="flex-1 text-center font-mono text-[10px]" style={{ color: "#2a4050" }}>{f}</div>
              ))}
            </div>
            {preset.strings.map((str, si) => {
              const baseFreq = allNotes[str] || 110;
              return (
                <div key={str} className="flex items-center mb-1">
                  <div className="w-10 text-xs font-mono text-right pr-2 flex-shrink-0" style={{ color: "#06b6d4" }}>{str}</div>
                  <div className="flex flex-1 relative" style={{ height: 32 }}>
                    {/* String line */}
                    <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2" style={{ height: 2 - si * 0.2, background: `rgba(0,194,255,${0.3 + si * 0.05})`, borderRadius: 1 }} />
                    {frets.map(f => {
                      const key = `${si}-${f}`;
                      const freq = baseFreq * fretMultiplier(f);
                      return (
                        <div key={f} className="flex-1 flex items-center justify-center relative z-10"
                          onMouseDown={() => { setPressed(key); playTone(freq, preset.type, 1.2, 0.35); }}
                          onMouseUp={() => setPressed(null)}
                          onTouchStart={() => { setPressed(key); playTone(freq, preset.type, 1.2, 0.35); }}
                          onTouchEnd={() => setPressed(null)}
                        >
                          <div className={`w-5 h-5 rounded-full transition-all cursor-pointer`}
                            style={{
                              background: pressed === key ? "#00c2ff" : f === 0 ? "#1e3040" : "#0d1e2c",
                              border: `1px solid ${pressed === key ? "#00c2ff" : "#1e3040"}`,
                              boxShadow: pressed === key ? "0 0 8px #00c2ff" : "none",
                              transform: pressed === key ? "scale(1.3)" : "scale(1)",
                            }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs mt-3" style={{ color: "#2a4050" }}>Нажимай на лады — каждая строка это струна</p>
        </div>
      </div>
    </div>
  );
};

/* ─── Piano / VST panel ──────────────────────────────────── */
const PIANO_KEYS = [
  { note: "C4", label: "C", black: false }, { note: "C#4", label: "", black: true },
  { note: "D4", label: "D", black: false }, { note: "D#4", label: "", black: true },
  { note: "E4", label: "E", black: false },
  { note: "F4", label: "F", black: false }, { note: "F#4", label: "", black: true },
  { note: "G4", label: "G", black: false }, { note: "G#4", label: "", black: true },
  { note: "A4", label: "A", black: false }, { note: "A#4", label: "", black: true },
  { note: "B4", label: "B", black: false },
  { note: "C5", label: "C", black: false }, { note: "C#5", label: "", black: true },
  { note: "D5", label: "D", black: false }, { note: "D#5", label: "", black: true },
  { note: "E5", label: "E", black: false },
];

const PianoPanel = ({ onClose, octave = 0 }: { onClose: () => void; octave?: number }) => {
  const [active, setActive] = useState<string | null>(null);
  const [oct, setOct] = useState(octave);
  const whites = PIANO_KEYS.filter(k => !k.black);
  const blacks = PIANO_KEYS.filter(k => k.black);

  const play = (note: string) => {
    const base = NOTES[note] || 440;
    const freq = base * Math.pow(2, oct);
    setActive(note);
    playTone(freq, "triangle", 0.8, 0.45);
    setTimeout(() => setActive(null), 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden" style={{ background: "#0a1520" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="font-bold text-lg" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif" }}>Клавиши</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setOct(o => o - 1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#0d1e2c", color: "#7ab" }}>−</button>
            <span className="font-mono text-sm" style={{ color: "#00c2ff" }}>Oct {oct >= 0 ? "+" : ""}{oct}</span>
            <button onClick={() => setOct(o => o + 1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#0d1e2c", color: "#7ab" }}>+</button>
            <button onClick={onClose}><Icon name="X" size={20} style={{ color: "#4a6070" }} /></button>
          </div>
        </div>
        <div className="relative overflow-x-auto pb-6 px-3">
          <div className="relative flex" style={{ height: 120, minWidth: 340 }}>
            {/* White keys */}
            {whites.map((k, i) => (
              <div key={k.note}
                onMouseDown={() => play(k.note)}
                onTouchStart={e => { e.preventDefault(); play(k.note); }}
                className="flex-1 flex flex-col justify-end items-center pb-2 cursor-pointer rounded-b-lg transition-all"
                style={{
                  background: active === k.note ? "#00c2ff33" : "#e2f4ff",
                  border: "1px solid #7ab",
                  marginRight: 2,
                  boxShadow: active === k.note ? "0 0 12px #00c2ff" : "none",
                }}>
                <span className="text-[10px] font-mono" style={{ color: "#0a1520" }}>{k.label}</span>
              </div>
            ))}
            {/* Black keys overlay */}
            <div className="absolute top-0 left-0 w-full" style={{ height: 72, pointerEvents: "none" }}>
              {(() => {
                // Position black keys between whites
                const positions = [1, 2, 4, 5, 6, 8, 9, 11, 12, 13];
                return blacks.map((k, i) => (
                  <div key={k.note}
                    style={{
                      position: "absolute",
                      left: `calc(${(positions[i] / whites.length) * 100}% - 10px)`,
                      width: 20,
                      height: "100%",
                      background: active === k.note ? "#00c2ff" : "#0a1520",
                      borderRadius: "0 0 6px 6px",
                      zIndex: 2,
                      pointerEvents: "all",
                      cursor: "pointer",
                      border: "1px solid #1e3040",
                      boxShadow: active === k.note ? "0 0 8px #00c2ff" : "none",
                    }}
                    onMouseDown={() => play(k.note)}
                    onTouchStart={e => { e.preventDefault(); play(k.note); }}
                  />
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Drum machine panel ─────────────────────────────────── */
const DRUM_PADS = [
  { label: "Kick",  color: "#ef4444", freq: 60,  type: "sine" as OscillatorType,  dur: 0.4 },
  { label: "Snare", color: "#f97316", freq: 200, type: "sawtooth" as OscillatorType, dur: 0.15 },
  { label: "HiHat", color: "#eab308", freq: 8000,type: "square" as OscillatorType, dur: 0.05 },
  { label: "Open",  color: "#84cc16", freq: 6000,type: "square" as OscillatorType, dur: 0.25 },
  { label: "Tom 1", color: "#06b6d4", freq: 120, type: "sine" as OscillatorType,  dur: 0.3 },
  { label: "Tom 2", color: "#3b82f6", freq: 90,  type: "sine" as OscillatorType,  dur: 0.35 },
  { label: "Clap",  color: "#8b5cf6", freq: 1200,type: "sawtooth" as OscillatorType, dur: 0.1 },
  { label: "Rim",   color: "#ec4899", freq: 900, type: "square" as OscillatorType, dur: 0.08 },
];

const DrumPanel = ({ onClose }: { onClose: () => void }) => {
  const [active, setActive] = useState<number | null>(null);
  const [seq, setSeq] = useState<boolean[][]>(DRUM_PADS.map(() => new Array(16).fill(false)));
  const [seqPlaying, setSeqPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const seqRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hitPad = (i: number) => {
    const p = DRUM_PADS[i];
    setActive(i);
    playTone(p.freq, p.type, p.dur, 0.5);
    setTimeout(() => setActive(null), 100);
  };

  const toggleSeq = (pad: number, beat: number) => {
    setSeq(s => { const n = s.map(r => [...r]); n[pad][beat] = !n[pad][beat]; return n; });
  };

  useEffect(() => {
    if (seqPlaying) {
      seqRef.current = setInterval(() => {
        setStep(s => {
          const next = (s + 1) % 16;
          seq.forEach((row, pi) => { if (row[next]) hitPad(pi); });
          return next;
        });
      }, 125);
    } else {
      if (seqRef.current) clearInterval(seqRef.current);
    }
    return () => { if (seqRef.current) clearInterval(seqRef.current); };
  }, [seqPlaying, seq]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.9)" }} onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden" style={{ background: "#0a1520", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="font-bold text-lg" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif" }}>Драм-машина</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSeqPlaying(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all"
              style={{ background: seqPlaying ? "#ef4444" : "#0d1e2c", color: seqPlaying ? "#fff" : "#7ab", border: `1px solid ${seqPlaying ? "#ef4444" : "#1e3040"}` }}>
              <div className={`w-2 h-2 rounded-full ${seqPlaying ? "recording-dot" : ""}`} style={{ background: seqPlaying ? "#fff" : "#4a6070" }} />
              {seqPlaying ? "Stop" : "Play"}
            </button>
            <button onClick={onClose}><Icon name="X" size={20} style={{ color: "#4a6070" }} /></button>
          </div>
        </div>

        {/* Pads */}
        <div className="grid grid-cols-4 gap-2 px-4 pb-3">
          {DRUM_PADS.map((p, i) => (
            <button key={i} onMouseDown={() => hitPad(i)} onTouchStart={e => { e.preventDefault(); hitPad(i); }}
              className="h-16 rounded-2xl flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
              style={{
                background: active === i ? p.color : p.color + "22",
                border: `2px solid ${p.color}`,
                color: active === i ? "#fff" : p.color,
                transform: active === i ? "scale(0.94)" : "scale(1)",
                boxShadow: active === i ? `0 0 16px ${p.color}88` : "none",
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Sequencer */}
        <div className="px-4 pb-6 overflow-x-auto">
          <p className="text-xs mb-2" style={{ color: "#2a4050" }}>Секвенсор — включи шаги:</p>
          <div style={{ minWidth: 340 }}>
            {DRUM_PADS.map((p, pi) => (
              <div key={pi} className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-mono w-10 flex-shrink-0" style={{ color: p.color }}>{p.label}</span>
                {seq[pi].map((on, bi) => (
                  <button key={bi} onClick={() => toggleSeq(pi, bi)}
                    className="flex-1 rounded transition-all"
                    style={{
                      height: 16,
                      background: on ? p.color : "#0d1e2c",
                      border: `1px solid ${step === bi && seqPlaying ? "#00c2ff" : on ? p.color : "#1e3040"}`,
                      boxShadow: step === bi && seqPlaying ? "0 0 6px #00c2ff" : "none",
                    }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Sampler / Looper panel ─────────────────────────────── */
const SamplerPanel = ({ onClose, onImport }: { onClose: () => void; onImport: () => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [samples, setSamples] = useState<{ name: string; url: string; color: string }[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const colors = ["#ef4444", "#f97316", "#eab308", "#10b981", "#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b"];

  const loadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach((file, i) => {
      const url = URL.createObjectURL(file);
      setSamples(s => [...s, { name: file.name.replace(/\.[^.]+$/, "").slice(0, 12), url, color: colors[s.length % colors.length] }]);
    });
    e.target.value = "";
  };

  const playSample = (i: number, url: string) => {
    const audio = new Audio(url);
    setActive(i);
    audio.play();
    audio.onended = () => setActive(null);
    setTimeout(() => setActive(null), 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden" style={{ background: "#0a1520", maxHeight: "75vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="font-bold text-lg" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif" }}>Сэмплер</span>
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "#00c2ff22", color: "#00c2ff", border: "1px solid #00c2ff55" }}>
              <Icon name="Plus" size={12} /> Загрузить
            </button>
            <button onClick={onClose}><Icon name="X" size={20} style={{ color: "#4a6070" }} /></button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={loadFile} />

        {samples.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Icon name="Music" size={36} style={{ color: "#1e3040" }} />
            <p className="text-sm" style={{ color: "#2a4050" }}>Загрузи аудио-файлы для паддов</p>
            <button onClick={() => fileRef.current?.click()}
              className="px-5 py-2.5 rounded-full font-semibold text-sm"
              style={{ background: "#00c2ff", color: "#000" }}>
              Выбрать файлы
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 px-4 pb-6">
            {samples.map((s, i) => (
              <button key={i}
                onMouseDown={() => playSample(i, s.url)}
                onTouchStart={e => { e.preventDefault(); playSample(i, s.url); }}
                className="h-16 rounded-2xl flex items-center justify-center font-bold text-xs transition-all p-1 text-center cursor-pointer"
                style={{
                  background: active === i ? s.color : s.color + "22",
                  border: `2px solid ${s.color}`,
                  color: active === i ? "#fff" : s.color,
                  transform: active === i ? "scale(0.94)" : "scale(1)",
                  boxShadow: active === i ? `0 0 16px ${s.color}88` : "none",
                  lineHeight: 1.2,
                }}>
                {s.name}
              </button>
            ))}
            {samples.length < 16 && (
              <button onClick={() => fileRef.current?.click()}
                className="h-16 rounded-2xl flex items-center justify-center transition-all"
                style={{ border: "2px dashed #1e3040", color: "#2a4050" }}>
                <Icon name="Plus" size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Add Track Sheet ────────────────────────────────────── */
const trackTypes = [
  { icon: "Mic", label: "Голос/Аудио", sub: "Запись с AutoPitch и эффектами", color: "#ef4444", type: "voice" },
  { icon: "Guitar", label: "Гитара", sub: "Усилители и эффекты", color: "#06b6d4", type: "guitar" },
  { icon: "Music2", label: "Бас", sub: "Найди свой фирменный тон", color: "#3b82f6", type: "bass" },
  { icon: "RefreshCw", label: "Лупер", sub: "Полноценные дорожки без труда", color: "#f59e0b", type: "looper" },
  { icon: "Piano", label: "Виртуальные инструменты", sub: "Комплекты, ключи и другое", color: "#10b981", type: "vst", badge: "MIDI" },
  { icon: "Layers", label: "Сэмплер", sub: "Превратите любой звук в инструмент", color: "#8b5cf6", type: "sampler", badge: "MIDI" },
  { icon: "Grid", label: "Драм-машина", sub: "Создавайте биты за считанные секунды", color: "#f97316", type: "drums", badge: "MIDI" },
];

const AddTrackSheet = ({ onClose, onAdd, onImport }: {
  onClose: () => void;
  onAdd: (type: string, name: string, color: string, icon: string) => void;
  onImport: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
    <div className="rounded-t-3xl overflow-hidden" style={{ background: "#0f1923", maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} />
      </div>
      <div className="flex items-center justify-between px-5 pb-4">
        <span className="text-xl font-bold" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif", letterSpacing: "0.03em" }}>
          Добавить дорожку
        </span>
      </div>
      <div className="overflow-y-auto px-4 pb-4 space-y-1" style={{ maxHeight: "50vh" }}>
        {trackTypes.map(t => (
          <button
            key={t.type}
            className="w-full flex items-center gap-4 p-3 rounded-2xl transition-all"
            style={{ background: "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,194,255,0.07)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            onClick={() => { onAdd(t.type, t.label, t.color, t.icon); onClose(); }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: t.color }}>
              <Icon name={t.icon} size={22} style={{ color: "#fff" }} />
            </div>
            <div className="text-left flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: "#e2f4ff" }}>{t.label}</span>
                {t.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "#1e2d3a", color: "#7ab" }}>{t.badge}</span>
                )}
              </div>
              <span className="text-sm" style={{ color: "#4a6070" }}>{t.sub}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pb-6 pt-2" style={{ borderTop: "1px solid #1a2530" }}>
        <button
          className="flex items-center gap-3 p-3 rounded-2xl transition-all"
          style={{ background: "#141e28" }}
          onMouseEnter={e => e.currentTarget.style.background = "#1a2a38"}
          onMouseLeave={e => e.currentTarget.style.background = "#141e28"}
          onClick={() => { onImport(); onClose(); }}
        >
          <Icon name="FileMusic" size={20} style={{ color: "#00c2ff" }} />
          <div className="text-left">
            <div className="text-sm font-semibold" style={{ color: "#e2f4ff" }}>Импортировать</div>
            <div className="text-xs" style={{ color: "#4a6070" }}>Аудио, видео или файл</div>
          </div>
        </button>
        <button
          className="flex items-center gap-3 p-3 rounded-2xl transition-all"
          style={{ background: "#141e28" }}
          onMouseEnter={e => e.currentTarget.style.background = "#1a2a38"}
          onMouseLeave={e => e.currentTarget.style.background = "#141e28"}
          onClick={() => { onImport(); onClose(); }}
        >
          <Icon name="Music" size={20} style={{ color: "#8b5cf6" }} />
          <div className="text-left">
            <div className="text-sm font-semibold" style={{ color: "#e2f4ff" }}>Звуки & семплы</div>
            <div className="text-xs" style={{ color: "#4a6070" }}>mp3, wav, ogg, m4a</div>
          </div>
        </button>
      </div>
    </div>
  </div>
);

/* ─── Real FX Engine ─────────────────────────────────────── */
interface FxParams {
  reverb: { mix: number; decay: number };
  delay: { time: number; feedback: number; mix: number };
  compressor: { threshold: number; ratio: number; attack: number; release: number };
  eq: { low: number; mid: number; high: number };
  chorus: { rate: number; depth: number; mix: number };
}

const DEFAULT_FX: FxParams = {
  reverb:     { mix: 0.4, decay: 2.5 },
  delay:      { time: 0.35, feedback: 0.4, mix: 0.3 },
  compressor: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
  eq:         { low: 0, mid: 0, high: 0 },
  chorus:     { rate: 1.5, depth: 0.003, mix: 0.4 },
};

// Creates impulse response for convolution reverb
function makeImpulse(ctx: AudioContext, duration: number, decay: number) {
  const length = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buf;
}

interface FxChain {
  input: AudioNode;
  output: AudioNode;
  nodes: {
    reverb?: ConvolverNode;
    reverbGain?: GainNode;
    dryGain?: GainNode;
    delay?: DelayNode;
    delayFeedback?: GainNode;
    delayMix?: GainNode;
    compressor?: DynamicsCompressorNode;
    lowEq?: BiquadFilterNode;
    midEq?: BiquadFilterNode;
    highEq?: BiquadFilterNode;
    chorusOsc?: OscillatorNode;
    chorusDelay?: DelayNode;
    chorusMix?: GainNode;
  };
}

function buildFxChain(ctx: AudioContext, active: string[], params: FxParams): FxChain {
  const input = ctx.createGain();
  let current: AudioNode = input;
  const nodes: FxChain["nodes"] = {};

  // EQ
  if (active.includes("EQ")) {
    const low = ctx.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 200; low.gain.value = params.eq.low;
    const mid = ctx.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 1000; mid.Q.value = 1; mid.gain.value = params.eq.mid;
    const high = ctx.createBiquadFilter(); high.type = "highshelf"; high.frequency.value = 4000; high.gain.value = params.eq.high;
    current.connect(low); low.connect(mid); mid.connect(high);
    nodes.lowEq = low; nodes.midEq = mid; nodes.highEq = high;
    current = high;
  }

  // Compressor
  if (active.includes("Компрессор")) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = params.compressor.threshold;
    comp.ratio.value = params.compressor.ratio;
    comp.attack.value = params.compressor.attack;
    comp.release.value = params.compressor.release;
    current.connect(comp);
    nodes.compressor = comp;
    current = comp;
  }

  // Chorus
  if (active.includes("Chorus")) {
    const chorusDelay = ctx.createDelay(0.05);
    chorusDelay.delayTime.value = params.chorus.depth;
    const chorusOsc = ctx.createOscillator();
    chorusOsc.frequency.value = params.chorus.rate;
    const depthGain = ctx.createGain(); depthGain.gain.value = params.chorus.depth;
    chorusOsc.connect(depthGain); depthGain.connect(chorusDelay.delayTime);
    const chorusMix = ctx.createGain(); chorusMix.gain.value = params.chorus.mix;
    current.connect(chorusDelay); chorusDelay.connect(chorusMix);
    chorusOsc.start();
    nodes.chorusOsc = chorusOsc; nodes.chorusDelay = chorusDelay; nodes.chorusMix = chorusMix;
    // merge dry+chorus into a merge gain
    const merge = ctx.createGain();
    current.connect(merge); chorusMix.connect(merge);
    current = merge;
  }

  // Delay
  if (active.includes("Delay")) {
    const delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = params.delay.time;
    const feedback = ctx.createGain(); feedback.gain.value = params.delay.feedback;
    const delayMix = ctx.createGain(); delayMix.gain.value = params.delay.mix;
    delayNode.connect(feedback); feedback.connect(delayNode);
    current.connect(delayNode); delayNode.connect(delayMix);
    nodes.delay = delayNode; nodes.delayFeedback = feedback; nodes.delayMix = delayMix;
    const merge = ctx.createGain();
    current.connect(merge); delayMix.connect(merge);
    current = merge;
  }

  // Reverb (convolver)
  if (active.includes("Reverb")) {
    const conv = ctx.createConvolver();
    conv.buffer = makeImpulse(ctx, params.reverb.decay, 2);
    const reverbGain = ctx.createGain(); reverbGain.gain.value = params.reverb.mix;
    const dryGain = ctx.createGain(); dryGain.gain.value = 1 - params.reverb.mix;
    current.connect(conv); conv.connect(reverbGain);
    current.connect(dryGain);
    nodes.reverb = conv; nodes.reverbGain = reverbGain; nodes.dryGain = dryGain;
    const merge = ctx.createGain();
    reverbGain.connect(merge); dryGain.connect(merge);
    current = merge;
  }

  return { input, output: current, nodes };
}

/* ─── FX Sheet (реальные эффекты) ───────────────────────── */
const fxDefs = [
  { id: "Reverb",     icon: "Waves",     color: "#00c2ff", label: "Reverb"   },
  { id: "Delay",      icon: "Clock",     color: "#7c3aed", label: "Delay"    },
  { id: "Компрессор", icon: "Activity",  color: "#10b981", label: "Комп."    },
  { id: "EQ",         icon: "BarChart2", color: "#f59e0b", label: "EQ"       },
  { id: "Chorus",     icon: "Radio",     color: "#ec4899", label: "Chorus"   },
  { id: "AutoPitch",  icon: "TrendingUp",color: "#ef4444", label: "AutoPitch"},
];

const FxSheet = ({
  trackName, trackUrl, onClose, onFxChange,
}: {
  trackName: string;
  trackUrl?: string;
  onClose: () => void;
  onFxChange: (active: string[], params: FxParams) => void;
}) => {
  const [active, setActive] = useState<string[]>([]);
  const [params, setParams] = useState<FxParams>(DEFAULT_FX);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopPreview = () => {
    previewSourceRef.current?.stop();
    previewSourceRef.current = null;
    previewCtxRef.current?.close();
    previewCtxRef.current = null;
    setPreviewPlaying(false);
  };

  const playPreview = async () => {
    if (previewPlaying) { stopPreview(); return; }
    if (!trackUrl) return;
    try {
      const ctx = new AudioContext();
      previewCtxRef.current = ctx;
      const resp = await fetch(trackUrl);
      const arrBuf = await resp.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrBuf);
      const chain = buildFxChain(ctx, active, params);
      const src = ctx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(chain.input);
      chain.output.connect(ctx.destination);
      src.start();
      src.onended = () => { stopPreview(); };
      previewSourceRef.current = src;
      setPreviewPlaying(true);
    } catch { stopPreview(); }
  };

  const toggle = (id: string) => {
    const next = active.includes(id) ? active.filter(x => x !== id) : [...active, id];
    setActive(next);
    onFxChange(next, params);
  };

  const updateParam = (patch: Partial<FxParams>) => {
    const next = { ...params, ...patch };
    setParams(next);
    onFxChange(active, next);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden" style={{ background: "#0a1520", maxHeight: "82vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} /></div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="font-bold text-lg" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif" }}>FX — {trackName}</span>
          <div className="flex items-center gap-2">
            {trackUrl && (
              <button onClick={playPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{ background: previewPlaying ? "rgba(0,230,118,0.2)" : "#0d1e2c", color: previewPlaying ? "#00e676" : "#7ab", border: `1px solid ${previewPlaying ? "#00e676" : "#1e3040"}` }}>
                <Icon name={previewPlaying ? "Square" : "Play"} size={12} />
                {previewPlaying ? "Стоп" : "Слушать"}
              </button>
            )}
            <button onClick={onClose}><Icon name="X" size={20} style={{ color: "#4a6070" }} /></button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 pb-6" style={{ maxHeight: "65vh" }}>
          {/* FX grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {fxDefs.map(fx => {
              const on = active.includes(fx.id);
              return (
                <div key={fx.id}>
                  <button
                    onClick={() => { toggle(fx.id); setExpanded(on ? null : fx.id); }}
                    className="w-full flex flex-col items-center gap-2 py-3 px-2 rounded-2xl transition-all"
                    style={{ background: on ? fx.color + "22" : "#141e28", border: `1.5px solid ${on ? fx.color : "#1e2d3a"}`, boxShadow: on ? `0 0 12px ${fx.color}33` : "none" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: on ? fx.color : "#1e2d3a" }}>
                      <Icon name={fx.icon} size={18} style={{ color: on ? "#fff" : "#4a6070" }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: on ? fx.color : "#4a6070" }}>{fx.label}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Expanded params */}
          {expanded === "Reverb" && active.includes("Reverb") && (
            <div className="rounded-2xl p-4 mb-3 space-y-3" style={{ background: "#0d1e2c", border: "1px solid #00c2ff33" }}>
              <p className="text-xs font-mono uppercase" style={{ color: "#00c2ff" }}>Reverb</p>
              <SliderRow label="Mix" value={params.reverb.mix} min={0} max={1} step={0.01}
                onChange={v => updateParam({ reverb: { ...params.reverb, mix: v } })} color="#00c2ff" />
              <SliderRow label="Decay" value={params.reverb.decay} min={0.3} max={8} step={0.1}
                onChange={v => updateParam({ reverb: { ...params.reverb, decay: v } })} color="#00c2ff" />
            </div>
          )}
          {expanded === "Delay" && active.includes("Delay") && (
            <div className="rounded-2xl p-4 mb-3 space-y-3" style={{ background: "#0d1e2c", border: "1px solid #7c3aed33" }}>
              <p className="text-xs font-mono uppercase" style={{ color: "#7c3aed" }}>Delay</p>
              <SliderRow label="Time" value={params.delay.time} min={0.05} max={1} step={0.01}
                onChange={v => updateParam({ delay: { ...params.delay, time: v } })} color="#7c3aed" />
              <SliderRow label="Feedback" value={params.delay.feedback} min={0} max={0.9} step={0.01}
                onChange={v => updateParam({ delay: { ...params.delay, feedback: v } })} color="#7c3aed" />
              <SliderRow label="Mix" value={params.delay.mix} min={0} max={1} step={0.01}
                onChange={v => updateParam({ delay: { ...params.delay, mix: v } })} color="#7c3aed" />
            </div>
          )}
          {expanded === "Компрессор" && active.includes("Компрессор") && (
            <div className="rounded-2xl p-4 mb-3 space-y-3" style={{ background: "#0d1e2c", border: "1px solid #10b98133" }}>
              <p className="text-xs font-mono uppercase" style={{ color: "#10b981" }}>Компрессор</p>
              <SliderRow label="Threshold" value={params.compressor.threshold} min={-60} max={0} step={1}
                onChange={v => updateParam({ compressor: { ...params.compressor, threshold: v } })} color="#10b981" />
              <SliderRow label="Ratio" value={params.compressor.ratio} min={1} max={20} step={0.5}
                onChange={v => updateParam({ compressor: { ...params.compressor, ratio: v } })} color="#10b981" />
            </div>
          )}
          {expanded === "EQ" && active.includes("EQ") && (
            <div className="rounded-2xl p-4 mb-3 space-y-3" style={{ background: "#0d1e2c", border: "1px solid #f59e0b33" }}>
              <p className="text-xs font-mono uppercase" style={{ color: "#f59e0b" }}>EQ</p>
              <SliderRow label="Низкие" value={params.eq.low} min={-12} max={12} step={0.5}
                onChange={v => updateParam({ eq: { ...params.eq, low: v } })} color="#f59e0b" />
              <SliderRow label="Средние" value={params.eq.mid} min={-12} max={12} step={0.5}
                onChange={v => updateParam({ eq: { ...params.eq, mid: v } })} color="#f59e0b" />
              <SliderRow label="Высокие" value={params.eq.high} min={-12} max={12} step={0.5}
                onChange={v => updateParam({ eq: { ...params.eq, high: v } })} color="#f59e0b" />
            </div>
          )}
          {expanded === "Chorus" && active.includes("Chorus") && (
            <div className="rounded-2xl p-4 mb-3 space-y-3" style={{ background: "#0d1e2c", border: "1px solid #ec489933" }}>
              <p className="text-xs font-mono uppercase" style={{ color: "#ec4899" }}>Chorus</p>
              <SliderRow label="Rate" value={params.chorus.rate} min={0.1} max={8} step={0.1}
                onChange={v => updateParam({ chorus: { ...params.chorus, rate: v } })} color="#ec4899" />
              <SliderRow label="Mix" value={params.chorus.mix} min={0} max={1} step={0.01}
                onChange={v => updateParam({ chorus: { ...params.chorus, mix: v } })} color="#ec4899" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SliderRow = ({ label, value, min, max, step, onChange, color }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; color: string;
}) => (
  <div className="flex items-center gap-3">
    <span className="text-xs w-16 flex-shrink-0" style={{ color: "#7ab" }}>{label}</span>
    <div className="flex-1 relative h-4 flex items-center">
      <div className="w-full h-1 rounded-full" style={{ background: "#1e3040" }}>
        <div className="h-full rounded-full" style={{ width: `${((value - min) / (max - min)) * 100}%`, background: color, transition: "width 0.05s" }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
    </div>
    <span className="font-mono text-xs w-8 text-right flex-shrink-0" style={{ color }}>{value}</span>
  </div>
);

/* ─── AutoPitch modal ────────────────────────────────────── */
const AutoPitchModal = ({ onClose }: { onClose: () => void }) => {
  const [scale, setScale] = useState("C Major");
  const [amount, setAmount] = useState(80);
  const scales = ["C Major", "C# Major", "D Major", "Eb Major", "E Major", "F Major", "G Major", "A Major", "Bb Major", "B Major", "A Minor", "D Minor"];
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden" style={{ background: "#0f1923" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} /></div>
        <div className="px-5 pt-2 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#ef4444" }}>
              <Icon name="TrendingUp" size={16} style={{ color: "#fff" }} />
            </div>
            <span className="font-bold text-lg" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif" }}>AutoPitch</span>
          </div>
          <button onClick={onClose}><Icon name="X" size={20} style={{ color: "#4a6070" }} /></button>
        </div>
        <div className="px-5 pb-6 space-y-5">
          <div>
            <label className="text-xs font-mono uppercase" style={{ color: "#4a6070", letterSpacing: "0.08em" }}>Тональность</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {scales.slice(0, 8).map(s => (
                <button key={s} onClick={() => setScale(s)}
                  className="py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: scale === s ? "#00c2ff" : "#141e28", color: scale === s ? "#000" : "#7ab", border: `1px solid ${scale === s ? "#00c2ff" : "#1e2d3a"}` }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-mono uppercase" style={{ color: "#4a6070", letterSpacing: "0.08em" }}>Коррекция</label>
              <span className="text-sm font-bold" style={{ color: "#00c2ff" }}>{amount}%</span>
            </div>
            <input type="range" min={0} max={100} value={amount} onChange={e => setAmount(+e.target.value)} className="w-full accent-cyan-400" style={{ accentColor: "#00c2ff" }} />
          </div>
          <button className="w-full py-3.5 rounded-2xl font-bold text-base transition-all" style={{ background: "#00c2ff", color: "#000" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 24px rgba(0,194,255,0.4)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            Применить AutoPitch
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Recorder with live levels ────────────────────── */
const useRecorder = () => {
  const [state, setState] = useState<RecordingState>("idle");
  const [recTime, setRecTime] = useState(0);
  const [vuLevels, setVuLevels] = useState<number[]>(new Array(32).fill(0));
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recTimeRef = useRef(0);

  const animateVU = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.floor(data.length / 32);
    const lvls = Array.from({ length: 32 }, (_, i) => {
      const slice = data.slice(i * step, (i + 1) * step);
      return (slice.reduce((a, b) => a + b, 0) / slice.length / 255) * 100;
    });
    setVuLevels(lvls);
    animFrameRef.current = requestAnimationFrame(animateVU);
  }, []);

  const start = async (): Promise<{ url: string; duration: string; waveform: number[] } | null> => {
    setError("");
    try {
      // iOS Safari requires explicit permission request with these constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      streamRef.current = stream;

      // iOS Safari needs AudioContext resumed after user gesture
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();

      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      // Pick best supported mimeType (iOS Safari supports audio/mp4)
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      setState("recording");
      setRecTime(0);
      recTimeRef.current = 0;
      timerRef.current = setInterval(() => { recTimeRef.current += 1; setRecTime(t => t + 1); }, 1000);
      animateVU();
      return null;
    } catch (err) {
      const e = err as Error;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setError("Разреши доступ к микрофону в настройках браузера");
      } else if (e.name === "NotFoundError") {
        setError("Микрофон не найден на устройстве");
      } else {
        setError("Не удалось начать запись. Попробуй ещё раз.");
      }
      return null;
    }
  };

  const stop = (): Promise<{ url: string; duration: string; waveform: number[] }> =>
    new Promise(resolve => {
      if (!mediaRecorderRef.current) return;
      const mimeType = mediaRecorderRef.current.mimeType || "audio/webm";
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const duration = formatTime(recTimeRef.current);
        const waveform = Array.from({ length: 60 }, () => Math.random() * 80 + 10);
        setVuLevels(new Array(32).fill(0));
        cancelAnimationFrame(animFrameRef.current);
        resolve({ url, duration, waveform });
      };
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      setState("done");
    });

  const pause = () => {
    mediaRecorderRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    setVuLevels(new Array(32).fill(0));
    setState("paused");
  };

  const resume = () => {
    mediaRecorderRef.current?.resume();
    timerRef.current = setInterval(() => { recTimeRef.current += 1; setRecTime(t => t + 1); }, 1000);
    animateVU();
    setState("recording");
  };

  useEffect(() => () => {
    cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { state, recTime, vuLevels, error, start, stop, pause, resume };
};

const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ─── Anime Splash Screen ────────────────────────────────── */
const AnimeSplash = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState<"intro" | "logo" | "title" | "out">("intro");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 300);
    const t2 = setTimeout(() => setPhase("title"), 1100);
    const t3 = setTimeout(() => setPhase("out"), 2600);
    const t4 = setTimeout(() => onDoneRef.current(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "#020609",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.6s ease-in" : "none",
      }}
    >
      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(0deg, rgba(0,194,255,0.03) 0px, rgba(0,194,255,0.03) 1px, transparent 1px, transparent 3px)",
      }} />

      {/* Glitch grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(0,194,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,194,255,0.04) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Corner accents */}
      {[["top-4 left-4", "border-t-2 border-l-2"], ["top-4 right-4", "border-t-2 border-r-2"], ["bottom-4 left-4", "border-b-2 border-l-2"], ["bottom-4 right-4", "border-b-2 border-r-2"]].map(([pos, border], i) => (
        <div key={i} className={`absolute ${pos} w-8 h-8 ${border}`} style={{ borderColor: "#00c2ff", opacity: phase === "intro" ? 0 : 0.6, transition: "opacity 0.4s ease" }} />
      ))}

      {/* Logo */}
      <div style={{
        opacity: phase === "intro" ? 0 : 1,
        transform: phase === "intro" ? "scale(0.3)" : phase === "out" ? "scale(1.15)" : "scale(1)",
        transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div className="relative">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full" style={{
            background: "radial-gradient(circle, rgba(0,194,255,0.25) 0%, transparent 70%)",
            transform: "scale(2)",
            animation: phase === "logo" || phase === "title" ? "glow-pulse 1.5s ease-in-out infinite" : "none",
          }} />
          <img
            src="https://cdn.poehali.dev/projects/aa1808ba-e45f-437c-8925-20682e9a577e/files/3fa43031-b9e1-40e6-997b-435e174180c5.jpg"
            alt="cheburek"
            className="w-28 h-28 rounded-3xl object-cover relative z-10"
            style={{ border: "3px solid #00c2ff", boxShadow: "0 0 32px rgba(0,194,255,0.5), 0 0 64px rgba(0,194,255,0.2)" }}
          />
        </div>
      </div>

      {/* Title */}
      <div className="mt-8 text-center" style={{
        opacity: phase === "title" || phase === "out" ? 1 : 0,
        transform: phase === "title" || phase === "out" ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
      }}>
        <div className="glitch-text font-bold tracking-[0.2em] uppercase mb-1" style={{
          fontFamily: "Oswald, sans-serif",
          fontSize: "clamp(1.8rem, 6vw, 2.6rem)",
          color: "#e2f4ff",
        }}>
          CHEBUR<span style={{ color: "#00c2ff" }}>EK</span>STUDIO
        </div>
        <div className="font-mono text-xs tracking-[0.3em] uppercase" style={{ color: "#00c2ff", opacity: 0.7 }}>
          ▸ REC MODE ONLINE ▸
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-10 left-8 right-8" style={{
        opacity: phase === "title" || phase === "out" ? 1 : 0,
        transition: "opacity 0.4s ease 0.3s",
      }}>
        <div className="h-px w-full mb-2" style={{ background: "linear-gradient(90deg, transparent, #00c2ff, transparent)" }} />
        <div className="flex justify-between font-mono text-[10px]" style={{ color: "#1e4060" }}>
          <span>SYS_BOOT v2.0</span>
          <span>AUDIO ENGINE READY</span>
          <span>44.1kHz / 32bit</span>
        </div>
      </div>

      {/* Loading bar */}
      <div className="absolute bottom-6 left-8 right-8 h-0.5 rounded-full overflow-hidden" style={{ background: "#0d1e2c" }}>
        <div style={{
          height: "100%",
          background: "linear-gradient(90deg, #00c2ff, #7c3aed)",
          borderRadius: 999,
          width: phase === "intro" ? "0%" : phase === "logo" ? "50%" : "100%",
          transition: "width 0.8s ease",
          boxShadow: "0 0 8px #00c2ff",
        }} />
      </div>
    </div>
  );
};

/* ─── Save Dialog ────────────────────────────────────────── */
const SaveDialog = ({
  onSave, onDiscard, onContinue,
}: { onSave: () => void; onDiscard: () => void; onContinue: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
    <div className="w-full rounded-t-3xl overflow-hidden pb-safe" style={{ background: "#0a1520", maxWidth: 480 }}>
      <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} /></div>
      <div className="px-5 pt-3 pb-2 text-center">
        <span className="font-bold text-lg" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif" }}>Сохранить трек?</span>
        <p className="text-sm mt-1" style={{ color: "#4a6070" }}>Трек попадёт в твой кабинет</p>
      </div>
      <div className="flex flex-col gap-2 px-5 pb-6 pt-2">
        <button onClick={onSave}
          className="w-full py-4 rounded-2xl font-bold text-base"
          style={{ background: "#00c2ff", color: "#000", fontFamily: "Oswald, sans-serif", letterSpacing: "0.06em" }}>
          <Icon name="Save" size={16} style={{ display: "inline", marginRight: 8 }} />
          СОХРАНИТЬ И ВЫЙТИ
        </button>
        <button onClick={onContinue}
          className="w-full py-3.5 rounded-2xl font-bold text-sm"
          style={{ background: "#0d1e2c", color: "#e2f4ff", border: "1px solid #1e3040" }}>
          Продолжить запись
        </button>
        <button onClick={onDiscard}
          className="w-full py-3 rounded-2xl font-medium text-sm"
          style={{ background: "transparent", color: "#4a6070" }}>
          Выйти без сохранения
        </button>
      </div>
    </div>
  </div>
);

/* ─── Main App ───────────────────────────────────────────── */
export default function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState<"cabinet" | "daw">("cabinet");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  // Projects = сохранённые треки в Кабинете
  const [projects, setProjects] = useState<import("./Cabinet").Project[]>(() => {
    try { return JSON.parse(localStorage.getItem("cheburek_projects") || "[]"); } catch { return []; }
  });
  const projectCounterRef = useRef(projects.length + 1);
  const [projectName, setProjectName] = useState("Новый трек");

  // DAW tracks (дорожки внутри текущего проекта)
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showFx, setShowFx] = useState<number | null>(null);
  const [showAutoPitch, setShowAutoPitch] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<number | null>(null);
  const [showInstrument, setShowInstrument] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);
  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});
  const counterRef = useRef(0);
  const playheadRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recorder = useRecorder();

  // Rename
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRename = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(track.id);
    setRenameValue(track.name);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const commitRename = () => {
    if (renamingId !== null && renameValue.trim()) {
      setTracks(prev => prev.map(t => t.id === renamingId ? { ...t, name: renameValue.trim() } : t));
    }
    setRenamingId(null);
  };

  // FX params per track
  const [trackFxActive, setTrackFxActive] = useState<Record<number, string[]>>({});
  const [trackFxParams, setTrackFxParams] = useState<Record<number, FxParams>>({});

  const handleFxChange = (trackId: number, active: string[], params: FxParams) => {
    setTrackFxActive(prev => ({ ...prev, [trackId]: active }));
    setTrackFxParams(prev => ({ ...prev, [trackId]: params }));
  };

  // Volume
  const setTrackVolume = (id: number, vol: number) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, volume: vol } : t));
    if (audioRefs.current[id]) audioRefs.current[id].volume = vol / 100;
  };

  // Drag-and-drop
  const dragIdRef = useRef<number | null>(null);
  const dragOverIdRef = useRef<number | null>(null);

  const onDragStart = (id: number) => { dragIdRef.current = id; };
  const onDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    dragOverIdRef.current = id;
  };
  const onDrop = () => {
    const fromId = dragIdRef.current;
    const toId = dragOverIdRef.current;
    if (fromId === null || toId === null || fromId === toId) return;
    setTracks(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t => t.id === fromId);
      const toIdx = arr.findIndex(t => t.id === toId);
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
    dragIdRef.current = null;
    dragOverIdRef.current = null;
  };

  /* ─ playhead tick ─ */
  useEffect(() => {
    if (playing) {
      playheadRef.current = setInterval(() => setPlayhead(p => p + 1), 100);
    } else {
      if (playheadRef.current) clearInterval(playheadRef.current);
    }
    return () => { if (playheadRef.current) clearInterval(playheadRef.current); };
  }, [playing]);

  /* ─ add track ─ */
  const addTrack = (type: string, name: string, color: string, icon: string) => {
    counterRef.current += 1;
    const newTrack: Track = {
      id: counterRef.current,
      name: type === "voice" ? `Голос/Аудио ${counterRef.current}` : name,
      color,
      icon,
      type,
      hasAudio: false,
      fx: [],
      muted: false,
      solo: false,
      volume: 80,
      waveform: Array.from({ length: 60 }, () => 0),
    };
    setTracks(prev => [...prev, newTrack]);
    setActiveTrackId(newTrack.id);
    // Открываем интерфейс инструмента сразу
    if (["guitar", "bass", "vst", "drums", "sampler", "looper"].includes(type)) {
      setShowInstrument(type);
    }
  };

  /* ─ start recording on active track ─ */
  const handleRecord = async () => {
    if (recorder.state === "idle" || recorder.state === "done") {
      if (!activeTrackId) {
        counterRef.current += 1;
        const id = counterRef.current;
        setTracks(prev => [...prev, { id, name: `Голос/Аудио ${id}`, color: "#ef4444", icon: "Mic", type: "voice", hasAudio: false, fx: [], muted: false, solo: false, volume: 80, waveform: Array.from({ length: 60 }, () => 0) }]);
        setActiveTrackId(id);
      }
      await recorder.start();
    } else if (recorder.state === "recording") {
      const result = await recorder.stop();
      if (result && activeTrackId) {
        setTracks(prev => prev.map(t => t.id === activeTrackId ? { ...t, hasAudio: true, url: result.url, duration: result.duration, waveform: result.waveform } : t));
      }
    } else if (recorder.state === "paused") {
      recorder.resume();
    }
  };

  /* ─ play/pause track (with FX chain) ─ */
  const [trackPlayOffset, setTrackPlayOffset] = useState<Record<number, number>>({});
  const playAnimRef = useRef<Record<number, number>>({});
  const fxCtxRef = useRef<Record<number, AudioContext>>({});
  const fxSourceRef = useRef<Record<number, AudioBufferSourceNode>>({});

  const stopTrack = (id: number) => {
    try { fxSourceRef.current[id]?.stop(); } catch { /* already stopped */ }
    fxCtxRef.current[id]?.close();
    delete fxSourceRef.current[id];
    delete fxCtxRef.current[id];
    if (playAnimRef.current[id]) cancelAnimationFrame(playAnimRef.current[id]);
    audioRefs.current[id]?.pause();
  };

  const togglePlayTrack = async (track: Track) => {
    if (!track.url) return;

    if (playingTrackId === track.id) {
      stopTrack(track.id);
      setPlayingTrackId(null);
      return;
    }

    // Stop all others
    Object.keys(fxCtxRef.current).forEach(k => stopTrack(+k));
    Object.values(audioRefs.current).forEach(a => a.pause());
    Object.keys(playAnimRef.current).forEach(k => cancelAnimationFrame(playAnimRef.current[+k]));

    const active = trackFxActive[track.id] || [];
    const params = trackFxParams[track.id] || DEFAULT_FX;

    if (active.length === 0) {
      // Simple playback without FX
      if (!audioRefs.current[track.id]) {
        const audio = new Audio(track.url);
        audio.onended = () => { setPlayingTrackId(null); setTrackPlayOffset(p => ({ ...p, [track.id]: 0 })); };
        audioRefs.current[track.id] = audio;
      }
      const audio = audioRefs.current[track.id];
      audio.currentTime = 0;
      audio.volume = (track.volume || 80) / 100;
      audio.play();
    } else {
      // Playback with FX chain via Web Audio API
      try {
        const ctx = new AudioContext();
        if (ctx.state === "suspended") await ctx.resume();
        fxCtxRef.current[track.id] = ctx;

        const resp = await fetch(track.url);
        const arrBuf = await resp.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrBuf);

        const chain = buildFxChain(ctx, active, params);
        const gainOut = ctx.createGain();
        gainOut.gain.value = (track.volume || 80) / 100;
        chain.output.connect(gainOut);
        gainOut.connect(ctx.destination);

        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(chain.input);
        fxSourceRef.current[track.id] = src;

        src.onended = () => {
          ctx.close();
          delete fxCtxRef.current[track.id];
          delete fxSourceRef.current[track.id];
          setPlayingTrackId(null);
          setTrackPlayOffset(p => ({ ...p, [track.id]: 0 }));
          if (chain.nodes.chorusOsc) try { chain.nodes.chorusOsc.stop(); } catch { /* ok */ }
        };
        src.start();
      } catch {
        // Fallback to simple
        if (!audioRefs.current[track.id]) {
          const audio = new Audio(track.url);
          audio.onended = () => { setPlayingTrackId(null); };
          audioRefs.current[track.id] = audio;
        }
        audioRefs.current[track.id].currentTime = 0;
        audioRefs.current[track.id].play();
      }
    }

    setPlayingTrackId(track.id);

    // Waveform playhead animation
    const startTime = performance.now();
    const getDuration = () => {
      if (audioRefs.current[track.id]) return audioRefs.current[track.id].duration || 10;
      if (fxCtxRef.current[track.id]) return fxCtxRef.current[track.id].currentTime + 10;
      return 10;
    };

    let estimatedDuration = 10;
    try {
      const resp = await fetch(track.url, { method: "HEAD" });
      if (!resp.ok) throw new Error("head failed");
    } catch { /* ok */ }

    // Estimate from waveform length * typical sample density
    estimatedDuration = track.duration
      ? (() => { const parts = (track.duration || "0:00").split(":"); return (parseInt(parts[0]) * 60 + parseInt(parts[1])) || 10; })()
      : 10;

    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(1, elapsed / estimatedDuration);
      setTrackPlayOffset(p => ({ ...p, [track.id]: progress }));
      if (progress < 1) {
        playAnimRef.current[track.id] = requestAnimationFrame(animate);
      }
    };
    playAnimRef.current[track.id] = requestAnimationFrame(animate);
  };

  /* ─ import file ─ */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const waveform = Array.from({ length: 60 }, () => Math.random() * 80 + 15);
    counterRef.current += 1;
    const id = counterRef.current;
    setTracks(prev => [...prev, { id, name: file.name.replace(/\.[^.]+$/, ""), color: "#06b6d4", icon: "FileMusic", type: "import", hasAudio: true, url, duration: "—", waveform, fx: [], muted: false, solo: false, volume: 80 }]);
    setActiveTrackId(id);
    e.target.value = "";
  };

  /* ─ delete track ─ */
  const deleteTrack = (id: number) => {
    audioRefs.current[id]?.pause();
    delete audioRefs.current[id];
    if (playingTrackId === id) setPlayingTrackId(null);
    if (activeTrackId === id) setActiveTrackId(null);
    setTracks(prev => prev.filter(t => t.id !== id));
  };

  /* ─ open new project in DAW ─ */
  const openNewProject = () => {
    setTracks([{ id: 1, name: "Голос/Аудио", color: "#ef4444", icon: "Mic", type: "voice", hasAudio: false, fx: [], muted: false, solo: false, volume: 80, waveform: Array.from({ length: 60 }, () => 0) }]);
    counterRef.current = 1;
    setActiveTrackId(1);
    setProjectName("Новый трек " + projectCounterRef.current);
    setPlayhead(0); setPlaying(false);
    setScreen("daw");
  };

  const openExistingProject = (id: number) => {
    setEditingProjectId(id);
    const p = projects.find(pr => pr.id === id);
    if (!p) return;
    setProjectName(p.name);
    setTracks([{ id: 1, name: "Голос/Аудио", color: p.coverColor, icon: "Mic", type: "voice", hasAudio: !!p.audioUrl, url: p.audioUrl, duration: p.duration, fx: [], muted: false, solo: false, volume: 80, waveform: p.waveform || Array.from({ length: 60 }, () => Math.random() * 70 + 10) }]);
    counterRef.current = 1;
    setActiveTrackId(1);
    setScreen("daw");
  };

  /* ─ save project ─ */
  const doSaveProject = () => {
    const audioTrack = tracks.find(t => t.hasAudio && t.url);
    const now = new Date();
    const createdAt = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
    const colors = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#ec4899"];

    if (editingProjectId !== null) {
      setProjects(prev => {
        const updated = prev.map(p => p.id === editingProjectId ? {
          ...p, name: projectName, audioUrl: audioTrack?.url, duration: audioTrack?.duration || "0:00",
          trackCount: tracks.length, mimeType, waveform: audioTrack?.waveform,
        } : p);
        localStorage.setItem("cheburek_projects", JSON.stringify(updated.map(p => ({ ...p, audioUrl: undefined }))));
        return updated;
      });
    } else {
      const newId = projectCounterRef.current++;
      const project: import("./Cabinet").Project = {
        id: newId,
        name: projectName,
        coverColor: colors[newId % colors.length],
        createdAt,
        duration: audioTrack?.duration || "0:00",
        trackCount: tracks.length,
        audioUrl: audioTrack?.url,
        mimeType,
        waveform: audioTrack?.waveform,
      };
      setProjects(prev => {
        const updated = [project, ...prev];
        localStorage.setItem("cheburek_projects", JSON.stringify(updated.map(p => ({ ...p, audioUrl: undefined }))));
        return updated;
      });
    }
    setShowSaveDialog(false);
    setEditingProjectId(null);
    setScreen("cabinet");
  };

  const handleBackFromDAW = () => {
    const hasAudio = tracks.some(t => t.hasAudio && t.url);
    if (hasAudio) {
      setShowSaveDialog(true);
    } else {
      setEditingProjectId(null);
      setScreen("cabinet");
    }
  };

  /* ─ cabinet helpers ─ */
  const deleteProject = (id: number) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem("cheburek_projects", JSON.stringify(updated.map(p => ({ ...p, audioUrl: undefined }))));
      return updated;
    });
  };
  const renameProject = (id: number, name: string) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, name } : p);
      localStorage.setItem("cheburek_projects", JSON.stringify(updated.map(p => ({ ...p, audioUrl: undefined }))));
      return updated;
    });
  };

  const isRec = recorder.state === "recording";
  const isPaused = recorder.state === "paused";

  /* ─── CABINET SCREEN ─ */
  if (screen === "cabinet") {
    return (
      <>
        {showSplash && <AnimeSplash onDone={() => setShowSplash(false)} />}
        <Cabinet
          projects={projects}
          onNewProject={openNewProject}
          onOpenProject={openExistingProject}
          onDeleteProject={deleteProject}
          onRenameProject={renameProject}
        />
      </>
    );
  }

  /* ─── DAW SCREEN ─ */
  return (
    <div className="flex flex-col h-screen overflow-hidden select-none" style={{ background: "#080f16", color: "#e2f4ff", fontFamily: "IBM Plex Sans, sans-serif", maxWidth: 480, margin: "0 auto" }}>

      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-safe pb-2 pt-3" style={{ background: "#0a1520", borderBottom: "1px solid #0d1e2c" }}>
        <button className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "#0d1e2c" }}
          onClick={handleBackFromDAW}>
          <Icon name="ChevronLeft" size={20} style={{ color: "#e2f4ff" }} />
        </button>

        {/* Editable project name */}
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="flex-1 mx-3 text-center font-bold text-sm outline-none bg-transparent"
          style={{ fontFamily: "Oswald, sans-serif", color: "#e2f4ff", letterSpacing: "0.04em" }}
          placeholder="Название трека"
        />

        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all"
          style={{ background: "rgba(0,194,255,0.15)", color: "#00c2ff", border: "1px solid rgba(0,194,255,0.4)", flexShrink: 0 }}
          onClick={handleBackFromDAW}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 12px rgba(0,194,255,0.3)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
        >
          <Icon name="Save" size={13} />
          Сохранить
        </button>
      </div>

      {/* ── Timeline ruler ── */}
      <div className="flex-shrink-0 flex items-center px-4 py-1.5" style={{ background: "#0a1520", borderBottom: "1px solid #0d1e2c" }}>
        <div className="font-mono text-xs mr-3" style={{ color: "#4a6070", minWidth: 52 }}>
          {isRec ? <span style={{ color: "#ef4444" }} className="recording-dot inline-block">● {formatTime(recorder.recTime)}</span> : "00:00.0"}
        </div>
        <div className="flex-1 relative h-5 overflow-hidden" style={{ background: "#0d1e2c", borderRadius: 4 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <div key={n} className="absolute top-0 h-full flex flex-col items-start pl-0.5" style={{ left: `${(n - 1) * 12.5}%`, width: "12.5%" }}>
              <span className="font-mono text-[9px]" style={{ color: "#2a4050" }}>{n}</span>
              <div className="w-px h-2 mt-auto" style={{ background: "#1a3040" }} />
            </div>
          ))}
          <div className="absolute top-0 bottom-0 w-0.5 rounded" style={{ left: `${Math.min(95, (playhead / 10) % 96)}%`, background: "#00c2ff", boxShadow: "0 0 6px #00c2ff" }} />
        </div>
      </div>

      {/* ── Tracks area ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: "#080f16" }}>
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <img src="https://cdn.poehali.dev/projects/aa1808ba-e45f-437c-8925-20682e9a577e/files/3fa43031-b9e1-40e6-997b-435e174180c5.jpg"
              alt="cheburek" className="w-28 h-28 rounded-3xl object-cover opacity-60" style={{ border: "2px solid #0d1e2c" }} />
            <p className="text-sm" style={{ color: "#2a4050" }}>Нажми <span style={{ color: "#00c2ff" }}>+</span> чтобы добавить дорожку<br />или <span style={{ color: "#ef4444" }}>●</span> чтобы начать запись</p>
          </div>
        ) : tracks.map(track => {
          const isActive = track.id === activeTrackId;
          const isPlaying = track.id === playingTrackId;
          const isRenaming = renamingId === track.id;
          return (
            <div
              key={track.id}
              draggable
              onDragStart={() => onDragStart(track.id)}
              onDragOver={e => onDragOver(e, track.id)}
              onDrop={onDrop}
              className="flex flex-col transition-all"
              style={{ borderBottom: "1px solid #0d1e2c", background: isActive ? "rgba(0,194,255,0.05)" : "transparent", cursor: "grab" }}
              onClick={() => setActiveTrackId(track.id)}
            >
              <div className="flex items-stretch">
                {/* Drag handle */}
                <div className="flex-shrink-0 flex items-center px-1.5" style={{ color: "#1e3040" }}>
                  <Icon name="GripVertical" size={14} />
                </div>

                {/* Left panel */}
                <div className="flex-shrink-0 flex flex-col justify-center gap-1.5 px-2 py-2.5" style={{ width: 130, borderRight: "1px solid #0d1e2c" }}>
                  <div className="flex items-center gap-1.5">
                    <Icon name={track.icon} size={14} style={{ color: track.color, flexShrink: 0 }} />
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 text-xs font-semibold rounded px-1 py-0.5 outline-none"
                        style={{ background: "#0d1e2c", color: track.color, border: `1px solid ${track.color}66`, minWidth: 0 }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="text-xs font-semibold truncate flex-1 cursor-text"
                        style={{ color: track.color }}
                        onDoubleClick={e => startRename(track, e)}
                        title="Двойной клик — переименовать"
                      >
                        {track.name}
                      </span>
                    )}
                    <button onClick={e => startRename(track, e)} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#2a4050" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#00c2ff"}
                      onMouseLeave={e => e.currentTarget.style.color = "#2a4050"}>
                      <Icon name="Pencil" size={10} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all"
                      style={{ background: "#0d1e2c", color: "#00c2ff", border: "1px solid #1a3040" }}
                      onClick={e => { e.stopPropagation(); setShowFx(track.id); }}
                    >
                      +Fx
                    </button>
                    {["guitar","bass","vst","drums","sampler","looper"].includes(track.type) && (
                      <button
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all"
                        style={{ background: "#0d1e2c", color: track.color, border: `1px solid ${track.color}55` }}
                        onClick={e => { e.stopPropagation(); setShowInstrument(track.type); }}
                      >
                        <Icon name="Piano" size={10} />
                        Играть
                      </button>
                    )}
                    {track.hasAudio && track.url && (
                      <button
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all"
                        style={{ background: "rgba(0,230,118,0.12)", color: "#00e676", border: "1px solid rgba(0,230,118,0.35)" }}
                        onClick={e => { e.stopPropagation(); saveTrackToCabinet(track); }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,230,118,0.22)"; e.currentTarget.style.boxShadow = "0 0 8px rgba(0,230,118,0.3)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,230,118,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <Icon name="Save" size={9} />
                        Сохранить
                      </button>
                    )}
                  </div>
                </div>

                {/* Waveform / record area */}
                <div className="flex-1 flex items-center px-2 relative" style={{ minHeight: 60 }}>
                  {isRec && isActive ? (
                    <div className="flex items-end gap-[2px] w-full" style={{ height: 38 }}>
                      {recorder.vuLevels.map((v, i) => (
                        <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(4, v)}%`, background: `${track.color}cc`, transition: "height 0.05s", boxShadow: v > 50 ? `0 0 4px ${track.color}` : "none" }} />
                      ))}
                    </div>
                  ) : track.hasAudio && track.waveform ? (
                    <div
                      className="relative flex items-end gap-[2px] w-full rounded-xl overflow-hidden cursor-pointer"
                      style={{ height: 44, background: track.color + "18", padding: "4px 6px" }}
                      onClick={e => { e.stopPropagation(); togglePlayTrack(track); }}
                    >
                      {track.waveform.map((v, i) => {
                        const progress = trackPlayOffset[track.id] || 0;
                        const barProgress = i / track.waveform!.length;
                        const passed = isPlaying && barProgress <= progress;
                        return (
                          <div key={i} className="flex-1 rounded-sm"
                            style={{
                              height: `${v}%`,
                              background: passed ? track.color : track.color + "44",
                              transition: "background 0.05s",
                              boxShadow: passed && v > 50 ? `0 0 4px ${track.color}88` : "none",
                            }} />
                        );
                      })}
                      {/* Playhead line */}
                      {isPlaying && (
                        <div className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
                          style={{
                            left: `${(trackPlayOffset[track.id] || 0) * 100}%`,
                            background: "#fff",
                            opacity: 0.9,
                            boxShadow: `0 0 6px ${track.color}`,
                            transition: "left 0.1s linear",
                          }} />
                      )}
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center" style={{ height: 42 }}>
                      <span className="text-xs" style={{ color: "#2a4050" }}>Пусто — нажми ● для записи</span>
                    </div>
                  )}
                  {isPlaying && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: track.color + "33" }}>
                      <div className="w-1.5 h-1.5 rounded-full recording-dot" style={{ background: track.color }} />
                      <span className="font-mono text-[10px]" style={{ color: track.color }}>PLAY</span>
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button className="flex-shrink-0 w-8 flex items-center justify-center transition-all"
                  style={{ color: "#2a4050" }}
                  onClick={e => { e.stopPropagation(); deleteTrack(track.id); }}
                  onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                  onMouseLeave={e => e.currentTarget.style.color = "#2a4050"}>
                  <Icon name="X" size={14} />
                </button>
              </div>

              {/* Volume slider row */}
              {isActive && (
                <div className="flex items-center gap-2 px-4 pb-2.5 pt-0.5" onClick={e => e.stopPropagation()}>
                  <Icon name="Volume1" size={12} style={{ color: "#2a4050", flexShrink: 0 }} />
                  <div className="flex-1 relative h-3 flex items-center">
                    <div className="w-full h-1 rounded-full" style={{ background: "#0d1e2c" }}>
                      <div className="h-full rounded-full" style={{ width: `${track.volume}%`, background: `linear-gradient(90deg, ${track.color}88, ${track.color})`, transition: "width 0.05s" }} />
                    </div>
                    <input
                      type="range" min={0} max={100} value={track.volume}
                      onChange={e => { e.stopPropagation(); setTrackVolume(track.id, +e.target.value); }}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                    />
                  </div>
                  <span className="font-mono text-[10px] w-6 text-right" style={{ color: "#4a6070" }}>{track.volume}</span>
                  <Icon name="Volume2" size={12} style={{ color: "#2a4050", flexShrink: 0 }} />
                </div>
              )}
            </div>
          );
        })}

        {/* Add track row */}
        <button
          className="w-full flex items-center justify-center py-5 transition-all"
          style={{ background: "transparent", border: "none" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,194,255,0.04)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          onClick={() => setShowAddSheet(true)}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#0d1e2c", border: "1px solid #1a3040" }}>
            <Icon name="Plus" size={20} style={{ color: "#00c2ff" }} />
          </div>
        </button>
      </div>

      {/* ── Bottom FX Bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5" style={{ background: "#0a1520", borderTop: "1px solid #0d1e2c" }}>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
          style={{ background: "#0d1e2c" }}
          onClick={() => setShowFx(activeTrackId)}
          onMouseEnter={e => e.currentTarget.style.background = "#132030"}
          onMouseLeave={e => e.currentTarget.style.background = "#0d1e2c"}>
          <Icon name="Mic" size={16} style={{ color: "#00c2ff" }} />
          <span className="text-xs font-bold" style={{ color: "#00c2ff" }}>+Fx</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
          style={{ background: "#0d1e2c" }}
          onClick={() => setShowAutoPitch(true)}
          onMouseEnter={e => e.currentTarget.style.background = "#132030"}
          onMouseLeave={e => e.currentTarget.style.background = "#0d1e2c"}>
          <Icon name="TrendingUp" size={16} style={{ color: "#ef4444" }} />
          <span className="text-xs font-bold" style={{ color: "#ef4444" }}>AutoPitch</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
          style={{ background: "#0d1e2c" }}
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={e => e.currentTarget.style.background = "#132030"}
          onMouseLeave={e => e.currentTarget.style.background = "#0d1e2c"}>
          <Icon name="Upload" size={16} style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>Импорт</span>
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleImport} />
      </div>

      {/* ── Transport Bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 pb-safe py-3" style={{ background: "#060d14", borderTop: "1px solid #0d1e2c" }}>
        <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#0d1e2c" }}
          onClick={() => { setPlaying(false); setPlayhead(0); }}>
          <Icon name="SkipBack" size={18} style={{ color: "#4a6070" }} />
        </button>

        <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#0d1e2c" }}
          onClick={() => setPlaying(false)}>
          <Icon name="Rewind" size={18} style={{ color: "#4a6070" }} />
        </button>

        {/* Big REC button */}
        <button
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
          style={{
            background: isRec ? "#ff1744" : isPaused ? "#ff6d00" : "#ef4444",
            boxShadow: isRec ? "0 0 0 4px rgba(255,23,68,0.25), 0 0 24px rgba(255,23,68,0.4)" : "none",
          }}
          onClick={handleRecord}
        >
          {isRec ? (
            <div className="w-6 h-6 rounded recording-dot" style={{ background: "#fff" }} />
          ) : isPaused ? (
            <Icon name="Play" size={24} style={{ color: "#fff" }} />
          ) : (
            <div className="w-6 h-6 rounded-full" style={{ background: "#fff" }} />
          )}
        </button>

        <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: isRec ? "rgba(0,194,255,0.1)" : "#0d1e2c", border: isRec ? "1px solid rgba(0,194,255,0.3)" : "none" }}
          onClick={() => setPlaying(v => !v)}>
          <Icon name={playing ? "Pause" : "Play"} size={18} style={{ color: playing ? "#00c2ff" : "#4a6070" }} />
        </button>

        <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#0d1e2c" }}>
          <Icon name="FastForward" size={18} style={{ color: "#4a6070" }} />
        </button>
      </div>

      {/* ── Error toast ── */}
      {recorder.error && (
        <div className="fixed bottom-24 left-4 right-4 z-50 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: "rgba(255,23,68,0.15)", border: "1px solid rgba(255,23,68,0.4)", backdropFilter: "blur(10px)" }}>
          <Icon name="AlertCircle" size={16} style={{ color: "#ff1744" }} />
          <span className="text-sm" style={{ color: "#ff6b6b" }}>{recorder.error}</span>
        </div>
      )}

      {/* ── Sheets / Modals ── */}
      {showAddSheet && <AddTrackSheet onClose={() => setShowAddSheet(false)} onAdd={addTrack} onImport={() => fileInputRef.current?.click()} />}
      {showFx !== null && (() => {
        const fxTrack = tracks.find(t => t.id === showFx);
        return (
          <FxSheet
            trackName={fxTrack?.name || "Дорожка"}
            trackUrl={fxTrack?.url}
            onClose={() => setShowFx(null)}
            onFxChange={(active, params) => showFx && handleFxChange(showFx, active, params)}
          />
        );
      })()}
      {showAutoPitch && <AutoPitchModal onClose={() => setShowAutoPitch(false)} />}
      {(showInstrument === "guitar") && <GuitarPanel type="guitar" onClose={() => setShowInstrument(null)} />}
      {(showInstrument === "bass") && <GuitarPanel type="bass" onClose={() => setShowInstrument(null)} />}
      {(showInstrument === "vst" || showInstrument === "looper") && <PianoPanel onClose={() => setShowInstrument(null)} />}
      {showInstrument === "drums" && <DrumPanel onClose={() => setShowInstrument(null)} />}
      {showInstrument === "sampler" && <SamplerPanel onClose={() => setShowInstrument(null)} onImport={() => fileInputRef.current?.click()} />}

      {/* ── Save Dialog ── */}
      {showSaveDialog && (
        <SaveDialog
          onSave={doSaveProject}
          onDiscard={() => { setShowSaveDialog(false); setEditingProjectId(null); setScreen("cabinet"); }}
          onContinue={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}