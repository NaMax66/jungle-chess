// Run before styles load so a saved theme never flashes the classic board.
(() => {
  const known = ['classic', 'winter'];
  let saved;
  try { saved = localStorage.getItem('jungle-chess-board-theme'); } catch {}
  const requested = new URLSearchParams(location.search).get('theme');
  document.documentElement.dataset.boardTheme = known.includes(requested) ? requested : known.includes(saved) ? saved : 'classic';
  document.addEventListener('DOMContentLoaded', () => {
    const label = document.createElement('label');
    label.className = 'theme-choice';
    label.innerHTML = '<span>Тема</span><select aria-label="Тема поля"><option value="classic">Классическая</option><option value="winter">❄ Зимняя</option></select>';
    const select = label.querySelector('select');
    select.value = document.documentElement.dataset.boardTheme;
    select.addEventListener('change', () => {
      document.documentElement.dataset.boardTheme = select.value;
      document.dispatchEvent(new Event('board-theme-change'));
      try { localStorage.setItem('jungle-chess-board-theme', select.value); } catch {}
      const url = new URL(location.href);
      url.searchParams.set('theme', select.value);
      history.replaceState(null, '', url);
      // Close any terrain story that was opened under the previous theme.
      const dialog = document.querySelector('dialog.animal-dialog');
      if (dialog?.open) dialog.close();
    });
    document.querySelector('.room-nav').append(label);
  });
})();
