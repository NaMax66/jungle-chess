import {animals,initial,terrain,legalMoves,move,other,positionKey} from './engine.js';
import {terrainIcon,riverMarkup,setupWaterMotion} from './terrain-art.js';
import {snapshotPieces,animatePieces} from './piece-motion.js';
import {setupBoardView} from './board-view.js';
import {terrainEntries,terrainGuideIcon,terrainGuideMarkup} from './terrain-guide.js';
import {setupMusic} from './music.js';
import {rulesets,resolveRules,gameRules,rankOf,specialRulesText} from './rulesets.js';
import {baseline,levels,validateWeights} from './bot-search.js';
import {BotClient,loadWeights} from './bot-client.js';
import {gameRecord,readArchive,storeRecord,downloadRecord} from './game-records.js';
document.documentElement.dataset.boardTheme||='classic';
const $=id=>document.getElementById(id),names={blue:'Жёлтые',red:'Красные'};
const botMode=document.documentElement.dataset.mode==='bot';
const key=botMode?'jungle-chess-bot-v1':'jungle-chess-v1';
const query=new URLSearchParams(location.search);
const requestedRules=rulesets[query.get('rules')]?query.get('rules'):'battle';
const requestedDifficulty=levels[query.get('difficulty')]?query.get('difficulty'):'medium';
const freshMeta=()=>({id:crypto.randomUUID(),createdAt:new Date().toISOString()});
let state=initial(requestedRules),selected=null,flipped=false,undo=[],difficulty=requestedDifficulty,meta=freshMeta(),weights=baseline;
let animating=false,thinking=false,botError=false,botEpoch=0,loaded=false;
const bot=botMode?new BotClient():null;
try{
  const data=JSON.parse(localStorage.getItem(key));
  if(data?.version===1&&data.state?.pieces&&data.state.positions){
    const rules=resolveRules(data.state.rules||'battle');
    state={...data.state,rules};flipped=!!data.flipped;undo=data.undo||[];
    difficulty=levels[data.difficulty]?data.difficulty:'medium';
    meta=data.meta?.id?data.meta:freshMeta();weights=validateWeights(data.weights||baseline,rules);loaded=true;
  }
}catch{}
function recordCurrent(){return gameRecord(state,{...meta,mode:botMode?'bot':'local',difficulty,weightsVersion:weights.version});}
function archiveCurrent(abandoned=false){
  if(!state.history.length)return;
  const record=recordCurrent();
  if(abandoned&&record.result.status==='playing')record.result={status:'abandoned',winner:null,reason:'Начата новая партия'};
  if(!storeRecord(record))$('saved').textContent='Не удалось сохранить архив. Можно экспортировать партию вручную.';
}
function save(){
  try{localStorage.setItem(key,JSON.stringify({version:1,state,flipped,undo,difficulty,meta,weights}));}
  catch{$('saved').textContent='Не удалось сохранить партию в этом браузере';}
  if(state.status==='finished')archiveCurrent();
}
const facingAway=owner=>!botMode&&((owner==='red')!==flipped);
function cancelBot(){botEpoch++;bot?.cancel();thinking=false;botError=false;}
function refreshWeights(){
  const id=meta.id;
  loadWeights(gameRules(state)).then(value=>{
    if(meta.id===id&&!state.history.length){weights=validateWeights(value,gameRules(state));save();}
  });
}
async function runBot(){
  if(!botMode||thinking||animating||state.status!=='playing'||state.currentPlayer!=='red')return;
  const epoch=++botEpoch,position=positionKey(state);
  thinking=true;botError=false;render();
  try{
    const choice=await bot.choose(state,{difficulty,weights});
    if(epoch!==botEpoch||positionKey(state)!==position)return;
    if(!choice)throw new Error('Нет ответа');
    const next=move(state,choice.id,choice.x,choice.y);
    if(!next)throw new Error('Недопустимый ход');
    thinking=false;
    const last=next.history.at(-1),jump=Math.abs(last.from[0]-choice.x)+Math.abs(last.from[1]-choice.y)>1;
    await transition(()=>{state=next;selected=null;},{jumpId:jump?last.id:null});
    if(state.status==='finished')showResult();
  }catch{
    if(epoch===botEpoch){thinking=false;botError=true;render();}
  }
}
const coords=(x,y)=>'abcdefg'[x]+(9-y);
const animalImages={tiger:'/assets/tiger-head-v1.png',rat:'/assets/rat-v1.png',cat:'/assets/cat-head-v1.png',dog:'/assets/dog-head-v1.png',elephant:'/assets/elephant-head-v1.png',wolf:'/assets/wolf-head-v1.png',leopard:'/assets/leopard-head-v1.png',lion:'/assets/lion-head-v1.png'};
function animalPortrait(animal,large=false){
  const original=animalImages[animal];
  if(!original)return `<span>${animals[animal].emoji}</span>`;
  const source=original.replace('.png',large?'-768.webp':'-128.webp');
  const retina=large?'':` srcset="${source} 1x, ${original.replace('.png','-256.webp')} 2x"`;
  return `<img class="piece-art piece-art-${animal}" src="${source}"${retina} width="${large?768:128}" height="${large?768:128}" alt="" draggable="false">`;
}
function pieceFace(animal,away=false,rank=null){
  return `<span class="piece-face ${away?'facing-away':''}">${animalPortrait(animal)}${rank===null?'':`<small>${rank}</small>`}</span>`;
}
function sizeTrophies(){
  const original=$('board').querySelector('.piece')?.offsetWidth;
  if(!original)return;
  for(const owner of ['red','blue']){
    const player=$(owner+'-player');
    // On narrow phones the board token itself can be smaller than the banner.
    const minimum=Math.min(player.offsetHeight,original);
    player.style.setProperty('--trophy-diameter',`${Math.min(original,Math.max(minimum,56))}px`);
  }
}
function render(){
  const moves=selected?legalMoves(state,selected):[];
  const last=state.history.at(-1);
  const board=$('board');
  board.classList.toggle('flipped',flipped);
  board.style.setProperty('--river-phase',`-${performance.now()/1000}s`);
  board.replaceChildren();
  for(let i=0;i<63;i++){
    const x=flipped?6-i%7:i%7;
    const y=flipped?8-Math.floor(i/7):Math.floor(i/7);
    const t=terrain(x,y);
    const isBridge=y>=3&&y<=5&&[0,3,6].includes(x);
    const bridgeShadow=isBridge&&(flipped?6-x:x)>0;
    const p=state.pieces.find(p=>p.x===x&&p.y===y);
    const trapped=!!p&&t.type==='trap'&&t.owner!==p.owner;
    const allowed=moves.find(m=>m.x===x&&m.y===y);
    const cell=document.createElement('button');
    const isLast=last&&[last.from,last.to].some(([lx,ly])=>lx===x&&ly===y);
    cell.className=`cell ${t.type} ${isBridge?'bridge':''} ${bridgeShadow?'bridge-shadow':''} ${p?.id===selected?'selected':''} ${allowed?'legal':''} ${allowed?.capture?'capture':''} ${isLast?'last':''}`;
    cell.dataset.owner=t.owner||'';
    cell.setAttribute('aria-label',`${coords(x,y)}: ${p?names[p.owner]+' '+animals[p.animal].name:t.type==='water'?'Вода':t.type==='trap'?'Ловушка '+names[t.owner]:t.type==='den'?'Логово '+names[t.owner]:'Пустая клетка'}${allowed?', доступный ход':''}`);
    cell.setAttribute('aria-pressed',String(p?.id===selected&&!!p));
    const seal=terrainIcon(t.type);
    const away=facingAway(t.owner);
    if(trapped)cell.setAttribute('aria-label',cell.getAttribute('aria-label')+', в чужой ловушке, сила 0');
    cell.innerHTML=`${seal?`<span class="terrain-icon ${away?'facing-away':''}" aria-hidden="true">${seal}</span>`:''}${(x===0||y===8)?`<span class="coord">${coords(x,y)}</span>`:''}${p?`<span class="piece ${p.owner} ${trapped?'is-trapped':''}" data-piece-id="${p.id}" aria-hidden="true">${pieceFace(p.animal,facingAway(p.owner),trapped?0:rankOf(state,p.animal))}</span>`:''}`;
    cell.onclick=()=>clickCell(p,x,y);
    board.append(cell);
  }
  board.insertAdjacentHTML('beforeend',riverMarkup());
for(const owner of ['red','blue']){
  const player=$(owner+'-player');
  const opponent=other(owner);
  const missing=Object.keys(animals).filter(a=>!state.pieces.some(p=>p.owner===opponent&&p.animal===a));
  const captured=[...new Set([...state.history.filter(m=>m.owner===owner&&m.capture&&missing.includes(m.capture)).map(m=>m.capture),...missing])];
  const active=state.currentPlayer===owner&&state.status==='playing';
  const showTrophies=captured.length>0;
  const message=state.status==='finished'?(state.winner?(state.winner===owner?'ПОБЕДА':'ПОРАЖЕНИЕ'):'НИЧЬЯ'):(active?(botMode&&owner==='red'?(botError?'НУЖЕН ПОВТОР':thinking?'БОТ ДУМАЕТ':'ХОД БОТА'):'ВАШ ХОД'):'ЖДИТЕ ХОДА');
  player.classList.toggle('is-active',active);
  player.classList.toggle('facing-away',facingAway(owner));
  player.setAttribute('role','group');
  player.setAttribute('aria-label',`${names[owner]}: ${message.toLowerCase()}`);
  player.innerHTML=`<span class="player-dot" aria-hidden="true"></span><b>${names[owner]}${botMode&&owner==='red'?' · бот':''}</b><span class="player-center"><span class="trophies" role="list" aria-label="Захвачено: ${captured.map(a=>animals[a].name).join(', ')}" ${showTrophies?'':'hidden'}>${captured.map(a=>`<span class="piece trophy-token ${opponent}" role="listitem" data-trophy-id="${opponent}-${a}" data-facing-away="${facingAway(owner)}" aria-label="${names[opponent]}: ${animals[a].name}" title="Захвачено: ${names[opponent].toLowerCase()}, ${animals[a].name.toLowerCase()}">${pieceFace(a)}</span>`).join('')}</span></span><strong class="player-message">${message}</strong>`;
}
const game=document.querySelector('.game');
game.dataset.mode=botMode?'bot':'local';
game.dataset.activePlayer=state.status==='playing'?state.currentPlayer:'none';
game.dataset.turnEdge=state.status==='playing'?(state.currentPlayer===(flipped?'blue':'red')?'top':'bottom'):'none';
game.insertBefore($(flipped?'blue-player':'red-player'),game.firstChild);
game.insertBefore($(flipped?'red-player':'blue-player'),game.querySelector('.game-controls')||$('hint'));
$('turn').className='turn '+state.currentPlayer;$('turn').innerHTML=`<div class="turn-orb">${state.status==='finished'?'✦':'↗'}</div><div><b>${state.status==='finished'?(state.winner?'Победили '+names[state.winner].toLowerCase():'Ничья'):botMode&&state.currentPlayer==='red'?'Ход бота':'Ходят '+names[state.currentPlayer].toLowerCase()}</b><small>${state.status==='finished'?state.reason:`Ход ${Math.floor(state.history.length/2)+1} · ${botMode&&state.currentPlayer==='red'?(botError?'Не удалось получить ответ':thinking?'Обдумывает продолжение…':'Готовится к ходу'):selected?animals[state.pieces.find(p=>p.id===selected).animal].name:'Выберите свою фигуру'}`}</small></div>`;
$('hint').textContent=state.status==='finished'?state.reason:selected?`${animals[state.pieces.find(p=>p.id===selected).animal].name}: ${moves.length?'выберите подсвеченную клетку':'нет доступных ходов — выберите другую фигуру'}`:`Нажмите на ${state.currentPlayer==='blue'?'жёлтую':'красную'} фигуру, чтобы увидеть доступные ходы`;
if(botMode&&state.status==='playing'&&state.currentPlayer==='red')$('hint').textContent=botError?'Не удалось рассчитать ход. Повторите попытку или отмените свой ход.':'Бот обдумывает ход. Можно отменить свой ход или начать новую партию.';
$('bot-retry').hidden=!botError;
$('session-rules').textContent=`${gameRules(state).name} · версия ${gameRules(state).version}${botMode?' · '+levels[difficulty].name+' бот':''}`;
$('count').textContent=state.history.length;$('history').innerHTML=state.history.length?state.history.map((m,i)=>`<li>${i+1}. ${animals[m.animal].emoji} ${coords(...m.from)} → ${coords(...m.to)} ${m.capture?'× '+animals[m.capture].emoji:''}</li>`).reverse().join(''):'<li class="empty">Первый ход — начало истории.</li>';$('undo').disabled=!undo.length;$('resign').disabled=state.status!=='playing';document.querySelectorAll('[data-animal]').forEach(button=>{button.querySelector('b').textContent=rankOf(state,button.dataset.animal);});sizeTrophies();save();}
async function transition(update,options={}){
  if(animating)return;
  const board=$('board');
  const before=snapshotPieces(board);
  animating=true;
  let controls=[];
  try{
    update();
    render();
    controls=['undo','flip','new','resign'].map(id=>[$(id),$(id).disabled]);
    for(const [button,disabled] of controls){
      if(!disabled)button.dataset.motionLock='true';
      button.disabled=true;
    }
    board.dataset.animating='true';
    await animatePieces(board,before,options);
  }finally{
    animating=false;
    delete board.dataset.animating;
    for(const [button,disabled] of controls){
      button.disabled=disabled;
      delete button.dataset.motionLock;
    }
  }
}
async function clickCell(p,x,y){
  if(animating||state.status!=='playing'||(botMode&&state.currentPlayer==='red'))return;
  if(selected){
    const next=move(state,selected,x,y);
    if(next){
      const last=next.history.at(-1);
      const jump=Math.abs(last.from[0]-x)+Math.abs(last.from[1]-y)>1;
      await transition(()=>{undo.push(state);state=next;selected=null;},{jumpId:jump?last.id:null});
      if(state.status==='finished')showResult();
      else runBot();
      return;
    }
  }
  selected=p?.owner===state.currentPlayer?(selected===p.id?null:p.id):null;
  render();
}
function modal(html,viewer=null,kind=null){$('dialog-content').innerHTML=html;$('dialog').classList.toggle('facing-away',!!viewer&&facingAway(viewer));$('dialog').classList.toggle('animal-dialog',kind==='animal');if(!$('dialog').open)$('dialog').showModal();}
const animalNotes={
  elephant:{intro:'Самая сильная фигура на поле. Берёт любое животное, но даже ему стоит опасаться маленькой крысы.',ability:'Ходит по суше на одну клетку. В нашей версии слон и крыса могут съесть друг друга. Крыса может атаковать слона и из воды на берег.',historyTitle:'Как взвесить слона',history:'В китайском предании маленький Цао Чун решил задачу, с которой не справились взрослые: как взвесить огромного слона без больших весов? Он предложил завести слона в лодку и отметить уровень воды на борту. Затем слона вывели, а лодку наполнили камнями до той же отметки. Оставалось взвесить камни по отдельности и сложить их вес — столько же весил слон.',source:'https://public.websites.umich.edu/~dporter/sampler/elephant_trans.html',sourceLabel:'Цао Чун взвешивает слона — перевод на сайте Мичиганского университета ↗'},
  lion:{intro:'Сильный охотник, который умеет быстро менять берег и угрожать далёким клеткам.',ability:'Берёт животных силой до 7 включительно. Перепрыгивает реку по прямой — вдоль или поперёк. Любая крыса в воде на пути блокирует прыжок; на клетке приземления можно захватить доступного по силе соперника.',historyTitle:'Гость из Самарканда',history:'Львы не водились в Китае, но стали знаменитыми каменными стражами входов. В 635 году китайскому императору подарили настоящего льва из Самарканда. По описанию музея Миннеаполиса, возможность увидеть живого зверя изменила работу скульпторов: львы стали выглядеть более естественными, сильными и подвижными. Пара таких стражей VIII века сохранилась в музейной коллекции.',source:'https://collections.artsmia.org/art/105465/guardian-lion-china',sourceLabel:'Лев-страж и история подарка — Институт искусств Миннеаполиса ↗'},
  tiger:{intro:'Прыгун, для которого река становится коротким путём к сопернику.',ability:'Берёт животных силой до 6 включительно. Как и лев, прыгает через реку по прямой в обоих направлениях. Крыса на пути не даст перепрыгнуть воду.',historyTitle:'Как лиса воспользовалась силой тигра',history:'В китайской басне тигр поймал лису, но та уверяла, что все звери боятся именно её. Она предложила пройти по лесу и проверить. Тигр пошёл следом, и животные тут же разбежались. Он поверил хитрой лисе, не поняв, что звери испугались его самого. Так появилось выражение о лисе, которая пользуется могуществом тигра.',source:'https://folklore.usc.edu/the-fox-borrows-the-tigers-power/',sourceLabel:'Лиса и тигр — фольклорный архив Университета Южной Калифорнии ↗'},
  leopard:{intro:'Сильная сухопутная фигура: превосходит волка, собаку, кошку и крысу.',ability:'Сила 5. Ходит на одну клетку по суше и берёт равных или более слабых соперников. Не плавает и не прыгает через реку — использует мосты.',historyTitle:'Леопард на мундире',history:'В императорском Китае леопард мог рассказать о человеке ещё до знакомства: его изображение на знаке отличия обозначало военного чиновника третьего ранга. Один из ранних таких знаков, вытканный из шёлка и металлических нитей в эпоху Мин, хранится в музее Нельсона — Эткинс. Пятнистый зверь был узнаваемым знаком воинского положения.',source:'https://art.nelson-atkins.org/objects/19736/leopard-badge',sourceLabel:'Знак отличия с леопардом — музей Нельсона — Эткинс ↗'},
  wolf:{intro:'Середина звериной иерархии. В наших правилах волк сильнее собаки.',ability:'Сила 4. Может взять другого волка, собаку, кошку или крысу на суше. Передвигается на одну клетку; реку пересекает по мостам.',historyTitle:'Учёный и волк из Чжуншаня',history:'В китайской басне учёный Дунго спрятал преследуемого охотниками волка в мешке с книгами. Но, оказавшись на свободе, голодный волк захотел съесть своего спасителя. Проходивший старик усомнился, что такой большой зверь мог поместиться в мешке. Волк полез обратно, чтобы доказать свою правоту, — и мешок снова завязали. На этот раз находчивость спасла учёного.',source:'https://folklore.usc.edu/master-dongguo-and-the-wolf/',sourceLabel:'Дунго и волк — фольклорный архив Университета Южной Калифорнии ↗'},
  dog:{intro:'Защищает пути к логову и помогает охотиться на небольших соперников.',ability:'Сила 3. Берёт собаку, кошку и крысу на суше. Ходит на одну клетку, не заходит в воду и не перепрыгивает её.',history:'Шарпей — китайская сторожевая и охотничья собака мастифного типа. Эта порода известна уже несколько столетий в южных прибрежных провинциях Китая.',source:'https://www.fci.be/nomenclature/Standards/309g02-en.pdf'},
  cat:{intro:'Слабее большинства зверей, но полезна против крысы и для проникновения в чужое логово.',ability:'Сила 2. Берёт другую кошку и крысу на суше. Ходит на одну клетку. Крысу в реке не достанет: кошка не может войти в воду.',historyTitle:'Кошка, бабочка и день рождения',history:'В 1943 году художник Сюй Бэйхун написал для друга ко дню рождения кошку, играющую с бабочкой. В китайском языке названия этих двух существ созвучны выражению, связанному с долголетием. Поэтому за игривой сценкой скрывалось пожелание долгой жизни. Сегодня этот свиток хранится в Шанхайском музее.',source:'https://www.shanghaimuseum.net/mu/frontend/pg/article/id/CI00166263',sourceLabel:'«Кошка и бабочка» Сюй Бэйхуна — Шанхайский музей ↗'},
  rat:{intro:'Самая маленькая по силе, но единственная, кто умеет плавать и угрожать слону.',ability:'Сила 1. Ходит по суше и воде. В нашей версии крысы берут друг друга в воде, на суше и через берег в обе стороны. Крыса берёт слона на суше и из воды на берег, а своим присутствием в реке блокирует прыжки льва и тигра.',historyTitle:'Маленький против великана',history:'По игровой легенде, крыса может забраться слону в ухо и погубить его изнутри. Этой историей объясняют необычное правило Dou Shou Qi: самый маленький зверь побеждает самого сильного. Поэтому сила 1 может взять силу 8 — хитрость оказывается сильнее размера.',source:'https://www.ymimports.com/pages/how-to-play-jungle',sourceLabel:'Легенда в описании игры — Yellow Mountain Imports ↗'}
};
const dogHistoryPhotos=[
  {image:'/assets/history/han-dog-met-42361.webp',title:'Фигурка собаки',date:'Восточная Хань, 25–220 гг.',inventory:'1991.253.1',source:'https://www.metmuseum.org/art/collection/search/42361'},
  {image:'/assets/history/han-dog-met-44319.webp',title:'Фигурка стоящей собаки',date:'I–II века, Восточная Хань',inventory:'1994.605.18',source:'https://www.metmuseum.org/art/collection/search/44319'}
];
function showAnimal(id){
  const animal={...animals[id],rank:rankOf(state,id)},note={...animalNotes[id]};
  if(gameRules(state).id!=='battle'){
    if(['rat','elephant'].includes(id))note.ability=specialRulesText(state);
    if(id==='elephant')note.intro='Самая сильная фигура на поле, но в классической редакции слон не может взять крысу вне своей ловушки.';
    if(id==='dog')note.ability='Сила 4. Берёт собаку, волка, кошку и крысу на суше. В воду не входит.';
    if(id==='wolf'){note.intro='В классической редакции волк уступает собаке.';note.ability='Сила 3. Берёт волка, кошку и крысу на суше. В воду не входит.';}
  }
  if(!animal||!note)return;
  const history=note.history?`<div class="animal-history">${note.historyTitle?`<h3>${note.historyTitle}</h3>`:''}<p>${note.history}</p><a href="${note.source}" target="_blank" rel="noopener noreferrer">${note.sourceLabel||'Подробнее о породе — стандарт FCI ↗'}</a></div>`:'';
  const gallery=id==='dog'?`<section class="animal-museum"><h3>Собаки древнего Китая</h3><p>Керамические фигурки собак сохранились со времён Восточной Хань. Их помещали в гробницы как спутников человека в загробном мире.</p><div class="museum-gallery">${dogHistoryPhotos.map(photo=>`<figure><a href="${photo.source}" target="_blank" rel="noopener noreferrer" aria-label="${photo.title} — открыть страницу в Метрополитен-музее"><img src="${photo.image}" alt="${photo.title}: древняя китайская керамическая собака с закрученным хвостом" width="${photo.inventory==='1991.253.1'?500:416}" height="${photo.inventory==='1991.253.1'?625:624}" loading="lazy" decoding="async"></a><figcaption><a href="${photo.source}" target="_blank" rel="noopener noreferrer">${photo.title} ↗</a><span>${photo.date}</span><span>The Met · ${photo.inventory}</span><small>Public Domain · CC0</small></figcaption></figure>`).join('')}</div><a class="museum-license" href="https://www.metmuseum.org/hubs/open-access" target="_blank" rel="noopener noreferrer">Открытая коллекция The Met: условия использования ↗</a></section>`:'';
  modal(`<article class="animal-card"><div class="animal-card-top"><div class="animal-portrait">${animalPortrait(id,true)}</div><div class="animal-description"><div class="eyebrow">БИТВА ЗВЕРЕЙ · СИЛА ${animal.rank} ИЗ 8</div><h2>${animal.name}</h2><p>${note.intro}</p><h3>Что умеет</h3><p>${note.ability}</p></div></div><div class="animal-card-bottom">${history}${gallery}<h3>Помните о ловушках</h3><p>В чужой ловушке сила любого животного становится 0: его может взять даже самый слабый соперник. После выхода сила возвращается.</p><p>Любой зверь может принести победу, войдя в логово соперника. В своё логово заходить нельзя. Обычный ход — одна клетка по вертикали или горизонтали.</p></div></article>`,null,'animal');
}
function showTerrain(id){
  const html=terrainGuideMarkup(id,document.documentElement.dataset.boardTheme,state);
  if(html)modal(html,null,'animal');
}
function confirmAction(title,text,action){modal(`<h2>${title}</h2><p>${text}</p><div class="dialog-actions"><button id="cancel">Продолжить игру</button><button id="confirm" class="primary">${title}</button></div>`);$('cancel').onclick=()=>$('dialog').close();$('confirm').onclick=()=>{$('dialog').close();action();};}
function startGame(rulesId,newDifficulty){
  cancelBot();archiveCurrent(true);
  history.replaceState(null,'',`${location.pathname}?rules=${rulesId}${botMode?'&difficulty='+newDifficulty:''}`);
  state=initial(rulesId);difficulty=newDifficulty;meta=freshMeta();weights=baseline;selected=null;undo=[];render();
  if(botMode)refreshWeights();
}
function newGame(preferredRules=gameRules(state).id,preferredDifficulty=difficulty){
  cancelBot();render();
  modal(`<h2>Новая партия</h2><p>Настройки действуют до конца партии. Текущая запись останется в локальном архиве.</p><form id="game-options" class="game-options"><label>Правила<select name="rules">${Object.values(rulesets).map(r=>`<option value="${r.id}" ${r.id===preferredRules?'selected':''}>${r.name}</option>`).join('')}</select></label>${botMode?`<label>Сложность<select name="difficulty">${Object.entries(levels).map(([id,l])=>`<option value="${id}" ${id===preferredDifficulty?'selected':''}>${l.name}</option>`).join('')}</select></label><p>Вы играете за жёлтых и ходите первыми. Сложный уровень дольше обдумывает ход.</p>`:''}<div class="dialog-actions"><button type="button" id="keep-game">Продолжить игру</button><button type="submit" class="primary">Начать партию</button></div></form>`);
  $('keep-game').onclick=()=>{$('dialog').close();runBot();};
  $('game-options').onsubmit=event=>{
    event.preventDefault();const form=new FormData(event.currentTarget);
    $('dialog').close();startGame(form.get('rules'),botMode?form.get('difficulty'):'medium');
  };
}
function showResult(){modal(`<div class="win-emoji">${state.winner?'🏆':'🤝'}</div><h2>${state.winner?'Победили '+names[state.winner].toLowerCase()+'!':'Ничья'}</h2><p>${state.reason}. Сыграем ещё одну?</p><div class="dialog-actions"><button id="again" class="primary">Новая партия</button><button id="look">Посмотреть поле</button></div>`,state.winner);$('again').onclick=()=>{$('dialog').close();newGame();};$('look').onclick=()=>$('dialog').close();}
$('new').onclick=()=>newGame();
$('undo').onclick=async()=>{
  if(!animating&&undo.length){cancelBot();await transition(()=>{state=undo.pop();selected=null;});runBot();}
};
$('flip').onclick=()=>{flipped=!flipped;render();};
$('resign').onclick=()=>{
  const owner=botMode?'blue':state.currentPlayer;
  confirmAction('Сдаться',names[owner]+' уступят победу сопернику.',()=>{
    cancelBot();if(!botMode||state.currentPlayer==='blue')undo.push(structuredClone(state));state={...state,status:'finished',winner:other(owner),reason:names[owner]+' сдались'};selected=null;render();showResult();
  });
};
$('bot-retry').onclick=()=>runBot();
$('export-game').onclick=()=>downloadRecord(recordCurrent(),`battle-${meta.id}.json`);
$('open-archive').onclick=()=>{
  const records=readArchive();
  modal(`<h2>Сохранённые партии</h2><p>До 50 последних записей хранятся только в этом браузере. Экспорт сохранит ходы, правила, результат и версию бота.</p><div class="archive-list">${records.length?records.map((r,i)=>`<button type="button" data-record="${i}"><span>${new Date(r.createdAt).toLocaleDateString('ru-RU')} · ${r.mode==='bot'?'С ботом':'Вдвоём'} · ${r.moves.length} полуходов</span><small>${r.result.status==='abandoned'?'Не завершена':r.result.winner?names[r.result.winner]+' победили':'Ничья'} · Скачать JSON ↗</small></button>`).join(''):'<p>Здесь появятся завершённые партии и записи при начале новой игры.</p>'}</div>`);
  $('dialog-content').querySelectorAll('[data-record]').forEach(button=>button.onclick=()=>downloadRecord(records[Number(button.dataset.record)],`battle-${records[Number(button.dataset.record)].id}.json`));
};
$('close').onclick=()=>$('dialog').close();$('dialog').addEventListener('click',e=>{if(e.target===$('dialog')&&(e.offsetX<0||e.offsetY<0||e.offsetX>$('dialog').clientWidth||e.offsetY>$('dialog').clientHeight))$('dialog').close();});
$('rules').onclick=()=>modal(`<div class="eyebrow">${gameRules(state).name} · ВЕРСИЯ ${gameRules(state).version}</div><h2>Добраться до логова</h2><p>${botMode?'Вы играете за жёлтых против бота. Все фишки обращены к вам.':'Два игрока сидят друг напротив друга.'} Первыми ходят жёлтые. Нажмите на животное, затем на подсвеченную клетку.</p><ul><li><b>Ход:</b> одна клетка по вертикали или горизонтали. Свои фигуры и своё логово занимать нельзя.</li><li><b>Захват:</b> сильный берёт слабого или равного. Сила указана на фигуре.</li><li><b>Особенности выбранных правил:</b> ${specialRulesText(state)}</li><li><b>Вода:</b> плавает только крыса. Лев и тигр прыгают через реку; любая крыса на линии прыжка блокирует его.</li><li><b>Ловушка:</b> в чужой ловушке сила становится 0. После выхода возвращается.</li><li><b>Победа:</b> войдите в чужое логово, захватите всех зверей или лишите соперника ходов.</li><li><b>Ничья:</b> троекратное повторение или 100 полуходов без захвата.</li></ul><p>Правила фиксируются на партию. ${botMode?'Отмена возвращает ваш ход вместе с ответом бота.':'Отменяйте ходы по согласию обоих игроков.'} Ходы сохраняются только в браузере.</p><p class="rules-reference"><a href="https://www.ymimports.com/pages/how-to-play-jungle" target="_blank" rel="noopener noreferrer">Редакция Yellow Mountain Imports ↗</a><small>Для обоих наборов у нас жёлтые начинают первыми; общие условия завершения и ничьей указаны выше.</small></p>`);
$('animals').innerHTML=Object.entries(animals).reverse().map(([id,a])=>`<button type="button" class="animal-row" data-animal="${id}" aria-haspopup="dialog" aria-label="${a.name}: открыть описание" title="${a.name} — особенности и возможности"><span class="emoji" aria-hidden="true">${animalPortrait(id)}</span><span class="animal-name">${a.name}${['lion','tiger','rat'].includes(id)?`<small>${id==='rat'?'ПЛАВАЕТ':'ПРЫГАЕТ ЧЕРЕЗ РЕКУ'}</small>`:''}</span><b>${a.rank}</b><span class="animal-open" aria-hidden="true">↗</span></button>`).join('');
$('animals').addEventListener('click',event=>{const button=event.target.closest('button[data-animal]');if(button)showAnimal(button.dataset.animal);});
$('terrain-guide').innerHTML=Object.entries(terrainEntries).map(([id,entry])=>`<button type="button" class="animal-row terrain-row" data-terrain="${id}" aria-haspopup="dialog" aria-label="${entry.name}: открыть описание"><span class="emoji terrain-guide-icon" aria-hidden="true">${terrainGuideIcon(id)}</span><span class="animal-name">${entry.name}</span><span class="animal-open" aria-hidden="true">↗</span></button>`).join('');
document.addEventListener('click',event=>{const button=event.target.closest('button[data-terrain]');if(button)showTerrain(button.dataset.terrain);});
$('dialog').addEventListener('close',()=>{
  history.replaceState(null,'',`${location.pathname}?rules=${gameRules(state).id}${botMode?'&difficulty='+difficulty:''}`);
  queueMicrotask(()=>runBot());
});
render();
setupWaterMotion();
setupBoardView();
setupMusic();

const trophySizing=new ResizeObserver(sizeTrophies);
for(const id of ['board','red-player','blue-player'])trophySizing.observe($(id));

if(loaded&&((query.has('rules')&&requestedRules!==gameRules(state).id)||(botMode&&query.has('difficulty')&&requestedDifficulty!==difficulty))){
  newGame(requestedRules,requestedDifficulty);
}else runBot();
if(botMode&&!state.history.length)refreshWeights();
