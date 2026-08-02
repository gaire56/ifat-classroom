# Architecture Notes

## Trust boundaries

### Browser
Untrusted. Never receives answer keys or service-role secrets.

### Next.js server
Validates teacher/group session cookies, validates request bodies, checks class ownership, performs privileged Supabase operations, decrypts exportable group credentials only for teacher-only export requests.

### PostgreSQL / Supabase
Source of truth for classes, groups, questions, attempts, results, scoring, duplicate protection, and ranking inputs.

## Student answer flow

```text
Canvas scratch >= 55%
        |
        v
POST /api/student/attempt
        |
        v
signed group session validation
        |
        v
submit_group_attempt(...)
        |
        +--> lock group/question submission lane
        +--> verify active question
        +--> verify group belongs to class
        +--> reject duplicate option
        +--> assign attempt number
        +--> compare selected option to private correct_option
        +--> insert immutable attempt
        +--> update question_results
        +--> emit sanitized class event
        |
        v
return only { correct, attemptNumber, pointsEarned? }
```

## Why attempts survive refresh/device changes

Attempts and result state are database rows keyed by `question_id + group_id`. The browser is never the source of truth for attempt count or points.

## Concurrency protection

The PostgreSQL function takes a transaction-scoped advisory lock for the `question_id:group_id` pair. Together with unique constraints on selected option and attempt number, this blocks double-click races and simultaneous-device scoring races.

## Realtime model

The application never subscribes student clients directly to the `questions` or `attempts` tables. It subscribes only to sanitized event inserts. When an event arrives, the client calls its protected API again.

This keeps realtime responsive while preserving the server as the authorization boundary.
