import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "../api/client";
export default function AuthGate({ children }) {
    const [state, setState] = useState({ kind: "loading" });
    useEffect(() => {
        api.get("/auth/me")
            .then((r) => setState(r.data.isAdmin ? { kind: "ok" } : { kind: "forbidden" }))
            .catch(() => setState({ kind: "forbidden" })); // 401'i interceptor zaten yönlendirir
    }, []);
    if (state.kind === "loading")
        return _jsx("div", { className: "min-h-screen flex items-center justify-center text-slate-500", children: "Y\u00FCkl\u0259nir\u2026" });
    if (state.kind === "forbidden")
        return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6", children: [_jsx("div", { className: "text-lg font-bold text-slate-900", children: "Giri\u015F icaz\u0259niz yoxdur" }), _jsx("div", { className: "text-sm text-slate-500 max-w-sm", children: "Bu b\u00F6lm\u0259 yaln\u0131z administrator hesablar \u00FC\u00E7\u00FCnd\u00FCr." }), _jsx("a", { href: "/qabiliyyet/", className: "text-brand-600 text-sm font-medium hover:underline", children: "\u018Fsas s\u0259hif\u0259y\u0259 qay\u0131t" })] }));
    return _jsx(_Fragment, { children: children });
}
