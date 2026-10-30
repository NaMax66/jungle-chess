import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,move,legalMoves,positionKey} from '../public/engine.js';
import {resolveRules,rankOf} from '../public/rulesets.js';
import {chooseMove,allMoves,baseline,validateWeights} from '../public/bot-search.js';
import {gameRecord,storeRecord,readArchive,replayRecord} from '../public/game-records.js';
const p=(animal,owner,x,y)=>({id:owner+'-'+animal,animal,owner,x,y});
function game(pieces,rules='battle') {const s={...initial(rules),pieces};s.positions={[positionKey(s)]:1};return s;}
const can=(s,id,x,y)=>legalMoves(s,id).some(m=>m.x===x&&m.y===y);

test('classic YMI ranks and captures differ without changing battle defaults',()=>{
  for(const rules of ['battle','classic-ymi']){
    const classic=rules==='classic-ymi';
    assert.equal(rankOf(initial(rules),'dog'),classic?4:3);
    for(const [x,y,tx,ty] of [[0,3,1,3],[1,3,0,3]])assert.equal(can(game([p('rat','blue',x,y),p('rat','red',tx,ty)],rules),'blue-rat',tx,ty),!classic);
    assert.equal(can(game([p('rat','blue',1,3),p('elephant','red',0,3)],rules),'blue-rat',0,3),!classic);
    assert.equal(can(game([p('elephant','blue',0,3),p('rat','red',0,2)],rules),'blue-elephant',0,2),!classic);
    assert.ok(can(game([p('rat','blue',1,3),p('rat','red',2,3)],rules),'blue-rat',2,3));
    assert.ok(can(game([p('elephant','blue',2,7),p('rat','red',3,7)],rules),'blue-elephant',3,7));
  }
});
test('rules snapshots are independent, reject unsupported versions and survive transitions',()=>{
  const s=initial('classic-ymi'),before=JSON.stringify(s);const m=allMoves(s)[0];
  const next=move(s,m.id,m.x,m.y);
  assert.deepEqual(next.rules,s.rules);assert.equal(JSON.stringify(s),before);
  const altered=resolveRules();altered.ranks.rat=8;assert.equal(rankOf(initial(),'rat'),1);
  assert.throws(()=>resolveRules({...altered,version:9}));assert.throws(()=>resolveRules(altered));
  const legacy={...initial()};delete legacy.rules;assert.equal(rankOf(legacy,'wolf'),4);
});
test('search transitions match UI transitions without copying history',()=>{
  const s=initial();const m=allMoves(s)[0];const full=move(s,m.id,m.x,m.y),fast=move(s,m.id,m.x,m.y,{recordHistory:false});
  assert.deepEqual(fast.pieces,full.pieces);assert.deepEqual(fast.positions,full.positions);assert.equal(fast.quiet,full.quiet);assert.equal(fast.history.length,0);assert.equal(s.history.length,0);
});
test('bot finds an immediate den win and terminal states have no move',()=>{
  for(const rules of ['battle','classic-ymi']){
    const s=game([p('cat','blue',3,1),p('lion','red',6,0)],rules);
    const m=chooseMove(s,{maxNodes:3000,maxMs:500,random:()=>0});assert.equal(m.id,'blue-cat');assert.deepEqual([m.x,m.y],[3,0]);
    assert.equal(chooseMove(move(s,m.id,m.x,m.y)),null);
  }
});
test('bot prevents an immediate den loss instead of collecting a distant piece',()=>{
  const s=game([p('cat','blue',2,7),p('wolf','blue',6,2),p('rat','red',3,7),p('cat','red',6,1)]);
  const m=chooseMove(s,{difficulty:'hard',maxMs:1500,maxNodes:12000,random:()=>0});
  assert.equal(m.id,'blue-cat');assert.deepEqual([m.x,m.y],[3,7]);
});
test('bot returns legal moves under all levels and rules, and preserves state',()=>{
  for(const rules of ['battle','classic-ymi'])for(const difficulty of ['easy','medium','hard']){
    const s=initial(rules),before=JSON.stringify(s);const m=chooseMove(s,{difficulty,maxMs:70,maxNodes:500,random:()=>0});
    assert.ok(can(s,m.id,m.x,m.y));assert.equal(JSON.stringify(s),before);
  }
});
test('weight compatibility and malformed values fall back to baseline',()=>{
  const rules=resolveRules();assert.equal(validateWeights({...baseline,rulesets:['other@1']},rules),baseline);
  assert.equal(validateWeights({...baseline,trap:NaN},rules),baseline);
  const next={...baseline,version:'candidate-2',progress:8};assert.equal(validateWeights(next,rules),next);
});
test('portable records include rules and bot version, archive deduplicates and bounds storage',()=>{
  const s=initial('classic-ymi');const m=allMoves(s)[0];const next=move(s,m.id,m.x,m.y);
  const record=gameRecord(next,{id:'test',mode:'bot',difficulty:'hard',weightsVersion:'baseline-1',createdAt:'2026-10-30T00:00:00Z'});
  assert.equal(record.rules.id,'classic-ymi');assert.equal(record.bot.weightsVersion,'baseline-1');assert.equal(record.moves.length,1);
  const storage={value:null,getItem(){return this.value;},setItem(key,value){this.value=value;}};
  storeRecord(record,storage);storeRecord(record,storage);assert.equal(readArchive(storage).length,1);
  for(let i=0;i<60;i++)storeRecord({...record,id:String(i)},storage);assert.equal(readArchive(storage).length,50);
  assert.equal(storeRecord(record,{getItem(){return null;},setItem(){throw new Error('quota');}}),false);
});

test('exported games replay using their pinned rules; invalid moves are rejected',()=>{
  for(const rules of ['battle','classic-ymi']){
    let state=initial(rules);
    for(let i=0;i<12&&state.status==='playing';i++){const m=allMoves(state)[i%allMoves(state).length];state=move(state,m.id,m.x,m.y);}
    const record=gameRecord(state,{id:'replay'});
    const replayed=replayRecord(record);
    assert.deepEqual(replayed.pieces,state.pieces);assert.deepEqual(replayed.positions,state.positions);
    const broken=structuredClone(record);broken.moves[0].to=[3,0];assert.throws(()=>replayRecord(broken));
  }
});
