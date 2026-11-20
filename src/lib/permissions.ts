export const roles = ["admin", "manager", "accountant", "viewer"] as const;
export type Role = (typeof roles)[number];
export const kinds = [
  "production",
  "expense",
  "salary",
  "cashEntry",
  "employee",
] as const;
export type Kind = (typeof kinds)[number];
export function canWrite(role: string, kind: string) {
  return (
    role === "admin" ||
    (role === "manager" &&
      ["production", "salary", "employee"].includes(kind)) ||
    (role === "accountant" && ["expense", "salary", "cashEntry"].includes(kind))
  );
}
export const canExport = (role: string) =>
  ["admin", "manager", "accountant"].includes(role);
