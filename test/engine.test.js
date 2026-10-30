import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,legalMoves,move,positionKey} from '../public/engine.js';
const p=(animal,owner,x,y)=>({id:owner+'-'+animal,animal,owner,x,y});
const game=(pieces)=>({...initial(),pieces,positions:{}});
const can=(s,id,x,y)=>legalMoves(s,id).some(m=>m.x===x&&m.y===y);
test('initial arrangement and first turn',()=>{const s=initial();assert.equal(s.pieces.length,16);assert.equal(new Set(s.pieces.map(p=>p.x+','+p.y)).size,16);assert.equal(s.currentPlayer,'blue');assert.equal(legalMoves(s,'red-lion').length,0);});
test('elephant and rat capture each other, including rat from water',()=>{for(const [a,b,x,y,tx,ty] of [['elephant','rat',0,3,0,2],['rat','elephant',0,3,0,2],['rat','elephant',1,3,0,3]]){const s=game([p(a,'blue',x,y),p(b,'red',tx,ty)]);assert.ok(can(s,'blue-'+a,tx,ty));assert.equal(move(s,'blue-'+a,tx,ty).pieces.length,1);}});
test('only rats enter water; rats capture across shore and in water',()=>{assert.equal(can(game([p('dog','blue',0,3)]),'blue-dog',1,3),false);for(const [x,y,tx,ty] of [[0,3,1,3],[1,3,0,3],[1,3,2,3]])assert.ok(can(game([p('rat','blue',x,y),p('rat','red',tx,ty)]),'blue-rat',tx,ty));});
test('lion horizontal and tiger vertical jumps; either rat blocks',()=>{for(const [a,x,y,tx,ty,bx,by] of [['lion',0,3,3,3,1,3],['tiger',1,2,1,6,1,4]]){const s=game([p(a,'blue',x,y)]);assert.ok(can(s,'blue-'+a,tx,ty));for(const owner of ['blue','red'])assert.equal(can(game([...s.pieces,p('rat',owner,bx,by)]),'blue-'+a,tx,ty),false);}});
test('jump capture respects ranks',()=>{assert.ok(can(game([p('tiger','blue',0,3),p('leopard','red',3,3)]),'blue-tiger',3,3));assert.equal(can(game([p('tiger','blue',0,3),p('lion','red',3,3)]),'blue-tiger',3,3),false);});
test('own den blocked, enemy den wins',()=>{assert.equal(can(game([p('cat','blue',3,7)]),'blue-cat',3,8),false);const s=move(game([p('cat','blue',3,1),p('lion','red',6,6)]),'blue-cat',3,0);assert.equal(s.status,'finished');assert.equal(s.winner,'blue');});
test('trap rank applies before rat exception and is restored outside',()=>{assert.ok(can(game([p('cat','blue',2,7),p('elephant','red',3,7)]),'blue-cat',3,7));assert.equal(can(game([p('rat','blue',3,1),p('elephant','red',2,1)]),'blue-rat',2,1),false);assert.equal(can(game([p('cat','blue',2,6),p('elephant','red',3,6)]),'blue-cat',3,6),false);});
test('illegal moves do not mutate game',()=>{const s=initial(),before=JSON.stringify(s);assert.equal(move(s,'blue-elephant',1,5),null);assert.equal(JSON.stringify(s),before);});
test('no legal moves ends game',()=>{const s=game([p('lion','blue',0,0),p('wolf','blue',1,1),p('elephant','blue',0,2),p('dog','blue',6,8),p('cat','red',0,1)]);const next=move(s,'blue-dog',6,7);assert.equal(next.winner,'blue');assert.equal(next.reason,'У соперника нет допустимых ходов');});
test('100 half moves and repetition draw',()=>{const s=game([p('cat','blue',0,8),p('cat','red',6,0)]);s.quiet=99;assert.equal(move(s,'blue-cat',0,7).winner,null);assert.equal(move(s,'blue-cat',0,7).status,'finished');s.quiet=0;const next=move(s,'blue-cat',0,7);s.positions[positionKey(next)]=4;assert.equal(move(s,'blue-cat',0,7).reason,'Пятикратное повторение позиции');});
test('capture resets quiet counter; player changes',()=>{const s=game([p('wolf','blue',0,8),p('dog','red',0,7),p('cat','red',6,0)]);s.quiet=99;const next=move(s,'blue-wolf',0,7);assert.equal(next.quiet,0);assert.equal(next.currentPlayer,'red');assert.equal(next.status,'playing');});




