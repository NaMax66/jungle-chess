import {chooseMove} from './bot-search.js';
self.onmessage=({data})=>{
  try{self.postMessage({requestId:data.requestId,move:chooseMove(data.state,data.options)});}
  catch{self.postMessage({requestId:data.requestId,error:'search-failed'});}
};
