import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle2, ShieldCheck, AlertCircle, ArrowLeft, Printer, Calendar, Building, UserCheck } from 'lucide-react';
import { api } from '../../services/api';
import { CertificateModal } from '../../components/common/CertificateModal';

export const VerifyCertificatePage: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const [certData, setCertData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchCert = async () => {
      if (!certId) return;
      setLoading(true);
      try {
        const res = await api.learning.getCertificate(certId);
        if (res.data) {
          setCertData(res.data);
        } else {
          setError('Certificate not found or credential identifier invalid.');
        }
      } catch (err: any) {
        setError(err.message || 'Unable to verify credential at this time.');
      }
      setLoading(false);
    };

    fetchCert();
  }, [certId]);

  return (
    <div className="min-h-[85vh] bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to National Portal</span>
          </Link>
        </div>

        {/* Verification Status Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header Bar */}
          <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <h1 className="text-sm font-bold tracking-tight">
                  National NodalConnector Credential Registry
                </h1>
                <p className="text-[10px] text-slate-400">
                  Government & Industry Verification Protocol (SIH26044)
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              AUDIT: ACTIVE
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {loading && (
              <div className="text-center py-12 space-y-3">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Querying cryptographic credential ledger...</p>
              </div>
            )}

            {error && !loading && (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Verification Unsuccessful</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
                </div>
              </div>
            )}

            {certData && !loading && (
              <div className="space-y-6">
                {/* Verified Banner */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-emerald-900">
                      Authentic Credential Verified
                    </h2>
                    <p className="text-xs text-emerald-700">
                      This certificate was legitimately issued and registered with the National Directorate.
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Awarded Scholar
                    </span>
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>{certData.studentName}</span>
                    </div>
                    {certData.studentEmail && (
                      <span className="text-[11px] text-slate-500 font-mono block">
                        {certData.studentEmail}
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Accredited Institution
                    </span>
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>{certData.institution}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Certified Program & Track
                    </span>
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>{certData.courseTitle}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Credential ID
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-[11px] block">
                      {certData.certificateId}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Issue Date
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {certData.completedAt
                          ? new Date(certData.completedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Official Record Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Issuer: {certData.issuer}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Verification</span>
                    </button>
                    <button
                      onClick={() => setShowModal(true)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Full Certificate</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {certData && (
        <CertificateModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          certificate={certData}
        />
      )}
    </div>
  );
};
