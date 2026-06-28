import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";

interface Me {
    id: string;
    userName: string | null;
    firstName: string | null;
    lastName: string | null;
    isAdmin: boolean;
}
type State = { kind: "loading" } | { kind: "ok" } | { kind: "forbidden" };

export default function AuthGate({ children }: { children: ReactNode }) {
    const [state, setState] = useState<State>({ kind: "loading" });

    useEffect(() => {
        api.get<Me>("/auth/me")
            .then((r) => setState(r.data.isAdmin ? { kind: "ok" } : { kind: "forbidden" }))
            .catch(() => setState({ kind: "forbidden" })); // 401'i interceptor zaten yönlendirir
    }, []);

    if (state.kind === "loading")
        return <div className="min-h-screen flex items-center justify-center text-slate-500">Yüklənir…</div>;

    if (state.kind === "forbidden")
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="text-lg font-bold text-slate-900">Giriş icazəniz yoxdur</div>
                <div className="text-sm text-slate-500 max-w-sm">Bu bölmə yalnız administrator hesablar üçündür.</div>
                <a href="/qabiliyyet/" className="text-brand-600 text-sm font-medium hover:underline">Əsas səhifəyə qayıt</a>
            </div>
        );

    return <>{children}</>;
}