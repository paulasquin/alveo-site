# Alveo site

Showcase page of Alveo, built from showcase-kit. Read README.md, then docs/showcase-kit.md (recipe, act contract, testing, pitfalls).

- **Simulated data only**: no patient image, recording, study, hospital or clinician name on this site (decision of Paul, 2026-10-19). Regenerate the data with tools/build_sim.py; never copy from Alveo's DATA/.
- Audience: ICU clinicians and EIT researchers. Professional register, "vous" in French; facts must match the Alveo app and Costa et al. 2009.
- Code, comments and docs in English; copy in French (index.html, content.js) and English (strings.js, content.en.js).
- `js/kit/` is shared with showcase-kit: improve it there and port the fix.
- Validate 3D on a real GPU (modal/) and on a phone profile before calling a change done; SwiftShader hides NaN shader bugs.
