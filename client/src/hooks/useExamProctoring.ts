import { useState, useEffect, useCallback, useRef } from 'react';

export interface ProctoringViolation {
  type: 'FULLSCREEN_EXIT' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES' | 'SUSPICIOUS_MOVEMENT' | 'CLIPBOARD_ATTEMPT';
  timestamp: string;
  details: string;
}

export interface UseExamProctoringOptions {
  active: boolean;
  maxStrikes?: number;
  onViolation?: (violation: ProctoringViolation, currentStrikes: number) => void;
  onMaxStrikesReached?: (violationsLog: ProctoringViolation[]) => void;
}

export const useExamProctoring = ({
  active,
  maxStrikes = 3,
  onViolation,
  onMaxStrikesReached,
}: UseExamProctoringOptions) => {
  const [strikes, setStrikes] = useState(0);
  const [violationsLog, setViolationsLog] = useState<ProctoringViolation[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeWarning, setActiveWarning] = useState<ProctoringViolation | null>(null);

  const strikesRef = useRef(0);
  strikesRef.current = strikes;

  const violationsRef = useRef<ProctoringViolation[]>([]);
  violationsRef.current = violationsLog;

  // Web Audio Warning Beep
  const playWarningBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before interaction
    }
  }, []);

  const recordViolation = useCallback(
    (type: ProctoringViolation['type'], details: string) => {
      if (!active) return;

      const newViolation: ProctoringViolation = {
        type,
        timestamp: new Date().toISOString(),
        details,
      };

      const newCount = strikesRef.current + 1;
      setStrikes(newCount);
      setViolationsLog((prev) => [...prev, newViolation]);
      setActiveWarning(newViolation);
      playWarningBeep();

      if (onViolation) {
        onViolation(newViolation, newCount);
      }

      if (newCount >= maxStrikes && onMaxStrikesReached) {
        onMaxStrikesReached([...violationsRef.current, newViolation]);
      }
    },
    [active, maxStrikes, onViolation, onMaxStrikesReached, playWarningBeep]
  );

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err: any) {
      console.warn('Fullscreen request failed:', err.message);
    }
  }, []);

  const clearActiveWarning = useCallback(() => {
    setActiveWarning(null);
  }, []);

  const resetProctoring = useCallback(() => {
    setStrikes(0);
    setViolationsLog([]);
    setActiveWarning(null);
    strikesRef.current = 0;
    violationsRef.current = [];
  }, []);

  // Listeners for Tab Switches, Window Focus, Fullscreen, Keystrokes, and Clipboard
  useEffect(() => {
    if (!active) return;

    // 1. Fullscreen Change
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);
      if (!inFullscreen) {
        recordViolation('FULLSCREEN_EXIT', 'Exited exam fullscreen lockdown mode.');
      }
    };

    // 2. Tab Switch (Visibility Change)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('TAB_SWITCH', 'Switched browser tab or minimized window.');
      }
    };

    // 3. Window Blur (Switching Application / DevTools)
    const handleWindowBlur = () => {
      // Small debounce to avoid false triggers during browser prompt popups
      setTimeout(() => {
        if (!document.hasFocus() || document.hidden) {
          recordViolation('WINDOW_BLUR', 'Switched focus away from exam application window.');
        }
      }, 250);
    };

    // 4. Keyboard Shortcuts Lockdown
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12, Ctrl+Shift+I/J/C, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 'c', 'C', 'v', 'V', 'p', 'P'].includes(e.key)) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation('CLIPBOARD_ATTEMPT', `Prohibited key command intercepted: ${e.key}`);
      }
    };

    // 5. Context Menu (Right-Click) Blocking
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation('CLIPBOARD_ATTEMPT', 'Right-click context menu prohibited during exam.');
    };

    // 6. Copy / Cut / Paste Blocking
    const handleClipboardEvent = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('CLIPBOARD_ATTEMPT', `Clipboard ${e.type} action prohibited during exam.`);
    };

    // 7. Page Leave Confirmation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active proctored examination. Leaving will invalidate your score.';
      return e.returnValue;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleClipboardEvent);
    window.addEventListener('cut', handleClipboardEvent);
    window.addEventListener('paste', handleClipboardEvent);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleClipboardEvent);
      window.removeEventListener('cut', handleClipboardEvent);
      window.removeEventListener('paste', handleClipboardEvent);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [active, recordViolation]);

  return {
    strikes,
    maxStrikes,
    violationsLog,
    isFullscreen,
    activeWarning,
    requestFullscreen,
    recordViolation,
    clearActiveWarning,
    resetProctoring,
  };
};