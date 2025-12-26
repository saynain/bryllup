# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Start development server
pnpm build    # Build for production
pnpm lint     # Run ESLint
pnpm start    # Start production server
```

## Architecture

This is a Norwegian wedding website for "Silje & Sindre" built with Next.js 15 (App Router) and React 19.

### Key Technologies
- **Styling**: Tailwind CSS v4 with CSS variables for theming (globals.css)
- **Animations**: Framer Motion for parallax scrolling and entrance animations
- **UI Components**: Radix UI primitives (components/ui/) with shadcn/ui patterns
- **Fonts**: Italianno (decorative) and Cormorant (body) via next/font

### Structure
- `app/page.tsx` - Single-page wedding site with parallax sections and RSVP form
- `app/api/rsvp/route.ts` - POST endpoint that saves RSVPs to Google Sheets
- `components/ui/` - Reusable form components (Button, Input, Label, RadioGroup)
- `lib/utils.ts` - Contains `cn()` helper for Tailwind class merging

### Google Sheets Integration
The RSVP form submits to a Google Sheet via the Sheets API. Required environment variables (see `.env.local.example`):
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`

### Import Alias
Use `@/*` for absolute imports from the project root.
