import { useState, useEffect } from 'react';
import { liteClient } from 'algoliasearch/lite';

const APP_ID = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID || '';
const SEARCH_KEY = process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_KEY || '';

// Initialize client only if keys are present
const searchClient = (APP_ID && SEARCH_KEY) ? liteClient(APP_ID, SEARCH_KEY) : null;

export interface AlgoliaSearchParams {
  indexName: string;
  query: string;
  city?: string;
  council?: string;
  hitsPerPage?: number;
}

export function useAlgoliaSearch<T = any>({ indexName, query, city, council, hitsPerPage = 20 }: AlgoliaSearchParams) {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!searchClient) {
      setLoading(false);
      return;
    }

    if (!query && !city && !council) {
        setResults([]);
        return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchSearch = async () => {
      try {
        // Build facet filters for geo-fencing searches dynamically
        const facetFilters: string[] = [];
        if (city) facetFilters.push(`city:${city}`);
        if (council) facetFilters.push(`council:${council}`);

        const response = await searchClient.search({
          requests: [
            {
              indexName,
              query,
              hitsPerPage,
              facetFilters,
            },
          ],
        });

        if (isMounted) {
          const firstResult = response?.results?.[0] as any;
          if (firstResult?.hits) {
            setResults(firstResult.hits as T[]);
          }
        }
      } catch (err: any) {
        console.error('[Algolia Hooks Error]', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Debounce the fetch slightly to avoid hammering API on every keystroke
    const timeout = setTimeout(fetchSearch, 300);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [query, city, council, indexName, hitsPerPage]);

  return { results, loading, error, isConfigured: !!searchClient };
}
