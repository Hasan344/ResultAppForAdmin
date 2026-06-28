import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";

export interface AuthUser {
    id: string;
    userName: string | null;
    firstName: string | null;
    lastName: string | null;
    isAdmin: boolean;
}

interface AuthCtx {
    user: AuthUser | null;
    loading: boolean;
    login: (userName: string, password: string) => Promise<void>;
    logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
    const c = useContext(Ctx);
    if (!c) throw new Error("useAuth AuthProvider içində istifadə olunmalıdır");
    return c;
}

const TOKEN_KEY = "auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) { setLoading(false); return; }
        api.get<AuthUser>("/auth/me")
            .then((r) => setUser(r.data))
            .catch(() => { localStorage.removeItem(TOKEN_KEY); setUser(null); })
            .finally(() => setLoading(false));
    }, []);

    async function login(userName: string, password: string) {
        const r = await api.post<{ token: string; user: AuthUser }>(
            "/auth/login", { userName, password });
        localStorage.setItem(TOKEN_KEY, r.data.token);
        setUser(r.data.user);
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
    }

    return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}