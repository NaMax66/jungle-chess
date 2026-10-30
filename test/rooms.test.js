import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,applyAction,publicRoom,ROOM_TTL,tokenHash} from '../worker/room-core.js';
function room(){const r=createRoom('test','battle',0);r.keys={blue:'host-hash',red:'guest-hash'};return r;}
const action=(r,owner,value)=>applyAction(r,owner,{revision:r.revision,...value},1000);
test('room moves use server turn, revision and shared rules',()=>{
  let r=room();const before=JSON.stringify(r);
  assert.throws(()=>action(r,'red',{type:'move',id:'red-rat',x:0,y:3}),/ход соперника/);
  assert.throws(()=>applyAction(r,'blue',{type:'move',revision:9},1000),/обновилась/);
  assert.throws(()=>action(r,'blue',{type:'move',id:'red-rat',x:0,y:3}),/недоступен/);
  r=action(r,'blue',{type:'move',id:'blue-rat',x:6,y:5});assert.equal(r.state.history.length,1);assert.equal(r.state.rules.version,2);
  assert.equal(JSON.parse(before).state.history.length,0);
});
test('undo requires opponent agreement, reconstructs positions and keeps rules',()=>{
  let r=room();r=action(r,'blue',{type:'move',id:'blue-rat',x:6,y:5});r=action(r,'red',{type:'move',id:'red-rat',x:0,y:3});
  r=action(r,'blue',{type:'undo'});
  assert.throws(()=>action(r,'blue',{type:'reply',accept:true}),/согласия/);
  assert.throws(()=>action(r,'blue',{type:'move',id:'blue-rat',x:6,y:4}),/предложение/);
  r=action(r,'red',{type:'reply',accept:true});assert.equal(r.state.history.length,0);assert.equal(r.state.currentPlayer,'blue');assert.equal(Object.keys(r.state.positions).length,1);
});
test('resignation and rematch preserve seats and pin rules',()=>{
  let r=room();const seats=r.keys;r=action(r,'red',{type:'resign'});assert.equal(r.state.winner,'blue');
  const old=r.gameId;r=action(r,'blue',{type:'rematch'});r=action(r,'red',{type:'reply',accept:true});
  assert.notEqual(r.gameId,old);assert.deepEqual(r.keys,seats);assert.equal(r.state.status,'playing');
});
test('public snapshots hide auth material, expiry and waiting are enforced',async()=>{
  const r=room(),snapshot=publicRoom(r);assert.equal('keys' in snapshot,false);
  assert.equal(JSON.stringify(snapshot).includes('host-hash'),false);
  assert.throws(()=>applyAction(r,'blue',{type:'resign',revision:0},ROOM_TTL+1),/истёк/);
  r.keys.red=null;assert.throws(()=>action(r,'blue',{type:'resign'}),/второго игрока/);
  assert.equal(await tokenHash('short'),null);
});
