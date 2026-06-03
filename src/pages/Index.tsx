import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const VUMeter = ({ levels }: { levels?: number[] }) => {
  const bars = [1, 2, 3, 4, 5, 6, 7, 8];
  const classes = [
    "vu-bar-1", "vu-bar-2", "vu-bar-3", "vu-bar-4",
    "vu-bar-5", "vu-bar-6", "vu-bar-7", "vu-bar-8"
  ];
  const colors = [
    "#00e676", "#00e676", "#00e676", "#00e676",
    "#00e676", "#69f0ae", "#ffeb3b", "#ff1744"
  ];
  return (
    <div className="flex items-end gap-[3px] h-14">
      {bars.map((_, i) => (
        <div key={i} className="w-2 rounded-sm" style={{ backgroundColor: colors[i] + "15", position: "relative", height: "100%" }}>
          <div
            className={`w-full rounded-sm absolute bottom-0 ${levels ? "" : classes[i]}`}
            style={{
              backgroundColor: colors[i],
              boxShadow: `0 0 6px ${colors[i]}80`,
              height: levels ? `${Math.min(100, levels[i] || 0)}%` : undefined,
              transition: levels ? "height 0.05s ease-out" : undefined,
            }}
          />
        </div>
      ))}
    </div>
  );
};

type RecordingState = "idle" | "recording" | "paused" | "done";

interface RecordingEntry {
  id: number;
  name: string;
  url: string;
  duration: string;
  size: string;
}

