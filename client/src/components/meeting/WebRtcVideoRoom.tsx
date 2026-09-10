import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Share2,
  MessageSquare,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Users,
  Send,
  AlertCircle,
  PenTool
} from 'lucide-react';
import { CollaborativeBoard, DrawStroke } from './CollaborativeBoard';

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
}

interface WebRtcVideoRoomProps {
  roomId: string;
  roomTitle: string;
  currentUser: {
    id: string;
    name: string;
    role?: string;
  };
  onClose: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const WebRtcVideoRoom: React.FC<WebRtcVideoRoomProps> = ({
  roomId,
  roomTitle,
  currentUser,
  onClose,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Call States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [, setConnectionState] = useState<'connecting' | 'connected' | 'waiting'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUserName, setRemoteUserName] = useState<string>('Remote Participant');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Collaborative Whiteboard & Shared Notes State
  const [showBoard, setShowBoard] = useState(false);
  const [remoteStroke, setRemoteStroke] = useState<DrawStroke | null>(null);
  const [remoteNotes, setRemoteNotes] = useState<string | null>(null);

  const handleDrawStroke = (stroke: DrawStroke) => {
    socketRef.current?.emit('webrtc:whiteboard-draw', {
      roomId,
      drawData: stroke,
      sender: currentUser.name,
    });
  };

  const handleNotesUpdate = (updatedNotes: string) => {
    socketRef.current?.emit('webrtc:notes-update', {
      roomId,
      notes: updatedNotes,
      sender: currentUser.name,
    });
  };

  // Timer: Unlimited duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  // Main WebRTC & Socket Connection Lifecycle
  useEffect(() => {
    let isCleanedUp = false;

    const setupCall = async () => {
      try {
        // 1. Get User Media (Camera + Mic) with robust fallback
        let stream: MediaStream | null = null;
        try {
          if (navigator?.mediaDevices?.getUserMedia) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              },
              audio: true,
            });
          }
        } catch (mediaErr: any) {
          console.warn('Full camera+audio stream unavailable, trying audio-only...', mediaErr);
          try {
            if (navigator?.mediaDevices?.getUserMedia) {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
          } catch (audioErr: any) {
            console.warn('Microphone also unavailable. Initializing session in presentation mode.', audioErr);
            setPermissionError(
              'Camera/Microphone access not available. You can still use the live whiteboard, shared code notes, chat, and screen sharing.'
            );
          }
        }

        // Fallback canvas video stream if hardware stream is null (e.g. headless or desktop without webcam)
        if (!stream) {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${currentUser.name} (Live Host)`, canvas.width / 2, canvas.height / 2);
          }
          stream = (canvas as any).captureStream ? (canvas as any).captureStream(5) : new MediaStream();
        }

        const activeStream: MediaStream = stream || new MediaStream();

        if (isCleanedUp) {
          activeStream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = activeStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = activeStream;
        }

        // 2. Connect to Socket.IO signaling server (Localhost or Persistent Railway)
        const isLocal =
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        const envBackendUrl = (import.meta as any).env?.VITE_BACKEND_URL;
        let backendUrl: string;
        if (isLocal) {
          backendUrl = 'http://localhost:5000';
        } else if (envBackendUrl && typeof envBackendUrl === 'string' && envBackendUrl.trim() && !envBackendUrl.includes('vercel.app')) {
          backendUrl = envBackendUrl.trim();
        } else {
          backendUrl = 'https://sih26044-ayush-portal-production.up.railway.app';
        }
        backendUrl = backendUrl.replace(/\/+$/, '').replace(/\/api$/, '');

        const socket = io(backendUrl, {
          transports: ['websocket', 'polling'],
          auth: {
            token: localStorage.getItem('ayush_portal_token') || localStorage.getItem('auth_token') || '',
          },
        });
        socketRef.current = socket;

        // 3. Initialize RTCPeerConnection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add local tracks to RTCPeerConnection
        activeStream.getTracks().forEach((track) => {
          pc.addTrack(track, activeStream);
        });

        // Remote track received
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
              setHasRemoteVideo(true);
              setConnectionState('connected');
            }
          }
        };

        // ICE candidate generated locally -> send via signaling
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc:ice-candidate', {
              roomId,
              candidate: event.candidate,
            });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setConnectionState('connected');
          } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            setConnectionState('waiting');
          }
        };

        // 4. Socket Signaling Events
        socket.on('connect', () => {
          socket.emit('webrtc:join-room', {
            roomId,
            user: { name: currentUser.name, id: currentUser.id, role: currentUser.role },
          });
        });

        socket.on('webrtc:room-joined', ({ participantCount }: { participantCount: number }) => {
          if (participantCount <= 1) {
            setConnectionState('waiting');
          }
        });

        // Another peer joined -> Create Offer (we are the caller)
        socket.on('webrtc:peer-joined', async ({ user }: { user: any }) => {
          if (user?.name) setRemoteUserName(user.name);
          setConnectionState('connecting');

          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            socket.emit('webrtc:offer', {
              roomId,
              sdp: offer,
            });
          } catch (err) {
            console.error('Error creating WebRTC offer:', err);
          }
        });

        // Received offer -> Set Remote Description & Create Answer
        socket.on('webrtc:offer', async ({ sdp, peerId }: { sdp: RTCSessionDescriptionInit; peerId: string }) => {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc:answer', {
              roomId,
              sdp: answer,
              targetId: peerId,
            });
          } catch (err) {
            console.error('Error handling WebRTC offer:', err);
          }
        });

        // Received answer -> Set Remote Description
        socket.on('webrtc:answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            setConnectionState('connected');
          } catch (err) {
            console.error('Error setting remote description from answer:', err);
          }
        });

        // Received ICE candidate from peer
        socket.on('webrtc:ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          try {
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        });

        // Peer left room
        socket.on('webrtc:peer-left', () => {
          setHasRemoteVideo(false);
          setConnectionState('waiting');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        });

        // In-call text chat
        socket.on('webrtc:chat-message', (msg: ChatMessage) => {
          setMessages((prev) => [...prev, msg]);
        });

        // In-call collaborative whiteboard sync
        socket.on('webrtc:whiteboard-draw', ({ drawData }: { drawData: DrawStroke }) => {
          setRemoteStroke(drawData);
        });

        // In-call shared notes sync
        socket.on('webrtc:notes-update', ({ notes }: { notes: string }) => {
          setRemoteNotes(notes);
        });
      } catch (err: any) {
        console.error('Failed to access camera/mic:', err);
        setPermissionError(
          err.name === 'NotAllowedError'
            ? 'Camera/microphone access was denied. Please allow permissions in your browser bar.'
            : 'Could not initialize video devices. Please verify your camera/microphone are connected.'
        );
      }
    };

    setupCall();

    return () => {
      isCleanedUp = true;
      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      // Close WebRTC
      if (pcRef.current) {
        pcRef.current.close();
      }
      // Leave room & disconnect socket
      if (socketRef.current) {
        socketRef.current.emit('webrtc:leave-room', { roomId });
        socketRef.current.disconnect();
      }
    };
  }, [roomId, currentUser]);

  // Toggle Audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (localStreamRef.current && pcRef.current) {
        const cameraTrack = localStreamRef.current.getVideoTracks()[0];
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        if (pcRef.current) {
          const senders = pcRef.current.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing canceled or failed:', err);
      }
    }
  };

  // Send In-Call Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;
    socketRef.current.emit('webrtc:chat-message', {
      roomId,
      message: newMessage.trim(),
      sender: currentUser.name,
    });
    setNewMessage('');
  };

  // Copy Room Link / Room Code
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const getDirectMeetingUrl = () => {
    return `${window.location.origin}/meetings?room=${encodeURIComponent(roomId)}&title=${encodeURIComponent(roomTitle)}`;
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(getDirectMeetingUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Top Header Bar */}
      <div className="px-6 py-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>{roomTitle}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                WebRTC P2P HD (Unlimited)
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
              <span>
                Room ID: <span className="font-mono text-slate-300">{roomId}</span>
              </span>
              <span>•</span>
              <span>
                Call Duration: <span className="font-mono font-bold text-emerald-400">{formatDuration(callDuration)}</span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Room Code Button */}
          <button
            type="button"
            onClick={copyRoomCode}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            title="Copy Room Code (e.g. guidance-...)"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Code Copied!' : `Code: ${roomId}`}</span>
          </button>

          {/* Share Direct Meeting Link Button */}
          <button
            type="button"
            onClick={copyMeetingLink}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Copy Full Meeting Join Link with Room Code"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ml-2"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Main Video Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 gap-4 overflow-hidden">
        {permissionError ? (
          <div className="max-w-md p-6 rounded-2xl bg-slate-900 border border-rose-500/40 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-base font-bold text-rose-300">Device Permission Required</h3>
            <p className="text-xs text-slate-300">{permissionError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="w-full h-full relative flex items-center justify-center">
            {/* Remote Video Stream (Main Screen) */}
            <div className="w-full h-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 relative flex items-center justify-center shadow-2xl">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${hasRemoteVideo ? 'block' : 'hidden'}`}
              />

              {/* Waiting State Overlay if second peer hasn't arrived */}
              {!hasRemoteVideo && (
                <div className="text-center space-y-3 p-8">
                  <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-200">Waiting for participant to join...</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Your camera and microphone are live. The room is ready with unlimited duration. Share this link with the candidate or interviewer to connect.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={copyMeetingLink}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>{copiedLink ? 'Meeting Link Copied!' : 'Copy Meeting Invite Link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={copyRoomCode}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copiedCode ? 'Room Code Copied!' : `Copy Code: ${roomId}`}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Remote Participant Tag */}
              {hasRemoteVideo && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 text-xs font-bold text-slate-200 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{remoteUserName}</span>
                </div>
              )}
            </div>

            {/* Local Video Stream (Picture-in-Picture Floating Window) */}
            <div className="absolute bottom-6 right-6 w-48 sm:w-64 h-32 sm:h-44 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-2xl z-20 group">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : 'block'} transform -scale-x-100`}
              />
              {isVideoMuted && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-xs space-y-1">
                  <VideoOff className="w-6 h-6 text-slate-600" />
                  <span>Camera Off</span>
                </div>
              )}

              {/* Local Tag */}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-semibold text-slate-300">
                You ({currentUser.name}) {isAudioMuted && '• Muted'}
              </div>
            </div>
          </div>
        )}

        {/* In-Call Text Chat Drawer */}
        {showChat && (
          <div className="w-80 h-full bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between shadow-2xl z-30 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>In-Call Meeting Chat</span>
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs no-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No messages yet. Send a message to participants in this room.
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender === currentUser.name;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}
                    >
                      <span className="text-[10px] text-slate-400 font-semibold">{m.sender} • {m.timestamp}</span>
                      <div
                        className={`px-3 py-2 rounded-2xl max-w-[85%] break-words ${
                          isMe
                            ? 'bg-emerald-600 text-white rounded-br-xs'
                            : 'bg-slate-800 text-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* In-Call Collaborative Whiteboard & Shared Notes Drawer */}
        <CollaborativeBoard
          isOpen={showBoard}
          onClose={() => setShowBoard(false)}
          onDraw={handleDrawStroke}
          onNotesChange={handleNotesUpdate}
          remoteStroke={remoteStroke}
          remoteNotes={remoteNotes}
          currentUser={currentUser}
          roomTitle={roomTitle}
        />
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="px-6 py-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-center gap-4 z-20">
        {/* Microphone Toggle */}
        <button
          onClick={toggleAudio}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
            isAudioMuted
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleVideo}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
            isVideoMuted
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
            isScreenSharing
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Your Screen'}
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Collaborative Whiteboard / Shared Notes Toggle */}
        <button
          onClick={() => setShowBoard(!showBoard)}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer relative ${
            showBoard
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title="Collaborative Whiteboard & Live Notes"
        >
          <PenTool className="w-5 h-5" />
        </button>

        {/* Chat Toggle */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer relative ${
            showChat
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title="Open In-Call Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {messages.length > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center">
              {messages.length}
            </span>
          )}
        </button>

        {/* End Call / Leave */}
        <button
          onClick={onClose}
          className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          title="Leave Conference"
        >
          <PhoneOff className="w-5 h-5" />
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
};
