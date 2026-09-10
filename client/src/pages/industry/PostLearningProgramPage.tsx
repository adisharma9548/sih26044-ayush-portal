import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import {
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  AlertCircle,
  School,
  Lightbulb,
} from 'lucide-react';

const INITIAL_LEARNING_DOMAINS = [
  'Artificial Intelligence & Machine Learning',
  'Cloud Native DevOps & Infrastructure',
  'Full-Stack Web & Mobile Engineering',
  'AYUSH & Phytomedicinal Pharmacology',
  'Data Science, Big Data & Analytics',
  'Cybersecurity & Threat Defense',
  'Bioinformatics & Computational Biology',
  'Robotics, Embedded Systems & IoT',
  'Biotechnology & Clinical Research Trials',
];

export const PostLearningProgramPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Dynamic AI Intelligence & Copy State
  const [dynamicSubtitle, setDynamicSubtitle] = useState<string>(
    'Empower university scholars across partner institutions with verified competency frameworks and real-world operational training.'
  );
  const [marketInsight, setMarketInsight] = useState<string>('');
  const [gapStatistic, setGapStatistic] = useState<string>('');
  const [trendingTopics, setTrendingTopics] = useState<string[]>([
    'Core Architecture & Tooling',
    'Real-World Production Workflows',
    'Enterprise Standards & Security',
    'Capstone Evaluation & Sandbox Tests',
  ]);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Dynamic Disciplines
  const [domains, setDomains] = useState<string[]>(INITIAL_LEARNING_DOMAINS);
  const [showCustomDomainInput, setShowCustomDomainInput] = useState(false);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [discoveringDomains, setDiscoveringDomains] = useState(false);

  // Field-level AI assistance
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [showTitleOptions, setShowTitleOptions] = useState(false);

  // Academia - Industry Bilateral Co-Sponsorship
  const [academicCoSponsor, setAcademicCoSponsor] = useState(false);
  const [partnerInstitution, setPartnerInstitution] = useState('');
  const [academicCreditType, setAcademicCreditType] = useState('UGC 2-Credit Technical Elective');
  const [partnerList, setPartnerList] = useState<string[]>([]);

  // Dynamically load active academic institutions from system database
  useEffect(() => {
    const loadAcademicPartners = async () => {
      try {
        const res = await api.admin.getPartners();
        if (Array.isArray(res.data)) {
          const names = res.data
            .map((p: any) => p.name || p.organizationName)
            .filter(Boolean);
          if (names.length > 0) {
            setPartnerList(names);
          }
        }
      } catch (err) {
        // quiet fallback
      }
    };
    loadAcademicPartners();
  }, []);

  // AI Curriculum Studio State
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiNotice, setAiNotice] = useState('');

  const [formData, setFormData] = useState<{
    title: string;
    provider: string;
    type: 'certification' | 'workshop' | 'course';
    duration: string;
    skillsCovered: string;
    description: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    cost: string;
    ayushDomain: string;
    syllabus: string;
  }>({
    title: '',
    provider: user?.institution || user?.name || '',
    type: 'certification',
    duration: '4 Weeks / 20 Hours',
    skillsCovered: '',
    description: '',
    level: 'Intermediate',
    cost: 'Free',
    ayushDomain: INITIAL_LEARNING_DOMAINS[0],
    syllabus: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Fetch dynamic AI Market Insight whenever domain or format changes
  const fetchMarketInsight = async (
    domain: string,
    type: 'certification' | 'workshop' | 'course'
  ) => {
    setLoadingInsight(true);
    try {
      const res = await api.ai.getLearningMarketInsight({ domain, type });
      if (res.data) {
        if (res.data.subtitle) setDynamicSubtitle(res.data.subtitle);
        if (res.data.marketInsight) setMarketInsight(res.data.marketInsight);
        if (res.data.gapStatistic) setGapStatistic(res.data.gapStatistic);
        if (Array.isArray(res.data.trendingTopics) && res.data.trendingTopics.length > 0) {
          setTrendingTopics(res.data.trendingTopics);
        }
      }
    } catch (err: any) {
      console.warn('[PostLearningProgram] AI Market insight fallback:', err?.message);
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    fetchMarketInsight(formData.ayushDomain, formData.type);
  }, [formData.ayushDomain, formData.type]);

  const handleAiAutoDraft = async () => {
    setAiGenerating(true);
    setAiNotice('');
    try {
      const res = await api.ai.generateLearningModuleDraft({
        domain: formData.ayushDomain,
        type: formData.type,
        level: formData.level,
        cost: formData.cost,
        provider: formData.provider,
        prompt: aiPrompt.trim() || undefined,
      });

      const draft = res.data;
      if (draft) {
        setFormData((prev) => ({
          ...prev,
          title: draft.title || prev.title,
          duration: draft.duration || prev.duration,
          level: (draft.level as any) || prev.level,
          cost: draft.cost || prev.cost,
          skillsCovered: Array.isArray(draft.skillsCovered)
            ? draft.skillsCovered.join(', ')
            : draft.skillsCovered || prev.skillsCovered,
          description: draft.description || prev.description,
          syllabus: Array.isArray(draft.syllabus)
            ? draft.syllabus.join('\n')
            : draft.syllabus || prev.syllabus,
        }));
        setAiNotice(`✨ Groq AI auto-drafted curriculum for "${draft.title}"! Review & refine below.`);
        setTimeout(() => setAiNotice(''), 6000);
      }
    } catch (err: any) {
      setAiNotice('AI draft generator is currently offline. You can fill in the fields manually.');
      setTimeout(() => setAiNotice(''), 4000);
    } finally {
      setAiGenerating(false);
    }
  };

  // Field-level: Fetch AI Title Suggestions
  const handleFetchTitleSuggestions = async () => {
    setLoadingTitles(true);
    try {
      const res = await api.ai.getLearningTitleSuggestions({
        domain: formData.ayushDomain,
        type: formData.type,
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSuggestedTitles(res.data);
        setShowTitleOptions(true);
      }
    } catch (err: any) {
      setAiNotice('Could not generate titles at this moment.');
      setTimeout(() => setAiNotice(''), 3000);
    } finally {
      setLoadingTitles(false);
    }
  };

  // Field-level: Auto-detect skills based on domain
  const handleAutoDetectSkills = () => {
    const defaultDomainSkills: Record<string, string[]> = {
      'Artificial Intelligence & Machine Learning': [
        'PyTorch',
        'Model Fine-Tuning',
        'Vector Embeddings',
        'RAG Architectures',
        'MLOps',
      ],
      'Cloud Native DevOps & Infrastructure': [
        'Kubernetes',
        'Docker',
        'Terraform',
        'GitOps CI/CD',
        'Observability',
      ],
      'Full-Stack Web & Mobile Engineering': [
        'React',
        'TypeScript',
        'Node.js REST APIs',
        'PostgreSQL',
        'Tailwind CSS',
      ],
      'AYUSH & Phytomedicinal Pharmacology': [
        'Phytochemical Extraction',
        'Schedule T GMP',
        'Pharmacopoeia Quality Control',
        'Dravyaguna Analysis',
      ],
      'Data Science, Big Data & Analytics': [
        'Apache Spark',
        'Pandas',
        'SQL Pipelines',
        'Statistical Modeling',
        'Data Visualization',
      ],
      'Cybersecurity & Threat Defense': [
        'Zero Trust Network',
        'Vulnerability Scanning',
        'SIEM Threat Hunting',
        'Cryptographic Protocols',
      ],
    };

    const detected = defaultDomainSkills[formData.ayushDomain] || [
      formData.ayushDomain,
      'System Architecture',
      'Quality Assurance',
      'Production Deployment',
      'Compliance Standards',
    ];
    setFormData((prev) => ({
      ...prev,
      skillsCovered: detected.join(', '),
    }));
    setAiNotice(`✨ Auto-populated verified skills for ${formData.ayushDomain}!`);
    setTimeout(() => setAiNotice(''), 4000);
  };

  // Discover emerging disciplines with AI
  const handleDiscoverEmergingDomains = async () => {
    setDiscoveringDomains(true);
    try {
      const res = await api.ai.getLearningMarketInsight({
        domain: formData.ayushDomain,
        type: formData.type,
      });
      if (res.data?.emergingDomains && res.data.emergingDomains.length > 0) {
        setDomains((prev) => {
          const unique = Array.from(new Set([...prev, ...res.data.emergingDomains]));
          return unique;
        });
        setAiNotice(`✨ Discovered ${res.data.emergingDomains.length} emerging interdisciplinary tracks!`);
        setTimeout(() => setAiNotice(''), 5000);
      }
    } catch (err: any) {
      setAiNotice('Domain discovery currently offline.');
      setTimeout(() => setAiNotice(''), 3000);
    } finally {
      setDiscoveringDomains(false);
    }
  };

  const handleAddCustomDomain = () => {
    const trimmed = customDomainInput.trim();
    if (trimmed && !domains.includes(trimmed)) {
      setDomains((prev) => [trimmed, ...prev]);
      setFormData((prev) => ({ ...prev, ayushDomain: trimmed }));
      setCustomDomainInput('');
      setShowCustomDomainInput(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      provider: user?.institution || user?.name || '',
      type: 'certification',
      duration: '4 Weeks / 20 Hours',
      skillsCovered: '',
      description: '',
      level: 'Intermediate',
      cost: 'Free',
      ayushDomain: INITIAL_LEARNING_DOMAINS[0],
      syllabus: '',
    });
    setAiPrompt('');
    setAiNotice('');
    setShowTitleOptions(false);
    setAcademicCoSponsor(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const skills = formData.skillsCovered.split(',').map((s) => s.trim());
    const syllabusList = formData.syllabus.split('\n').filter(Boolean);

    const finalProvider =
      academicCoSponsor && partnerInstitution.trim()
        ? `${formData.provider} (in collaboration with ${partnerInstitution.trim()})`
        : formData.provider;

    const finalDescription = academicCoSponsor
      ? `${formData.description}\n\n[Academic Co-Sponsorship: Accredited with ${partnerInstitution} under ${academicCreditType}]`
      : formData.description;

    await api.learning.create({
      title: formData.title,
      provider: finalProvider,
      type: formData.type,
      duration: formData.duration,
      skillsCovered: skills,
      description: finalDescription,
      level: formData.level,
      cost: formData.cost,
      ayushDomain: formData.ayushDomain,
      syllabus: syllabusList,
    });

    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      navigate('/industry/programs');
    }, 1800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
              INDUSTRY SKILL ACCREDITATION
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {formData.type === 'workshop'
                ? '🛠️ Interactive Lab'
                : formData.type === 'course'
                ? '📖 Self-Paced Track'
                : '🎓 Certification Track'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Sponsor / Post Learning Module
          </h1>

          {/* DYNAMIC SUBTITLE - Replaces hardcoded static text */}
          <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
            {dynamicSubtitle}
            {loadingInsight && (
              <span className="text-[10px] text-purple-600 font-semibold ml-2 animate-pulse">
                (Updating AI Market Insight...)
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/industry/programs')}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
        >
          ← Back to Manage Modules
        </button>
      </div>

      {/* DYNAMIC AI LABOR MARKET GAP INTELLIGENCE CARD */}
      {marketInsight && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50 border border-purple-200/80 text-slate-800 text-xs shadow-xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                AI
              </div>
              <span className="font-bold text-purple-950 text-xs">
                Real-Time Labor Market Gap Intelligence: {formData.ayushDomain}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {gapStatistic && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  📊 {gapStatistic}
                </span>
              )}
              <button
                type="button"
                onClick={() => fetchMarketInsight(formData.ayushDomain, formData.type)}
                disabled={loadingInsight}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-purple-200 hover:bg-purple-100/60 text-purple-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Fetch updated market insights from Groq LLM"
              >
                <RefreshCw className={`w-3 h-3 ${loadingInsight ? 'animate-spin' : ''}`} />
                <span>Refresh AI Intelligence</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
            {marketInsight}
          </p>
        </div>
      )}

      {success ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-lg space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {formData.type === 'workshop'
              ? '🛠️ Hands-On Lab Published Live!'
              : formData.type === 'course'
              ? '📖 Self-Paced Course Published Live!'
              : '🎓 Industry Certification Published Live!'}
          </h2>
          <p className="text-xs text-slate-500">
            "{formData.title}" is now available in the curriculum catalog with dedicated interactive workspaces. Redirecting...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI Learning Module Studio Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/30 border border-purple-400/40 text-purple-200 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <span>AI Learning Module Studio</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-300/30 text-purple-200">
                      Dynamic Synthesis Engine
                    </span>
                  </h3>
                  <p className="text-[11px] text-purple-200">
                    Auto-synthesize NSQF-aligned curriculum, targeted skills, and multi-week syllabus modules
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200">
                Powered by Groq LLM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
              <div className="sm:col-span-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-purple-200">Target Discipline</label>
                  <button
                    type="button"
                    onClick={() => setShowCustomDomainInput(!showCustomDomainInput)}
                    className="text-[10px] text-amber-300 hover:text-amber-200 font-semibold underline cursor-pointer"
                  >
                    {showCustomDomainInput ? 'Select Existing' : '+ Custom'}
                  </button>
                </div>

                {showCustomDomainInput ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      placeholder="e.g. Quantum Computing"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-purple-950/90 border border-amber-400/50 text-white text-xs placeholder:text-purple-300/50 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomDomain}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs shrink-0 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.ayushDomain}
                    onChange={(e) => setFormData({ ...formData, ayushDomain: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-purple-950/70 border border-purple-400/30 text-white text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  >
                    {domains.map((dom) => (
                      <option key={dom} value={dom} className="bg-slate-900 text-white">
                        {dom}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="sm:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-purple-200">
                    Specific Topic / Guidance (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleDiscoverEmergingDomains}
                    disabled={discoveringDomains}
                    className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    title="Ask AI to discover new interdisciplinary domains"
                  >
                    <Sparkles className={`w-2.5 h-2.5 ${discoveringDomains ? 'animate-spin' : ''}`} />
                    <span>{discoveringDomains ? 'Discovering...' : '✨ AI Emerging Tracks'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={
                    formData.type === 'workshop'
                      ? 'e.g. Interactive Kubernetes CLI debugging or API unit tests'
                      : formData.type === 'course'
                      ? 'e.g. Async pipelines, microservices architecture & event buses'
                      : 'e.g. Full-stack cloud engineering or phytomedicinal extraction'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-purple-950/70 border border-purple-400/30 text-white text-xs placeholder:text-purple-300/60 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="button"
                  onClick={handleAiAutoDraft}
                  disabled={aiGenerating}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-spin' : ''}`} />
                  <span>{aiGenerating ? 'Synthesizing...' : '✨ Auto-Draft with AI'}</span>
                </button>
              </div>
            </div>

            {/* DYNAMIC AI TOPIC CHIPS - Adapt to selected domain */}
            <div className="pt-2 border-t border-purple-400/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3 h-3 text-amber-300" />
                <span className="text-[11px] font-bold text-purple-200">
                  Trending Demand Topics in {formData.ayushDomain} (Click to auto-fill prompt):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trendingTopics.map((topic, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAiPrompt(topic)}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-800/80 border border-purple-400/30 text-purple-200 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{topic}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Banner Format Selector */}
            <div className="pt-2 border-t border-purple-400/20">
              <span className="block text-[11px] font-bold text-purple-200 mb-1.5">
                Select Module Format to Draft with AI:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: 'workshop',
                      duration: '2 Days / 12 Hours',
                    }))
                  }
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.type === 'workshop'
                      ? 'bg-amber-400/20 border-amber-400 text-white font-bold ring-1 ring-amber-400 shadow-xs'
                      : 'bg-purple-950/40 border-purple-400/20 text-purple-200 hover:bg-purple-900/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>🛠️</span>
                    <span>Hands-On Lab</span>
                  </div>
                  <span className="text-[10px] text-purple-200/80 block mt-0.5">
                    Interactive code sandbox & live tests
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: 'course',
                      duration: '4 Weeks / 20 Hours',
                    }))
                  }
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.type === 'course'
                      ? 'bg-blue-400/20 border-blue-400 text-white font-bold ring-1 ring-blue-400 shadow-xs'
                      : 'bg-purple-950/40 border-purple-400/20 text-purple-200 hover:bg-purple-900/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>📖</span>
                    <span>Self-Paced Course</span>
                  </div>
                  <span className="text-[10px] text-purple-200/80 block mt-0.5">
                    Modular syllabus & progress tracking
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: 'certification',
                      duration: '6 Weeks / 40 Hours',
                    }))
                  }
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.type === 'certification'
                      ? 'bg-purple-400/30 border-purple-300 text-white font-bold ring-1 ring-purple-300 shadow-xs'
                      : 'bg-purple-950/40 border-purple-400/20 text-purple-200 hover:bg-purple-900/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>🎓</span>
                    <span>Industry Certification</span>
                  </div>
                  <span className="text-[10px] text-purple-200/80 block mt-0.5">
                    Comprehensive credential track
                  </span>
                </button>
              </div>
            </div>

            {aiNotice && (
              <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-400/30 text-[11px] text-purple-200 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{aiNotice}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5 text-xs">
            {/* Format Selection Cards in Main Form */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">
                  Choose Publishing Format:
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                  {formData.type === 'workshop'
                    ? '🛠️ HANDS-ON LAB'
                    : formData.type === 'course'
                    ? '📖 SELF-PACED COURSE'
                    : '🎓 INDUSTRY CERTIFICATION'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: 'workshop',
                      duration: formData.duration || '2 Days / 12 Hours',
                    })
                  }
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    formData.type === 'workshop'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 font-semibold shadow-xs ring-2 ring-amber-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <strong className="block text-slate-900 mb-1 flex items-center justify-between">
                    <span>🛠️ Hands-on Lab</span>
                    {formData.type === 'workshop' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </strong>
                  Practical in-browser coding sandbox with live terminal execution and anti-cheat typing enforcement.
                </div>
                <div
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: 'course',
                      duration: formData.duration || '4 Weeks / 20 Hours',
                    })
                  }
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    formData.type === 'course'
                      ? 'bg-blue-50 border-blue-400 text-blue-950 font-semibold shadow-xs ring-2 ring-blue-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <strong className="block text-slate-900 mb-1 flex items-center justify-between">
                    <span>📖 Self-Paced Course</span>
                    {formData.type === 'course' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </strong>
                  Structured reading modules, step-by-step technical guides, and checkpoint quizzes at student's pace.
                </div>
                <div
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: 'certification',
                      duration: formData.duration || '6 Weeks / 40 Hours',
                    })
                  }
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    formData.type === 'certification'
                      ? 'bg-purple-50 border-purple-400 text-purple-950 font-semibold shadow-xs ring-2 ring-purple-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <strong className="block text-slate-900 mb-1 flex items-center justify-between">
                    <span>🎓 Certification</span>
                    {formData.type === 'certification' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                    )}
                  </strong>
                  Comprehensive accredited curriculum with architectural theory, sandbox milestones, and verified certificate.
                </div>
              </div>
            </div>

            {/* ACADEMIA - INDUSTRY BILATERAL CO-SPONSORSHIP ACCREDITATION */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <School className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 text-xs">
                      Academia-Industry Co-Sponsorship & Sabbatical Credit
                    </span>
                    <span className="block text-[10px] text-emerald-700">
                      Link directly with university faculty and student cohorts for academic credit
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-xs">
                  <input
                    type="checkbox"
                    checked={academicCoSponsor}
                    onChange={(e) => setAcademicCoSponsor(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Enable Co-Sponsorship</span>
                </label>
              </div>

              {academicCoSponsor && (
                <div className="pt-2 border-t border-emerald-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      Partner University / Academic Institution
                    </label>
                    <input
                      type="text"
                      list="partner-institutions-list"
                      value={partnerInstitution}
                      onChange={(e) => setPartnerInstitution(e.target.value)}
                      placeholder="Search or enter accredited university name..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <datalist id="partner-institutions-list">
                      {partnerList.map((inst, i) => (
                        <option key={i} value={inst} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      Academic Recognition & Credit Equivalency
                    </label>
                    <select
                      value={academicCreditType}
                      onChange={(e) => setAcademicCreditType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                    >
                      <option value="UGC 2-Credit Technical Elective">UGC 2-Credit Technical Elective</option>
                      <option value="AICTE Mandatory Practical Internship Lab">AICTE Mandatory Practical Internship Lab</option>
                      <option value="Faculty FDP / Sabbatical Co-Teaching Credit">Faculty FDP / Sabbatical Co-Teaching Credit</option>
                      <option value="Corporate Pre-Placement Assessment Track">Corporate Pre-Placement Assessment Track</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">Program Title</label>
                  <button
                    type="button"
                    onClick={handleFetchTitleSuggestions}
                    disabled={loadingTitles}
                    className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className={`w-3 h-3 ${loadingTitles ? 'animate-spin' : ''}`} />
                    <span>{loadingTitles ? 'Thinking...' : '✨ AI Title Ideas'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  required
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={
                    formData.type === 'workshop'
                      ? 'e.g. Applied AI & Code Optimization Hands-On Lab'
                      : formData.type === 'course'
                      ? 'e.g. Cloud Distributed Systems & Microservices Architecture'
                      : 'e.g. Cloud Native DevOps & Kubernetes Masterclass'
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />

                {/* Suggested Title Dropdown / Chips */}
                {showTitleOptions && suggestedTitles.length > 0 && (
                  <div className="mt-1.5 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs space-y-1 animate-in fade-in duration-150">
                    <span className="text-[10px] font-bold text-purple-900 block">
                      Click to choose an AI-suggested title:
                    </span>
                    <div className="space-y-1">
                      {suggestedTitles.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, title: t }));
                            setShowTitleOptions(false);
                          }}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-purple-100 text-[11px] text-purple-950 font-medium transition-colors cursor-pointer flex items-center justify-between"
                        >
                          <span>{t}</span>
                          <span className="text-[10px] text-purple-600 font-bold">Use →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Sponsoring Enterprise / Faculty</label>
                <input
                  type="text"
                  required
                  name="provider"
                  value={formData.provider}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Program Format</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none font-medium"
                >
                  <option value="workshop">🛠️ Hands-On Lab (Interactive Code Sandbox)</option>
                  <option value="course">📖 Self-Paced Course (Modular Learning & Quizzes)</option>
                  <option value="certification">🎓 Industry Certification (Verified Digital Credential)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Duration</label>
                <input
                  type="text"
                  required
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="e.g. 4 Weeks / 20 Hours"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Difficulty Level</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Student Enrollment Fee</label>
                <input
                  type="text"
                  required
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  placeholder="e.g. Free or ₹499"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">
                  Targeted Skills Covered (comma separated)
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetectSkills}
                  className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>✨ Auto-Detect Skills</span>
                </button>
              </div>
              <input
                type="text"
                required
                name="skillsCovered"
                value={formData.skillsCovered}
                onChange={handleChange}
                placeholder="e.g. Docker, Kubernetes, CI/CD, Helm, Microservices"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Program Overview</label>
              <textarea
                required
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe curriculum objectives, practical training, and industry assessment methods..."
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Syllabus Modules (one module per line)
              </label>
              <textarea
                rows={4}
                name="syllabus"
                value={formData.syllabus}
                onChange={handleChange}
                placeholder={
                  'Module 1: Foundations & Toolchain Setup\nModule 2: Practical Implementation & Labs\nModule 3: Industry Best Practices & Architecture\nModule 4: Capstone Evaluation'
                }
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono text-[11px]"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>{loading ? 'Publishing Program...' : 'Publish Learning Module'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

