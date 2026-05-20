import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { api } from "../api/client";
import type { Section } from "../types";

type SectionContextValue = {
  sections: Section[];
  sectionId: number | null;
  setSectionId: (id: number | null) => void;
  loading: boolean;
};

const SectionContext = createContext<SectionContextValue | undefined>(undefined);

const STORAGE_KEY = "forqab.sectionId";

export function SectionProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionIdState] = useState<number | null>(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? Number(v) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Section[]>("/lookup/sections")
      .then((r) => setSections(r.data))
      .finally(() => setLoading(false));
  }, []);

  function setSectionId(id: number | null) {
    setSectionIdState(id);
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(id));
  }

  return (
    <SectionContext.Provider value={{ sections, sectionId, setSectionId, loading }}>
      {children}
    </SectionContext.Provider>
  );
}

export function useSection() {
  const ctx = useContext(SectionContext);
  if (!ctx) throw new Error("useSection must be used within SectionProvider");
  return ctx;
}

/**
 * Helper: an `axios` params object that always includes the global sectionId
 * (when set). Returns a new object — safe to spread.
 */
export function useSectionParams(): Record<string, string | number> {
  const { sectionId } = useSection();
  return sectionId !== null ? { sectionId } : {};
}
