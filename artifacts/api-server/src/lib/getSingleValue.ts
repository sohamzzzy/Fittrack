type ParamValue =
  | string
  | string[]
  | Record<string, unknown>
  | Array<string | Record<string, unknown>>
  | undefined;

export function getSingleValue(value: ParamValue): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }

  return typeof value === "string" ? value : undefined;
}
