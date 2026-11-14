import { PHOTO_NOT_ANALYSED, PHOTO_NOT_ANALYSED_LABEL, photoAnalysisLabel } from "@/lib/gi/classifier";

/**
 * Fundus (SANS) photo classifier: a prototype stub. No model is connected: it
 * never analyses the image and never returns a finding, a confidence or a
 * status. A crew member who wants a human to look ticks "Flag for ground review".
 */
export interface FundusPhotoResult {
  analysed: false;
  status: typeof PHOTO_NOT_ANALYSED;
  label: typeof PHOTO_NOT_ANALYSED_LABEL;
  finding: null;
}

export function classifyFundusPhoto(): FundusPhotoResult {
  return { analysed: false, status: PHOTO_NOT_ANALYSED, label: PHOTO_NOT_ANALYSED_LABEL, finding: null };
}

export { PHOTO_NOT_ANALYSED_LABEL, photoAnalysisLabel };
