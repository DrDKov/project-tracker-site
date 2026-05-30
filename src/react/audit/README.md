# React Audit log

Stage 25 moves audit row rendering from legacy `innerHTML` strings into a React
island. The runtime may still call `renderAudit()`, but presentation is now owned
by `AuditLog`.
