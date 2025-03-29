import { useState, useEffect } from 'react';
import { UseSearchReturn } from '../types/hooks';

export function useSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  debounceMs = 300
): UseSearchReturn<T> {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const performSearch = async () => {
      if (!query) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await searchFn(query);
        if (isMounted) {
          setResults(searchResults);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Search failed'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    timeoutId = setTimeout(performSearch, debounceMs);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [query, searchFn, debounceMs]);

  return {
    query,
    results,
    isLoading,
    error,
    setQuery,
  };
} 