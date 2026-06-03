import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

/* ─── Types ─────────────────────────────────────────────── */
type RecordingState = "idle" | "recording" | "paused" | "done";

interface Track {
  id: number;
  name: string;
  color: string;
  icon: string;
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

const AddTrackSheet = ({ onClose, onAdd }: { onClose: () => void; onAdd: (type: string, name: string, color: string, icon: string) => void }) => (
  <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
    <div className="rounded-t-3xl overflow-hidden" style={{ background: "#0f1923", maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} />
      </div>
      <div className="flex items-center justify-between px-5 pb-4">
        <span className="text-xl font-bold" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif", letterSpacing: "0.03em" }}>
          Добавить дорожку
        </span>
        <button className="px-4 py-1.5 rounded-full font-bold text-sm" style={{ background: "#00c2ff", color: "#000" }}>
          Pro
        </button>
      </div>
      <div className="overflow-y-auto px-4 pb-6 space-y-1" style={{ maxHeight: "55vh" }}>
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
        <ImportButton icon="FileMusic" label="Импортировать" sub="Аудио, видео или файл" />
        <ImportButton icon="Music" label="Звонки & семплы" sub="Из телефона и библиотеки" />
      </div>
    </div>
  </div>
);

const ImportButton = ({ icon, label, sub }: { icon: string; label: string; sub: string }) => (
  <button className="flex items-center gap-3 p-3 rounded-2xl transition-all" style={{ background: "#141e28" }}
    onMouseEnter={e => e.currentTarget.style.background = "#1a2a38"}
    onMouseLeave={e => e.currentTarget.style.background = "#141e28"}>
    <Icon name={icon} size={20} style={{ color: "#00c2ff" }} />
    <div className="text-left">
      <div className="text-sm font-semibold" style={{ color: "#e2f4ff" }}>{label}</div>
      <div className="text-xs" style={{ color: "#4a6070" }}>{sub}</div>
    </div>
  </button>
);

/* ─── FX Sheet ───────────────────────────────────────────── */
const fxList = [
  { name: "Reverb", icon: "Waves", color: "#00c2ff" },
  { name: "Delay", icon: "Clock", color: "#7c3aed" },
  { name: "Компрессор", icon: "Activity", color: "#10b981" },
  { name: "EQ", icon: "BarChart2", color: "#f59e0b" },
  { name: "Chorus", icon: "Radio", color: "#ec4899" },
  { name: "AutoPitch", icon: "TrendingUp", color: "#ef4444" },
];

const FxSheet = ({ trackName, onClose }: { trackName: string; onClose: () => void }) => {
  const [active, setActive] = useState<string[]>(["Reverb"]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden" style={{ background: "#0f1923" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full" style={{ background: "#2a3540" }} /></div>
        <div className="px-5 pb-3 flex items-center justify-between">
          <span className="font-bold text-lg" style={{ color: "#e2f4ff", fontFamily: "Oswald, sans-serif" }}>
            +FX — {trackName}
          </span>
          <button onClick={onClose}><Icon name="X" size={20} style={{ color: "#4a6070" }} /></button>
        </div>
        <div className="grid grid-cols-3 gap-3 px-4 pb-8">
          {fxList.map(fx => {
            const on = active.includes(fx.name);
            return (
              <button key={fx.name} onClick={() => setActive(v => on ? v.filter(x => x !== fx.name) : [...v, fx.name])}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
                style={{ background: on ? fx.color + "22" : "#141e28", border: `1px solid ${on ? fx.color : "#1e2d3a"}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: on ? fx.color : "#1e2d3a" }}>
                  <Icon name={fx.icon} size={18} style={{ color: on ? "#fff" : "#4a6070" }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: on ? fx.color : "#7ab" }}>{fx.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const mr = new MediaRecorder(stream);
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
    } catch {
      setError("Нет доступа к микрофону");
      return null;
    }
  };

  const stop = (): Promise<{ url: string; duration: string; waveform: number[] }> =>
    new Promise(resolve => {
      if (!mediaRecorderRef.current) return;
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
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

/* ─── Main App ───────────────────────────────────────────── */
export default function Index() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showFx, setShowFx] = useState<number | null>(null);
  const [showAutoPitch, setShowAutoPitch] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<number | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);
  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});
  const counterRef = useRef(0);
  const playheadRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recorder = useRecorder();

  const activeTrack = tracks.find(t => t.id === activeTrackId);

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
      hasAudio: false,
      fx: [],
      muted: false,
      solo: false,
      volume: 80,
      waveform: Array.from({ length: 60 }, () => 0),
    };
    setTracks(prev => [...prev, newTrack]);
    setActiveTrackId(newTrack.id);
  };

  /* ─ start recording on active track ─ */
  const handleRecord = async () => {
    if (recorder.state === "idle" || recorder.state === "done") {
      if (!activeTrackId) {
        counterRef.current += 1;
        const id = counterRef.current;
        setTracks(prev => [...prev, { id, name: `Голос/Аудио ${id}`, color: "#ef4444", icon: "Mic", hasAudio: false, fx: [], muted: false, solo: false, volume: 80, waveform: Array.from({ length: 60 }, () => 0) }]);
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

  /* ─ play/pause track ─ */
  const togglePlayTrack = (track: Track) => {
    if (!track.url) return;
    if (playingTrackId === track.id) {
      audioRefs.current[track.id]?.pause();
      setPlayingTrackId(null);
    } else {
      Object.values(audioRefs.current).forEach(a => a.pause());
      if (!audioRefs.current[track.id]) {
        const audio = new Audio(track.url);
        audio.onended = () => setPlayingTrackId(null);
        audioRefs.current[track.id] = audio;
      }
      audioRefs.current[track.id].play();
      setPlayingTrackId(track.id);
    }
  };

  /* ─ import file ─ */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const waveform = Array.from({ length: 60 }, () => Math.random() * 80 + 15);
    counterRef.current += 1;
    const id = counterRef.current;
    setTracks(prev => [...prev, { id, name: file.name.replace(/\.[^.]+$/, ""), color: "#06b6d4", icon: "FileMusic", hasAudio: true, url, duration: "—", waveform, fx: [], muted: false, solo: false, volume: 80 }]);
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

  const isRec = recorder.state === "recording";
  const isPaused = recorder.state === "paused";

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none" style={{ background: "#080f16", color: "#e2f4ff", fontFamily: "IBM Plex Sans, sans-serif", maxWidth: 480, margin: "0 auto" }}>

      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-safe pb-2 pt-3" style={{ background: "#0a1520", borderBottom: "1px solid #0d1e2c" }}>
        <button className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "#0d1e2c" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "#4a6070" }} />
        </button>

        <div className="flex items-center gap-2">
          <img src="https://cdn.poehali.dev/projects/aa1808ba-e45f-437c-8925-20682e9a577e/files/3fa43031-b9e1-40e6-997b-435e174180c5.jpg"
            alt="logo" className="w-7 h-7 rounded-full object-cover" style={{ border: "1.5px solid #00c2ff" }} />
          <span className="font-bold text-base tracking-widest uppercase" style={{ fontFamily: "Oswald, sans-serif", color: "#e2f4ff" }}>
            Chebur<span style={{ color: "#00c2ff" }}>ek</span>Studio
          </span>
        </div>

        <button className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "#0d1e2c" }}>
          <Icon name="Upload" size={18} style={{ color: "#4a6070" }} />
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
                  <div className="flex items-center gap-1.5">
                    <button
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all"
                      style={{ background: "#0d1e2c", color: "#00c2ff", border: "1px solid #1a3040" }}
                      onClick={e => { e.stopPropagation(); setShowFx(track.id); }}
                    >
                      +Fx
                    </button>
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
                      className="flex items-end gap-[2px] w-full rounded-xl overflow-hidden cursor-pointer"
                      style={{ height: 42, background: track.color + "15", padding: "4px 6px" }}
                      onClick={e => { e.stopPropagation(); togglePlayTrack(track); }}
                    >
                      {track.waveform.map((v, i) => (
                        <div key={i} className="flex-1 rounded-sm"
                          style={{ height: `${v}%`, background: isPlaying ? track.color : track.color + "88", transition: "background 0.3s", boxShadow: isPlaying && v > 50 ? `0 0 3px ${track.color}` : "none" }} />
                      ))}
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
      {showAddSheet && <AddTrackSheet onClose={() => setShowAddSheet(false)} onAdd={addTrack} />}
      {showFx !== null && <FxSheet trackName={tracks.find(t => t.id === showFx)?.name || "Дорожка"} onClose={() => setShowFx(null)} />}
      {showAutoPitch && <AutoPitchModal onClose={() => setShowAutoPitch(false)} />}
    </div>
  );
}