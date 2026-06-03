import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../utils/supabaseClient.js";
import {
  getAuthenticatedHomePath,
  isAdminRole,
  isDashboardRole,
  normalizePermissions,
} from "../constants/roles.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { resolveAuthProfile } from "../services/profileService.js";
import {
  clearAuthStorage,
  getAuthUser,
  persistAuthSession,
} from "../utils/mobileAuth.js";

const AuthContext = createContext(null);
const BOOTSTRAP_TIMEOUT_MS = 12000;

export function AuthProvider({ children, onSignedOut }) {
  const isMobile = useIsMobile();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [user, setUser] = useState(null);
  const bootstrapCompleteRef = useRef(false);

  const applySignedOutState = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const hydrateSession = useCallback(async (session) => {
    if (!session?.user) {
      applySignedOutState();
      return null;
    }

    try {
      const profile = await resolveAuthProfile(session.user);
      persistAuthSession(session, profile);
      setUser(profile);
      setIsAuthenticated(true);
      return profile;
    } catch (error) {
      console.error("Failed to resolve auth profile:", error);
      const fallbackProfile = {
        id: session.user.id,
        email: session.user.email,
        name:
          session.user.user_metadata?.full_name ??
          session.user.email ??
          "مستخدم",
        role: session.user.user_metadata?.role ?? "Employee",
        company_id: session.user.user_metadata?.company_id ?? null,
        employee_id: null,
        department: null,
        job_title: null,
        image: null,
        permissions: normalizePermissions(null),
      };
      persistAuthSession(session, fallbackProfile);
      setUser(fallbackProfile);
      setIsAuthenticated(true);
      return fallbackProfile;
    }
  }, [applySignedOutState]);

  useEffect(() => {
    let cancelled = false;
    bootstrapCompleteRef.current = false;

    const finishBootstrap = () => {
      bootstrapCompleteRef.current = true;
      if (!cancelled) setIsBootstrapping(false);
    };

    const timeoutId = window.setTimeout(() => {
      if (!bootstrapCompleteRef.current && !cancelled) {
        console.warn("Auth bootstrap timed out — rendering with fallback state.");
        finishBootstrap();
      }
    }, BOOTSTRAP_TIMEOUT_MS);

    async function bootstrap() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) throw error;

        if (data.session) {
          await hydrateSession(data.session);
        } else {
          applySignedOutState();
        }
      } catch (error) {
        console.error("Auth bootstrap failed:", error);
        if (!cancelled) applySignedOutState();
      } finally {
        finishBootstrap();
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      // Initial session is handled by bootstrap(); re-processing it here can
      // deadlock Supabase auth when combined with parallel getSession calls.
      if (event === "INITIAL_SESSION") return;

      window.setTimeout(async () => {
        if (cancelled) return;

        if (session) {
          if (!bootstrapCompleteRef.current) return;

          setIsBootstrapping(true);
          try {
            await hydrateSession(session);
          } catch (error) {
            console.error("Auth state hydration failed:", error);
          } finally {
            if (!cancelled) setIsBootstrapping(false);
          }
          return;
        }

        applySignedOutState();
        onSignedOut?.();
      }, 0);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [applySignedOutState, hydrateSession, onSignedOut]);

  const refreshProfile = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) return null;
    return hydrateSession(data.session);
  }, [hydrateSession]);

  const value = useMemo(() => {
    const role = user?.role ?? getAuthUser()?.role ?? "Employee";
    const permissions = normalizePermissions(
      user?.permissions ?? getAuthUser()?.permissions,
    );

    return {
      isAuthenticated,
      isBootstrapping,
      user,
      role,
      permissions,
      isAdmin: isAdminRole(role),
      isDashboardUser: isDashboardRole(role),
      homePath: getAuthenticatedHomePath(role, isMobile),
      isMobile,
      hydrateSession,
      refreshProfile,
      setAuthenticatedUser: (profile) => {
        setUser(profile);
        setIsAuthenticated(true);
        setIsBootstrapping(false);
      },
    };
  }, [hydrateSession, isAuthenticated, isBootstrapping, isMobile, refreshProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function usePermission(key) {
  const { permissions, isAdmin } = useAuth();
  if (isAdmin) return true;
  return Boolean(permissions?.[key]);
}
