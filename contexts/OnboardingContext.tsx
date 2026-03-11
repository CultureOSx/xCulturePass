import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  isComplete: boolean;
  country: string;
  city: string;
  communities: string[];
  ethnicityText: string;
  languages: string[];
  interests: string[];
  subscriptionTier: 'free' | 'plus' | 'elite' | 'sydney-local';
}

interface OnboardingContextValue {
  state: OnboardingState;
  isLoading: boolean;
  setCountry: (country: string) => void;
  setCity: (city: string) => void;
  setCommunities: (communities: string[]) => void;
  setEthnicityText: (ethnicityText: string) => void;
  setLanguages: (languages: string[]) => void;
  setInterests: (interests: string[]) => void;
  setSubscriptionTier: (tier: OnboardingState['subscriptionTier']) => void;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  updateLocation: (country: string, city: string) => Promise<void>;
}

const STORAGE_KEY = '@culturepass_onboarding';

const defaultState: OnboardingState = {
  isComplete: false,
  country: '',
  city: '',
  communities: [],
  ethnicityText: '',
  languages: [],
  interests: [],
  subscriptionTier: 'free',
};

const defaultContextValue: OnboardingContextValue = {
  state: defaultState,
  isLoading: false,
  setCountry: () => {},
  setCity: () => {},
  setCommunities: () => {},
  setEthnicityText: () => {},
  setLanguages: () => {},
  setInterests: () => {},
  setSubscriptionTier: () => {},
  completeOnboarding: async () => {},
  resetOnboarding: async () => {},
  updateLocation: async () => {},
};

export const OnboardingContext = createContext<OnboardingContextValue>(defaultContextValue);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data) as Partial<OnboardingState>;
          setState({ ...defaultState, ...parsed });
        }
      } catch {
        // AsyncStorage unavailable (e.g. private browsing on web) — use defaults
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const persistUpdate = async (patch: Partial<OnboardingState>) => {
    setState((prev) => {
      const newState = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState)).catch((err) => {
        if (__DEV__) {
           
          console.warn('[OnboardingContext] AsyncStorage.setItem failed — onboarding state will not persist across sessions.', err);
        }
      });
      return newState;
    });
  };

  const value = useMemo(() => ({
    state,
    isLoading,
    setCountry:        (country: string) => persistUpdate({ country }),
    setCity:           (city: string) => persistUpdate({ city }),
    setCommunities:    (communities: string[]) => persistUpdate({ communities }),
    setEthnicityText:  (ethnicityText: string) => persistUpdate({ ethnicityText }),
    setLanguages:      (languages: string[]) => persistUpdate({ languages }),
    setInterests:      (interests: string[]) => persistUpdate({ interests }),
    setSubscriptionTier: (subscriptionTier: OnboardingState['subscriptionTier']) => persistUpdate({ subscriptionTier }),
    completeOnboarding: () => persistUpdate({ isComplete: true }),
    resetOnboarding: async () => {
      setState(defaultState);
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    },
    updateLocation: (country: string, city: string) => persistUpdate({ country, city }),
  }), [state, isLoading]);  

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  return useContext(OnboardingContext);
}
