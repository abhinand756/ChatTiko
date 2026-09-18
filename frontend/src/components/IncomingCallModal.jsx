import { createPortal } from "react-dom";
import { Phone, Video, PhoneOff } from "lucide-react";

export default function IncomingCallModal({
  isOpen,
  callerName,
  callType,
  onAccept,
  onDecline,
}) {
  if (!isOpen) return null;

  const isVideo = callType === "video";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1326]/95 p-6 text-white text-center shadow-2xl shadow-black/90">
        {/* Ringing pulse animation background */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-500/30 animate-ping opacity-75" />
          <span className="absolute inline-flex h-20 w-20 rounded-full bg-purple-600/30 animate-pulse" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg">
            {callerName ? callerName.charAt(0).toUpperCase() : "?"}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white capitalize">{callerName}</h3>
        <p className="mt-1 text-sm text-slate-300 flex items-center justify-center gap-1.5">
          {isVideo ? <Video className="h-4 w-4 text-purple-400" /> : <Phone className="h-4 w-4 text-indigo-400" />}
          Incoming {isVideo ? "Video Call" : "Voice Call"}...
        </p>

        <div className="mt-8 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={onDecline}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-900/40 transition hover:brightness-110 active:scale-95"
            title="Decline"
          >
            <PhoneOff className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={onAccept}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-lg shadow-green-900/40 transition hover:brightness-110 active:scale-95 animate-bounce"
            title="Accept"
          >
            {isVideo ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
