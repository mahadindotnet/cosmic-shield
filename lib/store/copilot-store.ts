import { create } from "zustand";

interface CopilotState {
  open: boolean;
  /** The panel's input text (pre-filled by openWith, not sent automatically). */
  draft: string;
  setOpen: (open: boolean) => void;
  setDraft: (draft: string) => void;
  /** Opens the co-pilot with a question pre-filled (e.g. from the early-warning card). */
  openWith: (draft: string) => void;
}

/** Open state of the AI co-pilot panel, shared by every "Ask co-pilot" entry point. */
export const useCopilotStore = create<CopilotState>()((set) => ({
  open: false,
  draft: "",
  setOpen: (open) => set({ open }),
  setDraft: (draft) => set({ draft }),
  openWith: (draft) => set({ open: true, draft }),
}));
