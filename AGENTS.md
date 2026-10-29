# Jungle Chess

- Russian product name: «Битва зверей». Keep the existing `jungle-chess` repository and domain names.

- Canonical repository: https://github.com/NaMax66/jungle-chess, branch `main`.
- Delivery workflow: implement and preview on http://localhost:8080 first. Keep the local server available for the user to review changes without waiting for Cloudflare. Run focused checks, then commit and push only after the user approves the changes or explicitly asks to push. The user configures the GitHub → Cloudflare integration.
- Do not create or publish Sites, deploy Workers directly, or change hosting, DNS or domain bindings unless the user explicitly requests it.
- Frontend sources live in `public/`. `npm run build` copies them into ignored `dist/`; `wrangler.jsonc` serves that directory using Workers Static Assets. No backend is required for the current same-device mode.
- Keep the game engine independent of the UI. Run `npm test` for engine changes.
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
