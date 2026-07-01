const KG_TO_LBS = 2.20462;

export function formatWeight(kg: number | null | undefined, unit: "kg" | "lbs" = "kg"): number | null {
  if (kg == null) return null;
  if (unit === "kg") return kg;
  return Number((kg * KG_TO_LBS).toFixed(1));
}

export function parseWeightToKg(value: string | number, unit: "kg" | "lbs" = "kg"): number | null {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return null;
  if (unit === "kg") return num;
  return Number((num / KG_TO_LBS).toFixed(2));
}

export function formatWeightDisplay(kg: number | null | undefined, unit: "kg" | "lbs" = "kg"): string {
  const val = formatWeight(kg, unit);
  if (val == null) return "—";
  return `${val}${unit}`;
}
