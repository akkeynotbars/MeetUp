# MeetUp — Progress Presentation Script

For sharing with the team via WhatsApp. ~13 min total + Q&A.

---

Guys, here's the script for our progress presentation to Sir. Each of us has a section — say what's listed and have the right thing on screen when it's your turn. Keep your part tight (~2 min) so we don't drag and we leave time for questions.

**Order of presenters:**

---

*1. Akbar — Intro (2 min)*

Say:
- "MeetUp is an AI-powered recruitment platform that connects job seekers with companies, with AI doing the matching."
- "It's a 7-week project. We're now starting Week 2."
- briefly intro the team and who built what (just names + roles)

Show:
- the PRD / project brief
- the 7-week timeline

---

*2. Reza — Project structure & GitHub (2 min)*

Say:
- "First thing we did was set up the repo and split the codebase into three folders, so every team member knows exactly where their code goes:"
  - `/frontend` — HTML, CSS, JS (the website)
  - `/backend` — Node.js + Express (the API)
  - `/ai-engine` — Python + Flask (the matching logic, coming in Week 4)
- "Database is Supabase (Postgres). All 7 of us have push access to the repo."

Show:
- open the GitHub repo: https://github.com/akkeynotbars/MeetUp.git
- expand the folder tree so Sir can see the 3 layers
- briefly open `ai-engine/main.py` to show the AI layer is already stubbed

---

*3. Kent & Wang — Frontend (3 min, split however you want)*

Say:
- "We built the landing page, login screen, and signup screen using vanilla HTML/CSS/JS — no framework yet, keeping it simple."
- "We also did a cleanup pass this week. Login and signup had about 150 lines of duplicate CSS, so we pulled all the shared auth styling into one file at `frontend/shared/auth.css`. Now if we change a button colour, both pages update together — no drift."
- "Dashboard pages are stubbed in for next week."

Show:
- live in the browser: open `frontend/LandingPage/index.html`, click through to Login, then Sign Up
- briefly open `frontend/shared/auth.css` so Sir can see the consolidation

---

*4. Nasyith — Backend Auth API (3 min)*

Say:
- "I built the authentication API in Express. Three endpoints:"
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- "Signup validates the input, checks for duplicate emails, hashes the password with bcrypt *before* storing it, then inserts into Supabase. If the role is `company`, it also creates a row in the companies table with status `pending_verification` — so admins can approve them later."
- "Login verifies the bcrypt hash and returns a JWT that includes the user's role. The frontend reads the role from the token and redirects to the right dashboard."
- "One security thing: I used the *same* error message for 'email not found' and 'wrong password' — that prevents attackers from enumerating which emails are registered in our system."

Show:
- open `backend/routes/auth.js` and walk through the signup handler
- open `backend/utils/password.js` to point out the bcrypt usage (this satisfies NFR-01 — passwords never stored in plain text)
- if Min has the DB tables live by presentation time, run a `curl` to `/api/auth/signup` then `/api/auth/login` for a live demo

---

*5. Min — Database & role-based access (2 min)*

Say:
- "I set up the Supabase project and the database schema. Two tables: `users` (storing bcrypt password hashes, never plaintext) and `companies` linked to it by `user_id`."
- "I also wrote the role middleware: `requireRole('user')` or `requireRole('company')`. Any protected endpoint we add later just chains these middlewares — that's FR-02 done in one line per route."
- "Row-Level Security is enabled on both tables — only our backend's service-role key can write to them. The frontend can never hit the database directly."

Show:
- Supabase dashboard → Table Editor → `users` and `companies`
- `backend/middleware/role.js` — quick walk-through of how `requireAuth` runs first, then `requireRole` checks the role

---

*6. Odma — What's coming next (1 min)*

Say:
- "Next week (Week 3) we wire the frontend forms to the backend API — so signup and login actually create real accounts in the database and redirect to the right dashboard based on role."
- "I'll also start on the user dashboard UI for browsing jobs."
- briefly preview the AI-engine work (job-to-candidate matching) coming in Week 4–5

Show:
- the Week 3 section of the timeline

---

**Closing notes for everyone:**

- Have your tabs and editor ready *before* we start. Tab order: GitHub → browser (frontend) → editor (backend code) → Supabase dashboard. We don't want to fumble switching.
- If Sir asks about deployment → "Local-only for now. Planned for Week 6."
- If he asks "why not just use Supabase Auth?" → "We built our own so we can fully control the company verification flow and the role logic."
- If he asks about tests → "Manual smoke tests done. Automated tests planned for Week 5."
- If he asks where the AI is → "Stubbed in `/ai-engine`, real work begins Week 4 once auth is fully wired."

Total est. time: ~13 min + Q&A.
