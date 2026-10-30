import {DurableObject} from 'cloudflare:workers';
import {createRoom,applyAction,publicRoom,mintToken,tokenHash,ROOM_TTL} from './room-core.js';
import {rulesets} from '../public/rulesets.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export class GameRoom extends DurableObject{
  constructor(ctx,env){
    super(ctx,env);this.room=null;this.queue=Promise.resolve();
    ctx.blockConcurrencyWhile(async()=>{this.room=await ctx.storage.get('room')||null;});
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
  }
  serial(fn){const task=this.queue.then(fn);this.queue=task.catch(()=>{});return task;}
  async persist(room){
    await this.ctx.storage.put('room',room);await this.ctx.storage.setAlarm(room.expiresAt);this.room=room;
  }
  async fetch(request){
    return this.serial(async()=>{
      const url=new URL(request.url),path=url.pathname;
      if(path==='/init'&&request.method==='POST'){
        if(this.room)return json({error:'Комната уже создана.'},409);
        const {id,rules}=await request.json();const room=createRoom(id,rules),token=mintToken();room.keys.blue=await tokenHash(token);
        await this.persist(room);return json({roomId:id,token,owner:'blue'},201);
      }
      if(!this.room)return json({error:'Комната не найдена.'},404);
      if(this.room.expiresAt<=Date.now())return json({error:'Срок жизни комнаты истёк.'},410);
      if(path.endsWith('/join')&&request.method==='POST'){
        if(this.room.keys.red)return json({error:'Оба места уже заняты.'},409);
        const token=mintToken(),room={...this.room,keys:{...this.room.keys,red:await tokenHash(token)},revision:this.room.revision+1,expiresAt:Date.now()+ROOM_TTL};
        await this.persist(room);this.broadcast();return json({token,owner:'red'});
      }
      if(path.endsWith('/state')&&request.method==='GET')return json(publicRoom(this.room));
      if(path.endsWith('/connect')&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
        if(this.ctx.getWebSockets().length>=8)return json({error:'Слишком много подключений.'},429);
        const [client,server]=Object.values(new WebSocketPair());
        this.ctx.acceptWebSocket(server);server.serializeAttachment({owner:null,opened:Date.now(),window:Date.now(),messages:0});
        return new Response(null,{status:101,webSocket:client});
      }
      return json({error:'Недоступный запрос.'},404);
    });
  }
  send(ws,value){try{ws.send(JSON.stringify(value));}catch{}}
  snapshot(ws){
    const owner=ws.deserializeAttachment()?.owner;
    if(!owner||!this.room)return;
    const online={blue:false,red:false};
    for(const peer of this.ctx.getWebSockets()){
      const seat=peer.deserializeAttachment()?.owner;if(seat&&peer.readyState===1)online[seat]=true;
    }
    this.send(ws,{type:'state',owner,online,...publicRoom(this.room)});
  }
  broadcast(){for(const ws of this.ctx.getWebSockets())this.snapshot(ws);}
  webSocketMessage(ws,message){
    return this.serial(async()=>{
      try{
        if(!this.room||this.room.expiresAt<=Date.now()){ws.close(4004,'Комната закрыта');return;}
        if(typeof message!=='string'||message.length>2048){ws.close(1009,'Слишком большое сообщение');return;}
        let attachment=ws.deserializeAttachment();
        if(!attachment)return;
        const now=Date.now();
        if(now-attachment.window>1000){attachment.window=now;attachment.messages=0;}
        if(++attachment.messages>12){ws.close(1008,'Слишком много сообщений');return;}
        ws.serializeAttachment(attachment);
        const action=JSON.parse(message);
        if(!attachment.owner){
          if(action.type!=='auth'||now-attachment.opened>15000){ws.close(4001,'Нужно занять место');return;}
          const hash=await tokenHash(action.token);
          const owner=hash&&['blue','red'].find(seat=>this.room.keys[seat]===hash);
          if(!owner){ws.close(4001,'Место не подтверждено');return;}
          for(const peer of this.ctx.getWebSockets())if(peer!==ws&&peer.deserializeAttachment()?.owner===owner)peer.close(4002,'Игра открыта в другой вкладке');
          attachment={...attachment,owner};ws.serializeAttachment(attachment);this.broadcast();return;
        }
        const next=applyAction(this.room,attachment.owner,action);
        await this.persist(next);this.broadcast();
      }catch(error){this.send(ws,{type:'error',message:error instanceof SyntaxError?'Некорректное сообщение.':error.message});this.snapshot(ws);}
    });
  }
  webSocketClose(ws,code,reason){try{ws.close(code===1005||code===1006?1000:code,reason);}catch{}this.broadcast();}
  webSocketError(ws){try{ws.close(1011,'Ошибка связи');}catch{}this.broadcast();}
  async alarm(){
    if(this.room&&this.room.expiresAt>Date.now()){await this.ctx.storage.setAlarm(this.room.expiresAt);return;}
    for(const ws of this.ctx.getWebSockets())try{ws.close(4004,'Срок жизни комнаты истёк');}catch{}
    await this.ctx.storage.deleteAll();this.room=null;
  }
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/rooms'))return env.ASSETS.fetch(request);
    const origin=request.headers.get('Origin');
    if(origin&&origin!==url.origin)return json({error:'Запрос с другого сайта запрещён.'},403);
    try{
      if(url.pathname==='/api/rooms'&&request.method==='POST'){
        if(Number(request.headers.get('Content-Length'))>2048)return json({error:'Запрос слишком большой.'},413);
        const body=await request.json();
        if(body.rules!==undefined&&(typeof body.rules!=='string'||!rulesets[body.rules]))return json({error:'Выберите доступный набор правил.'},400);
        const id=crypto.randomUUID();
        const room=env.ROOMS.get(env.ROOMS.idFromName(id));
        return await room.fetch(new Request('https://room.internal/init',{method:'POST',body:JSON.stringify({id,rules:body.rules||'battle'})}));
      }
      const match=url.pathname.match(/^\/api\/rooms\/([0-9a-f-]{36})\/(state|join|connect)$/);
      if(!match)return json({error:'Комната не найдена.'},404);
      return await env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
    }catch(error){return json({error:'Не удалось обработать запрос комнаты.'},error instanceof SyntaxError?400:503);}
  }
};
