// Auth context — the single source of truth for session state.
// All route protection and user-scoped data flow through this provider.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout, signup as apiSignup } from "../api/client";
import type { AuthResponse, LoginInput, Profile, SignupInput, User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<AuthResponse>;
  signup: (input: SignupInput) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Probe the session cookie once on mount — this is what keeps users
  // logged in across full page refreshes.
  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        setUser(res.user);
        setProfileState(res.profile);
      })
      .catch(() => {
        // 401 or network failure — anonymous until proven otherwise
        setUser(null);
        setProfileState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<AuthResponse> => {
    const res = await apiLogin(input);
    setUser(res.user);
    setProfileState(res.profile);
    return res;
  }, []);

  const signup = useCallback(async (input: SignupInput): Promise<AuthResponse> => {
    const res = await apiSignup(input);
    setUser(res.user);
    setProfileState(res.profile);
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setProfileState(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await getCurrentUser();
    setUser(res.user);
    setProfileState(res.profile);
  }, []);

  const setProfile = useCallback((p: Profile) => setProfileState(p), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: user !== null,
        login,
        signup,
        logout,
        refreshUser,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
