---
applyTo: "**/api/**/*,**/routes/**/*,**/server/**/*"
---

# API & Server Code

- Validate all request inputs before processing.
- Return structured error responses with a message and error code.
- Use proper HTTP status codes.
- Check authentication before processing protected requests.
- Keep business logic in service modules, not in route handlers.
- Log errors server-side — never expose internals to the client.
- Never hardcode secrets — use environment variables.
