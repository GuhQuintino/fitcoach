import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import {setupPage,userId} from './student-tutorial-browser.mjs';

const initialVersion=JSON.parse(fs.readFileSync('dist/version.json','utf8')).version;
let version=initialVersion;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/version.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version}));return;}
 let file=path.resolve('dist','.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(path.resolve('dist')+path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory())file=path.resolve('dist/index.html');
 const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.gif':'image/gif'}[path.extname(file)]||'application/octet-stream';
 res.setHeader('Content-Type',type);
 let body=fs.readFileSync(file);
 // Model a second release with a changed SW and matching compiled app build ID.
 if(file.endsWith('.js'))body=body.toString().replaceAll(initialVersion,version);
 res.end(body);
});
await new Promise(resolve=>server.listen(3110,'127.0.0.1',resolve));
const browser=await puppeteer.launch({headless:true});
const assertions=[];
try{
 const state=await setupPage(browser,{width:375,height:667});const page=state.page;
 const check=(name,pass)=>{assertions.push({name,pass});if(!pass)throw new Error(name);};
 await page.goto('http://127.0.0.1:3110/#/student/profile',{waitUntil:'networkidle0'});
 await page.waitForSelector('[data-testid="student-tutorial-start"]');
 console.log('Profile loaded; waiting for service worker');
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active,{timeout:20000});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 check('Primeira instalação não avisa atualização inexistente',!await page.$('[aria-label="Atualização do aplicativo"]'));
 const sentinel=JSON.stringify({userId,workoutId:'keep-active-session',exercises:[{sets:[{completed:false}]}],lastUpdate:new Date().toISOString()});
 await page.evaluate(({userId,sentinel})=>localStorage.setItem(`active_workout_${userId}`,sentinel),{userId,sentinel});
 let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
 version=initialVersion+'-release2';
 console.log('Installing simulated release 2');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForSelector('[aria-label="Atualização do aplicativo"]');
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting);
 check('Voltar ao app detecta nova publicação e oferece atualizar',true);
 check('Não recarrega antes do aceite',navigations===0);
 await page.screenshot({path:'.qatest/app-update-mobile.png'});
 await page.setOfflineMode(true);
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(el=>el.innerText==='Atualizar agora').click());
 await page.waitForSelector('[role="alert"]');
 check('Sem conexão mantém app aberto e oferece tentar novamente',navigations===0);
 await page.setOfflineMode(false);
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(el=>el.innerText==='Atualizar agora').click());
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Atualização do aplicativo"]'));
 await page.waitForSelector('[data-testid="student-tutorial-start"]');
 check('Aceitar ativa worker e recarrega uma vez',navigations===1);
 check('Sessão ativa preservada ao atualizar',await page.evaluate(({userId,sentinel})=>localStorage.getItem(`active_workout_${userId}`)===sentinel,{userId,sentinel}));
 check('Worker usa cache com versão da nova publicação',await page.evaluate(async version=>(await caches.keys()).includes(`fitcoach-${version}`),version));
 check('Mantém a rota atual',page.url().endsWith('#/student/profile'));
 const result={timestamp:new Date().toISOString(),assertions,errors:state.errors,writes:state.writes};
 fs.writeFileSync('.qatest/app-update-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
