import puppeteer from 'puppeteer';
import fs from 'node:fs';
import {setupPage,clickText,userId,workoutId} from './student-tutorial-browser.mjs';
import {realFixtures,settle,rectangle,seedDemoSafety} from './student-tutorial-real-utils.mjs';
const browser=await puppeteer.launch({headless:true});
const results=[];
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3001';
try {
 for(const [width,height,theme] of [[375,667,'light'],[768,1024,'dark'],[1440,900,'dark']]) {
  const normalRects={};
  for(const [route,steps] of [['/student/dashboard',[0]],['/student/selection',[1]],[`/student/workout/${workoutId}`,[2,3,4,5,6]]]) {
   const normal=await setupPage(browser,{width,height,fixtures:realFixtures,preloadStorage:{fc_pwa_install_dismissed_until:'2099-12-31T23:59:59Z'}});
   await normal.page.evaluateOnNewDocument(theme=>localStorage.setItem('theme',theme),theme);
   await normal.page.goto(base+'/#'+route,{waitUntil:'networkidle0'});
   await settle(normal.page,`[data-tutorial-target="${steps[0]}"]`);
   for(const step of steps)normalRects[step]=await rectangle(normal.page,`[data-tutorial-target="${step}"]`);
   await normal.page.screenshot({path:`.qatest/student-tutorial-real-${width}-baseline-${steps[0]}.png`});
   await normal.page.close();
  }
  const safety=seedDemoSafety();
  const state=await setupPage(browser,{width,height,preloadStorage:safety});const page=state.page;
  await page.evaluateOnNewDocument(theme=>localStorage.setItem('theme',theme),theme);
  await page.goto(base+'/#/student/dashboard?tutorial=0',{waitUntil:'networkidle0'});
  const assertions=[];
  async function check(name,pass,detail){assertions.push({name,pass,...detail});if(!pass){await page.screenshot({path:`.qatest/student-tutorial-real-failure-${width}.png`});console.log(JSON.stringify({name,detail}));if(!name.includes('spotlight e explicação'))throw new Error(`${width} ${name}`);}}
  for(let step=0;step<7;step++) {
   const selector=`[data-tutorial-target="${step}"]`;
   await settle(page,selector);await page.waitForSelector('[data-tutorial-spotlight]');
   const actual=await rectangle(page,selector),expected=normalRects[step];
   const delta=Object.fromEntries(['x','y','width','height'].map(key=>[key,Math.abs(actual[key]-expected[key])]));
   await check(`Passo${step+1}: mesmo componente/layout da tela normal`,actual.main&&actual.nav&&actual.tag===expected.tag&&Object.values(delta).every(value=>value<=1.1),{actual,expected,delta});
   const geometry=await page.evaluate(step=>{
    const target=document.querySelector(`[data-tutorial-target="${step}"]`).getBoundingClientRect(),panel=document.querySelector('.tutorial-panel').getBoundingClientRect();
    const overlap=target.left<panel.right&&target.right>panel.left&&target.top<panel.bottom&&target.bottom>panel.top;
    return {target:{x:target.x,y:target.y,width:target.width,height:target.height},panel:{x:panel.x,y:panel.y,width:panel.width,height:panel.height},overlap,visible:target.top>=53&&target.bottom<=innerHeight,panelVisible:panel.top>=53&&panel.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,blurMasks:[...document.querySelectorAll('.tutorial-mask')].length===4&&[...document.querySelectorAll('.tutorial-mask')].every(el=>getComputedStyle(el).backdropFilter.includes('blur')),focusNext:document.activeElement===document.querySelector('[data-tutorial-next]')};
   },step);
   await check(`Passo${step+1}: spotlight e explicação visíveis sem sobrepor`,!geometry.overlap&&geometry.visible&&geometry.panelVisible&&!geometry.overflow,{geometry});
   await check(`Passo${step+1}: fundo borrado e foco no Próximo`,geometry.blurMasks&&geometry.focusNext);
   await page.screenshot({path:`.qatest/student-tutorial-real-${width}-step${step+1}.png`});
   if(step===0) {
    const source=await page.$eval(selector,el=>({tag:el.tagName,text:el.innerText,href:el.getAttribute('href')}));
    await check('Card real da dashboard é Link de treinos',source.tag==='A'&&source.text.includes('Toque para ver seus treinos'));
    await page.click(selector);
   } else if(step===1) {
    await page.click(selector);
   } else if(step===2) {
    await clickText(page,'Ver detalhes de Supino reto com barra');
    await check('Detalhes reais do exercício expandem no player',await page.$eval(selector,el=>el.innerText.includes('Apoie os pés')));
    await clickText(page,'Recolher detalhes de Supino reto com barra');
    await clickText(page,'Ver vídeo de demonstração de Supino reto com barra');
    await page.waitForSelector('[aria-label="Vídeo demonstrativo: Supino reto com barra"]');
    await page.waitForFunction(()=>document.querySelector('.tutorial-panel').hidden);
    await check('Vídeo usa modal real e esconde tutorial',await page.$eval('.tutorial-panel',el=>el.hidden));
    await settle(page,'[aria-label="Vídeo demonstrativo: Supino reto com barra"]');
    await page.screenshot({path:`.qatest/student-tutorial-real-${width}-video.png`});
    await page.keyboard.press('Escape');
    await page.waitForSelector('[aria-label="Vídeo demonstrativo: Supino reto com barra"]',{hidden:true});
    await page.waitForFunction(()=>!document.querySelector('.tutorial-panel').hidden);
    await check('Escape fecha vídeo e mantém tutorial',await page.$eval('.tutorial-panel',el=>!el.hidden));
    await clickText(page,'Próximo');
   } else if(step===4) {
    await clickText(page,'Série de aquecimento - Ver detalhes');
    await page.waitForSelector('.tutorial-real-screen [role="dialog"]');
    await check('Ícone abre guia real de séries',await page.$eval('.tutorial-real-screen [role="dialog"]',el=>el.innerText.toLowerCase().includes('aquecimento')));
    const close=await page.$('.tutorial-real-screen [role="dialog"] button[aria-label*="Fechar"]');await close.click();
    await page.waitForSelector('.tutorial-real-screen [role="dialog"]',{hidden:true});
    await clickText(page,'Próximo');
   } else if(step===5) {
    for(const [aria,value] of [['Carga em kg para série 1','25'],['Repetições para série 1','12']]) {const input=await page.$(`[aria-label="${aria}"]`);await input.click({clickCount:3});await input.type(value);}
    await clickText(page,'Definir PSE para série 1');
    await page.waitForSelector('[aria-label="Selecionar PSE 7"]');
    await page.waitForFunction(()=>document.querySelector('.tutorial-panel').hidden);
    await check('PSE usa seletor real em modal',await page.$eval('.tutorial-panel',el=>el.hidden));
    await clickText(page,'Selecionar PSE 7');
    await page.waitForSelector('.tutorial-real-screen [role="dialog"]',{hidden:true});
    await clickText(page,'Concluir série 1 de Supino reto com barra');
    await check('Check marca série real somente em memória',!!await page.$('[aria-label="Desmarcar série 1 de Supino reto com barra"]'));
    await check('Demo não inicia descanso',!await page.$('[aria-label="Cronômetro de descanso"]'));
    await clickText(page,'Próximo');
   } else if(step===6) {
    await page.type('[data-tutorial-target="6"] textarea','Prática de feedback nas telas reais.');
    await clickText(page,'Voltar');await settle(page,'[data-tutorial-target="5"]');
    await check('Voltar preserva valores reais praticados',await page.$eval('[aria-label="Carga em kg para série 1"]',el=>el.value==='25'));
    await clickText(page,'Próximo');await settle(page,'[data-tutorial-target="6"]');
   } else await clickText(page,'Próximo');
  }
  if(width===375){await page.evaluate(()=>{window.dispatchEvent(new Event('online'));document.dispatchEvent(new Event('visibilitychange'));});await new Promise(resolve=>setTimeout(resolve,15500));}
  const effects=await page.evaluate(()=>window.__qaEffects);
  const dataWrites=effects.storageWrites.filter(write=>write.key?.startsWith('active_workout')||write.key?.startsWith('fc_cache_')||write.key==='fc_offline_sync_queue');
  await check('Nenhuma escrita em cache, sessão, fila ou IndexedDB',dataWrites.length===0&&effects.indexedWrites.length===0,{effects});
  await check('Sem áudio, notificação, vibração ou wakelock na demo',!effects.audioCalls.length&&!effects.notifications.length&&!effects.vibrations.length&&!effects.wakeLocks.length);
  await check('Nenhuma mutação remota durante tutorial',state.writes.length===0,{writes:state.writes});
  await check('Treino stale, fila pendente e caches preservados byte a byte',await page.evaluate(safety=>Object.entries(safety).every(([key,value])=>localStorage.getItem(key)===value),safety));
  await page.focus('[data-tutorial-next]');await page.keyboard.press('Tab');
  await check('Tab circula para primeiro controle ativo do tutorial',await page.evaluate(()=>{
   const controls=[...document.querySelector('.student-tutorial').querySelectorAll('button,input,textarea,a[href],[tabindex="0"]')].filter(el=>!el.closest('[inert]')&&el.getClientRects().length>0&&!el.disabled);
   return document.activeElement===controls[0];
  }));
  await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
  await check('Shift+Tab circula para próximo',await page.$eval('[data-tutorial-next]',el=>document.activeElement===el));
  const demoWrites=[...state.writes];
  // The synthetic pending queue is only a demo safety probe. Remove it before returning
  // to the live Profile, where normal automatic sync is expected and outside this test.
  await page.evaluate(()=>localStorage.removeItem('fc_offline_sync_queue'));
  await clickText(page,'Concluir tutorial');await page.waitForSelector('[data-testid="student-tutorial-start"]');
  await page.waitForFunction(()=>document.activeElement===document.querySelector('[data-testid="student-tutorial-start"]'));
  await check('Retorno ao Profile restaura foco',await page.$eval('[data-testid="student-tutorial-start"]',el=>document.activeElement===el));
  await page.click('[data-testid="student-tutorial-start"]');await settle(page,'[data-tutorial-target="0"]');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>location.hash==='#/student/profile');
  await check('Reiniciar e sair pelo Escape continuam disponíveis',true);
  results.push({viewport:`${width}x${height}`,theme,assertions,errors:state.errors,effects,writes:demoWrites});await page.close();
 }
 fs.writeFileSync('.qatest/student-tutorial-real-results.json',JSON.stringify({timestamp:new Date().toISOString(),results},null,2));
 if(results.some(result=>result.assertions.some(assertion=>!assertion.pass)))process.exitCode=1;
 console.log(JSON.stringify(results.map(result=>({viewport:result.viewport,assertions:result.assertions.length,errors:result.errors,writes:result.writes})),null,2));
} catch(error) {
 const page=(await browser.pages()).at(-1);const body=await page.$eval('body',el=>el.innerText);await page.screenshot({path:'.qatest/student-tutorial-real-last-failure.png'});
 fs.writeFileSync('.qatest/student-tutorial-real-failure.json',JSON.stringify({error:error.message,url:page.url(),body,results},null,2));console.log(body.slice(-1800));throw error;
} finally {await browser.close();}
