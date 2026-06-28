import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
const Ctx = createContext(null);
export function useAuth() {
    const c = useContext(Ctx);
    if (!c)
        throw new Error("useAuth AuthProvider içində istifadə olunmalıdır");
    return c;
}
const TOKEN_KEY = "auth_token";
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            setLoading(false);
            return;
        }
        api.get("/auth/me")
            .then((r) => setUser(r.data))
            .catch(() => { localStorage.removeItem(TOKEN_KEY); setUser(null); })
            .finally(() => setLoading(false));
    }, []);
    async function login(userName, password) {
        const r = await api.post("/auth/login", { userName, password });
        localStorage.setItem(TOKEN_KEY, r.data.token);
        setUser(r.data.user);
    }
    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
    }
    return _jsx(Ctx.Provider, { value: { user, loading, login, logout }, children: children });
}
