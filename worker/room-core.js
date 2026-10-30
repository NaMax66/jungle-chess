import {initial,move,other} from '../public/engine.js';

export const ROOM_TTL=7*24*60*60*1000;
export function createRoom(id,rules='battle',now=Date.now()){
  return {id,gameId:crypto.randomUUID(),createdAt:new Date(now).toISOString(),revision:0,state:initial(rules),keys:{blue:null,red:null},proposal:null,expiresAt:now+ROOM_TTL};
}
export function applyAction(room,owner,action,now=Date.now()){
  if(!['red','blue'].includes(owner))throw new Error('Сначала займите место за доской.');
  if(room.expiresAt<=now)throw new Error('Срок жизни комнаты истёк.');
  if(action.revision!==room.revision)throw new Error('Позиция обновилась. Повторите действие.');
  if(!room.keys.red)throw new Error('Ждём второго игрока.');
  const next={...room,revision:room.revision+1,expiresAt:now+ROOM_TTL};
  if(action.type==='reply'){
    if(!room.proposal)throw new Error('Предложение уже закрыто.');
    if(action.accept&&room.proposal.owner===owner)throw new Error('Ждём согласия соперника.');
    if(action.accept){
      if(room.proposal.kind==='rematch'){
        next.state=initial(room.state.rules);next.gameId=crypto.randomUUID();next.createdAt=new Date(now).toISOString();
      }else{
        let restored=initial(room.state.rules);
        for(const entry of room.state.history.slice(0,room.proposal.target))restored=move(restored,entry.id,...entry.to);
        next.state=restored;
      }
    }
    next.proposal=null;return next;
  }
  if(action.type==='resign'){
    if(room.state.status!=='playing')throw new Error('Партия уже закончена.');
    next.state={...room.state,status:'finished',winner:other(owner),reason:(owner==='blue'?'Жёлтые':'Красные')+' сдались'};
    next.proposal=null;return next;
  }
  if(room.proposal)throw new Error('Сначала ответьте на предложение.');
  if(action.type==='rematch'){
    next.proposal={kind:'rematch',owner};return next;
  }
  if(room.state.status!=='playing')throw new Error('Партия уже закончена.');
  if(action.type==='undo'){
    const target=room.state.history.findLastIndex(entry=>entry.owner===owner);
    if(target<0)throw new Error('Вы ещё не сделали ход.');
    next.proposal={kind:'undo',owner,target};return next;
  }
  if(action.type!=='move')throw new Error('Неизвестное действие.');
  if(room.state.currentPlayer!==owner)throw new Error('Сейчас ход соперника.');
  if(!Number.isInteger(action.x)||!Number.isInteger(action.y)||typeof action.id!=='string')throw new Error('Некорректный ход.');
  const moved=move(room.state,action.id,action.x,action.y);
  if(!moved)throw new Error('Этот ход недоступен.');
  next.state=moved;return next;
}
export function publicRoom(room){
  return {roomId:room.id,gameId:room.gameId,createdAt:room.createdAt,revision:room.revision,state:room.state,joined:{blue:!!room.keys.blue,red:!!room.keys.red},proposal:room.proposal,expiresAt:room.expiresAt};
}
export const mintToken=()=>crypto.randomUUID()+crypto.randomUUID();
export async function tokenHash(token){
  if(typeof token!=='string'||token.length!==72)return null;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
