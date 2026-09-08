import React, { useState, useEffect } from 'react';
import { Sparkles, GraduationCap, BookOpen, ArrowRight, X, Search, Check } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  isOpen: boolean;
  currentDegree?: string;
  currentSpecialization?: string;
  onConfirm: (degree: string, specialization: string) => void;
  onClose?: () => void;
}

export const DegreeSpecializationPromptModal: React.FC<Props> = ({
  isOpen,
  currentDegree = '',
  currentSpecialization = '',
  onConfirm,
  onClose,
}) => {
  const [degree, setDegree] = useState(currentDegree);
  const [specialization, setSpecialization] = useState(currentSpecialization);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [academicField, setAcademicField] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When degree is modified or entered, fetch dynamic AI specializations
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = degree.trim();
    if (trimmed.length < 2) {
      setAiSuggestions([]);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoadingAi(true);
      setErrorMessage(null);
      try {
        const res = await api.ai.getSpecializations(trimmed);
        if (isMounted && res.data) {
          setAiSuggestions(res.data.specializations || []);
          setAcademicField(res.data.academicField || '');
          if (!specialization && res.data.specializations?.length > 0) {
            setSpecialization(res.data.specializations[0]);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Unable to fetch AI specializations. You can type your own.');
        }
      } finally {
        if (isMounted) setLoadingAi(false);
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [degree, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!degree.trim()) {
      setErrorMessage('Please enter or select your degree/program.');
      return;
    }
    if (!specialization.trim()) {
      setErrorMessage('Please enter or select your academic specialization.');
      return;
    }
    onConfirm(degree.trim(), specialization.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                  AI ACADEMIC CALIBRATION
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                Select Degree & Specialization
              </h3>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          The test engine will dynamically formulate examination questions tailored specifically to your exact academic major using live AI generation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Degree Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Academic Degree / Program
            </label>
            <div className="relative">
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. LL.B, BAMS, B.Tech Computer Science, B.Pharm, MBA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                required
              />
              {loadingAi && (
                <div className="absolute right-3 top-2.5">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            {academicField && (
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                <span>Recognized Field:</span>
                <strong>{academicField}</strong>
              </p>
            )}
          </div>

          {/* AI Discovered Specializations */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Specialization / Topic Focus</span>
              {loadingAi && <span className="text-[10px] text-slate-400 font-normal">Generating AI tracks...</span>}
            </label>

            {aiSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                {aiSuggestions.map((spec) => {
                  const isSelected = specialization === spec;
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setSpecialization(spec)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{spec}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Specialization Input */}
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Or type custom specialization (e.g. Constitutional Law)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              required
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-red-600 font-semibold">{errorMessage}</p>
          )}

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              <span>Confirm & Generate Questions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};