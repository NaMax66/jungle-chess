export function snapshotPieces(board) {
  const pieces = new Map([...board.querySelectorAll('[data-piece-id]')].map(piece => [
    piece.dataset.pieceId,
    { rect: piece.getBoundingClientRect(), clone: piece.cloneNode(true), angle: piece.querySelector('.piece-face')?.classList.contains('facing-away') ? 180 : 0 }
  ]));
  for (const trophy of board.closest('.game').querySelectorAll('[data-trophy-id]')) {
    const rect = trophy.getBoundingClientRect();
    if (rect.width && rect.height) pieces.set(trophy.dataset.trophyId, {
      rect, isTrophy: true, angle: trophy.dataset.facingAway === 'true' ? 180 : 0
    });
  }
  return pieces;
}

export async function animatePieces(board, before, { jumpId = null } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const animations = [];
  const ghosts = [];
  const raised = [];
  const hidden = [];
  const after = new Map([...board.querySelectorAll('[data-piece-id]')].map(piece => [piece.dataset.pieceId, piece]));
  const easing = 'cubic-bezier(.22,.7,.25,1)';
  const duration = jumpId ? 460 : 280;

  const fly = (clone, from, to, fromAngle, toAngle, delay = 0) => {
    clone.removeAttribute('data-piece-id');
    clone.classList.add('piece-ghost');
    clone.dataset.captureFlight = 'true';
    Object.assign(clone.style, {
      position: 'fixed', left: `${from.left}px`, top: `${from.top}px`,
      width: `${from.width}px`, height: `${from.height}px`, margin: '0',
      transformOrigin: 'top left', transition: 'none', zIndex: '100', visibility: 'visible'
    });
    document.body.append(clone);
    ghosts.push(clone);
    animations.push(clone.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width},${to.height / from.height})` }
    ], { duration: 220, delay, easing, fill: 'both' }));
    const face = clone.querySelector('.piece-face');
    if (face) animations.push(face.animate([
      { transform: `rotate(${fromAngle}deg)` },
      { transform: `rotate(${toAngle}deg)` }
    ], { duration: 220, delay, easing, fill: 'both' }));
  };

  try {
    for (const [id, piece] of after) {
      const old = before.get(id);
      if (old?.isTrophy) {
        const rect = piece.getBoundingClientRect();
        piece.style.visibility = 'hidden';
        hidden.push(piece);
        fly(piece.cloneNode(true), old.rect, rect, old.angle,
          piece.querySelector('.piece-face')?.classList.contains('facing-away') ? 180 : 0);
        continue;
      }
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
      if (after.has(id) || old.isTrophy) continue;
      const trophy = board.closest('.game').querySelector(`[data-trophy-id="${id}"]`);
      const trophyRect = trophy?.getBoundingClientRect();
      if (trophyRect?.width && trophyRect.height) {
        trophy.style.visibility = 'hidden';
        hidden.push(trophy);
        fly(old.clone, old.rect, trophyRect, old.angle,
          trophy.dataset.facingAway === 'true' ? 180 : 0, duration - 160);
        continue;
      }
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
    for (const piece of hidden) piece.style.removeProperty('visibility');
    for (const animation of animations) animation.cancel();
  }
}
