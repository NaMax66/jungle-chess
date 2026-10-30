import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,relative,isAbsolute} from 'node:path';

const root=resolve(process.argv.includes('--dist')?'dist':'public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.json':'application/json; charset=utf-8'};

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/rooms')){
      const proxy=http.request({hostname:'127.0.0.1',port:8787,path:req.url,method:req.method,headers:req.headers},upstream=>{res.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(res);});
      proxy.on('error',()=>{res.writeHead(503,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Локальный сервер комнат не запущен. Выполните npm run dev:rooms.'}));});req.pipe(proxy);return;
    }
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
});
server.on('upgrade',(req,socket,head)=>{
  if(!req.url.startsWith('/api/rooms/')){socket.destroy();return;}
  const proxy=http.request({hostname:'127.0.0.1',port:8787,path:req.url,method:req.method,headers:req.headers});
  proxy.on('upgrade',(response,upstream,upstreamHead)=>{
    socket.write(`HTTP/1.1 ${response.statusCode} Switching Protocols\r\n`+Object.entries(response.headers).map(([key,value])=>`${key}: ${value}`).join('\r\n')+'\r\n\r\n');
    if(upstreamHead.length)socket.write(upstreamHead);if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);
    socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());
  });
  proxy.on('response',response=>{socket.end(`HTTP/1.1 ${response.statusCode} Error\r\nConnection: close\r\n\r\n`);});
  proxy.on('error',()=>socket.destroy());proxy.end();
});
server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('Local: http://localhost:'+(Number(process.env.PORT)||8080)));
