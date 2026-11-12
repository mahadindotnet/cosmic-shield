Features:
heart rate
sleep
bp
oxygen
Space radiation (dosimeter readings, show the running total against NASA’s career limit, and add solar storm alerts from NASA’s DONKI space weather database.)
bristol stool image (AI)- hydration + nutrition
the retina and optic nerve picture with a special camera called a fundoscope(AI looks for SANS)
Amsler grid test
mental health diagnosis conversation with AI Stress- consider heart rate variability (HRV)
“Bone protection”: exercise minutes, resistance-training load, and calcium/vitamin D intake
Glucose level
Gamification. Streaks or points for completing check-ins and exercise.
Mission environment selector (ISS / Lunar surface / Mars transit / Mars surface). Changing it changes radiation exposure, gravity and the delay before ground can answer. A Mars delay of up to about 22 minutes each way is your reason for building in-app guidance.
  Daily dose per environment (details and citations in docs/nasa-data-sources.md):
  - ISS: 0.717 mSv/day, measured (ALTEA-Survey via NASA OSDR RadLab, June 2011)
  - Lunar surface: 1.369 mSv/day, published (Zhang et al., Science Advances 2020, Chang'E-4 LND)
  - Mars transit: 1.84 ± 0.30 mSv/day, published (Zeitlin et al., Science 2013, MSL-RAD cruise)
  - Mars surface: 0.64 ± 0.12 mSv/day, published (Hassler et al., Science 2014, MSL-RAD at Gale crater)
  Watch threshold = 2 × the daily dose: an app heuristic, not a NASA value.
AI will not diagnose or prescribe medicine
Work to do
Heart rate, bp, oxygen er dataset same naki check

Dashboard UI (9 different tab er analytics/ common reusable items, brand(icon, color…) consistent
Dataset, user input data for all features individually
History of previous input
AI agent
Basic

Auth
Backend