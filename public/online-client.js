export class OnlineClient{
  constructor({onState,onStatus,onError,onRoom}){
    Object.assign(this,{onState,onStatus,onError,onRoom});
    this.roomId=new URLSearchParams(location.search).get('room');
    this.owner=null;this.token=null;this.connected=false;this.pending=false;this.revision=0;this.closed=false;this.attempt=0;
    this.wake=()=>{if(!document.hidden&&!this.closed&&!this.connected)this.connect();};
    document.addEventListener('visibilitychange',this.wake);
  }
  seatKey(){return `jungle-online-seat-${this.roomId}`;}
  remember(seat){
    this.token=seat.token;this.owner=seat.owner;
    try{localStorage.setItem(this.seatKey(),JSON.stringify(seat));}
    catch{this.onError('Браузер не сохранил место. После закрытия вкладки восстановить его не получится.');}
  }
  async request(path,body){
    const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(10000)});
    const value=await response.json().catch(()=>({error:'Сервер комнаты недоступен.'}));
    if(!response.ok)throw new Error(value.error||'Не удалось открыть комнату.');return value;
  }
  async start(rules){
    this.onStatus('Открываем комнату…');
    if(!this.roomId){
      const seat=await this.request('/api/rooms',{rules});this.roomId=seat.roomId;this.remember(seat);
      history.replaceState(null,'',`/online/?room=${this.roomId}`);
    }else{
      if(!/^[0-9a-f-]{36}$/.test(this.roomId))throw new Error('Ссылка на комнату повреждена.');
      try{const saved=JSON.parse(localStorage.getItem(this.seatKey()));if(saved?.token)this.remember(saved);}catch{}
    }
    const room=await this.request(`/api/rooms/${this.roomId}/state`);this.onRoom(room);
    if(this.token)this.connect();
    else this.onStatus(room.joined.red?'Оба места заняты.':'Друг приглашает вас за доску.');
  }
  async join(){
    const seat=await this.request(`/api/rooms/${this.roomId}/join`,{});this.remember(seat);this.connect();
  }
  connect(){
    if(this.closed||!this.token||this.socket?.readyState===WebSocket.OPEN||this.socket?.readyState===WebSocket.CONNECTING)return;
    clearTimeout(this.retry);this.connected=false;this.onStatus('Соединяемся…');
    const url=new URL(`/api/rooms/${this.roomId}/connect`,location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    const ws=new WebSocket(url);this.socket=ws;
    const authTimeout=setTimeout(()=>{if(!this.connected)ws.close();},12000);
    ws.onopen=()=>ws.send(JSON.stringify({type:'auth',token:this.token}));
    ws.onmessage=({data})=>{
      if(this.socket!==ws||data==='pong')return;
      let message;try{message=JSON.parse(data);}catch{return;}
      if(message.type==='error'){this.onError(message.message);return;}
      if(message.type!=='state')return;
      clearTimeout(authTimeout);clearTimeout(this.actionTimeout);this.connected=true;this.pending=false;this.attempt=0;
      this.owner=message.owner;this.revision=message.revision;this.onState(message);this.onStatus('Соединение установлено');
    };
    ws.onclose=event=>{
      clearTimeout(authTimeout);clearInterval(this.ping);clearTimeout(this.actionTimeout);
      if(this.socket!==ws)return;
      this.connected=false;this.pending=false;
      if([4001,4002,4004].includes(event.code)){
        this.closed=true;this.onStatus(event.code===4002?'Игра открыта в другой вкладке.':event.code===4004?'Срок жизни комнаты истёк.':'Не удалось восстановить место в комнате.');return;
      }
      this.onStatus('Связь прервалась. Восстанавливаем…');
      if(!this.closed)this.retry=setTimeout(()=>this.connect(),Math.min(8000,500*2**this.attempt++));
    };
    ws.onerror=()=>{};
    this.ping=setInterval(()=>{if(ws.readyState===WebSocket.OPEN)ws.send('ping');},30000);
  }
  act(action){
    if(!this.connected||this.pending)throw new Error('Дождитесь восстановления связи.');
    this.pending=true;
    this.socket.send(JSON.stringify({...action,revision:this.revision}));
    this.actionTimeout=setTimeout(()=>{this.onStatus('Проверяем подтверждение хода…');this.socket?.close();},7000);
  }
  inviteLink(){return `${location.origin}/online/?room=${this.roomId}`;}
  close(){this.closed=true;this.connected=false;clearTimeout(this.retry);clearTimeout(this.actionTimeout);clearInterval(this.ping);if(this.socket)this.socket.onclose=null;this.socket?.close();document.removeEventListener('visibilitychange',this.wake);}
}
