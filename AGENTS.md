# Jungle Chess

- Canonical repository: https://github.com/NaMax66/jungle-chess, branch `main`.
- Delivery workflow: implement, run focused checks, commit and push to GitHub. The user configures the GitHub → Cloudflare integration and checks the resulting deployment.
- Do not create or publish Sites, deploy Workers directly, or change hosting, DNS or domain bindings unless the user explicitly requests it.
- Frontend sources live in `public/`. `npm run build` copies them into ignored `dist/`; `wrangler.jsonc` serves that directory using Workers Static Assets. No backend is required for the current same-device mode.
- Keep the game engine independent of the UI. Run `npm test` for engine changes.
- Figures use emoji for now. The user will provide photos for the visual design later.
- Same-device games start with yellow; there is no rock-paper-scissors phase. The internal `blue` player ID is retained for compatibility with saved games.
- Visual direction: Chinese printed board graphics with modern UI, warm paper, dark ink lines, red and ochre-yellow sides. `public/board-theme.css` holds the evolving visual theme. Emoji remain until the animal artwork stage.
