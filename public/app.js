import {animals,initial,terrain,legalMoves,move,other} from './engine.js';
import {terrainIcon,riverMarkup,setupWaterMotion} from './terrain-art.js';
import {snapshotPieces,animatePieces} from './piece-motion.js';
import {setupBoardView} from './board-view.js';
const $=id=>document.getElementById(id),names={blue:'Жёлтые',red:'Красные'},key='jungle-chess-v1';
let state=initial(),selected=null,flipped=false,undo=[];
let animating=false;
try{const data=JSON.parse(localStorage.getItem(key));if(data?.version===1&&data.state?.pieces&&data.state.positions){state=data.state;flipped=!!data.flipped;undo=data.undo||[];}}catch{}
function save(){try{localStorage.setItem(key,JSON.stringify({version:1,state,flipped,undo}));}catch{$('saved').textContent='Не удалось сохранить партию в этом браузере';}}
const coords=(x,y)=>'abcdefg'[x]+(9-y);
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
    const p=state.pieces.find(p=>p.x===x&&p.y===y);
    const trapped=!!p&&t.type==='trap'&&t.owner!==p.owner;
    const allowed=moves.find(m=>m.x===x&&m.y===y);
    const cell=document.createElement('button');
    const isLast=last&&[last.from,last.to].some(([lx,ly])=>lx===x&&ly===y);
    cell.className=`cell ${t.type} ${p?.id===selected?'selected':''} ${allowed?'legal':''} ${allowed?.capture?'capture':''} ${isLast?'last':''}`;
    cell.dataset.owner=t.owner||'';
    cell.setAttribute('aria-label',`${coords(x,y)}: ${p?names[p.owner]+' '+animals[p.animal].name:t.type==='water'?'Вода':t.type==='trap'?'Ловушка '+names[t.owner]:t.type==='den'?'Логово '+names[t.owner]:'Пустая клетка'}${allowed?', доступный ход':''}`);
    cell.setAttribute('aria-pressed',String(p?.id===selected&&!!p));
    const seal=terrainIcon(t.type);
    const away=(t.owner==='red')!==flipped;
    if(trapped)cell.setAttribute('aria-label',cell.getAttribute('aria-label')+', в чужой ловушке, сила 0');
    cell.innerHTML=`${seal?`<span class="terrain-icon ${away?'facing-away':''}" aria-hidden="true">${seal}</span>`:''}${(x===0||y===8)?`<span class="coord">${coords(x,y)}</span>`:''}${p?`<span class="piece ${p.owner} ${trapped?'is-trapped':''}" data-piece-id="${p.id}" aria-hidden="true"><span class="piece-face ${(p.owner==='red')!==flipped?'facing-away':''}"><span>${animals[p.animal].emoji}</span><small>${trapped?0:animals[p.animal].rank}</small></span></span>`:''}`;
    cell.onclick=()=>clickCell(p,x,y);
    board.append(cell);
  }
  board.insertAdjacentHTML('beforeend',riverMarkup());
