import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/lib/auth';
import { api, type CouncilPreference } from '@/lib/api';
import { getPostcodesByPlace } from '@shared/location/australian-postcodes';

const DEFAULT_REMINDER_TIME = '19:00';

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

/**
 * useCouncil — Centralised council data hook for CulturePassAU.
 *
 * Fetches the user's matched council dashboard, alert preferences,
 * follow/unfollow state, and waste reminder mutations.
 *
 * @returns {
 *   data: CouncilDashboard | undefined,
 *   isLoading: boolean,
 *   isError: boolean,
 *   isAuthenticated: boolean,
 *   refetch: () => Promise<any>,
 *   councilId: string | undefined,
 *   effectivePrefs: CouncilPreference[],
 *   followMutation: UseMutationResult<any, unknown, void, unknown>,
 *   prefMutation: UseMutationResult<any, unknown, CouncilPreference[], unknown>,
 *   reminderMutation: UseMutationResult<any, unknown, boolean, unknown>,
 *   togglePref: (category: string) => void,
 *   reload: () => Promise<void>,
 * }
 */
export function useCouncil() {
  const queryClient = useQueryClient();
  const { state } = useOnboarding();
  const { isAuthenticated } = useAuth();
  const [localPrefs, setLocalPrefs] = useState<CouncilPreference[]>([]);

  const councilParams = useMemo(
    () => buildCouncilParams(state.city, state.country),
    [state.city, state.country],
  );

  const queryKey = ['/api/council/my', councilParams.city, councilParams.postcode] as const;

  const { data, isLoading, isError, refetch } = useQuery<CouncilDashboard>({
    queryKey,
    queryFn: () => api.council.my(councilParams),
    enabled: isAuthenticated && !!state.city,
  });

  const councilId = data?.council.id;
  const effectivePrefs = localPrefs.length > 0 ? localPrefs : (data?.preferences ?? []);

  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/council/my'] });
  };

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!councilId) throw new Error('Council not resolved');
      if (data?.following) return api.council.unfollow(councilId);
      return api.council.follow(councilId);
    },
    onSuccess: reload,
  });

  const prefMutation = useMutation({
    mutationFn: async (preferences: CouncilPreference[]) => {
      if (!councilId) throw new Error('Council not resolved');
      return api.council.updatePreferences(councilId, preferences);
    },
    onSuccess: reload,
  });

  const reminderMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!councilId) throw new Error('Council not resolved');
      return api.council.updateWasteReminder(councilId, {
        enabled,
        reminderTime: data?.reminder?.reminderTime ?? DEFAULT_REMINDER_TIME,
        postcode: data?.waste?.postcode,
        suburb: data?.waste?.suburb,
      });
    },
    onSuccess: reload,
  });

  const togglePref = (category: string) => {
    const next = effectivePrefs.map((item) =>
      item.category === category ? { ...item, enabled: !item.enabled } : item,
    );
    setLocalPrefs(next);
    prefMutation.mutate(next);
  };

  return {
    data,
    isLoading,
    isError,
    isAuthenticated,
    refetch,
    councilId,
    effectivePrefs,
    followMutation,
    prefMutation,
    reminderMutation,
    togglePref,
  };
}
