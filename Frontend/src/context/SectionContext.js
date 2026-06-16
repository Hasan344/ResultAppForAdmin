import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
const SectionContext = createContext(undefined);
const STORAGE_KEY = "forqab.sectionId";
export function SectionProvider({ children }) {
    const [sections, setSections] = useState([]);
    const [sectionId, setSectionIdState] = useState(() => {
        const v = localStorage.getItem(STORAGE_KEY);
        return v ? Number(v) : null;
    });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        api
            .get("/lookup/sections")
            .then((r) => setSections(r.data))
            .finally(() => setLoading(false));
    }, []);
    function setSectionId(id) {
        setSectionIdState(id);
        if (id === null)
            localStorage.removeItem(STORAGE_KEY);
        else
            localStorage.setItem(STORAGE_KEY, String(id));
    }
    return (_jsx(SectionContext.Provider, { value: { sections, sectionId, setSectionId, loading }, children: children }));
}
export function useSection() {
    const ctx = useContext(SectionContext);
    if (!ctx)
        throw new Error("useSection must be used within SectionProvider");
    return ctx;
}
/**
 * Helper: an `axios` params object that always includes the global sectionId
 * (when set). Returns a new object — safe to spread.
 */
export function useSectionParams() {
    const { sectionId } = useSection();
    return sectionId !== null ? { sectionId } : {};
}
