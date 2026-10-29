# Jungle Chess

- Russian product name: «Битва зверей». Keep the existing `jungle-chess` repository and domain names.

- Canonical repository: https://github.com/NaMax66/jungle-chess, branch `main`.
- Delivery workflow: implement and preview on http://localhost:8080 first. Keep the local server available for the user to review changes without waiting for Cloudflare. Run focused checks, then commit and push only after the user approves the changes or explicitly asks to push. The user configures the GitHub → Cloudflare integration.
- Do not create or publish Sites, deploy Workers directly, or change hosting, DNS or domain bindings unless the user explicitly requests it.
- Frontend sources live in `public/`. `npm run build` copies them into ignored `dist/`; `wrangler.jsonc` serves that directory using Workers Static Assets. No backend is required for the current same-device mode.
- Keep the game engine independent of the UI. Run `npm test` for engine changes.
- Figures use emoji for now. The user has supplied photo references of the physical pieces and board; use them for the Chinese printed visual style.
- Same-device games start with yellow; there is no rock-paper-scissors phase. The internal `blue` player ID is retained for compatibility with saved games.
- Players sit opposite each other. Orient the top side's piece faces and strength badges 180 degrees toward that player; swapping the board view swaps which side faces away. Keep the face rotation independent of movement animation.
- Visual direction: Chinese printed board graphics with modern UI, warm paper, dark ink lines, red and ochre-yellow sides. `public/board-theme.css` holds the evolving visual theme. Emoji remain until the animal artwork stage.
