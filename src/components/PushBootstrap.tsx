import { useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { registerPushTokenForUser } from '../lib/notifications';

/** Demande la permission + enregistre le token Expo pour les notifs. */
export function PushBootstrap() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user?.id) return;
    registerPushTokenForUser(user.id).catch(() => undefined);
  }, [loading, user?.id]);

  return null;
}
