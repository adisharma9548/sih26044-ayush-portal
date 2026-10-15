import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { IResume, IResumeParsedData } from '../../types';
import { ALL_INDIAN_STATES, getDistrictsForState } from '../../data/indiaGeography';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Download,
  Plus,
  Trash2,
  Building,
  GraduationCap,
  Sparkles,
  MapPin,
  RefreshCw,
  Target,
} from 'lucide-react';

export const ResumeUploadReviewPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [uploading, setUploading] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [activeResume, setActiveResume] = useState<IResume | null>(null);
  const [formData, setFormData] = useState<IResumeParsedData>({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: {
      state: user?.locationStructured?.state || '',
      district: user?.locationStructured?.district || '',
      city: user?.locationStructured?.city || '',
      country: 'India',
    },
    education: [],
    skills: [],
    experience: [],
    projects: [],
  });

  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [confirmedSuccess, setConfirmedSuccess] = useState<boolean>(false);

  // Fetch existing resume if already uploaded
  useEffect(() => {
    async function loadResume() {
      try {
        const res = await api.resumes.getMyResume();
        if (res.data) {
          setActiveResume(res.data);
          const dataToLoad = res.data.confirmedData || res.data.extractedData;
          if (dataToLoad) {
            setFormData((prev) => ({
              ...prev,
              ...dataToLoad,
              location: {
                ...prev.location,
                ...(dataToLoad.location || {}),
              },
            }));
            if (dataToLoad.location?.state) {
              setAvailableDistricts(getDistrictsForState(dataToLoad.location.state));
            }
          }
        }
      } catch {
        // No resume yet
      }
    }
    loadResume();
  }, []);

  const handleStateChange = (stateName: string) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        state: stateName,
        district: '', // Reset district when state changes
      },
    }));
    setAvailableDistricts(getDistrictsForState(stateName));
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMessage('');
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Invalid file format. Please upload a PDF, DOC, or DOCX document.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB maximum limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const data = new FormData();
      data.append('file', selectedFile);

      const res = await api.resumes.upload(data);
      if (res.data) {
        setActiveResume(res.data);
        const extracted = res.data.extractedData;
        if (extracted) {
          setFormData((prev) => ({
            ...prev,
            ...extracted,
            location: {
              ...prev.location,
              ...(extracted.location || {}),
            },
          }));
          if (extracted.location?.state) {
            setAvailableDistricts(getDistrictsForState(extracted.location.state));
          }
          setSuccessMessage('Resume parsed successfully! Please review and confirm your details below.');
        } else if (res.data.extractionStatus === 'failed') {
          setErrorMessage(
            res.data.extractionError ||
            'Could not extract text automatically (scanned image or protected PDF). You can enter and confirm your details manually below.'
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!activeResume?.id && !activeResume?._id) {
      setErrorMessage('Please upload a resume before confirming.');
      return;
    }
    setConfirming(true);
    setErrorMessage('');

    try {
      const resumeId = activeResume.id || (activeResume as any)._id;
      const res = await api.resumes.confirm(resumeId, formData);
      if (res.data) {
        setConfirmedSuccess(true);
        setSuccessMessage('Profile and verified competencies successfully synchronized from your resume!');
        if (refreshUser) await refreshUser();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save confirmed resume profile.');
    } finally {
      setConfirming(false);
    }
  };



  const addEducation = () => {
    setFormData((prev) => ({
      ...prev,
      education: [
        ...(prev.education || []),
        { institution: '', degree: '', fieldOfStudy: '', startYear: 2021, endYear: 2025 },
      ],
    }));
  };

  const removeEducation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index),
    }));
  };

  const updateEducation = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const updated = [...(prev.education || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              NATIONAL COMPETENCY REPOSITORY
            </span>
            <span className="text-xs text-slate-400">NodalConnector Verified</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Compulsory Resume Upload & AI Skill Extraction
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload your authentic curriculum vitae to extract, calibrate, and verify your competencies
          </p>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-2xl shadow-xs self-start sm:self-auto">
          <button
            onClick={() => navigate('/student/resume')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Step 1: Resume & Skills</span>
          </button>
          <button
            onClick={() => navigate('/student/target-role')}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Target className="w-3.5 h-3.5 text-slate-400" />
            <span>Step 2: Target Role Gap</span>
          </button>
        </div>
      </div>

      {/* Confirmation Success Banner */}
      {confirmedSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-emerald-950">Resume Confirmed & Synchronized</h3>
                <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                  Profile Updated
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Educational background and contact information successfully confirmed and synchronized to your student profile.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/student/target-role')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Analyze Target Roles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="px-4 py-2 rounded-xl bg-white text-slate-700 font-semibold text-xs border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {successMessage && !confirmedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <div>{successMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload Document & File Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              1. Upload Resume Document
            </h2>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50'
              }`}
            >
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <div className="text-xs font-semibold text-slate-700">
                Drag & drop your PDF or DOCX file here
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Supported formats: PDF, DOCX (Max 5MB)</div>

              <label className="mt-4 inline-block">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs cursor-pointer transition-colors inline-block">
                  Browse Files
                </span>
              </label>

              {selectedFile && (
                <div className="mt-4 p-3 bg-emerald-50/80 rounded-xl text-left border border-emerald-200 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-emerald-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Extract AI
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Existing Upload Info */}
            {activeResume && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-slate-500">Active Document on File</div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeResume.extractionStatus === 'completed' || activeResume.extractionStatus === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeResume.extractionStatus === 'failed'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {activeResume.extractionStatus.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 text-xs font-bold text-slate-800 truncate">
                  {activeResume.originalFilename}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Uploaded: {new Date(activeResume.uploadedAt).toLocaleDateString()} &bull; Size:{' '}
                  {(activeResume.fileSizeBytes / 1024).toFixed(1)} KB
                </div>

                <a
                  href={`#`}
                  onClick={async (e) => {
                    e.preventDefault();
                    const resumeId = activeResume.id || (activeResume as any)._id;
                    try {
                      const res = await api.resumes.download(resumeId);
                      if (res.data?.downloadUrl) {
                        window.open(res.data.downloadUrl, '_blank');
                      }
                    } catch (err: any) {
                      setErrorMessage(err.message || 'Download failed');
                    }
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Authorized Document
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Side-by-Side Review & Confirmation Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  2. Review & Confirm Extracted Credentials
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirming synchronizes verified competencies directly to your SkillProfile with source: 'resume'.
                </p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span>Confirm & Sync</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Structured Indian Geography Cascade */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Standardized Indian Administrative Geography
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">State / UT</label>
                  <select
                    value={formData.location?.state || ''}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Select State / UT</option>
                    {ALL_INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">District</label>
                  <select
                    value={formData.location?.district || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: { ...formData.location, district: e.target.value },
                      })
                    }
                    disabled={!availableDistricts.length}
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                  >
                    <option value="">Select District</option>
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    value={formData.location?.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: { ...formData.location, city: e.target.value },
                      })
                    }
                    placeholder="e.g. Varanasi, Pune"
                    className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Education Credentials */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  Educational Credentials & Institution
                </h3>
                <button
                  type="button"
                  onClick={addEducation}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Degree
                </button>
              </div>

              {(formData.education || []).map((edu, idx) => (
                <div key={idx} className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => removeEducation(idx)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Institution / College</label>
                      <input
                        type="text"
                        value={edu.institution || ''}
                        onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                        placeholder="e.g. National Institute of Ayurveda, Jaipur"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Degree / Qualification</label>
                      <input
                        type="text"
                        value={edu.degree || ''}
                        onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                        placeholder="e.g. BAMS, MD (Ayurveda)"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Specialization</label>
                      <input
                        type="text"
                        value={edu.fieldOfStudy || ''}
                        onChange={(e) => updateEducation(idx, 'fieldOfStudy', e.target.value)}
                        placeholder="e.g. Panchakarma"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Completion Year</label>
                      <input
                        type="number"
                        value={edu.endYear || ''}
                        onChange={(e) => updateEducation(idx, 'endYear', Number(e.target.value))}
                        placeholder="2025"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Grade / CGPA</label>
                      <input
                        type="text"
                        value={edu.grade || ''}
                        onChange={(e) => updateEducation(idx, 'grade', e.target.value)}
                        placeholder="e.g. 8.4 CGPA"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>



            {/* Bottom confirmation action */}
            <div className="pt-5 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Confirming Profile...
                  </>
                ) : (
                  <>
                    <span>Confirm & Synchronize Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeUploadReviewPage;
