# Deploying to Vercel

The site is a static multi-page app (`index.html` is the landing page).
No build step, no backend — data is fetched live in the browser. The only
external service is the existing Cloudflare Worker for Notion portfolio cards,
which is hosted separately and keeps working as-is.

`stats-data.js` **must** stay next to `index.html` (the emergency-food chart needs it).

---

## Option A — Fastest: Vercel CLI (no GitHub needed)

In a terminal:

```
cd "D:\CLAUDE CODE\Camden_interface"
npx vercel
```

- First run asks you to log in — choose **Continue with GitHub** (or email); it opens a browser.
- Then a few prompts — press **Enter** to accept every default.
- It prints a preview URL when done.

Publish to the production URL:

```
npx vercel --prod
```

**To update later:** make your edits, then run `npx vercel --prod` again.

---

## Option B — Best long-term: GitHub + auto-deploy (recommended for DML)

1. Create a new **empty, private** repo at <https://github.com/new>
   (e.g. `camden-food-systems`). Don't add a README/gitignore — the repo already has them.

2. Connect and push (replace `<you>` with your GitHub username):

   ```
   cd "D:\CLAUDE CODE\Camden_interface"
   git remote add origin https://github.com/<you>/camden-food-systems.git
   git branch -M main
   git push -u origin main
   ```

3. Go to <https://vercel.com> → **Add New… → Project → Import** that repo →
   **Deploy** (all defaults are correct — Framework: *Other*, no build command).

4. **To update later:**

   ```
   git add -A
   git commit -m "describe the change"
   git push
   ```

   Every push auto-deploys and keeps a version history.

---

## Notes

- The `.claude/` folder holds a Notion token and is git-ignored — never commit it.
- `notion-proxy/` and `figma-plugin/` are source-only helpers; they don't run on Vercel
  and are harmless to include. Delete them from the repo if you'd rather keep it clean.
- Custom domain (e.g. via your Hostinger domain): add it in Vercel → Project → Settings → Domains.
