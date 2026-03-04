import { renderHook } from '@testing-library/react-native';
import { useCouncil } from '../useCouncil';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRefetch = jest.fn();
const mockMutate = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  })),
  useMutation: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

jest.mock('../../contexts/OnboardingContext', () => ({
  useOnboarding: jest.fn(() => ({
    state: { city: 'Sydney', country: 'Australia' },
  })),
}));

jest.mock('../../lib/auth', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    userId: 'test-uid',
  })),
}));

jest.mock('../../lib/api', () => ({
  api: {
    council: {
      my: jest.fn(),
      follow: jest.fn(),
      unfollow: jest.fn(),
      updatePreferences: jest.fn(),
      updateWasteReminder: jest.fn(),
    },
  },
}));

jest.mock('@shared/location/australian-postcodes', () => ({
  getPostcodesByPlace: jest.fn(() => [
    { postcode: 2000, place_name: 'Sydney', state_code: 'NSW' },
  ]),
}));

const { useQuery } = require('@tanstack/react-query');
const { useOnboarding } = require('../../contexts/OnboardingContext');
const { useAuth } = require('../../lib/auth');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCouncil hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });
    (useOnboarding as jest.Mock).mockReturnValue({
      state: { city: 'Sydney', country: 'Australia' },
    });
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      userId: 'test-uid',
    });
  });

  it('should pass enabled: true when authenticated and city is set', () => {
    renderHook(() => useCouncil());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it('should pass enabled: false when city is empty', () => {
    (useOnboarding as jest.Mock).mockReturnValue({
      state: { city: '', country: 'Australia' },
    });

    renderHook(() => useCouncil());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('should pass enabled: false when not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      userId: null,
    });

    renderHook(() => useCouncil());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('should expose council data and loading state', () => {
    const mockData = {
      council: { id: 'c1', name: 'City of Sydney' },
      preferences: [{ category: 'emergency', enabled: true }],
      following: false,
    };

    (useQuery as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useCouncil());

    expect(result.current.data).toBe(mockData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.councilId).toBe('c1');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should use data preferences when no local overrides exist', () => {
    const prefs = [
      { category: 'emergency', enabled: true },
      { category: 'flood', enabled: false },
    ];

    (useQuery as jest.Mock).mockReturnValue({
      data: { council: { id: 'c1' }, preferences: prefs, following: false },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useCouncil());

    expect(result.current.effectivePrefs).toEqual(prefs);
  });

  it('should include the correct query key with city and postcode', () => {
    renderHook(() => useCouncil());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['/api/council/my', 'Sydney', 2000],
      }),
    );
  });
});
