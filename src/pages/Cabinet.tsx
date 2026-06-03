import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";

interface SavedTrack {
  id: number;
  name: string;
  url: string;
  duration: string;
  color: string;
  mimeType: string;
  savedAt: string;
}

interface UserProfile {
  nick: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
}

interface CabinetProps {
  tracks: SavedTrack[];
  onBack: () => void;
  onDeleteTrack: (id: number) => void;
  onRenameTrack: (id: number, name: string) => void;
}

export default function Cabinet({ tracks, onBack, onDeleteTrack, onRenameTrack }: CabinetProps) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem("cheburek_profile");
      return saved ? JSON.parse(saved) : {
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
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDraft(d => ({ ...d, avatarUrl: url }));
    e.target.value = "";
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setDraft(d => ({ ...d, coverUrl: url }));
    e.target.value = "";
  };

  const togglePlay = (track: SavedTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      const audio = new Audio(track.url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(track.id);
    }
  };

  const downloadTrack = (track: SavedTrack) => {
    const ext = track.mimeType.includes("mp4") ? "m4a" : track.mimeType.includes("ogg") ? "ogg" : "webm";
    const safeName = track.name.replace(/[^а-яёА-ЯЁa-zA-Z0-9_\- ]/g, "").trim() || "track";
    const a = document.createElement("a");
    a.href = track.url;
    a.download = `${safeName}.${ext}`;
    a.click();
  };

  const commitRename = (id: number) => {
    if (renameVal.trim()) onRenameTrack(id, renameVal.trim());
    setRenamingId(null);
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#080f16", color: "#e2f4ff", fontFamily: "IBM Plex Sans, sans-serif", maxWidth: 480, margin: "0 auto" }}>

      {/* ── Cover ── */}
      <div className="relative flex-shrink-0" style={{ height: 180 }}>
        {/* Cover bg */}
        <div className="absolute inset-0" style={{
          background: profile.coverUrl
            ? `url(${profile.coverUrl}) center/cover`
            : "linear-gradient(135deg, #0a1520 0%, #0d1e35 50%, #081525 100%)",
          backgroundSize: "cover",
        }}>
          <div className="absolute inset-0" style={{ background: "rgba(8,15,22,0.4)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,194,255,0.02) 0px, rgba(0,194,255,0.02) 1px, transparent 1px, transparent 4px)",
          }} />
        </div>

        {/* Back button */}
        <button className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(8,15,22,0.7)", border: "1px solid #1a3040", backdropFilter: "blur(8px)" }}
          onClick={onBack}>
          <Icon name="ChevronLeft" size={20} style={{ color: "#e2f4ff" }} />
        </button>

        {/* Edit cover */}
        <button className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(8,15,22,0.7)", border: "1px solid #1a3040", backdropFilter: "blur(8px)" }}
          onClick={() => coverInputRef.current?.click()}>
          <Icon name="Image" size={16} style={{ color: "#00c2ff" }} />
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

        {/* Avatar */}
        <div className="absolute bottom-0 left-5 translate-y-1/2 z-10">
          <div className="relative">
            <img
              src={profile.avatarUrl || "https://cdn.poehali.dev/projects/aa1808ba-e45f-437c-8925-20682e9a577e/files/3fa43031-b9e1-40e6-997b-435e174180c5.jpg"}
              alt="avatar"
              className="w-20 h-20 rounded-2xl object-cover"
              style={{ border: "3px solid #080f16", boxShadow: "0 0 20px rgba(0,194,255,0.3)" }}
            />
            <button
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "#00c2ff" }}
              onClick={() => avatarInputRef.current?.click()}>
              <Icon name="Camera" size={12} style={{ color: "#000" }} />
            </button>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      {/* ── Profile info ── */}
      <div className="px-5 pt-14 pb-4" style={{ borderBottom: "1px solid #0d1e2c" }}>
        {editingProfile ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono uppercase mb-1 block" style={{ color: "#4a6070", letterSpacing: "0.08em" }}>Никнейм</label>
              <input
                value={draft.nick}
                onChange={e => setDraft(d => ({ ...d, nick: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "#0d1e2c", border: "1px solid #00c2ff55", color: "#e2f4ff" }}
                placeholder="Твой никнейм"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase mb-1 block" style={{ color: "#4a6070", letterSpacing: "0.08em" }}>О себе</label>
              <textarea
                value={draft.bio}
                onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: "#0d1e2c", border: "1px solid #1e3040", color: "#e2f4ff" }}
                placeholder="Расскажи о себе..."
              />
            </div>
            <div className="flex gap-2">
              <button onClick={saveProfile}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: "#00c2ff", color: "#000" }}>
                Сохранить
              </button>
              <button onClick={() => { setEditingProfile(false); setDraft(profile); }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "#0d1e2c", color: "#7ab" }}>
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-xl" style={{ fontFamily: "Oswald, sans-serif", color: "#e2f4ff", letterSpacing: "0.04em" }}>
                {profile.nick}
              </div>
              {profile.bio && (
                <div className="text-sm mt-1" style={{ color: "#4a6070" }}>{profile.bio}</div>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="font-mono text-xs" style={{ color: "#00c2ff" }}>
                  {tracks.length} {tracks.length === 1 ? "трек" : tracks.length < 5 ? "трека" : "треков"}
                </span>
              </div>
            </div>
            <button onClick={() => { setDraft(profile); setEditingProfile(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: "#0d1e2c", color: "#00c2ff", border: "1px solid #1a3040" }}>
              <Icon name="Pencil" size={13} />
              Изменить
            </button>
          </div>
        )}
      </div>

      {/* ── Tracks ── */}
      <div className="flex-1 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-sm uppercase tracking-widest" style={{ fontFamily: "Oswald, sans-serif", color: "#4a6070" }}>
            Мои треки
          </span>
        </div>

        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Icon name="Music" size={40} style={{ color: "#1e3040" }} />
            <p className="text-sm text-center" style={{ color: "#2a4050" }}>
              Нет сохранённых треков.<br />Запиши и сохрани первый!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, idx) => (
              <div key={track.id} className="rounded-2xl overflow-hidden transition-all"
                style={{ background: "#0a1520", border: "1px solid #0d1e2c" }}>

                {/* Waveform preview bar */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${track.color}, ${track.color}44)` }} />

                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Track number */}
                  <span className="font-mono text-xs w-5 text-center flex-shrink-0" style={{ color: "#1e3040" }}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  {/* Play button */}
                  <button
                    onClick={() => togglePlay(track)}
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: playingId === track.id ? track.color : track.color + "22",
                      border: `1.5px solid ${track.color}`,
                      boxShadow: playingId === track.id ? `0 0 12px ${track.color}88` : "none",
                    }}>
                    <Icon name={playingId === track.id ? "Pause" : "Play"} size={15}
                      style={{ color: playingId === track.id ? "#fff" : track.color }} />
                  </button>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    {renamingId === track.id ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onBlur={() => commitRename(track.id)}
                        onKeyDown={e => { if (e.key === "Enter") commitRename(track.id); if (e.key === "Escape") setRenamingId(null); }}
                        className="w-full px-2 py-1 rounded-lg text-sm outline-none"
                        style={{ background: "#0d1e2c", border: `1px solid ${track.color}66`, color: "#e2f4ff" }}
                      />
                    ) : (
                      <div>
                        <div className="font-semibold text-sm truncate" style={{ color: "#e2f4ff" }}
                          onDoubleClick={() => { setRenamingId(track.id); setRenameVal(track.name); }}>
                          {track.name}
                        </div>
                        <div className="text-xs" style={{ color: "#2a4050" }}>
                          {track.duration} · {track.savedAt}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => { setRenamingId(track.id); setRenameVal(track.name); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{ color: "#4a6070" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#00c2ff"}
                      onMouseLeave={e => e.currentTarget.style.color = "#4a6070"}>
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button onClick={() => downloadTrack(track)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{ color: "#4a6070" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#00c2ff"}
                      onMouseLeave={e => e.currentTarget.style.color = "#4a6070"}>
                      <Icon name="Download" size={14} />
                    </button>
                    <button onClick={() => onDeleteTrack(track.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{ color: "#4a6070" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={e => e.currentTarget.style.color = "#4a6070"}>
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
