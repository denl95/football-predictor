<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Critical project rules

These are the non-obvious constraints that are easy to get wrong. See `CLAUDE.md`
for the full project overview.

- **Package manager is Bun.** Use `bun` / `bun run <script>` for everything — never npm/yarn/pnpm.
- **Prisma is generated to `src/generated/prisma/`.** Import the client from
  `@/generated/prisma/client`, never from `@prisma/client`. Always import the shared
  `prisma` instance from `@/lib/db` (it wires up the `PrismaPg` driver adapter).
  `src/generated/` is auto-generated — never edit it by hand.
- **There is no `middleware.ts`.** Auth gating is the `authorized` callback in
  `src/lib/auth.ts` plus the `src/app/(app)/` route group.
- **Session uses the JWT strategy** (Credentials + adapter). `session.user.id` exists
  only because the `jwt`/`session` callbacks thread `token.sub` through.
- **Admin/creator checks must be re-done server-side** in the action — hiding a button
  is not authorisation. Admin = `session.user.email === process.env.ADMIN_EMAIL`.
- **Styling**: use the theme tokens from `globals.css` (`bg-surface`, `text-accent`,
  `border-border`, …); never hardcode hex colours.
- **Biome** enforces tabs, double quotes, ESM-only, no `any`. Run `bun lint:fix` before
  committing.
