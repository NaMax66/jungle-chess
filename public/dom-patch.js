// Preserve decoded images, SVG animations and compositor layers on no-op renders.
const markup=new WeakMap();
export function patchHTML(element,html){
  if(markup.get(element)===html)return;
  element.innerHTML=html;markup.set(element,html);
}
export function patchText(element,text){if(element.textContent!==String(text))element.textContent=text;}
export function patchAttribute(element,name,value){
  if(element.getAttribute(name)!==String(value))element.setAttribute(name,String(value));
}
export function placeBefore(parent,node,anchor=null){
  if(node===anchor||(node.parentNode===parent&&node.nextSibling===anchor))return;
  parent.insertBefore(node,anchor);
}
