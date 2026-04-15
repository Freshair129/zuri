# Architectural Law: RBAC & Security

```mermaid
sequenceDiagram
    participant U as User
    participant NA as NextAuth
    participant DB as Database
    participant API as API Route

    U->>NA: Login (email + password)
    NA->>DB: Verify credentials (bcrypt)
    DB-->>NA: User + roles
    NA-->>U: JWT token (session)
    U->>API: Request + JWT
    API->>API: getServerSession()
    API->>API: can(roles, domain, action)
    API-->>U: Response
```

- **Roles**: DEV, OWNER, MANAGER, SALES, KITCHEN, FINANCE, STAFF.
- **Enforcement**: Use `can(roles, domain, action)` centralized in `src/lib/permissionMatrix.js`.
- **Storage**: Roles are stored in `Employee.roles[]` (array of UPPERCASE strings).
- **Session**: NextAuth v4 handles session via JWT strategy.
