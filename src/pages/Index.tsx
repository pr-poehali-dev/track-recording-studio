import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const VUMeter = () => {
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
            className={`w-full rounded-sm absolute bottom-0 ${classes[i]}`}
            style={{ backgroundColor: colors[i], boxShadow: `0 0 6px ${colors[i]}80` }}
          />
        </div>
      ))}
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

const WaveformVisualizer = () => {
  const bars = Array.from({ length: 48 }, (_, i) => ({
    h: Math.random() * 60 + 10,
    delay: `${(i * 0.04).toFixed(2)}s`,
  }));
  return (
    <div className="flex items-center gap-[3px] h-20 px-4">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${bar.h}%`,
            background: i < 20
              ? `linear-gradient(180deg, var(--daw-cyan) 0%, rgba(0,229,255,0.2) 100%)`
              : "var(--daw-border)",
            animation: i < 20 ? `waveform ${0.8 + Math.random() * 0.8}s ease-in-out ${bar.delay} infinite` : "none",
            transformOrigin: "bottom",
          }}
        />
      ))}
    </div>
  );
};

export default function Index() {
  const [time, setTime] = useState("00:00.000");
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(128);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setSeconds(s => {
          const ns = s + 0.1;
          const min = Math.floor(ns / 60);
          const sec = Math.floor(ns % 60);
          const ms = Math.floor((ns % 1) * 1000);
          setTime(`${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`);
          return ns;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleStop = () => { setIsPlaying(false); setSeconds(0); setTime("00:00.000"); };

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
              className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-medium transition-all duration-300 font-plex"
              style={{ background: "var(--daw-cyan)", color: "var(--daw-bg)", fontSize: "0.9rem" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 32px rgba(0,229,255,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Icon name="Play" size={16} style={{ color: "var(--daw-bg)" }} />
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

      {/* DAW Interface Preview */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto fade-up-3">
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--daw-surface)", border: "1px solid var(--daw-border)" }}>
            {/* DAW Top Bar */}
            <div className="flex items-center justify-between px-5 py-3" style={{ background: "var(--daw-surface2)", borderBottom: "1px solid var(--daw-border)" }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
                </div>
                <span className="font-mono text-xs" style={{ color: "var(--daw-muted)" }}>trackstudio — session_01.trk</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="font-mono text-sm px-3 py-1 rounded" style={{ background: "var(--daw-bg)", color: "var(--daw-cyan)", border: "1px solid var(--daw-border)" }}>
                  {time}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs" style={{ color: "var(--daw-muted)" }}>BPM</span>
                  <button onClick={() => setBpm(b => Math.max(60, b - 1))} className="w-5 h-5 text-xs rounded flex items-center justify-center" style={{ background: "var(--daw-border)", color: "var(--daw-text)" }}>−</button>
                  <span className="font-mono text-sm font-medium w-8 text-center" style={{ color: "var(--daw-text)" }}>{bpm}</span>
                  <button onClick={() => setBpm(b => Math.min(200, b + 1))} className="w-5 h-5 text-xs rounded flex items-center justify-center" style={{ background: "var(--daw-border)", color: "var(--daw-text)" }}>+</button>
                </div>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--daw-border)" }}>
              <button onClick={handleStop} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                style={{ background: "var(--daw-surface2)", border: "1px solid var(--daw-border)" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--daw-muted)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--daw-border)"}>
                <Icon name="Square" size={14} style={{ color: "var(--daw-muted)" }} />
              </button>
              <button onClick={() => setIsPlaying(v => !v)}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all glow-cyan"
                style={{ background: "var(--daw-cyan)", border: "none" }}>
                <Icon name={isPlaying ? "Pause" : "Play"} size={18} style={{ color: "var(--daw-bg)" }} />
              </button>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                style={{ background: isPlaying ? "rgba(255,23,68,0.15)" : "var(--daw-surface2)", border: `1px solid ${isPlaying ? "var(--daw-red)" : "var(--daw-border)"}` }}>
                <div className={`w-3 h-3 rounded-full ${isPlaying ? "recording-dot" : ""}`}
                  style={{ background: isPlaying ? "var(--daw-red)" : "var(--daw-muted)", boxShadow: isPlaying ? "0 0 8px var(--daw-red)" : "none" }} />
              </button>
              <div className="flex-1 ml-2">
                <WaveformVisualizer />
              </div>
              <VUMeter />
            </div>

            {/* Tracks */}
            <div className="p-5 space-y-3">
              {[
                { name: "Вокал", color: "#00e5ff", vol: 85 },
                { name: "Гитара", color: "#00e676", vol: 70 },
                { name: "Барабаны", color: "#ff6d00", vol: 92 },
              ].map((track, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: "var(--daw-surface2)", border: "1px solid var(--daw-border)" }}>
                  <div className="w-20 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: track.color, boxShadow: `0 0 6px ${track.color}` }} />
                    <span className="font-mono text-xs truncate" style={{ color: "var(--daw-text)" }}>{track.name}</span>
                  </div>
                  <div className="flex-1 h-8 rounded overflow-hidden" style={{ background: "var(--daw-bg)" }}>
                    <div className="h-full rounded transition-all" style={{
                      width: `${track.vol}%`,
                      background: `linear-gradient(90deg, ${track.color}40, ${track.color}80)`,
                      borderRight: `2px solid ${track.color}`,
                    }}>
                      <div className="h-full opacity-20" style={{
                        backgroundImage: `repeating-linear-gradient(90deg, ${track.color} 0px, ${track.color} 1px, transparent 1px, transparent 8px)`
                      }} />
                    </div>
                  </div>
                  <span className="font-mono text-xs w-8 text-right" style={{ color: "var(--daw-muted)" }}>{track.vol}%</span>
                </div>
              ))}
            </div>
          </div>
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