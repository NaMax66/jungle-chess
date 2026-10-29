export function setupBoardView() {
  const root = document.documentElement;
  const game = document.querySelector('.game');
  const expand = document.getElementById('expand-board');
  let previousScroll = 0;
  let ownsFullscreen = false;
  let expanded = false;
  let returnFocus = expand;

  const panel = document.createElement('nav');
  panel.className = 'game-controls';
  panel.setAttribute('aria-label', 'Управление полем');
  panel.innerHTML = `
    <div class="expanded-status" aria-live="polite"></div>
    <button type="button" data-action="new" aria-label="Новая партия"><span aria-hidden="true">+</span><small>Новая партия</small></button>
    <button type="button" data-action="undo" aria-label="Отменить ход"><span aria-hidden="true">↶</span><small>Отменить</small></button>
    <button type="button" data-action="flip" aria-label="Повернуть поле"><span aria-hidden="true">↻</span><small>Повернуть</small></button>
    <button type="button" data-action="rules" aria-label="Как играть"><span aria-hidden="true">?</span><small>Правила</small></button>
    <button type="button" data-action="resign" aria-label="Сдаться"><span aria-hidden="true">⚑</span><small>Сдаться</small></button>
    <button type="button" class="collapse-board" aria-label="Развернуть поле на весь экран" aria-expanded="false"><span aria-hidden="true">⛶</span><small>Развернуть</small></button>`;
  game.insertBefore(panel, document.getElementById('hint'));
  const toggle = panel.querySelector('.collapse-board');
  const syncView = () => {
    expand.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Свернуть поле' : 'Развернуть поле на весь экран');
    toggle.querySelector('small').textContent = expanded ? 'Свернуть' : 'Развернуть';
  };
  document.querySelector('.history').open = false;

  const mirrors = [...panel.querySelectorAll('[data-action]')];
  const sync = () => {
    for (const button of mirrors) button.disabled = document.getElementById(button.dataset.action).disabled;
    const status = panel.querySelector('.expanded-status');
    const player = game.dataset.activePlayer;
    status.textContent = player === 'red' ? 'Ходят красные' : player === 'blue' ? 'Ходят жёлтые' : 'Партия завершена';
    status.dataset.player = player;
  };
  for (const button of mirrors) {
    button.addEventListener('click', () => document.getElementById(button.dataset.action).click());
  }
  const observer = new MutationObserver(sync);
  for (const button of mirrors) observer.observe(document.getElementById(button.dataset.action), { attributes: true, attributeFilter: ['disabled'] });
  observer.observe(game, { attributes: true, attributeFilter: ['data-active-player'] });
  sync();

  const collapse = async () => {
    if (!expanded) return;
    expanded = false;
    root.classList.remove('board-expanded');
    syncView();
    if (ownsFullscreen && document.fullscreenElement) {
      ownsFullscreen = false;
      try { await document.exitFullscreen(); } catch {}
    }
    window.scrollTo(0, previousScroll);
    returnFocus.focus({ preventScroll: true });
  };
  const enter = async (opener) => {
    if (expanded) return;
    previousScroll = window.scrollY;
    returnFocus = opener;
    expanded = true;
    root.classList.add('board-expanded');
    syncView();
    toggle.focus({ preventScroll: true });
    // Embedded browsers can decline native fullscreen; the viewport layout still works.
    if (!document.fullscreenElement && root.requestFullscreen) {
      try {
        await root.requestFullscreen();
        ownsFullscreen = true;
        if (!expanded) {
          ownsFullscreen = false;
          await document.exitFullscreen();
        }
      } catch {}
    }
  };
  expand.addEventListener('click', () => enter(expand));
  toggle.addEventListener('click', () => expanded ? collapse() : enter(toggle));
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && ownsFullscreen) {
      ownsFullscreen = false;
      collapse();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded && !document.querySelector('dialog[open]')) collapse();
  });
}
