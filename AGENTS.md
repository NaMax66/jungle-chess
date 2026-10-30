# Jungle Chess

- Russian product name: «Битва зверей». Keep the existing `jungle-chess` repository and domain names.
- Same-device play lives at `/local/` (`public/local/index.html`). `/` is the lobby, with local play and client-side bot play at `/bot/`. Keep Russian share metadata on the mode page and use root-relative asset URLs.
- The field guide includes eight animals and river/trap/den buttons. Keep it full-width beneath the board on medium screens and use two columns on phones. Terrain mechanics in `public/terrain-guide.js` are theme-independent; cultural descriptions and artwork belong to separate `public/themes/<id>.js` modules. Active theme is `html[data-board-theme]` (currently `classic`). Unknown themes must not inherit classic jade-seal/wooden-trap descriptions.

- Canonical repository: https://github.com/NaMax66/jungle-chess, branch `main`.
- Delivery workflow: implement and preview on http://localhost:8080 first. Keep the local server available for the user to review changes without waiting for Cloudflare. Run focused checks, then commit and push only after the user approves the changes or explicitly asks to push. The user configures the GitHub → Cloudflare integration.
- Do not create or publish Sites, deploy Workers directly, or change hosting, DNS or domain bindings unless the user explicitly requests it.
- Frontend sources live in `public/`. `npm run build` copies them into ignored `dist/`; `wrangler.jsonc` serves that directory using Workers Static Assets. Both current modes are client-side; no backend is required.
- Keep the game engine independent of the UI. Run `npm test` for engine changes.
- `RULES.md` records accepted variant rules. `public/rulesets.js` pins versioned `battle` and `classic-ymi` rules per game (new games use v2: fivefold repetition; v1 saves/archives retain threefold repetition); do not change published rule versions. The following rat rules describe the default battle set: Rats may capture each other across the shoreline in either direction and in water; a rat may capture an elephant from water onto land. Elephant and rat may capture each other on land, subject to traps. These are deliberate rules of this version; preserve them.
- The tiger uses `public/assets/tiger-head-v1.png`: the user selected the lower-right Chinese ink concept, with the head protruding slightly beyond the colored disk, especially on phones. The user has supplied photo references of the physical pieces and board.
- The rat uses `public/assets/rat-v1.png`: the user selected the upper-right rat concept. Show the full upright rat with raised forepaws and a curved tail, rather than only its head. Preserve visible player color around it. Animals without custom artwork still use emoji.
- The cat uses `public/assets/cat-head-v1.png`: the user approved the lower-right black cat head with amber eyes and a closed mouth. Use the head-only artwork, not the earlier kimono concept.
- The dog uses `public/assets/dog-head-v1.png`: the upper-right cream Shar-Pei concept, in three-quarter view with a slightly open mouth. Use the same restrained overhang as other head portraits.
- The elephant uses `public/assets/elephant-head-v1.png`: the upper-right silver-gray ink concept, frontal with spread ears, ivory tusks and an upward-curled trunk.
- The wolf uses `public/assets/wolf-head-v1.png`: the upper-left gray ink concept, frontal with amber eyes, a broad cheek ruff and a restrained snarl.
- The leopard uses `public/assets/leopard-head-v1.png`: the upper-right tawny ink concept, three-quarter head facing right with rosettes and an open mouth.
- The lion uses `public/assets/lion-head-v1.png`: the lower-right golden ink concept, roaring three-quarter head facing left with a sweeping flowing mane. All eight animal types now have custom artwork.
- Same-device games start with yellow; there is no rock-paper-scissors phase. The internal `blue` player ID is retained for compatibility with saved games.
- Players sit opposite each other. Orient the top side's piece faces and strength badges 180 degrees toward that player; swapping the board view swaps which side faces away. Keep the face rotation independent of movement animation.
- Use one shared controls panel in both normal and expanded board views, with a prominent new-game button. Move history starts collapsed and must not auto-expand during play.
- Visual direction: Chinese printed board graphics with modern UI, warm paper, dark ink lines, red and ochre-yellow sides. `public/board-theme.css` holds the evolving visual theme. Animal faces are frontal, slightly fierce, with the tiger as the approved style reference.
- Preserve original animal PNGs. The UI serves generated transparent WebP variants: 128/256px for tokens and the animal list, 768px only when a detail card opens. Regenerate with `scripts/optimize-art.py` (Python + Pillow); generated files are committed and the normal build requires no image dependencies.
- Optional quiet background music uses `public/music.js` and `public/assets/audio/guzheng-city.mp3`: Guzheng City by Kevin MacLeod, CC BY 4.0. Preserve the footer attribution and links recorded in `docs/music.md`. No autoplay or audio download before the user enables it; keep the mobile Web Audio gain low.
- Captured enemy tokens sit in the center of the capturing player banner, retaining their original color. Keep turn/status text visible; reuse the board piece face without its strength number and separate overlapping trophies with shadow, without an extra light halo. Size them between banner height and board-piece diameter; when the board piece is smaller on narrow screens, respect that maximum. Capture and undo use a short flight animation.

- Bot search runs in a cancellable Web Worker and must use the same engine/rules snapshot as the UI. Human is yellow; every piece faces the human in bot mode. Undo restores the position before the human turn, cancelling pending work. New game/settings must invalidate old bot replies.
- Keep bot and same-device continuations separate. Preserve/migrate existing `jungle-chess-v1` saves; bot uses `jungle-chess-bot-v1`. The local archive is capped at 50 records and exports versioned rules, moves, results and bot weights. No gameplay telemetry is sent.
- Bot weights have a schema/version and ruleset compatibility, with a built-in baseline fallback. MCTL training and remote weight publishing are future work; do not deploy services to implement the current browser bot.

- Keep board cells, portrait image nodes, river SVG/animations and player panels stable across selection renders. Use incremental DOM updates; never clear/rebuild the board or reinsert already positioned player panels on each click. Selection-only updates must not serialize saved games.

- Current bot strength is accepted (2026-10-30). Keep local game recording; defer further strength tuning, MCTL factory, remote collection/publishing and distillation until requested. Future work is recorded in `IDEAS.md`.
