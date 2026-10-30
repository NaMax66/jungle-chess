import {rulesets} from './rulesets.js';
const rules=document.getElementById('lobby-rules');
const difficulty=document.getElementById('lobby-difficulty');
const update=()=>{
  const rulesId=rulesets[rules.value]?rules.value:'battle';
  document.getElementById('play-local').href=`/local/?rules=${rulesId}`;
  document.getElementById('play-online').href=`/online/?rules=${rulesId}`;
  document.getElementById('play-bot').href=`/bot/?rules=${rulesId}&difficulty=${difficulty.value}`;
};
rules.addEventListener('change',update);difficulty.addEventListener('change',update);update();
