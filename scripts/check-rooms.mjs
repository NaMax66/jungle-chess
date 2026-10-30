import assert from 'node:assert/strict';
const base=process.env.ROOMS_TEST_URL||'http://localhost:8080';
async function api(path,body){
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:new URL(base).origin,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,body:await response.json()};
}
function connect(roomId,token){
  return new Promise((resolve,reject)=>{
    const url=new URL(`/api/rooms/${roomId}/connect`,base);url.protocol=url.protocol==='https:'?'wss:':'ws:';
    const socket=new WebSocket(url),messages=[],waiters=[];
    const peer={socket,send:value=>socket.send(JSON.stringify(value)),next:predicate=>new Promise((done,fail)=>{
      const index=messages.findIndex(predicate);if(index>=0){done(messages.splice(index,1)[0]);return;}
      const entry={predicate,done:value=>{clearTimeout(entry.timer);done(value);},timer:setTimeout(()=>fail(new Error('No expected room message')),8000)};waiters.push(entry);
    })};
    socket.onopen=()=>peer.send({type:'auth',token});
    socket.onerror=()=>reject(new Error('WebSocket failed'));
    socket.onmessage=event=>{
      const value=JSON.parse(event.data);const index=waiters.findIndex(w=>w.predicate(value));
      if(index>=0)waiters.splice(index,1)[0].done(value);else messages.push(value);
    };
    peer.next(m=>m.type==='state').then(snapshot=>resolve({...peer,initial:snapshot}),reject);
  });
}
const created=await api('/api/rooms',{rules:'battle'});assert.equal(created.status,201);
const roomId=created.body.roomId,hostToken=created.body.token;const peers=[];
try{
  const publicState=await api(`/api/rooms/${roomId}/state`);
  assert.equal(publicState.body.state.rules.version,2);assert.equal(publicState.body.joined.red,false);
  assert.equal(JSON.stringify(publicState.body).includes(hostToken),false);assert.equal('keys' in publicState.body,false);
  const attempts=await Promise.all([api(`/api/rooms/${roomId}/join`,{}),api(`/api/rooms/${roomId}/join`,{})]);
  assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
  const joined=attempts.find(r=>r.status===200);
  assert.equal((await api(`/api/rooms/${roomId}/join`,{})).status,409);
  const host=await connect(roomId,hostToken),guest=await connect(roomId,joined.body.token);peers.push(host,guest);
  assert.equal(host.initial.owner,'blue');assert.equal(guest.initial.owner,'red');
  let revision=guest.initial.revision;
  host.send({type:'move',id:'blue-rat',x:6,y:5,revision});
  let snapshot=await guest.next(m=>m.type==='state'&&m.revision===revision+1);revision=snapshot.revision;
  assert.equal(snapshot.state.history.length,1);assert.equal(snapshot.state.currentPlayer,'red');
  host.send({type:'move',id:'blue-rat',x:6,y:4,revision});
  assert.match((await host.next(m=>m.type==='error')).message,/ход соперника/);
  guest.send({type:'move',id:'red-rat',x:0,y:3,revision});
  snapshot=await host.next(m=>m.type==='state'&&m.revision===revision+1);revision=snapshot.revision;
  host.send({type:'undo',revision});
  snapshot=await guest.next(m=>m.type==='state'&&m.revision===revision+1);revision=snapshot.revision;
  assert.equal(snapshot.proposal.kind,'undo');
  guest.send({type:'reply',accept:true,revision});
  snapshot=await host.next(m=>m.type==='state'&&m.revision===revision+1);revision=snapshot.revision;assert.equal(snapshot.state.history.length,0);
  host.socket.close();const resumed=await connect(roomId,hostToken);peers.push(resumed);
  assert.equal(resumed.initial.owner,'blue');assert.equal(resumed.initial.revision,revision);
  resumed.send({type:'resign',revision});
  snapshot=await guest.next(m=>m.type==='state'&&m.revision===revision+1);revision=snapshot.revision;assert.equal(snapshot.state.winner,'red');
  resumed.send({type:'rematch',revision});
  snapshot=await guest.next(m=>m.type==='state'&&m.revision===revision+1);revision=snapshot.revision;
  const oldGame=snapshot.gameId;guest.send({type:'reply',accept:true,revision});
  snapshot=await resumed.next(m=>m.type==='state'&&m.revision===revision+1);assert.notEqual(snapshot.gameId,oldGame);assert.equal(snapshot.state.status,'playing');
  console.log('PASS: create/join, two sockets, server validation, agreed undo, reconnect, resign, rematch, private seat keys');
}finally{for(const peer of peers)peer.socket.close();}
