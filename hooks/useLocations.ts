/**
 * useLocations — React Query hook for the Firestore-backed location hierarchy.
 *
 * - Fetches Australian states + cities from GET /api/locations (30 min server cache)
 * - Client-side staleTime: 1 hour so the picker never re-fetches mid-session
 * - Falls back to constants/locations.ts data as placeholderData while loading
 *   so the picker is usable immediately, even offline
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type AustralianState } from '@/lib/api';
import { AUSTRALIAN_STATES, CITIES_BY_STATE } from '@/constants/locations';

// ---------------------------------------------------------------------------
// Build the placeholder from the static constants file so picker is
// immediately usable on first render / offline.
// ---------------------------------------------------------------------------
const STATIC_STATES: AustralianState[] = AUSTRALIAN_STATES.map((s) => ({
  name: s.label,
  code: s.value,
  emoji: s.emoji,
  cities: CITIES_BY_STATE[s.value],
}));

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseLocationsResult {
  /** List of states/territories ordered as returned by the API */
  states: AustralianState[];
  /** City lists keyed by state code */
  citiesByState: Record<string, string[]>;
  /** Look up which state a city belongs to */
  getStateForCity: (city: string) => string | undefined;
  /** Acknowledgement of Country text */
  acknowledgement: string;
  /** True while the first fetch is in-flight (placeholder data shown) */
  isLoading: boolean;
  error: Error | null;
}

export function useLocations(): UseLocationsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: () => api.locations.list(),
    staleTime:  1000 * 60 * 60,      // 1 hour — won't refetch mid-session
    gcTime:     1000 * 60 * 60 * 24, // 24 hours in cache
    placeholderData: {
      locations: [{
        country: 'Australia',
        countryCode: 'AU',
        states: STATIC_STATES,
        cities: STATIC_STATES.flatMap((s) => s.cities),
      }],
      acknowledgementOfCountry: '',
    },
    retry: 2,
  });

  const states = useMemo<AustralianState[]>(
    () => data?.locations?.[0]?.states ?? STATIC_STATES,
    [data],
  );

  const citiesByState = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const s of states) {
      map[s.code] = s.cities;
    }
    return map;
  }, [states]);

  const getStateForCity = useMemo(() => (city: string): string | undefined => {
    for (const s of states) {
      if (s.cities.includes(city)) return s.code;
    }
    return undefined;
  }, [states]);

  const acknowledgement =
    data?.acknowledgementOfCountry ??
    'CulturePass acknowledges the Traditional Custodians of Country throughout Australia.';

  return {
    states,
    citiesByState,
    getStateForCity,
    acknowledgement,
    isLoading,
    error: error as Error | null,
  };
}
