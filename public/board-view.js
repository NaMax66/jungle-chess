export function setupBoardView() {
  const root = document.documentElement;
  const game = document.querySelector('.game');
  const expand = document.getElementById('expand-board');
  let previousScroll = 0;
  let ownsFullscreen = false;
  let expanded = false;

  const panel = document.createElement('nav');
  panel.className = 'game-controls';
  panel.setAttribute('aria-label', 'Управление полем');
  panel.innerHTML = `
    <div class="expanded-status" aria-live="polite"></div>
    <button type="button" data-action="undo" aria-label="Отменить ход"><span aria-hidden="true">↶</span><small>Отменить</small></button>
    <button type="button" data-action="flip" aria-label="Повернуть поле"><span aria-hidden="true">↻</span><small>Повернуть</small></button>
    <button type="button" data-action="rules" aria-label="Как играть"><span aria-hidden="true">?</span><small>Правила</small></button>
    <button type="button" data-action="new" aria-label="Новая партия"><span aria-hidden="true">+</span><small>Новая партия</small></button>
    <button type="button" data-action="resign" aria-label="Сдаться"><span aria-hidden="true">⚑</span><small>Сдаться</small></button>
    <button type="button" class="collapse-board" aria-label="Свернуть поле"><span aria-hidden="true">⛶</span><small>Свернуть</small></button>`;
  game.append(panel);

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
    expand.setAttribute('aria-expanded', 'false');
    if (ownsFullscreen && document.fullscreenElement) {
      ownsFullscreen = false;
      try { await document.exitFullscreen(); } catch {}
    }
    window.scrollTo(0, previousScroll);
    expand.focus({ preventScroll: true });
  };
  expand.addEventListener('click', async () => {
    if (expanded) return;
    previousScroll = window.scrollY;
    expanded = true;
    root.classList.add('board-expanded');
    expand.setAttribute('aria-expanded', 'true');
    panel.querySelector('.collapse-board').focus({ preventScroll: true });
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
  });
  panel.querySelector('.collapse-board').addEventListener('click', collapse);
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
