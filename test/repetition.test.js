import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,move,positionKey} from '../public/engine.js';
import {resolveRules,repetitionLimit} from '../public/rulesets.js';
import {gameRecord,replayRecord} from '../public/game-records.js';
const cat=(owner,x,y)=>({id:owner+'-cat',owner,animal:'cat',x,y});
function cycleGame(rules){
  const s={...initial(rules),pieces:[cat('blue',0,8),cat('red',6,0)]};
  s.positions={[positionKey(s)]:1};return s;
}
function step(s,index,recordHistory=true){
  const turns=[['blue-cat',0,7],['red-cat',6,1],['blue-cat',0,8],['red-cat',6,0]];
  return move(s,...turns[index%4],{recordHistory});
}
for(const rules of ['battle','classic-ymi']){
  test(`${rules} v2 draws at the fifth occurrence, not third or fourth`,()=>{
    let s=cycleGame(rules);assert.equal(s.rules.version,2);
    for(let i=0;i<16;i++){
      s=step(s,i);assert.ok(s);
      assert.equal(s.status,i===15?'finished':'playing');
    }
    assert.equal(s.reason,'Пятикратное повторение позиции');assert.equal(s.winner,null);
  });
  test(`${rules} v1 and old snapshots retain threefold repetition`,()=>{
    let s=cycleGame(rules+'@1');
    const oldSnapshot={...s.rules};delete oldSnapshot.repetitionLimit;
    s.rules=resolveRules(oldSnapshot);assert.equal(repetitionLimit(s),3);
    for(let i=0;i<8;i++)s=step(s,i);
    assert.equal(s.reason,'Троекратное повторение позиции');
  });
}
test('search and recorded moves use the same repeat counts',()=>{
  let recorded=cycleGame('battle'),search=cycleGame('battle');
  for(let i=0;i<16;i++){
    recorded=step(recorded,i);search=step(search,i,false);
    assert.deepEqual(search.positions,recorded.positions);assert.equal(search.status,recorded.status);
  }
});
test('another side to move is a different position; a win takes priority over repetition',()=>{
  let s=cycleGame('battle');const candidate=step(s,0);
  s.positions[positionKey({...candidate,currentPlayer:'blue'})]=5;
  assert.equal(step(s,0).status,'playing');
  s={...initial(),pieces:[cat('blue',3,1),cat('red',6,0)],positions:{}};
  const win=move(s,'blue-cat',3,0);s.positions[positionKey(win)]=4;
  const actual=move(s,'blue-cat',3,0);assert.equal(actual.winner,'blue');assert.equal(actual.reason,'Логово захвачено');
});
test('old archive exports keep rule version when replayed',()=>{
  let state=initial('battle@1');
  state=move(state,'blue-rat',6,5);
  const record=gameRecord(state,{id:'old-rules'});
  assert.equal(replayRecord(record).rules.version,1);
  assert.equal(repetitionLimit(replayRecord(record)),3);
});
