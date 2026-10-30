import winter from './themes/winter.js';

// Keep both theme layers stable when the player switches the board's theme.
// Classic vectors and winter raster portraits share the same stable SVG frame.
const svg = (content, type, detail) => `<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true"><g class="terrain-classic">${content}</g><g class="terrain-winter"><image href="${winter.artwork[type]}-${detail?768:256}.webp" x="2" y="2" width="96" height="96" preserveAspectRatio="xMidYMid meet"/></g></svg>`;

export function terrainIcon(type, detail = false) {
  if (type === 'trap') return svg(`
    <path class="wood-shadow" d="M13 8H25V14H75V8H87V14H94V26H87V76H94V88H87V96H75V88H25V96H13V88H6V76H13V26H6V14H13Z"/>
    <path class="trap-well" d="M24 24H76V76H24Z"/>
    <path class="trap-bevel" d="M24 24H76L71 29H29V71L24 76Z"/>
    <g class="wood-beams">
      <path d="M6 13H94V25H6Z M6 75H94V87H6Z"/>
      <path d="M13 6H25V94H13Z M75 6H87V94H75Z"/>
    </g>
    <path class="wood-highlight" d="M7 14H12 M26 14H74 M88 14H93 M7 76H12 M26 76H74 M88 76H93 M14 7V93 M76 7V93"/>
    <path class="wood-grain" d="M28 18Q42 16 53 19T72 19 M28 22Q44 19 60 22 M28 80Q41 78 53 81T72 81 M31 84Q46 81 64 84 M18 28Q16 40 19 51T18 72 M22 29Q19 43 22 58 M80 28Q78 43 81 53T80 72 M84 33Q81 45 84 62"/>
    <g class="wood-pegs"><circle cx="19" cy="19" r="1.8"/><circle cx="81" cy="19" r="1.8"/><circle cx="19" cy="81" r="1.8"/><circle cx="81" cy="81" r="1.8"/></g>
    <text class="seal-writing trap-writing" x="50" y="62">陷</text>`, 'trap', detail);
  if (type === 'den') return svg(`
    <circle class="den-shadow" cx="50" cy="52" r="44"/>
    <circle class="den-stone" cx="50" cy="50" r="44"/>
    <path class="den-highlight" d="M10 47A40 40 0 0 1 79 23"/>
    <circle class="den-border" cx="50" cy="50" r="36.5"/>
    <circle class="den-heart" cx="50" cy="50" r="32"/>
    <path class="den-engraving" d="M29 17L26 22 M76 72L81 75 M16 62L20 64"/>
    <text class="seal-writing seal-inverse" x="50" y="47">獸</text>
    <text class="seal-writing seal-inverse" x="50" y="71">穴</text>`, 'den', detail);
  return '';
}

export function riverMarkup() {
  const water = ['left', 'right'].map(side => `
    <div class="river-art river-${side}" aria-hidden="true"></div>
    <div class="river-label river-${side}" aria-hidden="true"><span>小</span><span>河</span></div>
  `).join('');
  const leaf = '<path fill="#cbd3c3" d="M-14 2Q-12-15 14-14Q19 8-3 13Q-10 12-14 2Z"/><path d="M-17 16L10-9 M-5 4L-7-5 M1-2L8 1"/>';
  const fishSchool = count => [[0, 0], [-42, 24], [-42, -24], [-84, 48]]
    .slice(0, count)
    .map(([x, y]) => `<image href="/assets/river-fish.svg" x="${x - 24}" y="${y - 13}" width="48" height="26"/>`)
    .join('');
  const twig = '<path d="M-20 7L20-6 M-6 2L-14-7 M4-1L11 8"/>';
  const drifters = [
    [leaf, 54, -9, -24], [leaf, 153, -25, 31],
    [leaf, 239, -43, -42], [leaf, 100, -57, 16],
    [fishSchool(2), 205, -17, 0], [fishSchool(3), 75, -37, 0],
    [fishSchool(4), 165, -57, 0], [twig, 123, -38, -12]
  ].map(([shape, lane, delay, angle]) => `
    <g class="river-drifter${shape===leaf?' river-leaf':''}" style="--drift-offset:${delay * 2}s">
      <g transform="translate(0 ${lane}) rotate(${angle}) scale(.65)">${shape}</g>
    </g>`).join('');
  // One continuous layer: the opaque bridge cells hide a drifting object until
  // that same object emerges in the next visible stretch of river.
  const ice = ['left', 'right'].map((side, riverIndex) => {
    const floes = [[65, -3], [148, -12], [230, -20]].map(([lane, delay], index) => `
      <g class="winter-floe" style="--ice-offset:${delay - riverIndex * 5}s">
        <g transform="translate(0 ${lane}) rotate(${index * 17 - 12})">
          <path d="M-18-3L-3-11L17-4L14 7L-7 12L-19 5Z"/>
          <path class="ice-glint" d="M-12-2L-3-6L9-3"/>
        </g>
      </g>`).join('');
    return `<svg class="winter-ice river-${side}" viewBox="0 0 200 300" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 0H200V9L181 14L154 8L130 15L104 8L78 14L51 9L21 16L0 10Z M0 290L24 283L47 291L76 285L103 292L130 283L155 290L180 285L200 292V300H0Z"/>${floes}</svg>`;
  }).join('');
  return water + ice + `<svg class="river-life" viewBox="0 0 700 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">${drifters}</svg>`;
}

export function setupWaterMotion() {
  const button = document.getElementById('water-motion');
  const preferenceKey = 'jungle-chess-water-motion';
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let preference;
  try { preference = localStorage.getItem(preferenceKey); } catch {}
  const update = () => {
    const active = preference === 'on' || (preference !== 'off' && !media.matches);
    document.documentElement.dataset.waterMotion = active ? 'on' : 'off';
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? '≈ Волны: в движении' : '≈ Волны: без движения';
    button.title = active ? 'Остановить движение воды' : 'Включить движение воды';
  };
  button.addEventListener('click', () => {
    preference = document.documentElement.dataset.waterMotion === 'on' ? 'off' : 'on';
    try { localStorage.setItem(preferenceKey, preference); } catch {}
    update();
  });
  media.addEventListener('change', update);
  update();
}
