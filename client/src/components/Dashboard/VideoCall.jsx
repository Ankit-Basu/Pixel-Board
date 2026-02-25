import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import SimplePeer from "simple-peer/simplepeer.min.js";

export default function VideoCall() {
  const { socket } = useSocket();
  const { user } = useAuth();

  // State
  const [myId, setMyId] = useState("");
  const [idToCall, setIdToCall] = useState("");
  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | active
  const [callerInfo, setCallerInfo] = useState(null); // { from, callerName, signal }
  const [copied, setCopied] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMicOff, setIsMicOff] = useState(false);

  // Refs
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callerIdRef = useRef(null); // track who we're in a call with

  // Set socket ID
  useEffect(() => {
    if (socket) {
      setMyId(socket.id);
    }
  }, [socket]);

  // Cleanup stream helper
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (myVideoRef.current) {
      myVideoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup everything
  const cleanupCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    stopLocalStream();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    callerIdRef.current = null;
    setCallState("idle");
    setCallerInfo(null);
    setIsVideoOff(false);
    setIsMicOff(false);
  }, [stopLocalStream]);

  // Listen for incoming calls and call-ended
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (data) => {
      // data: { signal, from, callerName }
      setCallerInfo(data);
      setCallState("incoming");
    };

    const handleCallEnded = () => {
      cleanupCall();
    };

    socket.on("video-call-incoming", handleIncoming);
    socket.on("video-call-ended", handleCallEnded);

    return () => {
      socket.off("video-call-incoming", handleIncoming);
      socket.off("video-call-ended", handleCallEnded);
    };
  }, [socket, cleanupCall]);

  // Auto-bind local stream to video ref whenever it renders
  useEffect(() => {
    if (myVideoRef.current && localStreamRef.current) {
      if (myVideoRef.current.srcObject !== localStreamRef.current) {
        myVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  });

  // Get local media stream
  const getLocalStream = async () => {
    try {
      setStreamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      setStreamError("Camera/mic access denied. Please allow permissions.");
      throw err;
    }
  };

  // Initiate a call
  const callUser = async () => {
    if (!idToCall.trim() || !socket) return;
    try {
      const stream = await getLocalStream();
      setCallState("calling");
      callerIdRef.current = idToCall.trim();

      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream,
      });

      peer.on("signal", (signalData) => {
        socket.emit("video-call-user", {
          userToCall: idToCall.trim(),
          signalData,
          from: socket.id,
          callerName: user?.name || "Unknown",
        });
      });

      peer.on("stream", (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on("close", () => cleanupCall());
      peer.on("error", () => cleanupCall());

      peerRef.current = peer;

      // Listen for acceptance
      const handleAccepted = (data) => {
        peer.signal(data.signal);
        setCallState("active");
      };
      socket.on("video-call-accepted", handleAccepted);

      // Store cleanup
      peer._removeAcceptedListener = () =>
        socket.off("video-call-accepted", handleAccepted);
    } catch {
      setCallState("idle");
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!callerInfo || !socket) return;
    try {
      const stream = await getLocalStream();
      setCallState("active");
      callerIdRef.current = callerInfo.from;

      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
      });

      peer.on("signal", (signalData) => {
        socket.emit("video-call-accept", {
          signal: signalData,
          to: callerInfo.from,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on("close", () => cleanupCall());
      peer.on("error", () => cleanupCall());

      peer.signal(callerInfo.signal);
      peerRef.current = peer;
    } catch {
      cleanupCall();
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    if (callerInfo?.from && socket) {
      socket.emit("video-call-end", { to: callerInfo.from });
    }
    setCallState("idle");
    setCallerInfo(null);
  };

  // End active call
  const endCall = () => {
    if (callerIdRef.current && socket) {
      socket.emit("video-call-end", { to: callerIdRef.current });
    }
    if (peerRef.current?._removeAcceptedListener) {
      peerRef.current._removeAcceptedListener();
    }
    cleanupCall();
  };

  // Copy ID
  const copyId = () => {
    navigator.clipboard.writeText(myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOff(!audioTrack.enabled);
      }
    }
  };

  return (
    <div
      className="video-call-section card"
      style={{ maxWidth: "800px", margin: "20px auto" }}
    >
      <div
        className="vc-header"
        style={{
          marginBottom: "20px",
          textAlign: "center",
          fontFamily: "var(--pixel-font)",
          fontSize: "1.2rem",
          textShadow: "2px 2px 0 var(--accent)",
        }}
      >
        📹 VIDEO CALL
      </div>

      {/* My ID section */}
      <div className="vc-id-block">
        <label className="vc-label">YOUR ID</label>
        <div className="vc-id-row">
          <input
            className="vc-id-display"
            value={myId}
            readOnly
            onClick={copyId}
            title="Click to copy"
          />
          <button className="vc-copy-btn" onClick={copyId}>
            {copied ? "✓" : "📋"}
          </button>
        </div>
      </div>

      {/* Idle: show call input */}
      {callState === "idle" && (
        <div className="vc-call-block">
          <label className="vc-label">PASTE PEER ID</label>
          <input
            className="vc-input"
            placeholder="Enter ID to call..."
            value={idToCall}
            onChange={(e) => setIdToCall(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && callUser()}
          />
          <button
            className="hero-btn-retro btn-green vc-call-btn"
            onClick={callUser}
            disabled={!idToCall.trim()}
          >
            📞 CALL
          </button>
        </div>
      )}

      {/* Calling: waiting for acceptance */}
      {callState === "calling" && (
        <div className="vc-status-block">
          <div className="vc-calling-pulse" />
          <p className="vc-status-text">Calling...</p>
          <button
            className="hero-btn-retro btn-red vc-end-btn"
            onClick={endCall}
          >
            ✕ CANCEL
          </button>
        </div>
      )}

      {/* Incoming call */}
      {callState === "incoming" && callerInfo && (
        <div className="vc-incoming-block">
          <div className="vc-ring-icon">📱</div>
          <p className="vc-incoming-text">
            {callerInfo.callerName || "Someone"} is calling...
          </p>
          <div className="vc-incoming-actions">
            <button className="hero-btn-retro btn-green" onClick={acceptCall}>
              ✓ ACCEPT
            </button>
            <button className="hero-btn-retro btn-red" onClick={rejectCall}>
              ✕ REJECT
            </button>
          </div>
        </div>
      )}

      {/* Active call: show videos */}
      {callState === "active" && (
        <div className="vc-active-block">
          <div className="vc-videos">
            <div className="vc-video-wrap vc-remote">
              <video ref={remoteVideoRef} autoPlay playsInline />
              <span className="vc-video-label">REMOTE</span>
            </div>
            <div className="vc-video-wrap vc-local">
              <video ref={myVideoRef} autoPlay playsInline muted />
              {(!localStreamRef.current || isVideoOff) && (
                <div className="vc-no-camera-overlay">
                  <span>📷 OFF</span>
                </div>
              )}
              <span className="vc-video-label">YOU</span>
            </div>
          </div>
          <div className="vc-controls">
            <button
              className={`hero-btn-retro ${isVideoOff ? "btn-red" : "btn-blue"}`}
              onClick={toggleVideo}
            >
              {isVideoOff ? "📷 START VIDEO" : "🚫 STOP VIDEO"}
            </button>
            <button
              className={`hero-btn-retro ${isMicOff ? "btn-red" : "btn-blue"}`}
              onClick={toggleMic}
            >
              {isMicOff ? "🎙️ UNMUTE MIC" : "🔇 MUTE MIC"}
            </button>
            <button
              className="hero-btn-retro btn-red vc-end-btn"
              onClick={endCall}
            >
              📵 END CALL
            </button>
          </div>
        </div>
      )}

      {/* Show local preview while calling */}
      {callState === "calling" && (
        <div className="vc-video-wrap vc-local-preview">
          <video ref={myVideoRef} autoPlay playsInline muted />
          {(!localStreamRef.current || isVideoOff) && (
            <div className="vc-no-camera-overlay">
              <span>📷 OFF</span>
            </div>
          )}
        </div>
      )}

      {streamError && <p className="vc-error">{streamError}</p>}
    </div>
  );
}
