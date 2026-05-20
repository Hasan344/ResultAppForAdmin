export function shortExerciseLabel(code: string): string {
  const map: Record<string, string> = {
    sprint_100m: "100m",
    cross_1000m: "1000m",
    pull_up: "Qüvvə",
    long_jump: "Tullanma",
    gymnastics: "Gimnastika",
    sport_games: "İdman oy."
  };
  return map[code] ?? code;
}

export function genderLabel(g: number): string {
  return g === 1 ? "Kişi" : g === 2 ? "Qadın" : "—";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("az-AZ", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}
