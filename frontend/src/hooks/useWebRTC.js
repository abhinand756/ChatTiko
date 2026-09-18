import { useState, useRef, useEffect, useCallback } from "react";
import { showToast } from "../utils/toast";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useWebRTC(socketRef, userId) {
  const [callState, setCallState] = useState("idle"); // "idle" | "calling" | "receiving" | "connected"
  const [callType, setCallType] = useState("voice"); // "voice" | "video"
  const [partner, setPartner] = useState("");
  const [incomingCaller, setIncomingCaller] = useState("");
  const [incomingSignal, setIncomingSignal] = useState(null);

  const [myStream, setMyStream] = useState(null);
  const [userStream, setUserStream] = useState(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef(null);
  const myStreamRef = useRef(null);
  const pendingIceCandidates = useRef([]);
  const callStartedAtRef = useRef(null);
  const wasConnectedRef = useRef(false);

  const cleanUpCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach((track) => track.stop());
      myStreamRef.current = null;
    }

    setMyStream(null);
    setUserStream(null);
    setCallState("idle");
    setPartner("");
    setIncomingCaller("");
    setIncomingSignal(null);
    setIsMuted(false);
    setIsCameraOff(false);
    pendingIceCandidates.current = [];
    callStartedAtRef.current = null;
    wasConnectedRef.current = false;
  }, []);

  const emitCallCompleted = useCallback(() => {
    if (socketRef.current && partner && wasConnectedRef.current && callStartedAtRef.current) {
      const duration = Math.max(
        0,
        Math.floor((Date.now() - callStartedAtRef.current) / 1000),
      );
      socketRef.current.emit("callCompleted", {
        to: partner,
        callType,
        duration,
      });
    }
  }, [socketRef, partner, callType]);

  const createPeerConnection = useCallback((targetUser) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("iceCandidate", {
          to: targetUser,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setUserStream(event.streams[0]);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socketRef]);

  // Start outgoing call
  const startCall = useCallback(async (targetUsername, type = "voice") => {
    if (!socketRef.current) return;

    try {
      setCallState("calling");
      setCallType(type);
      setPartner(targetUsername);

      const constraints = {
        audio: true,
        video: type === "video" ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      myStreamRef.current = stream;
      setMyStream(stream);

      const pc = createPeerConnection(targetUsername);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit("callUser", {
        userToCall: targetUsername,
        signalData: offer,
        from: userId,
        callType: type,
      });
    } catch (err) {
      console.error("Error starting call:", err);
      showToast("Could not access media devices for call.", "error");
      cleanUpCall();
    }
  }, [socketRef, userId, createPeerConnection, cleanUpCall]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCaller || !incomingSignal || !socketRef.current) return;

    try {
      setCallState("connected");
      setPartner(incomingCaller);
      callStartedAtRef.current = Date.now();
      wasConnectedRef.current = true;

      const constraints = {
        audio: true,
        video: callType === "video" ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      myStreamRef.current = stream;
      setMyStream(stream);

      const pc = createPeerConnection(incomingCaller);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal));

      // Process pending ICE candidates
      while (pendingIceCandidates.current.length > 0) {
        const candidate = pendingIceCandidates.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued ICE candidate:", e);
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit("answerCall", {
        to: incomingCaller,
        signal: answer,
      });
    } catch (err) {
      console.error("Error accepting call:", err);
      cleanUpCall();
    }
  }, [incomingCaller, incomingSignal, callType, socketRef, createPeerConnection, cleanUpCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (socketRef.current && incomingCaller) {
      socketRef.current.emit("rejectCall", { to: incomingCaller });
    }
    cleanUpCall();
  }, [socketRef, incomingCaller, cleanUpCall]);

  // End active call
  const endCall = useCallback(() => {
    emitCallCompleted();
    if (socketRef.current && partner) {
      socketRef.current.emit("endCall", {
        to: partner,
        connected: wasConnectedRef.current,
        callType,
      });
    }
    cleanUpCall();
  }, [socketRef, partner, cleanUpCall, emitCallCompleted, callType]);

  // Toggle Mute Audio
  const toggleMute = useCallback(() => {
    if (myStreamRef.current) {
      const audioTrack = myStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle Video Camera
  const toggleCamera = useCallback(() => {
    if (myStreamRef.current) {
      const videoTrack = myStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Socket signaling listeners
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleIncomingCall = ({ signal, from, callType: incomingType }) => {
      if (callState !== "idle") {
        socket.emit("rejectCall", { to: from });
        return;
      }
      setIncomingCaller(from);
      setIncomingSignal(signal);
      setCallType(incomingType);
      setCallState("receiving");
    };

    const handleCallAccepted = async ({ signal }) => {
      setCallState("connected");
      callStartedAtRef.current = Date.now();
      wasConnectedRef.current = true;
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));

        while (pendingIceCandidates.current.length > 0) {
          const candidate = pendingIceCandidates.current.shift();
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Error adding candidate after answer:", e);
          }
        }
      }
    };

    const handleCallRejected = () => {
      showToast("Call was declined.", "error");
      cleanUpCall();
    };

    const handleCallEnded = () => {
      cleanUpCall();
    };

    const handleCallRinging = () => {
      // Callee is online and their device received the call.
      setCallState("ringing");
    };

    const handleCallUserOffline = () => {
      // Keep the overlay open in the "calling" state so the caller sees
      // "Calling..." and can hang up; the missed call is logged for them.
      setCallState("calling");
    };

    const handleIceCandidate = ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          console.error("Error adding ICE candidate:", err);
        });
      } else {
        pendingIceCandidates.current.push(candidate);
      }
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);
    socket.on("callRinging", handleCallRinging);
    socket.on("callUserOffline", handleCallUserOffline);
    socket.on("iceCandidate", handleIceCandidate);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);
      socket.off("callRinging", handleCallRinging);
      socket.off("callUserOffline", handleCallUserOffline);
      socket.off("iceCandidate", handleIceCandidate);
    };
  }, [socketRef, callState, cleanUpCall]);

  return {
    callState,
    callType,
    partner: partner || incomingCaller,
    myStream,
    userStream,
    isMuted,
    isCameraOff,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