const RecorderPanel = () => {
  const [state, setState] = useState<RecordingState>("idle");
  const [recTime, setRecTime] = useState(0);
  const [vuLevels, setVuLevels] = useState<number[]>(new Array(8).fill(0));
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});
  const counterRef = useRef(0);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const formatBytes = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  const animateVU = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.floor(data.length / 8);
    const lvls = Array.from({ length: 8 }, (_, i) => {
      const slice = data.slice(i * step, (i + 1) * step);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      return (avg / 255) * 100;
    });
    setVuLevels(lvls);
    animFrameRef.current = requestAnimationFrame(animateVU);
  }, []);

  const startRecording = async () => {
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
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        counterRef.current += 1;
        setRecordings(prev => [...prev, {
          id: counterRef.current,
          name: `Запись ${counterRef.current}`,
          url,
          duration: formatTime(recTimeRef.current),
          size: formatBytes(blob.size),
        }]);
        setVuLevels(new Array(8).fill(0));
        cancelAnimationFrame(animFrameRef.current);
      };

      mr.start(100);
      setState("recording");
      setRecTime(0);
      recTimeRef.current = 0;
      timerRef.current = setInterval(() => {
        recTimeRef.current += 1;
        setRecTime(t => t + 1);
      }, 1000);
      animateVU();
    } catch {
      setError("Нет доступа к микрофону. Разреши доступ в браузере.");
    }
  };

  const recTimeRef = useRef(0);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setState("done");
    setRecTime(0);
  };

  const pauseResume = () => {
    if (state === "recording") {
      mediaRecorderRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      setVuLevels(new Array(8).fill(0));
      setState("paused");
    } else if (state === "paused") {
      mediaRecorderRef.current?.resume();
      timerRef.current = setInterval(() => {
        recTimeRef.current += 1;
        setRecTime(t => t + 1);
      }, 1000);
      animateVU();
      setState("recording");
    }
  };

  const togglePlay = (rec: RecordingEntry) => {
    if (playingId === rec.id) {
      audioRefs.current[rec.id]?.pause();
      setPlayingId(null);
    } else {
      Object.values(audioRefs.current).forEach(a => a.pause());
      if (!audioRefs.current[rec.id]) {
        const audio = new Audio(rec.url);
        audio.onended = () => setPlayingId(null);
        audioRefs.current[rec.id] = audio;
      }
      audioRefs.current[rec.id].play();
      setPlayingId(rec.id);
    }
  };

  const deleteRec = (id: number) => {
    audioRefs.current[id]?.pause();
    delete audioRefs.current[id];
    if (playingId === id) setPlayingId(null);
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  useEffect(() => () => {
    cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--daw-surface)", border: "1px solid var(--daw-border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: "var(--daw-surface2)", borderBottom: "1px solid var(--daw-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <span className="font-mono text-xs" style={{ color: "var(--daw-muted)" }}>trackstudio — session_01.trk</span>
        </div>
        <div className="flex items-center gap-2">
          {state === "recording" && (
            <div className="flex items-center gap-2">
              <div className="recording-dot w-2 h-2 rounded-full" style={{ background: "var(--daw-red)" }} />
              <span className="font-mono text-xs" style={{ color: "var(--daw-red)" }}>REC {formatTime(recTime)}</span>
            </div>
          )}
          {state === "paused" && (
            <span className="font-mono text-xs" style={{ color: "var(--daw-orange)" }}>ПАУЗА {formatTime(recTime)}</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--daw-border)" }}>
        {state === "idle" || state === "done" ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-300 font-plex"
            style={{ background: "var(--daw-red)", color: "#fff", fontSize: "0.85rem" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 20px rgba(255,23,68,0.4)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
          >
            <div className="w-3 h-3 rounded-full bg-white" />
            Начать запись
          </button>
        ) : (
          <>
            <button
              onClick={stopRecording}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
              style={{ background: "var(--daw-surface2)", border: "1px solid var(--daw-border)" }}
            >
              <Icon name="Square" size={14} style={{ color: "var(--daw-muted)" }} />
            </button>
            <button
              onClick={pauseResume}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
              style={{ background: state === "paused" ? "var(--daw-cyan)" : "var(--daw-surface2)", border: `1px solid ${state === "paused" ? "var(--daw-cyan)" : "var(--daw-border)"}` }}
            >
              <Icon name={state === "paused" ? "Play" : "Pause"} size={16} style={{ color: state === "paused" ? "var(--daw-bg)" : "var(--daw-muted)" }} />
            </button>
          </>
        )}

        <div className="flex-1 flex items-end gap-[3px] h-10 mx-2">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-full transition-all"
              style={{
                height: state === "recording" ? `${Math.min(100, (vuLevels[i % 8] || 0) * (0.5 + Math.random() * 0.5))}%` : "15%",
                background: state === "recording"
                  ? `linear-gradient(180deg, var(--daw-cyan) 0%, rgba(0,229,255,0.3) 100%)`
                  : "var(--daw-border)",
                transition: "height 0.05s ease-out",
              }}
            />
          ))}
        </div>

        <VUMeter levels={state === "recording" ? vuLevels : undefined} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-4 px-4 py-3 rounded-lg flex items-center gap-2" style={{ background: "rgba(255,23,68,0.1)", border: "1px solid rgba(255,23,68,0.3)" }}>
          <Icon name="AlertCircle" size={14} style={{ color: "var(--daw-red)" }} />
          <span className="text-sm" style={{ color: "var(--daw-red)" }}>{error}</span>
        </div>
      )}

      {/* Recordings list */}
      <div className="p-5 space-y-2">
        {recordings.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="Mic" size={28} style={{ color: "var(--daw-border)", margin: "0 auto 8px" }} />
            <p className="text-sm" style={{ color: "var(--daw-muted)" }}>Нет записей. Нажми «Начать запись»</p>
          </div>
        ) : recordings.map(rec => (
          <div key={rec.id} className="flex items-center gap-3 p-3 rounded-lg transition-all"
            style={{ background: "var(--daw-surface2)", border: "1px solid var(--daw-border)" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--daw-border)"}
          >
            <button
              onClick={() => togglePlay(rec)}
              className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center transition-all"
              style={{ background: playingId === rec.id ? "var(--daw-cyan)" : "var(--daw-bg)", border: `1px solid ${playingId === rec.id ? "var(--daw-cyan)" : "var(--daw-border)"}` }}
            >
              <Icon name={playingId === rec.id ? "Pause" : "Play"} size={14} style={{ color: playingId === rec.id ? "var(--daw-bg)" : "var(--daw-muted)" }} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm truncate" style={{ color: "var(--daw-text)" }}>{rec.name}</div>
              <div className="flex gap-3 mt-0.5">
                <span className="font-mono text-xs" style={{ color: "var(--daw-muted)" }}>{rec.duration}</span>
                <span className="font-mono text-xs" style={{ color: "var(--daw-muted)" }}>{rec.size}</span>
              </div>
            </div>
            <a
              href={rec.url}
              download={`${rec.name}.webm`}
              className="w-8 h-8 rounded flex items-center justify-center transition-all"
              style={{ color: "var(--daw-muted)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--daw-cyan)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--daw-muted)"}
            >
              <Icon name="Download" size={14} />
            </a>
            <button
              onClick={() => deleteRec(rec.id)}
              className="w-8 h-8 rounded flex items-center justify-center transition-all"
              style={{ color: "var(--daw-muted)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--daw-red)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--daw-muted)"}
            >
              <Icon name="Trash2" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const KnobControl = ({ label, value, color = "#00e5ff" }: { label: string; value: number; color?: string }) => {
  const [val, setVal] = useState(value);
  const angle = -135 + val * 270;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-12 h-12 rounded-full cursor-pointer select-none"
        style={{ background: `var(--daw-surface2)`, border: `2px solid var(--daw-border)` }}
        onClick={() => setVal(v => v >= 1 ? 0 : Math.min(1, v + 0.1))}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="var(--daw-border)" strokeWidth="3" strokeLinecap="round"
            strokeDasharray="94 125" strokeDashoffset="-16" />
          <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${val * 94} 125`} strokeDashoffset="-16"
            style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray 0.2s' }} />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color, marginTop: "2px" }} />
        </div>
      </div>
      <span className="text-xs font-mono uppercase" style={{ color: "var(--daw-muted)", letterSpacing: "0.08em" }}>{label}</span>
    </div>
  );
};

const EffectCard = ({
  title, description, icon, delay, active
}: { title: string; description: string; icon: string; delay: string; active?: boolean }) => {
  const [on, setOn] = useState(active || false);
  return (
    <div
      className={`relative rounded-xl p-5 cursor-pointer transition-all duration-300 fade-up-${delay}`}
      style={{
        background: on ? "linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,229,255,0.03))" : "var(--daw-surface)",
        border: `1px solid ${on ? "rgba(0,229,255,0.35)" : "var(--daw-border)"}`,
        boxShadow: on ? "0 0 24px rgba(0,229,255,0.1)" : "none",
      }}
      onClick={() => setOn(v => !v)}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: on ? "rgba(0,229,255,0.15)" : "var(--daw-surface2)",
            border: `1px solid ${on ? "rgba(0,229,255,0.4)" : "var(--daw-border)"}`,
          }}
        >
          <Icon name={icon} fallback="Zap" size={18} style={{ color: on ? "var(--daw-cyan)" : "var(--daw-muted)" }} />
        </div>
        <div
          className="w-8 h-4 rounded-full transition-all duration-300 relative"
          style={{ background: on ? "var(--daw-cyan)" : "var(--daw-border)" }}
        >
          <div
            className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300"
            style={{
              background: on ? "var(--daw-bg)" : "var(--daw-muted)",
              left: on ? "calc(100% - 14px)" : "2px"
            }}
          />
        </div>
      </div>
      <h3 className="font-oswald text-base font-medium mb-1.5" style={{ color: on ? "var(--daw-cyan)" : "var(--daw-text)", letterSpacing: "0.04em" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--daw-muted)" }}>{description}</p>
      {on && (
        <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: "1px solid rgba(0,229,255,0.1)" }}>
          <KnobControl label="Mix" value={0.7} />
          <KnobControl label="Depth" value={0.5} />
          <KnobControl label="Rate" value={0.4} />
        </div>
      )}
    </div>
  );
};


export default function Index() {
  const features = [
    { icon: "Waves", title: "Reverb", description: "Зальный, пластинчатый и spring-реверб с управлением затуханием и pre-delay", active: true },
    { icon: "Clock", title: "Delay", description: "Синхронизированный с BPM delay: stereo, ping-pong и tape-echo режимы", active: false },
    { icon: "Activity", title: "Компрессор", description: "Прозрачная компрессия с контролем threshold, ratio, attack и release", active: true },
    { icon: "Zap", title: "EQ", description: "4-полосный параметрический эквалайзер для точной обработки частот", active: false },
    { icon: "Radio", title: "Chorus", description: "Пространственный хорус и фленджер для объёмного звучания", active: false },
    { icon: "TrendingUp", title: "Лимитер", description: "Финальный brickwall лимитер для громкости мастера без клипинга", active: false },
  ];

  return (
    <div className="min-h-screen noise-overlay" style={{ background: "var(--daw-bg)", color: "var(--daw-text)" }}>

      {/* Header / Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(13,15,18,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--daw-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded flex items-center justify-center"
            style={{ background: "var(--daw-cyan)", boxShadow: "0 0 12px rgba(0,229,255,0.5)" }}>
            <Icon name="Mic2" size={14} style={{ color: "var(--daw-bg)" }} />
          </div>
          <span className="font-oswald font-semibold text-lg tracking-widest uppercase" style={{ color: "var(--daw-text)" }}>
            Track<span style={{ color: "var(--daw-cyan)" }}>Studio</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {["Главная", "Функции", "О нас"].map(n => (
            <a key={n} href="#" className="text-sm uppercase tracking-widest transition-colors duration-200 font-plex"
              style={{ color: "var(--daw-muted)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--daw-cyan)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--daw-muted)")}>
              {n}
            </a>
          ))}
        </nav>
        <button
          className="px-4 py-1.5 rounded text-sm font-medium uppercase tracking-widest transition-all duration-200 font-plex"
          style={{ background: "var(--daw-cyan)", color: "var(--daw-bg)", fontSize: "0.75rem", letterSpacing: "0.1em" }}
          onMouseEnter={e => { (e.currentTarget.style.boxShadow = "0 0 16px rgba(0,229,255,0.5)"); }}
          onMouseLeave={e => { (e.currentTarget.style.boxShadow = "none"); }}
        >
          Открыть студию
        </button>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-6 grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-5"
            style={{ background: "radial-gradient(circle, var(--daw-cyan) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-5"
            style={{ background: "radial-gradient(circle, #00e676 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="fade-up-1 flex items-center gap-3 mb-6">
            <div className="recording-dot w-2.5 h-2.5 rounded-full" style={{ background: "var(--daw-red)", boxShadow: "0 0 8px var(--daw-red)" }} />
            <span className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--daw-muted)" }}>
              REC • Мобильная студия записи
            </span>
          </div>

          <h1 className="fade-up-2 font-oswald font-bold leading-none mb-6"
            style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)", color: "var(--daw-text)", letterSpacing: "-0.01em" }}>
            ЗАПИСЫВАЙ<br />
            <span style={{ color: "var(--daw-cyan)", textShadow: "0 0 40px rgba(0,229,255,0.3)" }}>ТРЕКИ</span>{" "}
            <span style={{ WebkitTextStroke: "1px var(--daw-muted)", color: "transparent" }}>ВЕЗДЕ</span>
          </h1>

          <p className="fade-up-3 max-w-lg text-lg leading-relaxed mb-10 font-plex"
            style={{ color: "var(--daw-muted)", fontWeight: 300 }}>
            Профессиональная студия в твоём телефоне. Reverb, Delay, Компрессор —
            звучи как в настоящей студии.
          </p>

          <div className="fade-up-4 flex flex-wrap gap-4">
            <button
              onClick={() => document.getElementById("recorder")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-medium transition-all duration-300 font-plex"
              style={{ background: "var(--daw-red)", color: "#fff", fontSize: "0.9rem" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 32px rgba(255,23,68,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div className="w-3 h-3 rounded-full bg-white recording-dot" />
              Начать запись
            </button>
            <button
              className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-medium transition-all duration-300 font-plex"
              style={{ background: "transparent", color: "var(--daw-text)", fontSize: "0.9rem", border: "1px solid var(--daw-border)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--daw-cyan)"; e.currentTarget.style.color = "var(--daw-cyan)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--daw-border)"; e.currentTarget.style.color = "var(--daw-text)"; }}
            >
              <Icon name="Headphones" size={16} />
              Демо-трек
            </button>
          </div>
        </div>
      </section>

      {/* Recorder */}
      <section className="px-6 py-12" id="recorder">
        <div className="max-w-5xl mx-auto fade-up-3">
          <div className="text-center mb-8">
            <span className="font-mono text-xs uppercase tracking-widest px-3 py-1 rounded-full" style={{ color: "var(--daw-red)", background: "rgba(255,23,68,0.08)", border: "1px solid rgba(255,23,68,0.2)" }}>
              Live Recording
            </span>
            <h2 className="font-oswald font-bold mt-4" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", color: "var(--daw-text)" }}>
              СТУДИЯ <span style={{ color: "var(--daw-cyan)" }}>В БРАУЗЕРЕ</span>
            </h2>
          </div>
          <RecorderPanel />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 fade-up-1">
            <span className="font-mono text-xs uppercase tracking-widest px-3 py-1 rounded-full" style={{ color: "var(--daw-cyan)", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)" }}>
              Эффекты обработки
            </span>
            <h2 className="font-oswald font-bold mt-4 mb-3" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "var(--daw-text)", letterSpacing: "0.02em" }}>
              ПРОФЕССИОНАЛЬНЫЙ<br />
              <span style={{ color: "var(--daw-cyan)" }}>ЗВУК</span> В ТВОИХ РУКАХ
            </h2>
            <p className="max-w-md mx-auto" style={{ color: "var(--daw-muted)", fontWeight: 300 }}>
              Нажми на карточку эффекта — настрой звучание прямо здесь
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <EffectCard key={i} {...f} delay={String(i + 1)} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16" style={{ background: "var(--daw-surface)", borderTop: "1px solid var(--daw-border)", borderBottom: "1px solid var(--daw-border)" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: "48", unit: "kHz", label: "Частота дискретизации" },
            { num: "32", unit: "bit", label: "Глубина записи" },
            { num: "6", unit: "FX", label: "Встроенных эффектов" },
            { num: "∞", unit: "TRK", label: "Треков в проекте" },
          ].map((s, i) => (
            <div key={i} className={`fade-up-${i + 1}`}>
              <div className="font-oswald font-bold" style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", color: "var(--daw-cyan)", lineHeight: 1, textShadow: "0 0 20px rgba(0,229,255,0.3)" }}>
                {s.num}<span className="text-2xl ml-1" style={{ color: "var(--daw-muted)" }}>{s.unit}</span>
              </div>
              <div className="mt-2 text-sm font-plex" style={{ color: "var(--daw-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(ellipse, var(--daw-cyan) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-2xl mx-auto relative">
          <h2 className="font-oswald font-bold mb-6 fade-up-1" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "var(--daw-text)", letterSpacing: "0.02em" }}>
            НАЧНИ ЗАПИСЫВАТЬ<br />
            <span style={{ color: "var(--daw-cyan)", textShadow: "0 0 30px rgba(0,229,255,0.3)" }}>ПРЯМО СЕЙЧАС</span>
          </h2>
          <p className="text-lg mb-10 fade-up-2 font-plex" style={{ color: "var(--daw-muted)", fontWeight: 300 }}>
            Бесплатно. Без ограничений по времени. Работает в браузере.
          </p>
          <button
            className="fade-up-3 inline-flex items-center gap-3 px-10 py-4 rounded-xl font-medium text-lg transition-all duration-300 font-plex"
            style={{ background: "var(--daw-cyan)", color: "var(--daw-bg)" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 48px rgba(0,229,255,0.4)"; e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0) scale(1)"; }}
          >
            <Icon name="Mic" size={20} style={{ color: "var(--daw-bg)" }} />
            Открыть студию бесплатно
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center" style={{ borderTop: "1px solid var(--daw-border)" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "var(--daw-cyan)" }}>
            <Icon name="Mic2" size={10} style={{ color: "var(--daw-bg)" }} />
          </div>
          <span className="font-oswald font-semibold tracking-widest uppercase text-sm" style={{ color: "var(--daw-text)" }}>
            Track<span style={{ color: "var(--daw-cyan)" }}>Studio</span>
          </span>
        </div>
        <p className="text-xs font-mono" style={{ color: "var(--daw-muted)" }}>
          © 2026 TrackStudio · Профессиональная запись в твоём телефоне
        </p>
      </footer>
    </div>
  );
}