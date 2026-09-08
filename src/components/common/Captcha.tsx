import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export interface CaptchaRef {
  validate: () => boolean;
  refresh: () => void;
  getValue: () => string;
}

interface CaptchaProps {
  onValidate?: (isValid: boolean) => void;
  className?: string;
  error?: string | null;
}

export const Captcha = forwardRef<CaptchaRef, CaptchaProps>(({ onValidate, className = '', error }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [captchaCode, setCaptchaCode] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [isValidated, setIsValidated] = useState<boolean | null>(null);

  const generateCaptchaText = (length = 6): string => {
    // Exclude easily confused characters: 0, O, o, 1, I, l
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset and set canvas dimensions
    const width = 160;
    const height = 44;
    canvas.width = width;
    canvas.height = height;

    // Background gradient with light cool tones
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f1f5f9');
    gradient.addColorStop(0.5, '#e2e8f0');
    gradient.addColorStop(1, '#f8fafc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Random background noise lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, 0.25)`;
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height
      );
      ctx.stroke();
    }

    // Random background noise dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, 0.3)`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render distorted characters
    const charSpacing = width / (text.length + 1);
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      ctx.save();
      const x = charSpacing * (i + 0.75);
      const y = height / 2 + Math.random() * 6 - 3;
      const angle = (Math.random() - 0.5) * 0.45; // slight tilt

      ctx.translate(x, y);
      ctx.rotate(angle);

      // Random dark distinct colors for text
      const colors = ['#0f172a', '#047857', '#1e3a8a', '#7c2d12', '#334155', '#166534'];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.font = `bold ${22 + Math.floor(Math.random() * 4)}px monospace`;
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 0, 0);

      ctx.restore();
    }
  };

  const refreshCaptcha = () => {
    const newCode = generateCaptchaText(5);
    setCaptchaCode(newCode);
    setUserInput('');
    setIsValidated(null);
    if (onValidate) onValidate(false);
    setTimeout(() => drawCaptcha(newCode), 20);
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserInput(val);
    const valid = val.toLowerCase().trim() === captchaCode.toLowerCase().trim();
    setIsValidated(valid);
    if (onValidate) onValidate(valid);
  };

  useImperativeHandle(ref, () => ({
    validate: () => {
      const valid = userInput.toLowerCase().trim() === captchaCode.toLowerCase().trim();
      setIsValidated(valid);
      return valid;
    },
    refresh: refreshCaptcha,
    getValue: () => userInput,
  }));

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Anti-Bot Security Verification
        </label>
        <span className="text-[10px] text-slate-400">Case-insensitive</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Canvas box */}
        <div className="relative border border-slate-300 rounded-xl overflow-hidden bg-slate-100 shadow-inner flex items-center shrink-0">
          <canvas ref={canvasRef} className="cursor-not-allowed select-none" />
          <button
            type="button"
            onClick={refreshCaptcha}
            title="Refresh CAPTCHA"
            className="absolute right-1.5 p-1 text-slate-500 hover:text-emerald-700 hover:bg-white/80 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Input box */}
        <div className="flex-1">
          <input
            type="text"
            required
            maxLength={6}
            value={userInput}
            onChange={handleInputChange}
            placeholder="Enter code"
            className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold tracking-wider uppercase text-slate-900 focus:outline-none focus:ring-2 ${
              isValidated === true
                ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/20'
                : error || isValidated === false && userInput.length >= 5
                ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                : 'border-slate-300 focus:ring-emerald-500'
            }`}
          />
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 font-medium">{error}</p>
      )}
    </div>
  );
});

Captcha.displayName = 'Captcha';
