import React, { useState, useRef, useEffect } from 'react';
import { useUGCDegreeSearch } from '../../hooks/useUGCDegreeSearch';
import { UGCDegreeSuggestion } from '../../types';
import { CheckCircle2, Loader2, Search, BookOpen, ChevronDown } from 'lucide-react';

interface UGCDegreeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'degree' | 'field';
  placeholder?: string;
  label?: string;
  required?: boolean;
  name?: string;
}

export const UGCDegreeSelector: React.FC<UGCDegreeSelectorProps> = ({
  value,
  onChange,
  type = 'degree',
  placeholder = 'Type to search UGC approved programs (e.g. B.Tech, B.Com, B.Arch, BAMS)...',
  label = 'UGC Recognized Academic Program',
  required = false,
  name = 'degree',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const { searchTerm, setSearchTerm, suggestions, isLoading } = useUGCDegreeSearch(type);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setSearchTerm(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelect = (item: UGCDegreeSuggestion) => {
    const display = type === 'degree' ? `${item.name} (${item.fullName})` : item.name;
    setInputValue(display);
    onChange(display);
    setIsOpen(false);
  };

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>UGC Gazette Approved</span>
          </span>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <BookOpen className="w-4 h-4" />
        </div>

        <input
          type="text"
          name={name}
          required={required}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-400"
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          ) : (
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform cursor-pointer ${isOpen ? 'rotate-180' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
            />
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto overflow-x-hidden p-1.5 space-y-1">
          {isLoading && suggestions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Verifying UGC academic framework...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/80 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-700">
                      {item.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      UGC ✓
                    </span>
                    {item.level && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        • {item.level}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {item.fullName}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 font-medium hidden sm:inline">
                  {item.category}
                </span>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-500">
              No matching UGC approved courses found. Please check your spelling.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
