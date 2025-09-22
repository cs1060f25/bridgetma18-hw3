# bridgetma18-hw3
- Bridget Ma
- BridgetMa18
- unified-ai-workspace.netlify.app
- https://drive.google.com/file/d/1hVWV3kmgiqpoA5zh64hVNm7meogzk0eq/view?usp=sharing

This prototype implements the Bob user journey with synthetic data:
- Dashboard (assignments, announcements, policy chips, policy diff)
- Smart Scheduling (conflict-free OH suggestions, booking/cancel, rebooking on conflict)
- AI Template (professor-approved template; blocks code-gen; metadata-only usage logs)
- Submission (pre-flight checklist, one-click **Declare AI Usage**, submit)

## Quick start
```bash
npm install
npm run dev 
```

### Demo controls (top-right buttons)
- **Trigger Monday Alert** → changes due date & policy; shows announcement + policy diff.
- **Add Interview Conflict** → creates a Tue 3:00–3:45 interview that conflicts with OH so you can rebook.

> Note: A few flows show "Not implemented" to model realistic UI controls per the assignment requirement.