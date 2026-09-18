import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Check, CheckCheck, AlertCircle } from "lucide-react";
import { resolveMediaUrl } from "../api/client";

const WAVEFORM = [
  8, 14, 18, 10, 22, 16, 12, 20, 24, 18, 10, 16, 22, 14, 20, 24, 18, 12, 16, 22,
  10, 18, 24, 16, 12, 20, 18, 10, 22, 14, 18, 24, 12, 18, 14,
];

// Only one voice note should be audible at a time, across every bubble.
let activeAudio = null;

export default function AudioPlayer({
  src,
  duration: initialDuration,
  timestamp,
  isMe,
  status,
  senderName = "",
  senderAvatar = "",
}) {
  const audioUrl = resolveMediaUrl(src);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [avatarError, setAvatarError] = useState(false);
  const [failed, setFailed] = useState(false);

  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    setAvatarError(false);
  }, [senderAvatar]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setFailed(false);
    setDuration(initialDuration || 0);
  }, [audioUrl, initialDuration]);

  const updateProgress = useCallback(function tick() {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime);

    if (!audio.paused && !audio.ended) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const stopTicking = () => cancelAnimationFrame(animationFrameRef.current);
    const release = () => {
      if (activeAudio === audio) activeAudio = null;
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => {
      activeAudio = audio;
      setIsPlaying(true);
      setFailed(false);
      stopTicking();
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    const handlePause = () => {
      release();
      setIsPlaying(false);
      stopTicking();
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      release();
      stopTicking();
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleError = () => {
      release();
      stopTicking();
      setIsPlaying(false);
      setFailed(true);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      stopTicking();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      release();
      audio.pause();
    };
  }, [audioUrl, updateProgress]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || failed) return;

    try {
      if (audio.paused) {
        if (activeAudio && activeAudio !== audio) activeAudio.pause();
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.error("Audio playback error:", error);
      setFailed(true);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (!Number.isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    : "";

  const progressPercent =
    duration > 0
      ? Math.min(Math.max((currentTime / duration) * 100, 0), 100)
      : 0;

  const firstLetter = (senderName || "?").charAt(0).toUpperCase();

  const containerStyle = isMe
    ? "bg-gradient-to-r from-[#2a1745] to-[#1d1236] border-indigo-500/30 shadow-indigo-950/40"
    : "bg-[#161f2c] border-slate-700/50 shadow-black/40";

  const activeColor = "bg-sky-400";
  const progressDotStyle = "bg-sky-400 shadow-[0_0_8px_#38bdf8]";
  const micColor = "text-sky-400";

  const avatarBg = isMe
    ? "bg-gradient-to-br from-indigo-500 to-purple-600"
    : "bg-gradient-to-br from-blue-600 to-teal-500";

  return (
    <div className={`flex w-full max-w-[320px] sm:max-w-[340px] items-start gap-3 rounded-[18px] p-3 pb-1 text-white border shadow-lg select-none ${containerStyle}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play / Pause button - h-10 w-10 matches Waveform container h-10 */}
      <button
        type="button"
        onClick={togglePlayPause}
        disabled={failed}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={failed ? "Audio unavailable" : isPlaying ? "Pause audio" : "Play audio"}
      >
        {failed ? (
          <AlertCircle className="h-6 w-6 text-rose-300" />
        ) : isPlaying ? (
          <Pause className="h-6 w-6 fill-white text-white" />
        ) : (
          <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
        )}
      </button>

      {/* Waveform & details */}
      <div className="relative flex-1 flex flex-col min-w-0">
        <div className="relative flex h-10 items-center w-full">
          {/* Invisible range seek slider */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0"
            aria-label="Seek audio"
          />

          {/* Waveform bars */}
          <div className="flex h-full w-full items-center gap-[2.5px]">
            {WAVEFORM.map((height, index) => {
              const barPercent = (index / (WAVEFORM.length - 1)) * 100;
              const active = barPercent <= progressPercent;

              return (
                <span
                  key={index}
                  className={`min-w-[3px] flex-1 rounded-full transition-colors duration-75 ${
                    active ? activeColor : "bg-slate-500/50"
                  }`}
                  style={{
                    height: `${height}px`,
                  }}
                />
              );
            })}
          </div>

          {/* Moving cyan progress point */}
          <div
            className={`pointer-events-none absolute top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${progressDotStyle}`}
            style={{
              left: `${progressPercent}%`,
            }}
          />
        </div>

        {/* Timers & Status row */}
        <div className="flex items-center justify-between text-[11px] text-slate-300/80 mt-0.5 px-0.5 font-medium">
          <span>
            {failed
              ? "Unavailable"
              : isPlaying || currentTime > 0
                ? formatTime(currentTime)
                : formatTime(duration)}
          </span>
          <div className="flex items-center gap-1">
            <span>{formattedTime}</span>
            {isMe && (
              <span className="ml-0.5">
                {status === "seen" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-sky-400 inline" />
                ) : status === "delivered" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-slate-300 inline" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-slate-300 inline" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Avatar section with mic badge */}
      <div className="relative shrink-0">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold text-base overflow-hidden border border-white/10 shadow-md ${avatarBg}`}>
          {senderAvatar && !avatarError ? (
            <img
              src={senderAvatar}
              alt={senderName || "User"}
              onError={() => setAvatarError(true)}
              className="h-full w-full object-cover rounded-full"
            />
          ) : (
            <span>{firstLetter}</span>
          )}
        </div>

        {/* Microphone Badge overlay at bottom-left */}
        <div className={`absolute -bottom-[0.5px] -left-[0.5px] flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#0b1220] ${micColor}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19v3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />

            <rect
              x="9"
              y="2"
              width="6"
              height="13"
              rx="3"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
