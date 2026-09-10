import React, { useState } from 'react';
import { Award, CheckCircle2, Copy, ExternalLink, Printer, ShieldCheck, X } from 'lucide-react';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    certificateId: string;
    studentName: string;
    courseTitle: string;
    completedAt?: string | Date;
    institution?: string;
  };
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  certificate,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const dateStr = certificate.completedAt
    ? new Date(certificate.completedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const verifyUrl = `${window.location.origin}/verify/${certificate.certificateId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    verifyUrl
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              National Digital Credential
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Card Preview (Printable Area) */}
        <div className="p-8 sm:p-10 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/30">
          <div className="relative p-6 sm:p-8 rounded-2xl border-4 border-amber-600/60 bg-white shadow-inner text-center space-y-6">
            {/* Outer Decorative Border Ring */}
            <div className="absolute inset-1.5 border border-dashed border-amber-500/40 rounded-xl pointer-events-none" />

            {/* Emblem / Header */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md flex items-center justify-center text-white">
                <Award className="w-8 h-8" />
              </div>
              <p className="text-[10px] uppercase font-extrabold tracking-widest text-amber-800">
                National Directorate for Academia-Industry Integration (SIH26044)
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif uppercase">
                Certificate of Competency
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This verified digital credential certifies active mastery and practical defense in the industry course
              </p>
            </div>

            {/* Recipient Details */}
            <div className="space-y-1 py-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Proudly Presented To
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif border-b-2 border-amber-400/70 inline-block px-8 pb-1">
                {certificate.studentName}
              </h3>
              {certificate.institution && (
                <p className="text-xs text-slate-600 font-medium pt-1">
                  {certificate.institution}
                </p>
              )}
            </div>

            {/* Course Title */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">
                For successfully fulfilling all milestones & manual-coding assessments in
              </span>
              <h4 className="text-lg sm:text-xl font-bold text-amber-900 bg-amber-50/80 rounded-xl py-2 px-4 border border-amber-200/60 max-w-xl mx-auto">
                {certificate.courseTitle}
              </h4>
            </div>

            {/* Certificate Footer / QR / Meta */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              {/* QR Code */}
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <img
                    src={qrCodeUrl}
                    alt="Certificate QR Verification"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <div className="text-[11px] space-y-0.5">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cryptographically Verified</span>
                  </div>
                  <p className="text-slate-500 font-mono text-[10px]">
                    ID: {certificate.certificateId}
                  </p>
                  <p className="text-slate-400 text-[10px]">Issued on {dateStr}</p>
                </div>
              </div>

              {/* Digital Seal */}
              <div className="text-center sm:text-right">
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                  NODALCONNECTOR OFFICIAL RECORD
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Tamper-Evident Ledger Entry • Publicly Auditable
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Verification Link Copied!' : 'Copy Verification URL'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Verify Public Page</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
