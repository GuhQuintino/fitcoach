import puppeteer from 'puppeteer';
import fs from 'node:fs';
import {setupPage,clickText,workoutId} from './student-tutorial-browser.mjs';
const browser=await puppeteer.launch({headless:true});
try {
 const state=await setupPage(browser,{width:1440,height:900});
 const page=state.page;
 await page.goto(`http://127.0.0.1:3000/#/student/workout/${workoutId}`,{waitUntil:'networkidle0'});
 const assertions=[];
 async function modalVisible(){return !!await page.$('[aria-label="Finalizar e avaliar treino"]');}
 async function check(name,pass){assertions.push({name,pass});if(!pass)throw new Error(name);}
 await check('Treino inicialmente incompleto não abre modal',!await modalVisible());
 await clickText(page,'Concluir série 1 de Supino reto');
 await new Promise(resolve=>setTimeout(resolve,200));
 await check('Mãe concluída com drops pendentes não abre modal',!await modalVisible());
 await clickText(page,'Concluir Drop 1');
 await new Promise(resolve=>setTimeout(resolve,200));
 await check('Primeiro drop concluído ainda não abre modal',!await modalVisible());
 await clickText(page,'Concluir Drop 2');
 await page.waitForSelector('[aria-label="Finalizar e avaliar treino"]');
 await check('Último drop abre mesmo modal da conclusão manual',await modalVisible());
 await page.screenshot({path:'.qatest/student-tutorial-autocomplete-modal.png'});
 await clickText(page,'Continuar treinando');
 await new Promise(resolve=>setTimeout(resolve,1200));
 await check('Cancelar não reabre automaticamente',!await modalVisible());
 await clickText(page,'Concluir treino e abrir resumo');
 await check('Conclusão manual continua disponível após cancelar',await modalVisible());
 await check('Abrir avaliação não grava dados remotos',state.writes.length===0);
 const result={assertions,errors:state.errors,writes:state.writes};
 fs.writeFileSync('.qatest/student-tutorial-autocomplete-results.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
 await page.screenshot({path:'.qatest/student-tutorial-autocomplete-initial.png'});
} finally {await browser.close();}
