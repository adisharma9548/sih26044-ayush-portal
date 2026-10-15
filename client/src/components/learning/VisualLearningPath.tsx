import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { LearningPath, LearningPathMilestone } from '../../types';
import {
  Sparkles,
  CheckCircle2,
  Lock,
  Play,
  Clock,
  BookOpen,
  ExternalLink,
  Target,
  RefreshCw,
  Award,
  ChevronDown,
  ChevronUp,
  Compass,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const VisualLearningPath: React.FC = () => {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom Goal Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [customGoalInput, setCustomGoalInput] = useState<string>('');

  // Expanded topics state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchCurrentPath = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.learning.getCurrentPath();
      setPath(res.data);
    } catch (err: any) {
      console.error('Failed to load current visual learning path:', err);
      setError(err?.message || 'Failed to load visual learning pathway');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentPath();
  }, []);

  const handleGenerate = async (customGoal?: string) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.learning.generatePath(customGoal ? { customGoal } : undefined);
      setPath(res.data);
      setIsModalOpen(false);
      setCustomGoalInput('');
    } catch (err: any) {
      console.error('Failed to generate learning path with AI:', err);
      setError(err?.message || 'Failed to generate path with AI');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleStatus = async (milestoneId: string, targetStatus: 'locked' | 'current' | 'completed') => {
    setUpdatingId(milestoneId);
    try {
      const res = await api.learning.updateMilestoneStatus(milestoneId, targetStatus);
      setPath(res.data);
    } catch (err: any) {
      console.error('Failed to update milestone status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">
          Retrieving your personalized visual learning pathway...
        </p>
      </div>
    );
  }

  // Empty State: Prompt user to generate their first visual AI learning path
  if (!path) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 inline-block">
            AI-POWERED VISUAL ROADMAP
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Create Your Adaptive Visual Learning Path
          </h2>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Generate an interactive milestone roadmap tailored dynamically to your academic discipline, current assessed competencies, and target career aspirations using our advanced curriculum intelligence.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Roadmap via AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Generate Path from My Assessed Skills</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={generating}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            Target Specific Goal / Role
          </button>
        </div>

        {/* Modal for Custom Goal */}
        {isModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => setIsModalOpen(false)}
            title="Target Specific Career Goal"
            subtitle="AI will engineer a customized visual milestone roadmap for this competency"
          >
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Career Role or Skill (e.g. "Cloud Architect", "Ayurvedic Clinical Researcher", "AI Systems Engineer")
                </label>
                <input
                  type="text"
                  value={customGoalInput}
                  onChange={(e) => setCustomGoalInput(e.target.value)}
                  placeholder="Enter role or goal..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate(customGoalInput.trim())}
                  disabled={!customGoalInput.trim() || generating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Build Custom Roadmap'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  const completedCount = path.milestones.filter((m) => m.status === 'completed').length;
  const totalCount = path.milestones.length;
  const progressPercent = path.overallProgress || Math.round((completedCount / Math.max(1, totalCount)) * 100);

  return (
    <div className="space-y-8">
      {/* Overview & Progress Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                ACTIVE VISUAL ROADMAP
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                {path.domain}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {path.title}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              {path.overview}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-300">Target Role:</span>
                <span className="font-semibold text-white">{path.targetRole}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">Milestones:</span>
                <span className="font-semibold text-white">
                  {completedCount} of {totalCount} completed
                </span>
              </div>
            </div>
          </div>

          {/* Progress Circular/Card Indicator */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-between shrink-0 min-w-[240px]">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-xs font-bold text-slate-200">Roadmap Progress</span>
              <span className="text-sm font-extrabold text-emerald-400">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden mb-3 border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{completedCount} Finished</span>
              <span>{totalCount - completedCount} Remaining</span>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={generating}
                className="text-[11px] font-bold text-indigo-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
                <span>Customize Goal</span>
              </button>

              <button
                onClick={() => handleGenerate()}
                disabled={generating}
                className="text-[11px] font-bold text-emerald-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Regenerate</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Connected Milestone Graph */}
      <div className="relative pl-6 sm:pl-10">
        {/* Continuous Connecting Line */}
        <div className="absolute left-[29px] sm:left-[45px] top-6 bottom-6 w-1 bg-gradient-to-b from-emerald-500 via-indigo-500 to-slate-200 rounded-full" />

        <div className="space-y-8">
          {path.milestones.map((milestone, idx) => {
            const isCompleted = milestone.status === 'completed';
            const isCurrent = milestone.status === 'current';
            const isLocked = milestone.status === 'locked';
            const isExpanded = !!expandedNodes[milestone.id];
            const isUpdating = updatingId === milestone.id;

            return (
              <div key={milestone.id} className="relative flex items-start gap-4 sm:gap-6 group">
                {/* Node Status Indicator Icon on the line */}
                <div className="relative z-10 shrink-0">
                  {isCompleted ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 border-2 border-white transition-transform group-hover:scale-105">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  ) : isCurrent ? (
                    <div className="relative">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-300 border-2 border-white transition-transform group-hover:scale-105 animate-pulse">
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
                      </div>
                      <span className="absolute -inset-1 rounded-full bg-indigo-400 opacity-40 animate-ping pointer-events-none" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border-2 border-slate-300">
                      <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Milestone Detail Card */}
                <div
                  className={`flex-1 bg-white rounded-3xl border p-5 sm:p-6 transition-all duration-200 shadow-xs ${
                    isCurrent
                      ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-md'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200/80 opacity-90'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Badges & Timeframe */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isCurrent
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Step {milestone.stepNumber.toString().padStart(2, '0')}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            milestone.difficulty === 'Beginner'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : milestone.difficulty === 'Advanced'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {milestone.difficulty}
                        </span>

                        {isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Completed
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                            Current Milestone
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{milestone.estimatedHours}</span>
                      </div>
                    </div>

                    {/* Milestone Title & Description */}
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        {milestone.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        {milestone.description}
                      </p>
                    </div>

                    {/* Core Topics Chips */}
                    {milestone.topics && milestone.topics.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {milestone.topics.map((topic, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/80"
                          >
                            #{topic}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expandable Learning Outcomes & Resources */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        {milestone.learningOutcomes && milestone.learningOutcomes.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Demonstrated Outcomes
                            </span>
                            <ul className="space-y-1">
                              {milestone.learningOutcomes.map((outcome, oIdx) => (
                                <li key={oIdx} className="text-xs text-slate-700 flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{outcome}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {milestone.resources && milestone.resources.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Curriculum Guides & References
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {milestone.resources.map((resItem, rIdx) => (
                                <a
                                  key={rIdx}
                                  href={resItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-200/60 transition-colors"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>{resItem.title}</span>
                                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={() => toggleExpand(milestone.id)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Syllabus & Outcomes'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* Milestone Status Toggle Controls */}
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <button
                            onClick={() => handleToggleStatus(milestone.id, 'current')}
                            disabled={isUpdating}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reopen</span>
                          </button>
                        ) : isCurrent ? (
                          <button
                            onClick={() => handleToggleStatus(milestone.id, 'completed')}
                            disabled={isUpdating}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Completed ➔</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(milestone.id, 'current')}
                            disabled={isUpdating}
                            className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-indigo-700" />
                            <span>Set as Current</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Custom Goal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title="Target Specific Career Goal"
          subtitle="AI will engineer a customized visual milestone roadmap for this competency"
        >
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Career Role or Skill (e.g. "Cloud Architect", "Ayurvedic Clinical Researcher", "AI Systems Engineer")
              </label>
              <input
                type="text"
                value={customGoalInput}
                onChange={(e) => setCustomGoalInput(e.target.value)}
                placeholder="Enter role or goal..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleGenerate(customGoalInput.trim())}
                disabled={!customGoalInput.trim() || generating}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Build Custom Roadmap'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
