import {terrainIcon} from './terrain-art.js';
import {getBoardTheme} from './themes/index.js';

// Mechanics remain independent of the visual theme and its cultural stories.
export const terrainEntries={
  river:{name:'Река',tag:'ВОДА И МОСТЫ',intro:'Течение разделяет берега, а три сухих прохода служат мостами.',rules:'Только крыса входит в воду. Лев и тигр перепрыгивают реку по прямой, если в воде на их пути нет ни одной крысы. Остальные животные идут по мостам. В нашей версии крысы берут друг друга через берег в обе стороны, а крыса из воды может захватить слона на берегу.'},
  trap:{name:'Ловушка',tag:'СИЛА СТАНОВИТСЯ НУЛЁМ',intro:'Маленькая клетка, которая меняет расстановку сил.',rules:'В чужой ловушке сила животного становится 0: его может взять даже самый слабый соперник. На свои фигуры ловушки не действуют. После выхода сила возвращается. Ослабление важнее особого захвата слона крысой: крыса с силой 0 не победит слона вне ловушки.'},
  den:{name:'Логово',tag:'ЦЕЛЬ ПАРТИИ',intro:'Последний рубеж, ради которого звери пересекают всё поле.',rules:'Войдите любым своим животным в логово соперника — и вы сразу победили. Сила вошедшего зверя не важна: крыса приносит такую же победу, как слон. В собственное логово заходить нельзя. Три соседние ловушки помогают защищать подходы.'}
};

export function terrainGuideIcon(id){
  return id==='river'?'<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path class="river-guide-water" d="M5 5H95V95H5Z"/><path class="river-guide-waves" d="M5 20Q16 9 28 20T51 20T74 20T97 20 M5 40Q16 29 28 40T51 40T74 40T97 40 M5 60Q16 49 28 60T51 60T74 60T97 60 M5 80Q16 69 28 80T51 80T74 80T97 80"/></svg>':terrainIcon(id);
}

export function terrainGuideMarkup(id,themeId='classic'){
  const entry=terrainEntries[id];
  if(!entry)return null;
  const theme=getBoardTheme(themeId),story=theme?.terrain[id];
  const art=story?.artwork;
  const portrait=art?`<figure class="terrain-artwork"><a href="${art.source}" target="_blank" rel="noopener noreferrer"><img src="${art.image}" alt="${art.alt}" width="${art.width}" height="${art.height}"></a><figcaption><a href="${art.source}" target="_blank" rel="noopener noreferrer">${art.title} ↗</a><span>${art.attribution}</span><span>${art.museum}</span><a href="${art.licenseSource}" target="_blank" rel="noopener noreferrer">${art.license}</a></figcaption></figure>`:`<div class="terrain-card-icon" aria-hidden="true">${terrainGuideIcon(id)}</div>`;
  const cultural=story?`<section class="animal-history"><h3>${story.title}</h3>${story.quote?`<blockquote class="river-quote"><span lang="zh">${story.quote}</span><p>${story.quoteTranslation}</p></blockquote>`:''}<p>${story.text}</p><a href="${story.source}" target="_blank" rel="noopener noreferrer">${story.sourceLabel}</a>${story.extraSource?`<p class="terrain-extra-source"><a href="${story.extraSource}" target="_blank" rel="noopener noreferrer">${story.extraSourceLabel}</a></p>`:''}${art?`<p class="terrain-art-note">${art.description}</p>`:''}</section>`:'';
  return `<article class="animal-card terrain-card" data-theme="${theme?.id||'neutral'}"><div class="animal-card-top"><div class="animal-portrait terrain-portrait">${portrait}</div><div class="animal-description"><div class="eyebrow">БИТВА ЗВЕРЕЙ · ${entry.tag}</div><h2>${entry.name}</h2><p>${entry.intro}</p><h3>Как работает</h3><p>${entry.rules}</p></div></div><div class="animal-card-bottom">${cultural}</div></article>`;
}
