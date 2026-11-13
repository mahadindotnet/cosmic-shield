/** Chip text per co-pilot tool, e.g. "Checked radiation status". Client-safe (no server imports). */
export const TOOL_LABELS: Record<string, string> = {
  get_latest_vitals: "Checked latest vitals",
  get_sleep_history: "Checked sleep history",
  get_radiation_status: "Checked radiation status",
  get_space_weather: "Checked space weather",
  get_environment: "Checked mission environment",
  get_active_alerts: "Checked active alerts",
  get_reference_baseline: "Checked reference baseline",
  get_guidance: "Looked up guidance",
};

export const SUGGESTED_QUESTIONS = [
  "Why am I on Watch?",
  "How did I sleep?",
  "What's my radiation status?",
  "What should I do?",
  "Any space weather?",
  "What is my glucose baseline?",
] as const;
