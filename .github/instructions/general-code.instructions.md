---
applyTo: "**/*.ts,**/*.tsx"
---

# General Code

- Prefer explicit types over loose typing for exported functions.
- Use descriptive-but-simple names.
- Prefer named exports over default exports.
- Validate inputs at system boundaries.
- Return structured errors from business logic — use try/catch only at boundaries.
- Keep functions small and focused.
- Comment only for invariants, assumptions, or external requirements.
