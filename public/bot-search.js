import {animals,legalMoves,move,other,terrain} from './engine.js';
import {gameRules} from './rulesets.js';

// This small, versioned evaluation contract can later be supplied by the factory.
export const baseline={schemaVersion:1,version:'baseline-1',rulesets:['battle@1','classic-ymi@1'],material:{rat:140,cat:180,dog:240,wolf:280,leopard:360,tiger:510,lion:570,elephant:650},progress:7,mobility:2,trap:80,denPressure:65};
export const levels={easy:{name:'Лёгкий',depth:2,nodes:1800,ms:180,variation:55},medium:{name:'Средний',depth:4,nodes:14000,ms:650,variation:12},hard:{name:'Сложный',depth:6,nodes:60000,ms:1500,variation:0}};
export function validateWeights(value,rules){
  const key=`${rules.id}@${rules.version}`;
  if(value?.schemaVersion!==1||typeof value.version!=='string'||value.version.length>80||!value.rulesets?.includes(key))return baseline;
  for(const id of Object.keys(baseline.material))if(!Number.isFinite(value.material?.[id])||value.material[id]<1||value.material[id]>5000)return baseline;
  for(const id of ['progress','mobility','trap','denPressure'])if(!Number.isFinite(value[id])||value[id]<0||value[id]>1000)return baseline;
  return value;
}
export function allMoves(s){
  return s.pieces.filter(p=>p.owner===s.currentPlayer).flatMap(p=>legalMoves(s,p.id).map(m=>({id:p.id,...m})));
}
function evaluate(s,weights){
  if(s.status==='finished')return s.winner?(s.winner===s.currentPlayer?100000:-100000):0;
  const us=s.currentPlayer;
  let score=0;
  for(const p of s.pieces){
    const sign=p.owner===us?1:-1;
    const distance=Math.abs(p.x-3)+Math.abs(p.y-(p.owner==='blue'?0:8));
    const t=terrain(p.x,p.y),trapped=t.type==='trap'&&t.owner!==p.owner;
    let value=weights.material[p.animal]+(rankBonus(s,p))*60+(11-distance)*weights.progress;
    if(distance<=2)value+=(3-distance)*weights.denPressure;
    if(trapped)value-=weights.trap;
    score+=sign*value;
  }
  for(const owner of [us,other(us)]){
    const view={...s,currentPlayer:owner};
    const moves=allMoves(view);
    score+=(owner===us?1:-1)*moves.length*weights.mobility;
    // Legal threats include shoreline, traps and jumps from this exact ruleset.
    const threatened=new Set(moves.map(m=>m.capture).filter(Boolean));
    for(const id of threatened){
      const victim=s.pieces.find(p=>p.id===id);
      score+=(owner===us?1:-1)*weights.material[victim.animal]*.22;
    }
  }
  return score;
}
const rankBonus=(s,p)=>gameRules(s).ranks[p.animal]-animals[p.animal].rank;
function order(s,moves){
  const value=m=>{
    const p=s.pieces.find(p=>p.id===m.id),target=s.pieces.find(p=>p.id===m.capture);
    return (terrain(m.x,m.y).type==='den'?100000:0)+(target?baseline.material[target.animal]*10:0)-Math.abs(m.x-3)-Math.abs(m.y-(p.owner==='blue'?0:8));
  };
  return moves.map(m=>({m,value:value(m)})).sort((a,b)=>b.value-a.value).map(item=>item.m);
}
export function chooseMove(state,{difficulty='medium',weights=baseline,random=Math.random,maxMs,maxNodes}={}){
  if(state.status!=='playing')return null;
  weights=validateWeights(weights,gameRules(state));
  const level=levels[difficulty]||levels.medium;
  const started=performance.now(),deadline=started+(maxMs??level.ms),budget=maxNodes??level.nodes;
  let nodes=0,completedDepth=0;
  const aborted=Symbol('budget');
  const search=(s,depth,alpha,beta,ply)=>{
    if(++nodes>budget||(nodes%32===0&&performance.now()>deadline))throw aborted;
    if(s.status==='finished')return s.winner?(s.winner===s.currentPlayer?100000-ply:-100000+ply):0;
    if(depth===0)return evaluate(s,weights);
    let best=-Infinity;
    for(const m of order(s,allMoves(s))){
      const next=move(s,m.id,m.x,m.y,{recordHistory:false});
      const score=-search(next,depth-1,-beta,-alpha,ply+1);
      best=Math.max(best,score);alpha=Math.max(alpha,score);
      if(alpha>=beta)break;
    }
    return best===-Infinity?-100000+ply:best;
  };
  const moves=order(state,allMoves(state));
  if(!moves.length)return null;
  // Always recognize an immediate win, even if a tiny device exhausts its budget.
  for(const m of moves){
    const next=move(state,m.id,m.x,m.y,{recordHistory:false});
    if(next.status==='finished'&&next.winner===state.currentPlayer)return {...m,depth:1,nodes};
  }
  let candidates=[{...moves[0],score:-Infinity}];
  for(let depth=1;depth<=level.depth;depth++){
    try{
      const scored=[];
      for(const m of moves){
        const next=move(state,m.id,m.x,m.y,{recordHistory:false});
        scored.push({...m,score:-search(next,depth-1,-Infinity,Infinity,1)});
      }
      scored.sort((a,b)=>b.score-a.score);candidates=scored;completedDepth=depth;
    }catch(error){if(error!==aborted)throw error;break;}
    if(performance.now()>deadline||Math.abs(candidates[0].score)>90000)break;
  }
  const best=candidates[0].score;
  const pool=candidates.filter(m=>m.score>=best-level.variation);
  const chosen=pool[Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length))]||candidates[0];
  return {...chosen,depth:completedDepth,nodes};
}
