import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from "lucide-react";

export default function CallOverlay({
  isOpen,
  callState,
  callType,
  partnerName,
  myStream,
  userStream,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && myStream) {
      localVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  useEffect(() => {
    if (remoteVideoRef.current && userStream) {
      remoteVideoRef.current.srcObject = userStream;
    }
  }, [userStream]);

  if (!isOpen) return null;

  const isVideo = callType === "video";
  const isConnected = callState === "connected";
  const callStatusLabel = isConnected
    ? isVideo
      ? "Video Call (Connected)"
      : "Voice Call (Connected)"
    : callState === "ringing"
      ? "Ringing..."
      : "Calling...";

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative flex h-full w-full max-w-4xl max-h-[85vh] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#090d1f] text-white shadow-2xl">
        {/* Call Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white uppercase">
              {partnerName ? partnerName.charAt(0) : "?"}
            </div>
            <div>
              <h3 className="font-semibold text-white capitalize">{partnerName}</h3>
              <p className="text-xs text-slate-300">
                {callStatusLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Video or Voice Display Area */}
        <div className="relative flex-1 bg-[#050814] flex items-center justify-center overflow-hidden">
          {isVideo ? (
            <>
              {/* Remote Video */}
              {userStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-3xl font-bold uppercase animate-pulse">
                    {partnerName ? partnerName.charAt(0) : "?"}
                  </div>
                  <p className="text-sm text-slate-400">Waiting for {partnerName} to join video...</p>
                </div>
              )}

              {/* Local PiP Video */}
              {myStream && (
                <div className="absolute bottom-6 right-6 h-40 w-28 overflow-hidden rounded-[16px] border border-white/20 shadow-2xl bg-black">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`h-full w-full object-cover ${isCameraOff ? "hidden" : ""}`}
                  />
                  {isCameraOff && (
                    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-xs text-slate-400">
                      Camera Off
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Voice Call UI */
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="relative flex h-32 w-32 items-center justify-center">
                {isConnected && (
                  <>
                    <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-500/20 animate-ping" />
                    <span className="absolute inline-flex h-28 w-28 rounded-full bg-purple-600/20 animate-pulse" />
                  </>
                )}
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl font-bold text-white shadow-xl">
                  {partnerName ? partnerName.charAt(0).toUpperCase() : "?"}
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                {isConnected
                  ? "Voice Call Active"
                  : callState === "ringing"
                    ? "Ringing... waiting for them to pick up"
                    : "Calling... they may be offline"}
              </p>
            </div>
          )}
        </div>

        {/* Call Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-6 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`flex h-13 w-13 items-center justify-center rounded-full transition-all active:scale-95 ${
              isMuted
                ? "bg-rose-500/20 border border-rose-500/40 text-rose-400"
                : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Toggle Camera (if video call) */}
          {isVideo && (
            <button
              type="button"
              onClick={onToggleCamera}
              className={`flex h-13 w-13 items-center justify-center rounded-full transition-all active:scale-95 ${
                isCameraOff
                  ? "bg-rose-500/20 border border-rose-500/40 text-rose-400"
                  : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
              }`}
              title={isCameraOff ? "Turn On Camera" : "Turn Off Camera"}
            >
              {isCameraOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
            </button>
          )}

          {/* End Call */}
          <button
            type="button"
            onClick={onEndCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-900/50 transition hover:brightness-110 active:scale-95"
            title="End Call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
