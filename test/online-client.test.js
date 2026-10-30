import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineClient} from '../public/online-client.js';

test('invitation automatically joins, restores saved seats, and handles a full room',async t=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  let saved=null;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>saved}});
  t.after(()=>{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;});
  const setup=({full=false,conflict=false,failed=false}={})=>{
    const calls=[],statuses=[],rooms=[];
    const client=Object.assign(Object.create(OnlineClient.prototype),{
      roomId:'11111111-1111-1111-1111-111111111111',token:null,owner:null,
      onStatus:message=>statuses.push(message),onRoom:room=>rooms.push(room),
      remember(seat){this.token=seat.token;this.owner=seat.owner;},
      connect(){calls.push('connect');},
      async request(path){
        calls.push(path.endsWith('/join')?'join':'state');
        if(path.endsWith('/join')){
          if(conflict||failed)throw Object.assign(new Error('join failed'),{status:conflict?409:503});
          return {token:'guest-token',owner:'red'};
        }
        return {joined:{red:full||(conflict&&calls.includes('join'))}};
      }
    });
    return {client,calls,statuses,rooms};
  };
  const guest=setup();await guest.client.start('battle');
  assert.deepEqual(guest.calls,['state','join','connect']);assert.equal(guest.client.owner,'red');

  saved=JSON.stringify({token:'host-token',owner:'blue'});
  const host=setup();await host.client.start('battle');
  assert.deepEqual(host.calls,['state','connect']);assert.equal(host.client.owner,'blue');
  saved=null;

  const full=setup({full:true});await full.client.start('battle');
  assert.deepEqual(full.calls,['state']);assert.equal(full.statuses.at(-1),'Оба места заняты.');

  const race=setup({conflict:true});await race.client.start('battle');
  assert.deepEqual(race.calls,['state','join','state']);assert.equal(race.rooms.at(-1).joined.red,true);
  assert.equal(race.client.token,null);

  const failed=setup({failed:true});await assert.rejects(failed.client.start('battle'),{status:503});
});
