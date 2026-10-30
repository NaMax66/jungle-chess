import {initial,move} from './engine.js';
import {gameRules,resolveRules} from './rulesets.js';
// Local-only portable records. No telemetry, account IDs or network submission.
export const archiveKey='jungle-chess-archive-v1';
export function gameRecord(state,{id,mode='local',difficulty=null,createdAt,weightsVersion=null}){
  return {schemaVersion:1,engineVersion:1,id,mode,createdAt,finishedAt:new Date().toISOString(),rules:resolveRules(gameRules(state)),bot:mode==='bot'?{difficulty,weightsVersion}:null,moves:state.history.map(m=>({id:m.id,from:[...m.from],to:[...m.to],capture:m.capture})),result:{status:state.status,winner:state.winner,reason:state.reason},finalPosition:state.pieces.map(p=>({...p}))};
}
export function readArchive(storage=localStorage){
  try{const items=JSON.parse(storage.getItem(archiveKey)||'[]');return Array.isArray(items)?items.slice(0,50):[];}catch{return [];}
}
export function storeRecord(record,storage=localStorage){
  let items=[record,...readArchive(storage).filter(item=>item.id!==record.id)].slice(0,50);
  while(items.length){
    try{storage.setItem(archiveKey,JSON.stringify(items));return true;}
    catch{items.pop();}
  }
  return false;
}
export function downloadRecord(value,filename='battle-of-beasts.json'){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// A record can be replayed for future analysis without trusting its finalPosition.
export function replayRecord(record){
  if(record?.schemaVersion!==1||record.engineVersion!==1||!Array.isArray(record.moves))throw new Error('Неподдерживаемая запись партии');
  let state=initial(resolveRules(record.rules));
  for(const entry of record.moves){
    const piece=state.pieces.find(p=>p.id===entry.id);
    if(!piece||!Array.isArray(entry.from)||piece.x!==entry.from[0]||piece.y!==entry.from[1]||!Array.isArray(entry.to))throw new Error('Повреждённая последовательность ходов');
    const next=move(state,entry.id,...entry.to);
    if(!next)throw new Error('Недопустимый ход в записи');
    state=next;
  }
  if(record.result.status==='finished'&&state.status!=='finished'){
    if(record.result.winner!=='red'&&record.result.winner!=='blue')throw new Error('Некорректный результат');
    state={...state,status:'finished',winner:record.result.winner,reason:record.result.reason};
  }
  return state;
}
