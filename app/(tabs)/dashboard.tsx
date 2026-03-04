import { Redirect } from 'expo-router';
import { AuthGuard } from '@/components/AuthGuard';
import { useRole } from '@/hooks/useRole';

/**
 * Tab stub — redirects to the organizer dashboard screen.
 * The tab bar entry is hidden for non-organizers via href: null in _layout.tsx.
 * AuthGuard blocks unauthenticated visitors; role check blocks non-organizers
 * who navigate here directly via URL.
 */
export default function DashboardTab() {
  return (
    <AuthGuard
      icon="bar-chart-outline"
      title="Organizer Dashboard"
      message="Sign in with an organizer account to manage your events and view analytics."
    >
      <DashboardRedirect />
    </AuthGuard>
  );
}

function DashboardRedirect() {
  const { isOrganizer, isLoading } = useRole();

  if (isLoading) return null; // Brief auth-state resolution; organizer dashboard has its own loading UI
  if (!isOrganizer) return <Redirect href="/(tabs)" />;

  return <Redirect href="/dashboard/organizer" />;
}
