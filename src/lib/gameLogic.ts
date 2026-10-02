/** Compatibility exports; browser skill context is supplied by application. */
export * from '../domain/gameRules';
export { calculateCombatStats, getComboStats, getSquadDodgeRate } from '../application/gameStats';
// Legacy helper retained for import compatibility; current callers no longer use it.
export const base64ToBlob = (base64Data: string): Blob | null => {
  if (!base64Data || !base64Data.startsWith("data:image")) return null;
  const parts = base64Data.split(",");
  const contentType = parts[0].match(/:(.*?);/)![1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: contentType });
};
