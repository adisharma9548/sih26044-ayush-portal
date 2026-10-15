import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Building2, MapPin, Globe, ArrowRight, ShieldCheck, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { CollegeSearchResult } from '../../types';

export const CollegeSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CollegeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = query.trim();
    if (!cleanQ || cleanQ.length < 2) {
      setErrorMessage('Please enter at least 2 characters to search.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setHasSearched(true);

    try {
      const res = await api.college.search(cleanQ, 10);
      const candidates = res.data || [];
      setResults(candidates);

      // If exact 1 candidate with high confidence, auto-navigate
      if (candidates.length === 1 && candidates[0].confidence >= 0.95) {
        const slug = deriveSlug(candidates[0].domain);
        navigate(`/college/${slug}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to search colleges. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const deriveSlug = (domain: string): string => {
    let clean = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    const parts = clean.split('.').filter(Boolean);
    if (parts.length >= 3 && (parts[parts.length - 2] === 'edu' || parts[parts.length - 2] === 'ac')) {
      return parts[parts.length - 3].replace(/[^a-z0-9]/g, '');
    }
    if (parts.length >= 2) {
      return parts[parts.length - 2].replace(/[^a-z0-9]/g, '');
    }
    return parts[0].replace(/[^a-z0-9]/g, '');
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Banner */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-4 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Autonomous Institutional Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Discover College & University Profiles
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Search any Indian higher education institution. Our AI engine dynamically identifies the official institutional domain and structures academic programs, placements, and departments in real time.
          </p>
        </header>

        {/* Search Bar Form */}
        <section aria-labelledby="search-heading" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 id="search-heading" className="sr-only">Search for a College or University</h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="college-search-input" className="sr-only">
                Enter college name or official domain
              </label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" aria-hidden="true" />
              </div>
              <input
                id="college-search-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="e.g. RKGIT, IIT Bombay, Delhi University, or rkgit.edu.in..."
                aria-describedby={errorMessage ? 'search-error-msg' : undefined}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-base transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 transition-colors text-base shadow-sm min-h-[48px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
                  <span>Discovering...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" aria-hidden="true" />
                  <span>Search</span>
                </>
              )}
            </button>
          </form>

          {errorMessage && (
            <p id="search-error-msg" role="alert" className="mt-3 text-sm text-rose-600 flex items-center gap-1.5">
              <span>{errorMessage}</span>
            </p>
          )}
        </section>

        {/* Results List */}
        <section aria-labelledby="results-heading">
          <h2 id="results-heading" className="sr-only">Search Results</h2>

          {isLoading && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-slate-600 font-medium">Extracting institution details from official domain...</p>
              <p className="text-xs text-slate-400 mt-1">Cross-referencing verified institutional databases</p>
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 px-4">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-lg font-bold text-slate-800">No institutions matched "{query}"</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                We couldn't locate an official institutional domain matching this query. You can try searching by exact domain (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">college.edu.in</code>).
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {results.length} Institution Candidate{results.length > 1 ? 's' : ''} Found
                </span>
                <span className="text-xs text-slate-400">Click to inspect universal academic profile</span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {results.map((item, idx) => {
                  const slug = deriveSlug(item.domain);
                  return (
                    <article
                      key={idx}
                      className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg flex-shrink-0 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Building2 className="w-6 h-6" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            <Link to={`/college/${slug}`} className="focus:outline-none focus-visible:underline">
                              {item.name}
                            </Link>
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                              {item.domain}
                            </span>
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                {item.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-400">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                              {Math.round(item.confidence * 100)}% Confidence
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        to={`/college/${slug}`}
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all min-h-[44px] flex-shrink-0"
                      >
                        <span>View Profile</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
