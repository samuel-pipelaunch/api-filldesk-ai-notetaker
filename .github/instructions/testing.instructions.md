---
applyTo: "tests/**/*,**/*.test.*,**/*.spec.*"
---

# Testing

- Test behavior, not implementation.
- Descriptive test names that explain the scenario.
- Follow Arrange–Act–Assert pattern.
- Mock external dependencies only — never mock internal code.
- Use factory functions for test data.
- Test both success and error paths.
- Keep tests deterministic — no randomness, time-dependence, or external state.
