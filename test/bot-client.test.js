import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BotClient} from '../public/bot-client.js';
import {initial} from '../public/engine.js';
test('cancelling worker resolves pending request and stale replies cannot replace a new one',async()=>{
  const oldWorker=globalThis.Worker,workers=[];
  globalThis.Worker=class{constructor(){workers.push(this);}postMessage(data){this.request=data;}terminate(){this.terminated=true;}};
  try{
    const client=new BotClient();
    const first=client.choose(initial(),{}),firstWorker=workers[0];
    client.cancel();assert.equal(await first,null);assert.equal(firstWorker.terminated,true);
    const second=client.choose(initial(),{}),secondWorker=workers[1];
    firstWorker.onmessage({data:{requestId:firstWorker.request.requestId,move:{id:'old'}}});
    secondWorker.onmessage({data:{requestId:secondWorker.request.requestId,move:{id:'new'}}});
    assert.deepEqual(await second,{id:'new'});assert.equal(secondWorker.terminated,true);
  }finally{globalThis.Worker=oldWorker;}
});
