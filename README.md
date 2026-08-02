# IF-AT Classroom MVP

A functional five-day **Immediate Feedback Assessment Technique (IF-AT)** classroom web app built with Next.js, TypeScript, Tailwind CSS, PostgreSQL/Supabase, Supabase Realtime, HTML Canvas scratching, secure teacher/group sessions, server-side scoring, and CSV/Excel exports.

## What is implemented

- Teacher login backed by Supabase Auth
- Multiple five-day classes
- Automatic Day 1–Day 5 creation with an explicit teacher-controlled current day
- Group creation with unique login IDs and strong random passwords
- bcrypt password hashing for group authentication
- AES-GCM encrypted credential copy for teacher-only credential export
- Group password reset with session invalidation
- Question creation with only day number, question number, and private A/B/C/D answer
- `draft`, `active`, and `closed` question states
- Database-enforced **one active question per class**
- Activate, close, reopen, and next-question controls
- Per-group and all-group reset controls with confirmation warnings
- Canvas scratch cards for mouse, pen, and touch
- 55% scratch threshold before submission
- One-card-at-a-time client interaction
- Permanent server-side attempt recording
- Exact IF-AT score schedule: **4, 3, 1, 0**
- Transaction-safe duplicate/replay protection in PostgreSQL
- Live dashboard refresh through a sanitized Supabase Realtime event table
- Polling fallback for classroom reliability
- Live current-question table
- Daily score tables
- Five-day ranking with standard competition ties (`1, 2, 2, 4`)
- Student waiting/completed/final screens
- Teacher switch controlling whether students can see final score/rank
- CSV and Excel exports for credentials, current results, daily/final results, rankings, and detailed attempts
- Demo seed data
- Protected teacher/student page areas
- Responsive classroom UI

## Security model

The most important rule is enforced architecturally: **`correct_option` is never returned by a student API.**

Student browsers receive only:

- class/group display information
- current day and question number
- their own recorded attempts
- their own completion status and points
- optional final score/rank if the teacher enables it

A scratch submission sends only `{ questionId, option }` to the server. The server verifies the signed group session and invokes the PostgreSQL `submit_group_attempt` function. That function serializes concurrent submissions for the same group/question, verifies the question is active, rejects repeated options, records the attempt, compares the answer inside PostgreSQL, calculates points, and returns only correctness/attempt/points.

The Supabase service-role key is used **server-side only**. Group sessions carry an authentication version; password resets increment that version so previously issued group sessions are rejected.

Realtime clients subscribe only to `class_activity_events`, a deliberately sanitized table containing:

- `class_id`
- `event_type`
- timestamp

It contains no answer keys, student answers, group names, credentials, or scores. An event tells the client to re-fetch its protected server endpoint.

### Credential export note

The requirements call for exporting group login credentials while also hashing passwords. Hashes are intentionally non-reversible, so this MVP stores:

1. a bcrypt hash used for login verification, and
2. a separately AES-256-GCM encrypted copy used only by teacher-only exports.

`GROUP_CREDENTIAL_KEY` must therefore be protected like any other server secret. For a higher-security deployment, you can remove `login_secret_enc` and switch to one-time password display/printing plus password resets.

## Project structure

```text
ifat-classroom/
├── middleware.ts
├── scripts/
│   └── seed.ts
├── supabase/
│   └── migrations/
│       └── 001_init.sql
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── student/
│   │   │   └── teacher/
│   │   ├── student/
│   │   │   ├── login/
│   │   │   ├── scratch/
│   │   │   └── results/
│   │   └── teacher/
│   │       ├── login/
│   │       ├── dashboard/
│   │       ├── classes/
│   │       └── class/[classId]/
│   ├── components/
│   └── lib/
├── .env.example
├── package.json
└── README.md
```

## 1. Create a Supabase project

Create a normal Supabase PostgreSQL project.

From Supabase Project Settings → API, copy:

- Project URL
- anon/public key
- service-role key

Never expose the service-role key to the browser.

## 2. Apply the database migration

Using the Supabase SQL Editor, run:

