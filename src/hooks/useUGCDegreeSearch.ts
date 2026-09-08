import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UGCDegreeSuggestion } from '../types';

export function useUGCDegreeSearch(type: 'degree' | 'field' = 'degree') {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<UGCDegreeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 500ms debounce gap between keystrokes to minimize load on backend & AI
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.ugc.searchDegrees(searchTerm, type);
        setSuggestions(res.data?.suggestions || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch UGC suggestions');
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, type]);

  return {
    searchTerm,
    setSearchTerm,
    suggestions,
    isLoading,
    error,
  };
}
