import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";

export interface Project {
  id: number;
  name: string;
  coverColor: string;
  createdAt: string;
  duration: string;
  trackCount: number;
  audioUrl?: string;
  mimeType?: string;
  waveform?: number[];
}

interface UserProfile {
  nick: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
}

interface CabinetProps {
  projects: Project[];
  onNewProject: () => void;
  onOpenProject: (id: number) => void;
  onDeleteProject: (id: number) => void;
  onRenameProject: (id: number, name: string) => void;
}

const PROJECT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function Cabinet({
  projects, onNewProject, onOpenProject, onDeleteProject, onRenameProject,
}: CabinetProps) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const s = localStorage.getItem("cheburek_profile");
      return s ? JSON.parse(s) : {
        nick: "Artist",
        bio: "Записываю треки в CheburekStudio 🎤",
        avatarUrl: "https://cdn.poehali.dev/projects/aa1808ba-e45f-437c-8925-20682e9a577e/files/3fa43031-b9e1-40e6-997b-435e174180c5.jpg",
        coverUrl: "",
      };
    } catch { return { nick: "Artist", bio: "", avatarUrl: "", coverUrl: "" }; }
  });

  const [editingProfile, setEditingProfile] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const saveProfile = () => {
    setProfile(draft);
    localStorage.setItem("cheburek_profile", JSON.stringify(draft));
    setEditingProfile(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setDraft(d => ({ ...d, avatarUrl: URL.createObjectURL(file) }));
    e.target.value = "";
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setDraft(d => ({ ...d, coverUrl: URL.createObjectURL(file) }));
    e.target.value = "";
  };

  const togglePlay = (p: Project) => {
    if (!p.audioUrl) return;
    if (playingId === p.id) {
      audioRef.current?.pause(); setPlayingId(null); return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    const audio = new Audio(p.audioUrl);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(p.id);
  };

  const downloadProject = (p: Project) => {
    if (!p.audioUrl) return;
    const ext = p.mimeType?.includes("mp4") ? "m4a" : "webm";
    const safe = p.name.replace(/[^\wа-яёА-ЯЁ\- ]/gi, "").trim() || "track";
    const a = document.createElement("a");
    a.href = p.audioUrl; a.download = `${safe}.${ext}`; a.click();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080f16", color: "#e2f4ff", fontFamily: "IBM Plex Sans, sans-serif", maxWidth: 480, margin: "0 auto" }}>

      {/* ── Cover ── */}
      <div className="relative flex-shrink-0" style={{ height: 160 }}>
        <div className="absolute inset-0" style={{
          background: profile.coverUrl
            ? `url(${profile.coverUrl}) center/cover`
            : "linear-gradient(135deg, #0a1825 0%, #0d2035 60%, #06111e 100%)",
        }}>
          <div className="absolute inset-0" style={{ background: "rgba(8,15,22,0.45)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,194,255,0.025) 0px, rgba(0,194,255,0.025) 1px, transparent 1px, transparent 4px)",
          }} />
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button onClick={() => coverInputRef.current?.click()}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(8,15,22,0.7)", border: "1px solid #1a3040" }}>
            <Icon name="Image" size={14} style={{ color: "#00c2ff" }} />
          </button>
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

        {/* Avatar */}
        <div className="absolute bottom-0 left-5 translate-y-1/2 z-10">
          <div className="relative">
            <img
              src={profile.avatarUrl || "https://cdn.poehali.dev/projects/aa1808ba-e45f-437c-8925-20682e9a577e/files/3fa43031-b9e1-40e6-997b-435e174180c5.jpg"}
              alt="avatar" className="w-18 h-18 rounded-2xl object-cover"
              style={{ width: 72, height: 72, border: "3px solid #080f16", boxShadow: "0 0 20px rgba(0,194,255,0.25)" }}
            />
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "#00c2ff" }}
              onClick={() => avatarInputRef.current?.click()}>
              <Icon name="Camera" size={11} style={{ color: "#000" }} />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>
      </div>

      {/* ── Profile info ── */}
      <div className="px-5 pt-12 pb-4" style={{ borderBottom: "1px solid #0d1e2c" }}>
        {editingProfile ? (
          <div className="space-y-3">
            <input value={draft.nick} onChange={e => setDraft(d => ({ ...d, nick: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "#0d1e2c", border: "1px solid #00c2ff55", color: "#e2f4ff" }} placeholder="Никнейм" />
            <textarea value={draft.bio} onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
              rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: "#0d1e2c", border: "1px solid #1e3040", color: "#e2f4ff" }} placeholder="О себе..." />
            <div className="flex gap-2">
              <button onClick={saveProfile} className="flex-1 py-2.5 rounded-xl font-bold text-sm" style={{ background: "#00c2ff", color: "#000" }}>Сохранить</button>
              <button onClick={() => { setEditingProfile(false); setDraft(profile); }} className="px-4 py-2.5 rounded-xl text-sm" style={{ background: "#0d1e2c", color: "#7ab" }}>Отмена</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-xl" style={{ fontFamily: "Oswald, sans-serif", color: "#e2f4ff" }}>{profile.nick}</div>
              {profile.bio && <div className="text-sm mt-0.5" style={{ color: "#4a6070" }}>{profile.bio}</div>}
              <div className="mt-1.5 font-mono text-xs" style={{ color: "#00c2ff" }}>
                {projects.length} {projects.length === 1 ? "проект" : projects.length < 5 ? "проекта" : "проектов"}
              </div>
            </div>
            <button onClick={() => { setDraft(profile); setEditingProfile(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: "#0d1e2c", color: "#00c2ff", border: "1px solid #1a3040" }}>
              <Icon name="Pencil" size={13} /> Изменить
            </button>
          </div>
        )}
      </div>

      {/* ── Projects list ── */}
      <div className="flex-1 px-4 py-4 pb-32">
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-sm uppercase tracking-widest" style={{ fontFamily: "Oswald, sans-serif", color: "#2a4050" }}>
            Мои треки
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <img src="https://cdn.poehali.dev/projects/aa1808ba-e45f-437c-8925-20682e9a577e/files/3fa43031-b9e1-40e6-997b-435e174180c5.jpg"
              alt="logo" className="w-20 h-20 rounded-2xl object-cover opacity-40" />
            <p className="text-sm text-center" style={{ color: "#1e3040" }}>
              Нажми <span style={{ color: "#00c2ff" }}>+</span> внизу,<br />чтобы записать первый трек
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p, idx) => (
              <div key={p.id} className="rounded-2xl overflow-hidden transition-all"
                style={{ background: "#0a1520", border: "1px solid #0d1e2c" }}>
                {/* Color stripe */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${p.coverColor}, ${p.coverColor}44)` }} />

                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Number */}
                  <span className="font-mono text-xs w-5 text-center flex-shrink-0" style={{ color: "#1e3040" }}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  {/* Cover square */}
                  <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${p.coverColor}33, ${p.coverColor}11)`, border: `1.5px solid ${p.coverColor}44` }}>
                    <Icon name="Music2" size={18} style={{ color: p.coverColor }} />
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0" onClick={() => onOpenProject(p.id)} style={{ cursor: "pointer" }}>
                    {renamingId === p.id ? (
                      <input autoFocus value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onBlur={() => { if (renameVal.trim()) onRenameProject(p.id, renameVal.trim()); setRenamingId(null); }}
                        onKeyDown={e => { if (e.key === "Enter") { if (renameVal.trim()) onRenameProject(p.id, renameVal.trim()); setRenamingId(null); } if (e.key === "Escape") setRenamingId(null); }}
                        onClick={e => e.stopPropagation()}
                        className="w-full px-2 py-1 rounded-lg text-sm outline-none"
                        style={{ background: "#0d1e2c", border: `1px solid ${p.coverColor}66`, color: "#e2f4ff" }}
                      />
                    ) : (
                      <>
                        <div className="font-semibold text-sm truncate" style={{ color: "#e2f4ff" }}
                          onDoubleClick={e => { e.stopPropagation(); setRenamingId(p.id); setRenameVal(p.name); }}>
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: "#2a4050" }}>{p.duration}</span>
                          <span className="text-xs" style={{ color: "#1e3040" }}>·</span>
                          <span className="text-xs" style={{ color: "#2a4050" }}>{p.trackCount} {p.trackCount === 1 ? "дорожка" : "дорожки"}</span>
                          <span className="text-xs" style={{ color: "#1e3040" }}>·</span>
                          <span className="text-xs" style={{ color: "#2a4050" }}>{p.createdAt}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {p.audioUrl && (
                      <button onClick={() => togglePlay(p)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        style={{ background: playingId === p.id ? p.coverColor : p.coverColor + "22", border: `1.5px solid ${p.coverColor}` }}>
                        <Icon name={playingId === p.id ? "Pause" : "Play"} size={13} style={{ color: playingId === p.id ? "#fff" : p.coverColor }} />
                      </button>
                    )}
                    {p.audioUrl && (
                      <button onClick={() => downloadProject(p)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        style={{ color: "#2a4050" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#00c2ff"}
                        onMouseLeave={e => e.currentTarget.style.color = "#2a4050"}>
                        <Icon name="Download" size={14} />
                      </button>
                    )}
                    <button onClick={() => { setRenamingId(p.id); setRenameVal(p.name); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{ color: "#2a4050" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#00c2ff"}
                      onMouseLeave={e => e.currentTarget.style.color = "#2a4050"}>
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button onClick={() => onDeleteProject(p.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{ color: "#2a4050" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={e => e.currentTarget.style.color = "#2a4050"}>
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>

                {/* Mini waveform if has audio */}
                {p.audioUrl && p.waveform && (
                  <div className="flex items-end gap-[1px] px-4 pb-2.5" style={{ height: 28 }}>
                    {p.waveform.slice(0, 80).map((v, i) => (
                      <div key={i} className="flex-1 rounded-sm"
                        style={{ height: `${v}%`, background: playingId === p.id ? p.coverColor : p.coverColor + "55" }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Floating + button ── */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50" style={{ maxWidth: 480, width: "100%" }}>
        <div className="flex justify-center">
          <button
            onClick={onNewProject}
            className="flex items-center gap-3 px-8 py-4 rounded-full font-bold text-base transition-all"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#fff",
              boxShadow: "0 4px 24px rgba(239,68,68,0.4), 0 0 0 4px rgba(239,68,68,0.15)",
              fontFamily: "Oswald, sans-serif",
              letterSpacing: "0.08em",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 32px rgba(239,68,68,0.6), 0 0 0 6px rgba(239,68,68,0.2)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 4px 24px rgba(239,68,68,0.4), 0 0 0 4px rgba(239,68,68,0.15)"}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.25)" }}>
              <Icon name="Plus" size={16} style={{ color: "#fff" }} />
            </div>
            НОВЫЙ ТРЕК
          </button>
        </div>
      </div>
    </div>
  );
}

export { PROJECT_COLORS };
