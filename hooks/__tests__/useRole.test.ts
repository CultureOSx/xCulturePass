import { renderHook } from '@testing-library/react-native';
import { useRole } from '../useRole';
import { useAuth } from '../../lib/auth';
import type { UserRole } from '../../shared/schema';

jest.mock('../../lib/auth', () => ({
  useAuth: jest.fn(),
}));

describe('useRole hook', () => {
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMock = (
    role?: UserRole,
    isAuthenticated = true,
    isLoading = false,
    isRestoring = false
  ) => {
    mockUseAuth.mockReturnValue({
      user: role ? { role } : null,
      isAuthenticated,
      isLoading,
      isRestoring,
    });
  };

  it('should return default user role and false flags when not authenticated', () => {
    setupMock(undefined, false);
    const { result } = renderHook(() => useRole());

    expect(result.current.role).toBe('user');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isOrganizer).toBe(false);
    expect(result.current.isCityAdmin).toBe(false);
    expect(result.current.isModerator).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should handle loading state', () => {
    setupMock(undefined, false, true, false);
    const { result: res1 } = renderHook(() => useRole());
    expect(res1.current.isLoading).toBe(true);

    setupMock(undefined, false, false, true);
    const { result: res2 } = renderHook(() => useRole());
    expect(res2.current.isLoading).toBe(true);
  });

  it('should identify a regular authenticated user', () => {
    setupMock('user', true);
    const { result } = renderHook(() => useRole());

    expect(result.current.role).toBe('user');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isOrganizer).toBe(false);
    expect(result.current.isCityAdmin).toBe(false);
    expect(result.current.isModerator).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should correctly identify rank >= organizer', () => {
    const roles: UserRole[] = ['organizer', 'business', 'sponsor', 'cityAdmin', 'moderator', 'admin', 'platformAdmin'];

    roles.forEach((role) => {
      setupMock(role, true);
      const { result } = renderHook(() => useRole());
      expect(result.current.role).toBe(role);
      expect(result.current.isOrganizer).toBe(true);
    });
  });

  it('should correctly identify rank >= cityAdmin', () => {
    const validRoles: UserRole[] = ['cityAdmin', 'moderator', 'admin', 'platformAdmin'];
    const invalidRoles: UserRole[] = ['user', 'organizer', 'business', 'sponsor'];

    validRoles.forEach((role) => {
      setupMock(role, true);
      const { result } = renderHook(() => useRole());
      expect(result.current.isCityAdmin).toBe(true);
    });

    invalidRoles.forEach((role) => {
      setupMock(role, true);
      const { result } = renderHook(() => useRole());
      expect(result.current.isCityAdmin).toBe(false);
    });
  });

  it('should correctly identify rank >= moderator', () => {
    const validRoles: UserRole[] = ['moderator', 'admin', 'platformAdmin'];

    validRoles.forEach((role) => {
      setupMock(role, true);
      const { result } = renderHook(() => useRole());
      expect(result.current.isModerator).toBe(true);
    });

    setupMock('cityAdmin', true);
    const { result } = renderHook(() => useRole());
    expect(result.current.isModerator).toBe(false);
  });

  it('should correctly identify rank >= admin', () => {
    const validRoles: UserRole[] = ['admin', 'platformAdmin'];

    validRoles.forEach((role) => {
      setupMock(role, true);
      const { result } = renderHook(() => useRole());
      expect(result.current.isAdmin).toBe(true);
    });

    setupMock('moderator', true);
    const { result } = renderHook(() => useRole());
    expect(result.current.isAdmin).toBe(false);
  });

  describe('hasRole', () => {
    it('should return true for exact role matches', () => {
      setupMock('business', true);
      const { result } = renderHook(() => useRole());

      expect(result.current.hasRole('business')).toBe(true);
      expect(result.current.hasRole('business', 'sponsor')).toBe(true);
      expect(result.current.hasRole('user', 'admin')).toBe(false);
    });

    it('should return false if not authenticated', () => {
      setupMock('business', false);
      const { result } = renderHook(() => useRole());
      expect(result.current.hasRole('business')).toBe(false);
    });
  });

  describe('hasMinRole', () => {
    it('should correctly compare ranks', () => {
      setupMock('moderator', true);
      const { result } = renderHook(() => useRole());

      expect(result.current.hasMinRole('user')).toBe(true);
      expect(result.current.hasMinRole('organizer')).toBe(true);
      expect(result.current.hasMinRole('cityAdmin')).toBe(true);
      expect(result.current.hasMinRole('moderator')).toBe(true);

      expect(result.current.hasMinRole('admin')).toBe(false);
      expect(result.current.hasMinRole('platformAdmin')).toBe(false);
    });

    it('should return false if not authenticated', () => {
      setupMock('admin', false);
      const { result } = renderHook(() => useRole());
      expect(result.current.hasMinRole('user')).toBe(false);
    });
  });
});
