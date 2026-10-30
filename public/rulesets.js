// Versioned mechanics: saved games and search always carry the same snapshot.
const battle={id:'battle',version:1,name:'Битва зверей',ratAcrossShore:true,ratFromWaterTakesElephant:true,elephantTakesRat:true,ranks:{rat:1,cat:2,dog:3,wolf:4,leopard:5,tiger:6,lion:7,elephant:8}};
const classic={...battle,id:'classic-ymi',name:'Классика · YMI',ratAcrossShore:false,ratFromWaterTakesElephant:false,elephantTakesRat:false,ranks:{...battle.ranks,dog:4,wolf:3},source:'https://www.ymimports.com/pages/how-to-play-jungle'};
for(const rules of [battle,classic]){Object.freeze(rules.ranks);Object.freeze(rules);}
export const rulesets=Object.freeze({battle, 'classic-ymi':classic});
export function resolveRules(value='battle'){
  if(typeof value==='string'){
    if(!rulesets[value])throw new Error('Неизвестный набор правил');
    return structuredClone(rulesets[value]);
  }
  if(!value||value.version!==1||!rulesets[value.id])throw new Error('Неподдерживаемая версия правил');
  const expected=rulesets[value.id];
  for(const key of ['ratAcrossShore','ratFromWaterTakesElephant','elephantTakesRat'])if(value[key]!==expected[key])throw new Error('Изменённые правила требуют отдельной версии');
  for(const animal of Object.keys(expected.ranks))if(value.ranks?.[animal]!==expected.ranks[animal])throw new Error('Изменённые ранги требуют отдельной версии');
  return structuredClone(expected);
}
export const gameRules=state=>state.rules||rulesets.battle;
export const rankOf=(state,animal)=>gameRules(state).ranks[animal];
export function specialRulesText(state){
  return gameRules(state).id==='battle'
    ? 'Волк сильнее собаки. На суше слон и крыса берут друг друга. Крысы захватывают через берег в обе стороны; крыса из воды может взять слона на берегу.'
    : 'Редакция Yellow Mountain Imports: собака сильнее волка. Слон не берёт крысу вне своей ловушки. Захваты крысой через берег запрещены; две крысы могут сражаться, когда обе в воде или обе на суше.';
}
