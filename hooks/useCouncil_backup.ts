import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type CouncilDashboard } from '@/lib/api';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { getPostcodesByPlace } from '@shared/location/australian-postcodes';

function buildCouncilParams(city?: string, country?: string) {
  const fallbackPostcode = city ? getPostcodesByPlace(city)[0] : undefined;
  return {
    city: city || undefined,
    country: country || 'Australia',
    postcode: fallbackPostcode?.postcode,
    suburb: fallbackPostcode?.place_name,
    state: fallbackPostcode?.state_code,
  };
}

interface UseCouncilOptions {
  city?: string;
  country?: string;
  enabled?: boolean;
}

export function useCouncil(options?: UseCouncilOptions) {
  const { state } = useOnboarding();
  const city = options?.city ?? state.city;
  const country = options?.country ?? state.country;
  const params = useMemo(() => buildCouncilParams(city, country), [city, country]);

  const query = useQuery<CouncilDashboard>({
    queryKey: ['/api/council/my', params.city, params.postcode],
    queryFn: () => api.council.my(params),
    enabled: options?.enabled ?? true,
    retry: 1,
  });

  const activeAlerts = useMemo(
    () => (query.data?.alerts ?? []).filter((item) => item.status === 'active'),
    [query.data?.alerts],
  );

  const openGrants = useMemo(
    () => (query.data?.grants ?? []).filter((grant) => grant.status === 'open' || grant.status === 'upcoming'),
    [query.data?.grants],
  );

  const isCouncilVerified = query.data?.council.verificationStatus === 'verified';
  const lgaCode = query.data?.council.lgaCode;

  return {
    ...query,
    council: query.data?.council,
    waste: query.data?.waste,
    facilities: query.data?.facilities ?? [],
    grants: query.data?.grants ?? [],
    links: query.data?.links ?? [],
    preferences: query.data?.preferences ?? [],
    reminder: query.data?.reminder ?? null,
    following: query.data?.following ?? false,
    activeAlerts,
    openGrants,
    isCouncilVerified,
    lgaCode,
  };
}
