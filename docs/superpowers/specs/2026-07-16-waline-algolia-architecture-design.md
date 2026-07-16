# Waline + Algolia Architecture Change

**Date:** 2026-07-16  
**Status:** Approved  
**Supersedes:** The authentication, comments, likes, guestbook backend, and search-provider sections of `2026-07-16-personal-website-v2-design.md`

## Goal

Reduce custom application code and long-term maintenance by replacing the planned Supabase browser authentication and interaction system with Waline, and replacing Pagefind as the primary search experience with Algolia DocSearch.

The website remains an Astro content site on Vercel. Supabase remains available only as Waline's PostgreSQL storage. Pagefind remains built as a fallback search provider.

## Confirmed Decisions

- Use a separate GitHub repository and Vercel project named `cc-waline`, based on the official Waline Vercel template.
- Use the existing Tokyo Supabase project as Waline's PostgreSQL database.
- Use Waline accounts for email/password registration and login.
- Configure QQ SMTP so email registration requires confirmation.
- Use Waline's default public OAuth service for GitHub login initially.
- Force login on both the Waline client and server before users can publish.
- Use Waline for article comments, replies, guestbook messages, administration, and article reactions.
- Accept that Waline reactions are page-level reactions rather than a strict one-account-one-like model.
- Accept Waline's native reply model instead of enforcing the previous custom one-level limit.
- Use Algolia DocSearch for the public technical blog after the website is publicly deployed and the domain is approved.
- Retain Pagefind as the pre-approval and outage fallback.
- Keep the approved five-article Obsidian import unchanged.

## Out of Scope

- Custom Supabase Auth UI or session handling in the Astro site.
- Custom comment, reply, like, profile, or administrator tables and RPC functions.
- Self-hosting the Waline OAuth service in this version.
- A CMS.
- Algolia indexing scripts or GitHub Actions that push records directly.
- Oracle-hosted production dependencies.

## Architecture

### Astro Website

The existing Astro Theme Pure site remains the public website. It owns:

- articles, tags, archives, projects, links, about, and RSS;
- the `/search` page;
- a thin Waline client wrapper;
- the `/guestbook` page;
- Pagefind fallback assets;
- Algolia DocSearch client configuration.

The website does not receive database passwords, SMTP credentials, Algolia administration keys, or Waline signing secrets.

### Waline Service

Waline runs as a separate Vercel project from the official `@waline/vercel` template. It owns:

- account registration and login;
- email confirmation and password recovery;
- public GitHub OAuth through the default Waline OAuth service;
- comments and replies according to Waline's native model, without a custom reply-depth restriction;
- comment administration;
- article reactions;
- comment notification emails;
- the management UI.

The first account is registered by CC with `2463323447@qq.com` before the Waline client is exposed on the public website. This guarantees CC becomes the initial administrator.

### Supabase PostgreSQL

Supabase Auth and the browser SDK are not used by the website. Supabase only stores Waline data.

Waline uses the Supabase pooler connection shown in the project dashboard, with SSL enabled. Tables use the `wl_` prefix. The official Waline PostgreSQL schema is applied before the service is opened to registration.

The runtime connection values are stored only in the `cc-waline` Vercel project:

- `PG_HOST`
- `PG_PORT`
- `PG_DB`
- `PG_USER`
- `PG_PASSWORD`
- `PG_PREFIX=wl_`
- `PG_SSL=true`

The previously prepared custom Supabase migration was tested only inside a rolled-back transaction and was never applied. Its local client, types, schema, tests, and dependency will be removed without any production database cleanup.

### Algolia DocSearch

Algolia DocSearch becomes the primary search provider after:

1. the technical blog is publicly deployed;
2. domain ownership is verified;
3. the DocSearch application is approved;
4. the initial crawler run is reviewed.

The crawler includes article, tag, and archive content. It excludes the guestbook, Waline service, Waline administration UI, login/profile pages, and other non-technical pages.

The Astro website receives only public search configuration:

- `PUBLIC_ALGOLIA_APP_ID`
- `PUBLIC_ALGOLIA_SEARCH_API_KEY`
- `PUBLIC_ALGOLIA_INDEX_NAME`

No Algolia administration key is exposed to the browser or stored in the website repository.

Pagefind indexing stays enabled. If the three public Algolia values are absent, the search page uses Pagefind. If DocSearch fails at runtime, the search page offers the Pagefind fallback instead of becoming unusable.

