import React from 'react';
import {
  CheckCircle2,
  Sparkles,
  BookOpen,
  Target,
  ArrowRight
} from 'lucide-react';

interface LessonContentRendererProps {
  content: string;
  keyTakeaways?: string[];
  title?: string;
}

export const LessonContentRenderer: React.FC<LessonContentRendererProps> = ({
  content,
  keyTakeaways,
}) => {
  if (!content) return null;

  // Helper to strip residual markdown bold markers and clean text
  const cleanInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part.replace(/\\/g, '');
    });
  };

  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];

  const flushList = () => {
    if (currentListItems.length > 0) {
      renderedElements.push(
        <div key={`list-${renderedElements.length}`} className="grid grid-cols-1 gap-2.5 my-3">
          {currentListItems}
        </div>
      );
      currentListItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // 1. Headers (### or ## or #)
    if (trimmed.startsWith('#')) {
      flushList();
      const headingText = trimmed.replace(/^#+\s*/, '');
      renderedElements.push(
        <div
          key={`h-${index}`}
          className="my-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-transparent border border-emerald-200/70 flex items-center gap-3 shadow-2xs"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-800 block">
              SYLLABUS SECTION
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              {headingText}
            </h3>
          </div>
        </div>
      );
      return;
    }

    // 2. Bullet / List Items (- or * or •)
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
      const bulletRaw = trimmed.replace(/^[-*•]\s*/, '');

      // Check if bullet contains a bold title followed by a colon
      const boldTitleMatch = bulletRaw.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);

      if (boldTitleMatch) {
        const itemTitle = boldTitleMatch[1];
        const itemDesc = boldTitleMatch[2];

        currentListItems.push(
          <div
            key={`bullet-${index}`}
            className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all flex items-start gap-3 text-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <strong className="font-bold text-slate-900 block text-[11px] mb-0.5">
                {itemTitle}
              </strong>
              <span className="text-slate-600 leading-relaxed">
                {cleanInline(itemDesc)}
              </span>
            </div>
          </div>
        );
      } else {
        currentListItems.push(
          <div
            key={`bullet-${index}`}
            className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-start gap-3 text-xs text-slate-700 leading-relaxed"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1">{cleanInline(bulletRaw)}</span>
          </div>
        );
      }
      return;
    }

    // 3. Regular Paragraphs
    flushList();
    renderedElements.push(
      <p key={`p-${index}`} className="text-xs text-slate-700 leading-relaxed my-2 font-normal">
        {cleanInline(trimmed)}
      </p>
    );
  });

  flushList();

  return (
    <div className="space-y-4">
      {/* Content Flow */}
      <div className="space-y-1">{renderedElements}</div>

      {/* Key Takeaways Section (if available) */}
      {keyTakeaways && keyTakeaways.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xs space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-bold tracking-tight text-white">
              Targeted Practical Competency Takeaways
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {keyTakeaways.map((takeaway, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Target className="w-3 h-3 text-emerald-400" />
                <span>{takeaway}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
