import type { SectionSlug } from "@/components/cosmic-shield/sections";
import type { HowToMeasureProps } from "@/components/cosmic-shield/how-to-measure";

export interface InstructionSection {
  title: string;
  body: string;
  /** Element id on the page to jump to ("Show me"). */
  anchor?: string;
}

export interface PageInstructions {
  intro: string;
  sections: InstructionSection[];
  measure?: Omit<HowToMeasureProps, "className" | "bare">;
}

/**
 * Content for the Instructions popup on every page. Each module explains its
 * sections in order, then how to take the measurement. Kept as data so the
 * wording can be reviewed without touching layout code.
 */
export const INSTRUCTIONS: Record<SectionSlug, PageInstructions> = {
  overview: {
    intro: "Start every shift here. Check your status, confirm the mission environment, then open any module that needs attention.",
    sections: [
      { title: "Mission environment", body: "Choose ISS, Lunar base or Mars transit. The background, thresholds, targets and guidance across the app change to match.", anchor: "overview-mission" },
      { title: "Body map", body: "Tap a glowing area of the body to open its module: head for Mind, eyes for Eyes, chest dosimeter for Radiation, heart for Vitals, gut for GI, wrist for Sleep & Stress, thigh for Bone Protection.", anchor: "overview-body" },
      { title: "Module cards", body: "Each card shows the latest reading and its status: Normal, Watch or Escalate. Grey means nothing has been logged yet.", anchor: "overview-modules" },
      { title: "Check-in streak", body: "Every daily check-in and exercise session earns points and keeps your streak going.", anchor: "overview-streak" },
    ],
  },
  vitals: {
    intro: "Record heart rate, blood pressure, oxygen saturation and glucose as one set, ideally at the same time each day.",
    sections: [
      { title: "Heart hologram", body: "Each callout shows your latest reading. Tap one to jump straight to its field in the form.", anchor: "vitals-hero" },
      { title: "Heart-rate trend", body: "The shaded band is the normal range. Readings outside it raise a Watch.", anchor: "vitals-hero" },
      { title: "Log a reading", body: "Enter HR, SpO₂ and blood pressure together. Glucose is optional. Press Log entry.", anchor: "vitals-log" },
      { title: "History", body: "Every past reading with its status, newest first.", anchor: "vitals-history" },
    ],
    measure: {
      equipment: ["Pulse oximeter", "BP cuff", "Glucometer"],
      duration: "≈ 5 min",
      steps: [
        { title: "Rest for 5 minutes", detail: "Sit or restrain yourself in a neutral position; no exercise in the last 30 min." },
        { title: "Clip the oximeter on a warm finger", detail: "Wait for a steady reading (≈ 30 s); log HR and SpO₂." },
        { title: "Fit the cuff at heart level", detail: "Bare upper arm, cuff 2 cm above the elbow. Stay still and silent." },
        { title: "Glucose: clean, lance, sample", detail: "Use the side of the fingertip; discard the first drop if instructed." },
      ],
      tip: "Measure at the same time each day so trends are comparable.",
    },
  },
  "sleep-stress": {
    intro: "Log how long and how well you slept, your morning HRV and your stress level. Together they show recovery and stress load.",
    sections: [
      { title: "Sleep hologram", body: "Callouts show last night's duration and quality, HRV and stress. Tap one to fill it in.", anchor: "sleep-stress-hero" },
      { title: "Sleep trend", body: "Hours slept per night against the normal band. Below the band raises a Watch.", anchor: "sleep-stress-hero" },
      { title: "Log sleep & stress", body: "Fill this in right after waking: hours, quality 1–5, HRV if your wearable gives it, stress 1–5.", anchor: "sleep-stress-log" },
      { title: "Sleep stages & HRV", body: "Stage breakdown and HRV trend appear once a wearable is connected or readings are logged.", anchor: "sleep-stress-log" },
      { title: "History", body: "Past nights with their status.", anchor: "sleep-stress-history" },
    ],
    measure: {
      equipment: ["Wearable / chest strap"],
      duration: "≈ 3 min",
      steps: [
        { title: "Log right after waking", detail: "Before coffee, exercise or screens." },
        { title: "Take a 2-minute HRV reading", detail: "Lie still, breathe normally; use the wearable's RMSSD value." },
        { title: "Rate sleep quality and stress honestly", detail: "Compare against your own normal, not the crew's." },
      ],
      tip: "HRV is personal. The trend matters more than any single number.",
    },
  },
  radiation: {
    intro: "Track your dosimeter readings, see how much of the NASA career limit you have used, and watch for solar storms.",
    sections: [
      { title: "Shield hologram", body: "Callouts show today's dose, mission total, career limit used and solar activity.", anchor: "radiation-hero" },
      { title: "Career dose gauge", body: "How much of the 600 mSv career limit you have used. The dashed marker is the projected dose for this mission environment.", anchor: "radiation-hero" },
      { title: "Log dosimeter reading", body: "Enter the device ID, whether the display shows a daily or cumulative dose, and the value in mSv.", anchor: "radiation-log" },
      { title: "Daily dose & solar alerts", body: "Daily dose against the Watch threshold for your environment, and solar flare / CME / particle-event alerts from NASA DONKI.", anchor: "radiation-log" },
      { title: "History", body: "Every dosimeter reading you have logged.", anchor: "radiation-history" },
    ],
    measure: {
      equipment: ["Personal dosimeter"],
      duration: "≈ 1 min",
      steps: [
        { title: "Wear the dosimeter on your torso", detail: "Keep it on for the whole shift, including sleep." },
        { title: "Read it at the same time each day", detail: "Note whether the display shows the daily or the cumulative dose." },
        { title: "Log it with the device ID", detail: "So readings from swapped devices aren't mixed up." },
      ],
      caution: "During a solar particle event, go to the shelter first and log afterwards.",
    },
  },
  bone: {
    intro: "Microgravity weakens bone. Log exercise and supplements every day so you can see whether you are protecting it.",
    sections: [
      { title: "Bone hologram", body: "Callouts show exercise minutes, peak resistance load, calcium and vitamin D. Tap one to fill it in.", anchor: "bone-hero" },
      { title: "Exercise target gauge", body: "Today's exercise minutes against the daily target for your mission environment.", anchor: "bone-hero" },
      { title: "Log countermeasures", body: "Enter aerobic and resistance minutes, the heaviest load you lifted, and calcium and vitamin D intake.", anchor: "bone-log" },
      { title: "Exercise trend", body: "Daily minutes against the target band.", anchor: "bone-log" },
      { title: "History", body: "Past days of exercise and supplements.", anchor: "bone-history" },
    ],
    measure: {
      equipment: ["Resistive exercise device", "Treadmill / cycle"],
      steps: [
        { title: "Log aerobic and resistance time separately", detail: "Both protect bone; resistance work matters most." },
        { title: "Record the heaviest set you lifted", detail: "Use the device's load reading, not perceived effort." },
        { title: "Add supplements from your meal log", detail: "Calcium from food plus tablets; vitamin D from tablets." },
      ],
      tip: "Without countermeasures, weight-bearing bones lose about 1–1.5% density per month in microgravity.",
    },
  },
  eyes: {
    intro: "Screen for SANS (spaceflight-associated neuro-ocular syndrome) with fundoscope photos and the Amsler grid self-test.",
    sections: [
      { title: "Eye hologram", body: "Callouts show the last SANS screening result and each eye's Amsler result.", anchor: "eyes-hero" },
      { title: "Screening schedule", body: "How often to screen in your mission environment, and when you last did.", anchor: "eyes-hero" },
      { title: "Fundoscope capture", body: "Upload a retina photo. AI screening flags signs of SANS for review; it never diagnoses.", anchor: "eyes-log" },
      { title: "Amsler grid test", body: "Cover one eye, look at the centre dot and record whether any lines look wavy, broken or missing. Repeat for the other eye.", anchor: "eyes-log" },
      { title: "History", body: "All fundoscope and Amsler results.", anchor: "eyes-history" },
    ],
    measure: {
      equipment: ["Reading glasses if used", "Fundoscope"],
      duration: "≈ 2 min per eye",
      steps: [
        { title: "Hold the screen ~35 cm away", detail: "Good, even lighting; wear your normal reading glasses." },
        { title: "Cover one eye", detail: "Look only at the centre dot. Don't move your gaze." },
        { title: "Check the lines", detail: "Are any wavy, broken, blurred or missing? Note where." },
        { title: "Repeat with the other eye", detail: "Log each eye as its own entry." },
      ],
      caution: "New distortion in central vision should be logged right away. It may trigger a Watch for SANS.",
    },
  },
  gi: {
    intro: "Track gut health, hydration and nutrition. A photo is fastest: the classifier suggests a Bristol type for you to confirm.",
    sections: [
      { title: "Gut hologram", body: "Callouts show the last Bristol type, today's fluids, meals logged and the AI image check.", anchor: "gi-hero" },
      { title: "Hydration gauge", body: "Today's fluid intake against the daily target.", anchor: "gi-hero" },
      { title: "Bristol photo (AI)", body: "Upload a photo and confirm or correct the suggested type. Your answer is what gets logged.", anchor: "gi-log" },
      { title: "Manual entry", body: "No photo? Pick the Bristol type yourself and add fluids and meals.", anchor: "gi-log" },
      { title: "Bristol scale", body: "Reference for types 1–7. Types 3–4 are normal.", anchor: "gi-scale" },
      { title: "History", body: "Past GI and intake entries.", anchor: "gi-history" },
    ],
    measure: {
      equipment: ["Tablet camera", "Waste collection bag"],
      steps: [
        { title: "Photograph inside the collection bag", detail: "Before sealing; fill the frame." },
        { title: "Use the cabin light, no flash", detail: "Flash washes out colour and texture." },
        { title: "Confirm or correct the AI's type", detail: "Your correction is what gets logged." },
      ],
      tip: "Types 6–7 on two logs in a row trigger a Watch. Keep your fluids up.",
    },
  },
  mind: {
    intro: "A quick daily check-in on mood and stress, plus a supportive AI conversation. Nothing here diagnoses or prescribes.",
    sections: [
      { title: "Brain hologram", body: "Callouts show today's mood and stress, this week's check-ins and conversations.", anchor: "mind-hero" },
      { title: "Daily check-in", body: "Rate mood and stress from 1 to 5 and add a short note if you like. It counts toward your streak.", anchor: "mind-log" },
      { title: "Talk it through", body: "An AI companion that listens and suggests coping techniques. Anything serious is routed to the flight surgeon.", anchor: "mind-log" },
      { title: "History", body: "Your past check-ins. Private to you and the flight surgeon.", anchor: "mind-history" },
    ],
    measure: {
      duration: "≈ 1 min",
      steps: [
        { title: "Pick a fixed time", detail: "The end of the work shift works well for most crews." },
        { title: "Rate mood and stress honestly", detail: "Entries are private to you and the flight surgeon." },
        { title: "Add a note if something stands out", detail: "Sleep, workload, conflict, homesickness…" },
      ],
      tip: "Low mood or high stress on 3 or more days triggers a Watch, never an automatic diagnosis.",
    },
  },
  mission: {
    intro: "Set where the crew is. Everything else in Cosmic Shield adapts to this choice.",
    sections: [
      { title: "Environment orb", body: "Callouts show expected daily dose, gravity, ground delay and projected mission dose.", anchor: "mission-hero" },
      { title: "Choose environment", body: "Pick ISS, Lunar base or Mars transit. The background and every module update straight away, and the choice is remembered.", anchor: "mission-picker" },
      { title: "Module briefing", body: "What this environment means for each health module.", anchor: "mission-briefing" },
    ],
  },
};
