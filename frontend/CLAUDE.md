@AGENTS.md

# Susu-BG Project Context

This is a fintech web application for Ghana - a daily savings (SUSU) and wallet management platform.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 |
| Backend | Express.js + Node.js |
| Database | Supabase (PostgreSQL) |

## Project Structure

```
susu-bg/
├── frontend/              # Next.js 16 application
│   ├── src/
│   │   ├── app/         # App Router pages
│   │   │   ├── (auth)/  # Login, register, OTP pages
│   │   │   └── (dashboard)/  # Protected app pages
│   │   └── lib/         # API clients
│   └── package.json
│
├── backend/              # Express.js API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   └── routes/        # API routes
│   └── package.json
│
└── .cursor/              # AI Agent configuration
    ├── rules/           # Project-specific rules
    └── agents/          # Custom subagents
```

## Key Features

- User authentication (login, register, OTP, PIN reset)
- Wallet management (deposit, withdraw)
- SUSU groups (contributions, loans, members)
- Admin panel (users, transactions, tellers, compliance)
- Teller operations
- USSD mobile money support
- Revenue tracking

## Development Commands

```bash
# Frontend
cd frontend && npm run dev      # http://localhost:3000

# Backend
cd backend && npm run dev       # http://localhost:3001
```

## Cursor/OpenCode Configuration

### Rules (.cursor/rules/)
- `general.mdc` - Always applies, coding standards
- `nextjs-react.mdc` - Frontend patterns
- `express-backend.mdc` - Backend patterns
- `susu-model.mdc` - SUSU financial model

### Subagents (.cursor/agents/)
- `fintech-reviewer.md` - Financial code review
- `susu-expert.md` - SUSU business logic
- `ghana-payments.md` - Ghana payment integrations

### Skills (.cursor/skills/)
- `susu-backend-dev.md` - Backend dev workflow
- `susu-frontend-dev.md` - Frontend dev workflow
