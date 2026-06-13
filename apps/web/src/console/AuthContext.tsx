import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { adminApi, ConsoleApiError } from "./api";

type Status = "loading" | "anon" | "authed";

interface AuthState {
  status: Status;
  email?: string;
}

interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export function ConsoleAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const me = await adminApi.me();
      if (me.authenticated) {
        setState({ status: "authed", email: me.email });
      } else {
        setState({ status: "anon" });
      }
    } catch (err) {
      if (err instanceof ConsoleApiError && err.status === 401) {
        setState({ status: "anon" });
      } else {
        setState({ status: "anon" });
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await adminApi.login(email, password);
    setState({ status: "authed", email: res.email });
  }, []);

  const logout = useCallback(async () => {
    await adminApi.logout();
    setState({ status: "anon" });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, refresh }),
    [state, login, logout, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsoleAuth(): AuthContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConsoleAuth used outside provider");
  return ctx;
}
