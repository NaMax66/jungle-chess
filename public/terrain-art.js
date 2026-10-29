// Vector artwork stays sharp at both phone and desktop board sizes.
const svg = content => `<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">${content}</svg>`;

export function terrainIcon(type) {
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
    <text class="seal-writing trap-writing" x="50" y="62">陷</text>`);
  if (type === 'den') return svg(`
    <circle class="den-shadow" cx="50" cy="52" r="44"/>
    <circle class="den-stone" cx="50" cy="50" r="44"/>
    <path class="den-highlight" d="M10 47A40 40 0 0 1 79 23"/>
    <circle class="den-border" cx="50" cy="50" r="36.5"/>
    <circle class="den-heart" cx="50" cy="50" r="32"/>
    <path class="den-engraving" d="M29 17L26 22 M76 72L81 75 M16 62L20 64"/>
    <text class="seal-writing seal-inverse" x="50" y="47">獸</text>
    <text class="seal-writing seal-inverse" x="50" y="71">穴</text>`);
  return '';
}

export function riverMarkup() {
  return ['left', 'right'].map(side => `
    <div class="river-art river-${side}" aria-hidden="true"></div>
    <div class="river-label river-${side}" aria-hidden="true"><span>小</span><span>河</span></div>
  `).join('');
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