```text
supabase/migrations/001_init.sql
```

Or, if you use the Supabase CLI:

```bash
supabase db push
```

The migration creates all tables, constraints, RLS settings, triggers, realtime publication membership, and the atomic attempt submission function.

## 3. Configure environment variables

Copy:

```bash
cp .env.example .env.local
```

Fill in all values.

Generate a session secret, for example:

```bash
openssl rand -hex 48
```

Generate the required 32-byte group credential encryption key:

```bash
openssl rand -base64 32
```

## 4. Install and run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## 5. Load development demo data

After the migration and `.env.local` are ready:

```bash
npm run seed
```

The development seed contains one teacher, one five-day class, five groups, five Day-1 questions, varied attempts, and sample scores.

The seed script prints its demo credentials to the terminal. They are intentionally kept in the development seed file only and are not hard-coded in application pages.

## 6. Classroom workflow

### Teacher

1. Log in.
2. Create/open a class.
3. Create student groups.
4. Export or distribute group credentials.
5. Open **Question control**.
6. Choose Day 1–5, question number, and correct option.
7. Activate exactly one question.
8. Watch **Live results** as groups scratch.
9. Close or move to the next question.
10. Use **Results** for daily totals, final ranking, and exports.
11. Mark the class `completed`.
12. Optionally enable final score/rank visibility for students.

### Student group

1. Log in with group ID/password.
2. Wait until a question is active.
3. Scratch A, B, C, or D.
4. At roughly 55% removed, the selected option is submitted.
5. If wrong, scratch another untried option.
6. If correct, the question locks and shows the awarded points.
7. Wait for the teacher to activate the next question.

## Exact scoring

| Correct attempt | Points |
|---|---:|
| 1st | 4 |
| 2nd | 3 |
| 3rd | 1 |
| 4th | 0 |

Points are calculated only inside the server/database path.

## Reset behavior

Teacher resets delete the affected `attempts` and `question_results` rows. The UI shows a confirmation warning before destructive resets. Realtime events cause students and teacher result screens to re-fetch immediately.

## Exports

Teacher-only endpoints support:

- Group credentials
- Current active-question results
- Daily/five-day score summary
- Final ranking
- Detailed attempt history

Each is available as CSV and Excel (`.xlsx`). Password hashes are never exported.

## Tie rule

This MVP uses **standard competition ranking**:

```text
1, 2, 2, 4
```

Groups with equal final totals receive the same rank.

## Deployment to Vercel

1. Push this directory to a private Git repository.
2. Import the repository into Vercel.
3. Add every variable from `.env.example` in Vercel Project Settings → Environment Variables.
4. Deploy.
5. In Supabase, keep the service-role key private and rotate it immediately if it is ever exposed.
6. Test teacher and student logins on the deployed HTTPS URL.
7. Test realtime updates with two separate browsers/devices before class.

No server secret should be prefixed with `NEXT_PUBLIC_`.

## Recommended production hardening

Before a high-stakes deployment, consider:

- rate limiting login and attempt endpoints
- audit log table for teacher administrative actions
- CSRF tokens on state-changing teacher actions
- stricter Realtime channel authorization instead of public sanitized event reads
- scheduled cleanup of old `class_activity_events`
- session revocation/version fields for forced logout
- optional WebAuthn/MFA for teachers
- automated database backups and restore drills
- observability/error reporting
- integration/end-to-end tests in CI
- accessibility mode controlled by the teacher, if needed

## Quick acceptance test

Use two browsers: one teacher, one student group.

1. Teacher activates a question with correct option `B`.
2. Student scratches `A` beyond 55% → server returns Wrong.
3. Refresh student page → `A` remains attempted.
4. Student scratches `B` → Correct, **3 points**.
5. Refresh/log out/log back in → completion and 3 points remain.
6. Try submitting `A` again directly → rejected as already attempted/completed.
7. Teacher dashboard updates without manual refresh.
8. Teacher resets that group → student state reopens after realtime refresh.
9. Teacher activates next question → student receives it automatically.
10. Export ranking/attempt history and verify no password hashes are present.
