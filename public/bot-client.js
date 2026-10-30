import {baseline,validateWeights} from './bot-search.js';
export class BotClient{
  constructor(){this.sequence=0;this.worker=null;this.pending=null;}
  cancel(){
    this.sequence++;this.worker?.terminate();this.worker=null;
    if(this.pending){this.pending.resolve(null);this.pending=null;}
  }
  choose(state,options){
    this.cancel();const requestId=this.sequence;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.worker?.terminate();this.worker=null;this.pending=null;reject(new Error('Бот не успел ответить'));},12000);
      this.pending={resolve:value=>{clearTimeout(timer);resolve(value);}};
      const fail=()=>{if(requestId!==this.sequence)return;clearTimeout(timer);this.worker?.terminate();this.worker=null;this.pending=null;reject(new Error('Не удалось запустить бота'));};
      try{
        this.worker=new Worker('/bot-worker.js',{type:'module'});
        this.worker.onmessage=({data})=>{
          if(data.requestId!==this.sequence)return;
          if(data.error){fail();return;}
          const done=this.pending;this.pending=null;clearTimeout(timer);done?.resolve(data.move);
          this.worker?.terminate();this.worker=null;
        };
        this.worker.onerror=fail;
        this.worker.postMessage({requestId,state,options});
      }catch{fail();}
    });
  }
}
export async function loadWeights(rules){
  try{
    const response=await fetch('/bot/weights-v2.json',{signal:AbortSignal.timeout(2500)});
    if(response.ok)return validateWeights(await response.json(),rules);
  }catch{}
  return baseline;
}
