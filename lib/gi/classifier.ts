/**
 * Bristol photo classifier: a prototype stub. It never analyses the image and
 * never suggests a type; the crew member confirms the Bristol type manually,
 * and that is what gets logged.
 */
export const PHOTO_NOT_ANALYSED = "not_analysed" as const;
export const PHOTO_NOT_ANALYSED_LABEL = "Not analysed: prototype";

export interface BristolPhotoResult {
  analysed: false;
  status: typeof PHOTO_NOT_ANALYSED;
  label: typeof PHOTO_NOT_ANALYSED_LABEL;
  bristolType: null;
}

export function classifyBristolPhoto(): BristolPhotoResult {
  return { analysed: false, status: PHOTO_NOT_ANALYSED, label: PHOTO_NOT_ANALYSED_LABEL, bristolType: null };
}

export const photoAnalysisLabel = (analysis: string | null) => (analysis === PHOTO_NOT_ANALYSED ? PHOTO_NOT_ANALYSED_LABEL : analysis ?? "");
