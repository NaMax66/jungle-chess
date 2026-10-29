import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve(process.argv.includes('--dist')?'dist':'public');
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(['/healthz','/readyz'].includes(url.pathname)){res.end('ok');return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/')&&!path.startsWith(root+'\\')){res.writeHead(403).end();return;}const body=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(body);}catch{res.writeHead(404).end('Not found');}}).listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('Local: http://localhost:'+(Number(process.env.PORT)||8080)));