for(const owner of ['red','blue']){
  const player=$(owner+'-player');
  const captured=Object.keys(animals).filter(a=>!state.pieces.some(p=>p.owner===owner&&p.animal===a));
  const active=state.currentPlayer===owner&&state.status==='playing';
  const message=state.status==='finished'?(state.winner?(state.winner===owner?'ПОБЕДА':'ПОРАЖЕНИЕ'):'НИЧЬЯ'):(active?'ВАШ ХОД':'ЖДИТЕ ХОДА');
  player.classList.toggle('is-active',active);
  player.classList.toggle('facing-away',(owner==='red')!==flipped);
  player.setAttribute('role','group');
  player.setAttribute('aria-label',`${names[owner]}: ${message.toLowerCase()}`);
  player.innerHTML=`<span class="player-dot" aria-hidden="true"></span><b>${names[owner]}</b><span class="captured" aria-label="Потерянные фигуры">${captured.map(a=>animals[a].emoji).join('')}</span><strong class="player-message">${message}</strong>`;
}
const game=document.querySelector('.game');
game.dataset.activePlayer=state.status==='playing'?state.currentPlayer:'none';
game.dataset.turnEdge=state.status==='playing'?(state.currentPlayer===(flipped?'blue':'red')?'top':'bottom'):'none';
game.insertBefore($(flipped?'blue-player':'red-player'),game.firstChild);
game.insertBefore($(flipped?'red-player':'blue-player'),$('hint'));
$('turn').className='turn '+state.currentPlayer;$('turn').innerHTML=`<div class="turn-orb">${state.status==='finished'?'✦':'↗'}</div><div><b>${state.status==='finished'?(state.winner?'Победили '+names[state.winner].toLowerCase():'Ничья'):'Ходят '+names[state.currentPlayer].toLowerCase()}</b><small>${state.status==='finished'?state.reason:`Ход ${Math.floor(state.history.length/2)+1} · ${selected?animals[state.pieces.find(p=>p.id===selected).animal].name:'Выберите свою фигуру'}`}</small></div>`;
$('hint').textContent=state.status==='finished'?state.reason:selected?`${animals[state.pieces.find(p=>p.id===selected).animal].name}: ${moves.length?'выберите подсвеченную клетку':'нет доступных ходов — выберите другую фигуру'}`:`Нажмите на ${state.currentPlayer==='blue'?'жёлтую':'красную'} фигуру, чтобы увидеть доступные ходы`;
$('count').textContent=state.history.length;$('history').innerHTML=state.history.length?state.history.map((m,i)=>`<li>${i+1}. ${animals[m.animal].emoji} ${coords(...m.from)} → ${coords(...m.to)} ${m.capture?'× '+animals[m.capture].emoji:''}</li>`).reverse().join(''):'<li class="empty">Первый ход — начало истории.</li>';$('undo').disabled=!undo.length;$('resign').disabled=state.status!=='playing';save();}
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
  if(animating||state.status!=='playing')return;
  if(selected){
    const next=move(state,selected,x,y);
    if(next){
      const last=next.history.at(-1);
      const jump=Math.abs(last.from[0]-x)+Math.abs(last.from[1]-y)>1;
      await transition(()=>{undo.push(state);state=next;selected=null;},{jumpId:jump?last.id:null});
      if(state.status==='finished')showResult();
      return;
    }
  }
  selected=p?.owner===state.currentPlayer?(selected===p.id?null:p.id):null;
  render();
}
function modal(html){$('dialog-content').innerHTML=html;$('dialog').showModal();}
function confirmAction(title,text,action){modal(`<h2>${title}</h2><p>${text}</p><div class="dialog-actions"><button id="cancel">Продолжить игру</button><button id="confirm" class="primary">${title}</button></div>`);$('cancel').onclick=()=>$('dialog').close();$('confirm').onclick=()=>{$('dialog').close();action();};}
function newGame(){state=initial();selected=null;undo=[];render();}
function showResult(){modal(`<div class="win-emoji">${state.winner?'🏆':'🤝'}</div><h2>${state.winner?'Победили '+names[state.winner].toLowerCase()+'!':'Ничья'}</h2><p>${state.reason}. Сыграем ещё одну?</p><div class="dialog-actions"><button id="again" class="primary">Новая партия</button><button id="look">Посмотреть поле</button></div>`);$('again').onclick=()=>{$('dialog').close();newGame();};$('look').onclick=()=>$('dialog').close();}
$('new').onclick=()=>state.history.length&&state.status==='playing'?confirmAction('Новая партия','Текущая партия будет завершена. Жёлтые снова ходят первыми.',newGame):newGame();$('undo').onclick=async()=>{if(!animating&&undo.length){await transition(()=>{state=undo.pop();selected=null;});}};$('flip').onclick=()=>{flipped=!flipped;render();};$('resign').onclick=()=>confirmAction('Сдаться',names[state.currentPlayer]+' уступят победу сопернику.',()=>{undo.push(structuredClone(state));state={...state,status:'finished',winner:other(state.currentPlayer),reason:names[state.currentPlayer]+' сдались'};selected=null;render();showResult();});$('close').onclick=()=>$('dialog').close();$('dialog').addEventListener('click',e=>{if(e.target===$('dialog')&&(e.offsetX<0||e.offsetY<0||e.offsetX>$('dialog').clientWidth||e.offsetY>$('dialog').clientHeight))$('dialog').close();});
$('rules').onclick=()=>modal(`<div class="eyebrow">ПРАВИЛА НАШЕЙ ВЕРСИИ</div><h2>Добраться до логова</h2><p>Играйте вдвоём, передавая устройство. Первыми ходят жёлтые. Нажмите на животное, затем на подсвеченную клетку.</p><ul><li><b>Ход:</b> одна клетка по вертикали или горизонтали. Свои фигуры и своё логово занимать нельзя.</li><li><b>Захват:</b> сильный съедает слабого или равного. Сила указана на фигуре. Волк сильнее собаки.</li><li><b>Слон и крыса</b> могут съесть друг друга. Только крыса плавает и атакует через берег в обе стороны, включая другую крысу.</li><li><b>Лев и тигр</b> прыгают через реку вдоль и поперёк. Любая крыса на пути блокирует прыжок.</li><li><b>Ловушка:</b> в чужой ловушке сила становится 0. Эффект ловушки важнее особого захвата слона крысой. После выхода сила возвращается.</li><li><b>Победа:</b> войдите в чужое логово, захватите все фигуры или лишите соперника ходов.</li><li><b>Ничья:</b> позиция повторилась трижды с той же очередью хода или сделано 100 полуходов без захвата.</li></ul><p>Партия сохраняется автоматически в этом браузере. Отменять ходы можно по согласию обоих игроков.</p>`);
$('animals').innerHTML=Object.entries(animals).reverse().map(([id,a])=>`<div class="animal-row"><span class="emoji">${a.emoji}</span><span>${a.name}${['lion','tiger','rat'].includes(id)?`<small>${id==='rat'?'ПЛАВАЕТ':'ПРЫГАЕТ ЧЕРЕЗ РЕКУ'}</small>`:''}</span><b>${a.rank}</b></div>`).join('');render();
setupWaterMotion();
setupBoardView();
document.querySelector('.field-key').innerHTML=`<span>≈ Река</span><span><span class="legend-seal" aria-hidden="true">${terrainIcon('trap')}</span>Ловушка</span><span><span class="legend-seal" aria-hidden="true">${terrainIcon('den')}</span>Логово</span>`;
