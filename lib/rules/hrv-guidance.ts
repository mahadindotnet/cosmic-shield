/**
 * Plain-language guidance for the `hrv_sleep_decline` early warning. Shared by
 * the early-warning card and the AI co-pilot (get_guidance), so both always
 * say the same thing. Non-diagnostic by design.
 */
export const HRV_SLEEP_DECLINE_MAY_MEAN = [
  "Accumulated fatigue that hasn't been recovered yet.",
  "Workload stress building up over several days.",
  "A disrupted sleep schedule, for example after shift changes.",
] as const;

export const HRV_SLEEP_DECLINE_STEPS = [
  "Protect your next sleep period and keep a consistent schedule.",
  "Follow the station's sleep-shift lighting schedule.",
  "Ease your workload where you can over the next day.",
  "Try a few minutes of slow breathing before sleep.",
] as const;

export const HRV_SLEEP_DECLINE_FOLLOW_UP = [
  "Re-check tomorrow morning.",
  "Talk to your Crew Medical Officer if it continues or you feel unwell.",
] as const;
