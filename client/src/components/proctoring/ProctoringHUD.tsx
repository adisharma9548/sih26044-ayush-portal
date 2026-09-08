import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, AlertTriangle, ShieldCheck, ShieldAlert, Eye, UserX, Users } from 'lucide-react';
import { ProctoringViolation } from '../../hooks/useExamProctoring';

interface ProctoringHUDProps {
  isActive: boolean;
  strikes: number;
  maxStrikes: number;
  onViolation: (type: ProctoringViolation['type'], details: string) => void;
}

export const ProctoringHUD: React.FC<ProctoringHUDProps> = ({
  isActive,
  strikes,
  maxStrikes,
  onViolation,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [proctorStatus, setProctorStatus] = useState<'VERIFIED' | 'WARNING' | 'VIOLATION'>('VERIFIED');
  const [statusMessage, setStatusMessage] = useState('Candidate Verified');

  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const faceAbsentFramesRef = useRef<number>(0);
  const multipleFaceFramesRef = useRef<number>(0);
  const lastViolationTimeRef = useRef<number>(0);

  // Initialize Webcam Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
          setCameraError(null);
        }
      } catch (err: any) {
        setCameraActive(false);
        setCameraError(err.message || 'Webcam access denied. Camera is mandatory for proctored exams.');
        onViolation('FACE_NOT_DETECTED', 'Camera feed disconnected or permission denied.');
      }
    };

    if (isActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive, onViolation]);

  // Computer Vision Face & Motion Detection Loop
  useEffect(() => {
    if (!isActive || !cameraActive) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.drawImage(video, 0, 0, width, height);

      const frame = ctx.getImageData(0, 0, width, height);
      const data = frame.data;
      const totalPixels = width * height;

      let skinTonePixels = 0;
      let motionPixels = 0;
      const prevData = prevFrameRef.current;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Skin-tone / Face region heuristic in RGB space
        const isSkin =
          r > 60 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g > 15 &&
          Math.abs(r - g) > 15;

        if (isSkin) skinTonePixels++;

        // Motion detection: difference between successive frames
        if (prevData) {
          const pr = prevData[i];
          const pg = prevData[i + 1];
          const pb = prevData[i + 2];
          const diff = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);
          if (diff > 55) {
            motionPixels++;
          }
        }
      }

      prevFrameRef.current = new Uint8ClampedArray(data);

      const skinRatio = skinTonePixels / totalPixels;
      const motionRatio = motionPixels / totalPixels;
      const now = Date.now();
      const throttleCooldown = 4500; // Throttle violation reports to avoid spamming

      // 1. Face Presence Verification
      if (skinRatio < 0.04) {
        faceAbsentFramesRef.current += 1;
        if (faceAbsentFramesRef.current >= 4) {
          setProctorStatus('VIOLATION');
          setStatusMessage('No Face Detected in Frame!');
          if (now - lastViolationTimeRef.current > throttleCooldown) {
            lastViolationTimeRef.current = now;
            onViolation('FACE_NOT_DETECTED', 'Face not detected in camera frame. Please stay centered.');
          }
        }
      } else {
        faceAbsentFramesRef.current = 0;

        // 2. High Motion / Multiple Person Detection
        if (motionRatio > 0.28) {
          multipleFaceFramesRef.current += 1;
          if (multipleFaceFramesRef.current >= 3) {
            setProctorStatus('VIOLATION');
            setStatusMessage('Excessive Movement / Multiple Persons!');
            if (now - lastViolationTimeRef.current > throttleCooldown) {
              lastViolationTimeRef.current = now;
              onViolation('MULTIPLE_FACES', 'Excessive movement or multiple persons detected around candidate.');
            }
          }
        } else if (motionRatio > 0.12) {
          setProctorStatus('WARNING');
          setStatusMessage('Movement Detected');
          multipleFaceFramesRef.current = 0;
        } else {
          setProctorStatus('VERIFIED');
          setStatusMessage('Candidate Verified');
          multipleFaceFramesRef.current = 0;
        }
      }
    }, 600);

    return () => clearInterval(interval);
  }, [isActive, cameraActive, onViolation]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Live Proctoring Badge */}
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl w-64 transition-all duration-300">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
              AI Proctor Active
            </span>
          </div>

          {/* Strikes Badge */}
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              strikes === 0
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                : strikes < maxStrikes
                ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                : 'bg-red-900/70 text-red-200 border border-red-700/70 animate-bounce'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Strikes: {strikes} / {maxStrikes}</span>
          </div>
        </div>

        {/* Video Frame */}
        <div className="relative w-full h-36 bg-black rounded-xl overflow-hidden border border-slate-800">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover -scale-x-100"
          />

          {/* Hidden Canvas for Computer Vision */}
          <canvas ref={canvasRef} width="120" height="90" className="hidden" />

          {/* Camera Error Message */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-3 text-center">
              <Camera className="w-6 h-6 text-red-400 mb-1" />
              <p className="text-[10px] text-red-300 font-semibold leading-tight">{cameraError}</p>
            </div>
          )}

          {/* Status Indicator Overlay */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            <div
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-md flex items-center gap-1 border shadow-xs ${
                proctorStatus === 'VERIFIED'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : proctorStatus === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-red-500/30 text-red-200 border-red-500/50'
              }`}
            >
              {proctorStatus === 'VERIFIED' ? (
                <ShieldCheck className="w-2.5 h-2.5" />
              ) : proctorStatus === 'WARNING' ? (
                <Eye className="w-2.5 h-2.5" />
              ) : (
                <ShieldAlert className="w-2.5 h-2.5" />
              )}
              <span>{statusMessage}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <p className="text-[9px] text-slate-400 mt-2 text-center">
          Camera & tab restrictions are enforced. Switching tabs or moving away will trigger warning strikes.
        </p>
      </div>
    </div>
  );
};