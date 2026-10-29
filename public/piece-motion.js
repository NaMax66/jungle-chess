export function snapshotPieces(board) {
  return new Map([...board.querySelectorAll('[data-piece-id]')].map(piece => [
    piece.dataset.pieceId,
    { rect: piece.getBoundingClientRect(), clone: piece.cloneNode(true) }
  ]));
}

export async function animatePieces(board, before, { jumpId = null } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const animations = [];
  const ghosts = [];
  const raised = [];
  const after = new Map([...board.querySelectorAll('[data-piece-id]')].map(piece => [piece.dataset.pieceId, piece]));
  const easing = 'cubic-bezier(.22,.7,.25,1)';
  const duration = jumpId ? 460 : 280;

  try {
    for (const [id, piece] of after) {
      const old = before.get(id);
      if (!old) {
        animations.push(piece.animate([
          { opacity: 0, transform: 'scale(.75)' },
          { opacity: 1, transform: 'scale(1)' }
        ], { duration: 220, easing }));
        continue;
      }
      const rect = piece.getBoundingClientRect();
      const dx = old.rect.left - rect.left;
      const dy = old.rect.top - rect.top;
      if (Math.abs(dx) < .5 && Math.abs(dy) < .5) continue;
      const scale = old.rect.width / rect.width;
      const frames = [{ transform: `translate(${dx}px,${dy}px) scale(${scale})` }];
      if (id === jumpId) {
        frames.push({
          transform: `translate(${dx / 2}px,${dy / 2 - rect.height * .45}px) scale(1.12)`,
          offset: .48
        });
      }
      frames.push({ transform: 'translate(0,0) scale(1)' });
      piece.style.zIndex = '5';
      raised.push(piece);
      animations.push(piece.animate(frames, { duration, easing }));
    }

    const boardRect = board.getBoundingClientRect();
    for (const [id, old] of before) {
      if (after.has(id)) continue;
      const ghost = old.clone;
      ghost.removeAttribute('data-piece-id');
      ghost.classList.add('piece-ghost');
      Object.assign(ghost.style, {
        left: `${old.rect.left - boardRect.left - board.clientLeft}px`,
        top: `${old.rect.top - boardRect.top - board.clientTop}px`,
        width: `${old.rect.width}px`, height: `${old.rect.height}px`
      });
      board.append(ghost);
      ghosts.push(ghost);
      animations.push(ghost.animate([
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(.65)' }
      ], { duration: 150, delay: duration - 150, easing, fill: 'forwards' }));
    }
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  } finally {
    for (const ghost of ghosts) ghost.remove();
    for (const piece of raised) piece.style.removeProperty('z-index');
    for (const animation of animations) animation.cancel();
  }
}
