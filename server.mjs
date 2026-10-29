import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,relative,isAbsolute} from 'node:path';

const root=resolve(process.argv.includes('--dist')?'dist':'public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};

http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(['/healthz','/readyz'].includes(url.pathname)){res.end('ok');return;}
    // Mirror this project's exact-path Cloudflare redirects during local review.
    const rules=await readFile(resolve(root,'_redirects'),'utf8');
    const redirect=rules.split(/\r?\n/).map(line=>line.trim().split(/\s+/)).find(([source])=>source===url.pathname);
    if(redirect){
      res.writeHead(Number(redirect[2]||302),{Location:redirect[1]+url.search,'Cache-Control':'no-store'}).end();
      return;
    }
    const pathname=decodeURIComponent(url.pathname);
    const path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    const within=relative(root,path);
    if(within.startsWith('..')||isAbsolute(within)){res.writeHead(403).end();return;}
    const body=await readFile(path);
    res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-cache');
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404).end('Not found');}
}).listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('Local: http://localhost:'+(Number(process.env.PORT)||8080)));
