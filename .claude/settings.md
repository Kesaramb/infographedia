# Infographedia — Claude Code Settings

## Hooks

### PreToolUse: Branch Protection
**Trigger**: Before any `Write` or `Edit` operation
**Action**: Blocks edits if the current git branch is `main` or `master`
**Why**: Prevents accidental direct commits to production branches. Always work on feature branches.

### PostToolUse: TypeScript Reminder
**Trigger**: After writing/editing `.ts` or `.tsx` files
**Action**: Reminds to use strict TypeScript and validate DNA with Zod
**Why**: Enforces the project's zero-`any` policy and DNA validation rules.

## Permissions

### Allowed
- Package management (`pnpm dev/build/lint/test/add/install`)
- Database operations (`pnpm db:migrate/seed`)
- Git operations
- Directory listing and file reading

### Denied
- Destructive operations (`rm -rf /`, `git push --force`, `git reset --hard`)
- Publishing (`pnpm publish`)

## Skills Available

| Skill | When It Activates |
|---|---|
| `dna-engine` | DNA schemas, rendering, Zod validation, component mapping |
| `ui-system` | Glassmorphism, Tailwind, app shell, modals, feed layout |
| `payload-cms` | Collections, hooks, API, auth, database |
| `ai-pipeline` | AI generation, tool calling, web search, prompts |

## Commands Available

| Command | Purpose |
|---|---|
| `/new-chart <type>` | Scaffold a new chart component for the DNA renderer |
| `/new-collection <name>` | Scaffold a new Payload CMS collection |
| `/iterate-flow` | Debug or build the iteration pipeline end-to-end |

## Agents Available

| Agent | Purpose |
|---|---|
| `code-reviewer` | Reviews changes against architecture rules |
| `dna-generator` | Generates sample DNA JSON for testing |
