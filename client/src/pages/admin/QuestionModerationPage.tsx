import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { IAdminQuestion } from '../../types';
import {
  HelpCircle,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Archive,
  RefreshCw,
  Loader2,
  Filter,
  Check,
} from 'lucide-react';

export const QuestionModerationPage: React.FC = () => {
  const [questions, setQuestions] = useState<IAdminQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [activeQuestion, setActiveQuestion] = useState<IAdminQuestion | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form state
  const [formCategory, setFormCategory] = useState<string>('Ayurveda');
  const [formQuestion, setFormQuestion] = useState<string>('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState<string>('');
  const [formWeight, setFormWeight] = useState<number>(20);
  const [formDifficulty, setFormDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [formStatus, setFormStatus] = useState<'active' | 'retired' | 'under_review'>('active');

  const fetchQuestions = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params: any = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (selectedDifficulty !== 'All') params.difficulty = selectedDifficulty;
      if (search.trim()) params.search = search.trim();

      const res = await api.admin.getQuestions(params);
      if (res.data) {
        setQuestions(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to retrieve question bank.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory, selectedStatus, selectedDifficulty]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleOpenCreate = () => {
    setFormCategory('Ayurveda');
    setFormQuestion('');
    setFormOptions(['', '', '', '']);
    setFormCorrectIndex(0);
    setFormExplanation('');
    setFormWeight(20);
    setFormDifficulty('Intermediate');
    setFormStatus('active');
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (q: IAdminQuestion) => {
    setActiveQuestion(q);
    setFormCategory(q.category);
    setFormQuestion(q.question);
    setFormOptions(q.options.length ? [...q.options] : ['', '', '', '']);
    setFormCorrectIndex(q.correctIndex || 0);
    setFormExplanation(q.explanation || '');
    setFormWeight(q.weight || 20);
    setFormDifficulty(q.difficulty || 'Intermediate');
    setFormStatus(q.status || 'active');
    setEditModalOpen(true);
  };

  const handleSaveQuestion = async (isEdit: boolean) => {
    if (!formQuestion.trim() || formOptions.some((opt) => !opt.trim())) {
      alert('Please fill out question text and all option choices.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        category: formCategory,
        question: formQuestion.trim(),
        options: formOptions.map((o) => o.trim()),
        correctIndex: formCorrectIndex,
        explanation: formExplanation.trim(),
        weight: formWeight,
        difficulty: formDifficulty,
        status: formStatus,
      };

      if (isEdit && activeQuestion) {
        const qId = activeQuestion.id || activeQuestion._id;
        await api.admin.updateQuestion(qId!, payload);
        setSuccessMessage('Question updated successfully.');
        setEditModalOpen(false);
      } else {
        await api.admin.createQuestion(payload);
        setSuccessMessage('Question authored and published to Question Bank.');
        setCreateModalOpen(false);
      }
      await fetchQuestions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRetire = async (q: IAdminQuestion) => {
    const qId = q.id || q._id;
    if (!qId) return;
    const newStatus = q.status === 'retired' ? 'active' : 'retired';
    try {
      await api.admin.updateQuestion(qId, { status: newStatus });
      setQuestions((prev) =>
        prev.map((item) => ((item.id || item._id) === qId ? { ...item, status: newStatus } : item))
      );
      setSuccessMessage(`Question ${newStatus === 'retired' ? 'retired' : 're-activated'} successfully.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update question status');
    }
  };

  const categories = ['All', 'Ayurveda', 'Yoga & Naturopathy', 'Unani', 'Siddha', 'Homoeopathy', 'Clinical Research', 'Pharmacology', 'General'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            <HelpCircle className="w-4 h-4" />
            Adaptive Assessment Engine
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Question Bank Moderation</h1>
          <p className="text-xs text-slate-500">Inspect, curate, update, or retire diagnostic evaluation questions</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs">
          {successMessage}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question text..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="under_review">Under Review</option>
            <option value="retired">Retired</option>
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <button
            onClick={() => fetchQuestions()}
            className="p-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs text-slate-500">Loading moderated questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No questions found matching your filter criteria.
          </div>
        ) : (
          questions.map((q) => {
            const isRetired = q.status === 'retired';
            return (
              <div
                key={q.id || q._id}
                className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all ${
                  isRetired ? 'opacity-60 border-rose-200 dark:border-rose-950' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">#{q.numericId}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {q.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {q.difficulty}
                      </span>
                      <span className="text-[10px] text-slate-400">&bull; Weight: {q.weight} pts</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          q.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : q.status === 'under_review'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                      {q.question}
                    </h3>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correctIndex;
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="truncate flex-1">{opt}</span>
                            {isCorrect && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-start">
                    <button
                      onClick={() => handleOpenEdit(q)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleRetire(q)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors ${
                        isRetired
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      {isRetired ? 'Activate' : 'Retire'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Author / Edit Modal */}
      {(createModalOpen || editModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {editModalOpen ? 'Edit Assessment Question' : 'Author New Assessment Question'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Difficulty</label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="active">active</option>
                  <option value="under_review">under_review</option>
                  <option value="retired">retired</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Question Statement</label>
              <textarea
                rows={3}
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="Enter verified diagnostic question..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Answer Choices (Select radio button for server-verified correct answer)
              </label>
              {formOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIndex"
                    checked={formCorrectIndex === i}
                    onChange={() => setFormCorrectIndex(i)}
                    className="accent-emerald-600"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...formOptions];
                      updated[i] = e.target.value;
                      setFormOptions(updated);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Official Explanation</label>
              <textarea
                rows={2}
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
                placeholder="Detailed rationale for student debrief..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setEditModalOpen(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveQuestion(editModalOpen)}
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editModalOpen ? 'Update Question' : 'Publish Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionModerationPage;
