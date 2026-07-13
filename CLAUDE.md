# CLAUDE.md - Development Guide

## Project Overview
A minimalist personal expense tracker optimized for New Zealand living. Focuses on local bank CSV imports, offline-first localStorage, multi-currency inputs (NZD, USD, CNY), and premium motion aesthetics.

## Build and Run Commands
*   **Install Dependencies**: `npm install`
*   **Run Development Server**: `npm run dev`
*   **Production Build**: `npm run build`
*   **Linting**: `npm run lint`

## Project Structure
```text
cool-euclid/
├── CLAUDE.md               # Dev guidelines & commands
├── ARCHITECTURE.md         # Technology decisions & core systems
├── package.json
├── index.html
├── src/
│   ├── main.tsx            # Entry point
│   ├── App.tsx             # Main Application Logic & layout
│   ├── components/         # Reusable UI components
│   │   ├── TransactionList.tsx
│   │   ├── CSVImporter.tsx
│   │   └── AddTransactionModal.tsx
│   ├── utils/              # Pure utilities
│   │   ├── csvParser.ts    # NZ Bank CSV Parsers (ANZ, ASB, BNZ, Westpac)
│   │   ├── currency.ts     # Multi-currency helper (NZD, CNY, USD)
│   │   └── storage.ts      # LocalStorage engine for persistence
│   └── styles/
│       └── index.css       # Core design tokens, theme variables & animations
```

## Guidelines & Rules

### Coding Standards
*   **TypeScript**: Explicit type definitions, no `any`.
*   **State Management**: Simple React state, custom hooks, and `localStorage` syncing.
*   **Comments**: Write code comments in **English** only.
*   **Thinking/Interaction**: Always think, plan, and communicate in **Chinese** (中文).

### Motion & Design Guidelines (UI Skills Alignment)
*   **Physical Feedback**: Every pressable element must scale down to `scale(0.97)` on `:active` with instant response.
*   **Anim Duration**: Keep UI micro-transitions (dropdowns, selectors, fades) under `300ms` using custom cubic-bezier curves (e.g., `cubic-bezier(0.23, 1, 0.32, 1)`).
*   **Entry animations**: Never animate from `scale(0)`. Always enter from `scale(0.95)` + `opacity: 0` for dialogs/modals.
*   **Edge Feedback**: Use CSS transitions for interruptibility instead of hard keyframes. Use spring-like decay animations for list reorderings or card dismissal if JS-driven.
