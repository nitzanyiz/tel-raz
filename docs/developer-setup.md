# Developer setup – tel-raz.com

The editor's guide is [`מדריך-ניהול-האתר.md`](./מדריך-ניהול-האתר.md). This doc covers everything technical.
Design: [`superpowers/specs/2026-11-14-tel-raz-site-design.md`](./superpowers/specs/2026-11-14-tel-raz-site-design.md).

## Architecture in one minute

- **Eleventy 3** builds `src/` → `_site/`. Nunjucks layouts in `src/_includes/`, Markdown pages in `src/pages/`.
- **Editor content** lives in `src/content/*.json` (settings, home, downloads) and the Markdown front matter/body of `src/pages/**/*.md`. It's loaded as global data in `.eleventy.js` (`site`, `home`, `downloads`).
- **Routing is developer-owned:** `src/pages/pages.11tydata.js` (default `/<file-name>/`, plain layout) plus `<name>.11tydata.json` overrides; `services/` and `legal/` have their own data files. No `layout` or `permalink` in front matter, so a CMS save can't move a page.
- **The build fails on dead internal links** (`lib/check-links.js`, run on `eleventy.after`). A broken preview never reaches the publish button.
- **Markdown is not run through Nunjucks** (`markdownTemplateEngine: false`), so editor text can never break the build.
- **Menu** = `lib/menu.js` → `buildMenu(menuGroups, pages, site)`. Pages opt in with front matter `menu: { title, parent, order }` (the label is `menu.title`, so editing the page title can't break the bar), and `src/_data/menuGroups.json` defines the non-page entries (headers and the external remote-support link). Empty groups and links with empty URLs are dropped.
- **Preview vs production:** `lib/env.js`. Only `CONTEXT=production` (Netlify's production branch) is production. Every other build gets `noindex`, `robots.txt: Disallow: /` and form subjects prefixed `[בדיקה] `.
- **Admin:** Sveltia CMS at `/admin` (`src/admin/index.html` pins the version; `src/admin/config.yml` defines the forms). `tests/cms.test.js` keeps the config in sync with the content files.
- **Forms:** Netlify Forms (`contact`, `service-call`), with a honeypot. They redirect to `/thanks/`.

## Local development

```bash
npm install          # see "npm registry" below if you're on a Wix laptop
npm start            # http://localhost:8080 with live reload
npm test             # builds preview/prod/empty-settings variants and checks them
scripts/behavior-check.sh # headless-Chrome checks of menu keyboard/hover behavior
scripts/screens.sh   # screenshots of key pages at 1280/1000/390px + open menus → .tmp-builds/screens/
scripts/placeholders.sh   # lists every [למילוי] left in the content
```

**Preview before launch:** `npm run preview` builds the site and uploads it to **https://preview--tel-raz.netlify.app**, a preview deploy on the existing Netlify project. It never touches tel-raz.com and uses no credits (only production deploys do). It's a preview build: noindex, and form emails tagged "[בדיקה]". It needs a one-time `npx netlify-cli login`. After launch, the automatic `master` branch deploy replaces this.

**Editing content locally:** run `npm start`, open http://localhost:8080/admin/ in Chrome or Edge, and choose **Work with Local Repository**, then select this repo folder. Saves write straight to your working tree (no login needed). Check `git diff` afterwards.

### npm registry

There's deliberately **no project `.npmrc`**: npm uses whatever registry your machine is configured for.

- **Netlify / a personal computer:** the default public registry.
- **A Wix-managed laptop:** the global Wix mirror (public npm is blocked there; be on VPN). npm's default `replace-registry-host=npmjs` makes `npm ci` fetch the lockfile's public URLs through the mirror.

The lockfile must keep public `https://registry.npmjs.org/...` URLs (Netlify can't reach the Wix mirror). Adding or upgrading a package through the mirror writes mirror URLs, so fix them before committing:

```bash
sed -i '' 's#https://npm.dev.wixpress.com/api/npm/npm-repos/#https://registry.npmjs.org/#g' package-lock.json
grep -c wixpress package-lock.json   # must print 0
```

(A project `.npmrc` pointing at the public registry also breaks `npx`-launched MCP servers that Claude Code starts from this folder, such as the Playwright gateway; they hang until Claude Code times out.)

## Branches and deploys (credit-saving)

| Branch | Netlify | Who writes to it |
|---|---|---|
| `master` | Branch deploy (free preview): `https://master--tel-raz.netlify.app` | You, and the CMS (every editor save is a commit here) |
| `production` | **Production** deploy → tel-raz.com (15 credits each) | Only the **"פרסום האתר"** action, or you |

- Publish: GitHub → Actions → **פרסום האתר** → Run workflow, or locally `git push origin master:production`. It's a fast-forward only; it fails if `production` diverged.
- `netlify.toml`'s `ignore` skips builds when a push only touches `docs/`, `.claude/`, `README.md`, `tests/` or `scripts/`.
- Free plan: 300 credits/month. Production deploy = 15, bandwidth ≈ 20/GB, previews free, forms free.

## Launch checklist

Nothing on Netlify changes until this checklist. The live temporary site stays up until step 4.

1. [ ] Everything is checked locally on `master` (`npm test` green, `scripts/screens.sh` reviewed, CMS round-trip in local mode, see below). Placeholders replaced (`scripts/placeholders.sh`), or you accept launching with generic copy.
2. [ ] `git push origin master` then `git push origin master:production`. **`production` must hold the full site before linking**, because linking deploys it immediately.
3. [ ] **GitHub OAuth app** for the CMS login: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
   - Application name: `Tel-Raz CMS`
   - Homepage URL: `https://tel-raz.com`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
   - Then generate a client secret.
   - Netlify → Project configuration → **Access & security → OAuth** → Install provider → GitHub → paste the Client ID and secret.
4. [ ] Netlify → Project configuration → Build & deploy → Continuous deployment → **Link repository** → GitHub → `nitzanyiz/tel-raz`, **Branch to deploy: `production`**. Leave the build command and publish dir empty (`netlify.toml` sets them). **This deploy is the launch.**
5. [ ] Same section → Branches and deploy contexts → **Branch deploys: Let me add individual branches → `master`**.
6. [ ] Forms: form detection is already enabled. After the first deploy, check that both `contact` and `service-call` appear under Forms, with email notifications to info@tel-raz.com.
7. [ ] Verify:
   - `/admin` login works on tel-raz.com **and** on the master preview.
   - `curl -I https://tel-raz.co.il` and `https://www.tel-raz.co.il` → `301` to `https://tel-raz.com/`.
   - Send each form from the live site (normal subject) and from the preview (`[בדיקה]` subject).
   - An old link works: `https://tel-raz.com/files/מדריך%20לשינוי%20שם%20שלוחה.pdf`.
   - The preview has `<meta name="robots" content="noindex">`.
8. [ ] Editor: create their GitHub account, add it as a collaborator (repo → Settings → Collaborators, **Write** role), send them the guide, and bookmark the three links in section 1 of the guide for them. Fill in the technical contact at the end of the guide.
9. [ ] Editor follows the Search Console and Google Business Profile guides.

### If the Netlify OAuth login doesn't work

Fallback: deploy Sveltia's auth worker (https://github.com/sveltia/sveltia-cms-auth) to Cloudflare Workers (free), point a GitHub OAuth app's callback at the worker, and set in `src/admin/config.yml`:

```yaml
backend:
  base_url: https://<your-worker>.workers.dev
```

Remove `site_domain`, then update section 2 of the editor guide if the login screen changes.

## CMS round-trip check (do once before launch, and after Sveltia upgrades)

In local mode (above): edit the phone in **פרטי האתר**, the intro of **מרכזיית Panasonic** and the **עלינו** body; add a dummy download, then remove it; save each time. Then:

```bash
git diff        # only the intended values changed; menu/layout/permalink untouched
npm test        # still green
git checkout -- src   # revert
```

If hidden front-matter keys get dropped, the route and menu tests fail. Fix `config.yml` before launch.

## Adding pages

Use the repo skill `.claude/skills/add-page/SKILL.md` (ask Claude: "add a page …"), or follow it by hand.

## Enabling page creation for the editor (later)

Not enabled now; the editor edits only. To let them add and remove pages from `/admin`:

1. In `src/admin/config.yml`, on the `services` and/or `pages` collections:
   - set `create: true` and `delete: true`;
   - add `slug: "{{fields.slug}}"` and a required `slug` string field (English letters, digits and dashes; add a `pattern`);
   - replace `menu`'s hidden widget with an object widget whose fields are `parent` (a `select` widget with options = the keys in `src/_data/menuGroups.json`) and `order` (number);
   - for `pages`, the default routing in `pages.11tydata.js` already gives new pages `/<slug>/` with the plain layout.
   - expose `menu.title` too (the label shown in the bar), with a short max length.
2. Let them rename and reorder menu headers: add `src/_data/menuGroups.json` as a file collection with `title` and `order` editable, and `key`/`parent`/`urlFromSite`/`external` hidden. Adding or deleting headers stays with the developer (an empty header would vanish from the menu anyway, since `buildMenu` drops empty groups).
3. Duplicate permalinks already fail the Eleventy build, and dead links fail the link check. Add a slug `pattern` in the CMS so an invalid slug is rejected while the editor is typing it.
4. Add a section "הוספת עמוד חדש" to the editor guide (section 4) and remove rule 6 in section 5.
5. Update `tests/cms.test.js` (it asserts `create: false`) to the new policy.
