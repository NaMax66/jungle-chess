import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
if(!existsSync(new URL('../dist/index.html',import.meta.url)))await cp(new URL('../public/',import.meta.url),new URL('../dist/',import.meta.url),{recursive:true});
const runtime=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
if(!existsSync(runtime)){console.error('Сначала выполните npm install');process.exit(1);}
const children=[spawn(process.execPath,[runtime,'dev','--port','8787'],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,WRANGLER_SEND_METRICS:'false'}}),spawn(process.execPath,['server.mjs'],{cwd:root,stdio:'inherit',windowsHide:true})];
const stop=()=>{for(const child of children)child.kill();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const child of children)child.on('exit',code=>{if(code){stop();process.exitCode=code;}});