## User Experience

### Article Pages

Every published article renders Waline below the article recommendations with:

- `login: 'force'`;
- `reaction: true`;
- Chinese locale;
- a normalized canonical pathname;
- light/dark styling that follows the website theme;
- a readable unavailable-state message when the Waline server cannot load.

Article reactions are not represented as authenticated Supabase likes. This difference is accepted.

### Guestbook

`/guestbook` is publicly readable. Publishing requires a Waline account. It uses the stable Waline path `/guestbook` and does not show article reactions.

The main navigation contains a Chinese “留言板” entry.

### Search

`/search` remains the single search entry:

- Algolia DocSearch is primary when all public Algolia values exist.
- Pagefind is primary before approval.
- A visible local-search fallback remains available after Algolia activation.
- The Algolia attribution required by the free DocSearch program remains visible.

## Security and Privacy

The Waline Vercel project uses:

- `LOGIN=force`;
- client `login: 'force'`;
- `SECURE_DOMAINS` limited to the website and Waline service domains;
- `DISABLE_USERAGENT=true`;
- `DISABLE_REGION=true`;
- Waline's default IP posting interval;
- direct publication with `COMMENT_AUDIT=false`.

QQ SMTP is configured using:

- `SMTP_HOST=smtp.qq.com`;
- `SMTP_PORT=465`;
- `SMTP_SECURE=true`;
- `SMTP_USER=2463323447@qq.com`;
- `SMTP_PASS` entered by the user directly in Vercel;
- matching sender and administrator email values.

The SMTP authorization code and database password are never pasted into source code, committed, printed in logs, or repeated in chat.

Waline's default public OAuth service is an accepted external dependency for this version. A later self-hosted OAuth service can replace it through `OAUTH_URL` without changing article or guestbook URLs.

## Failure Handling

- Waline failure never prevents article content from rendering.
- The article and guestbook components show a short retry message if the Waline client or server fails.
- Algolia absence selects Pagefind at build time.
- Algolia runtime failure preserves a user-visible Pagefind fallback.
- SMTP failure blocks verified email registration but does not disable GitHub login or existing sessions.
- Database connection failures surface through the Waline service and do not expose connection details to visitors.

## Testing

Automated website checks cover:

- Waline is present on article pages and `/guestbook`;
- article and guestbook paths are distinct and stable;
- forced-login client configuration;
- reactions enabled only for articles;
- the unavailable-state container;
- Algolia configuration resolution;
- Pagefind selection when Algolia values are incomplete;
- absence of secret environment variable names and values from browser output;
- all five imported articles;
- Astro type checking and production build.

Manual deployment verification covers:

- CC is the first Waline administrator;
- QQ email confirmation;
- GitHub login through the public OAuth service;
- comment, reply, deletion, guestbook, and reaction flows;
- light and dark mode;
- Supabase `wl_` table creation and persistence;
- DocSearch domain verification, crawl exclusions, attribution, and fallback behavior.

## Rollout

1. Replace the custom Supabase interaction implementation with the thin Waline/DocSearch architecture.
2. Import and publish the five approved Obsidian articles.
3. Deploy the Astro site with Pagefind as the active search.
4. Create and deploy the independent `cc-waline` service.
5. Initialize Waline's `wl_` PostgreSQL tables in Supabase.
6. Configure Waline database, forced login, security domains, privacy, and QQ SMTP environment variables.
7. Let CC register the first administrator account.
8. Set the website's public Waline server URL and verify comments, guestbook, and reactions.
9. Publicly deploy the technical blog.
10. Apply for Algolia DocSearch, verify the domain, review crawler scope, and run the first crawl.
11. Add the three public Algolia values and verify DocSearch plus Pagefind fallback.

## Acceptance Criteria

- The website contains no custom Supabase browser authentication or interaction code.
- No custom interaction migration is applied to production.
- Waline provides verified email registration, GitHub login, comments, replies, guestbook, administration, and reactions.
- CC owns the first Waline administrator account.
- Waline stores persistent data in Supabase PostgreSQL under the `wl_` prefix.
- Algolia DocSearch is the primary public search after approval.
- Pagefind remains functional before approval and during Algolia outages.
- Five approved articles are published.
- No secret is committed or exposed in browser bundles.
