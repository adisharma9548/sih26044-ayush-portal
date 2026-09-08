import React, { useState, useEffect, useRef } from 'react';
import { Shield, Camera, Maximize2, AlertTriangle, CheckCircle, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onAccept: () => void;
  onCancel?: () => void;
  degreeName?: string;
  specializationName?: string;
}

export const ProctoringAgreementModal: React.FC<Props> = ({
  isOpen,
  onAccept,
  onCancel,
  degreeName,
  specializationName,
}) => {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isOpen) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
            setCameraReady(true);
            setCameraError(null);
          }
        })
        .catch((err) => {
          setCameraReady(false);
          setCameraError(
            err.message || 'Webcam permission is mandatory to participate in this proctored evaluation.'
          );
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                PROCTORED EXAM LOCKDOWN
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              Secure Evaluation Environment
            </h2>
            <p className="text-xs text-slate-500">
              Discipline: <strong className="text-slate-800">{degreeName || 'Academic Degree'}</strong>
              {specializationName && (
                <> — Track: <strong className="text-emerald-700">{specializationName}</strong></>
              )}
            </p>
          </div>
        </div>

        {/* Video Preview Check */}
        <div className="relative w-full h-44 bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover -scale-x-100"
          />
          {cameraError ? (
            <div className="absolute inset-0 bg-red-950/85 p-4 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mb-1" />
              <p className="text-xs text-red-200 font-bold">Camera Access Required</p>
              <p className="text-[11px] text-red-300 mt-1 max-w-xs">{cameraError}</p>
            </div>
          ) : cameraReady ? (
            <div className="absolute bottom-2 left-2 bg-emerald-950/80 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-md border border-emerald-700/60">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>Camera Stream Verified</span>
            </div>
          ) : (
            <div className="text-slate-400 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold">Initializing Camera Stream...</span>
            </div>
          )}
        </div>

        {/* Lockdown Rules List */}
        <div className="space-y-2.5 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Mandatory Integrity Restrictions:
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <Maximize2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Fullscreen Enforced:</strong> Exiting fullscreen triggers an immediate strike.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Tab & App Restriction:</strong> Switching tabs or opening external apps is recorded.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Camera className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Live Face Proctoring:</strong> Face must remain centered. No roaming or secondary persons.
              </span>
            </div>

            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <span>
                <strong>3 Strikes Policy:</strong> Accumulating 3 violations terminates and auto-submits the test.
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={onAccept}
            disabled={!cameraReady}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Enter Fullscreen & Begin Exam</span>
          </button>
        </div>
      </div>
    </div>
  );
};