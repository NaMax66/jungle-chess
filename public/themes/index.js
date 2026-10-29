import classic from './classic.js';

// Add future themes as separate modules. Unknown themes deliberately get no
// classic cultural copy: jade seals and wooden pits may not match their art.
export const boardThemes={classic};
export function getBoardTheme(id='classic'){
  return Object.hasOwn(boardThemes,id)?boardThemes[id]:null;
}
