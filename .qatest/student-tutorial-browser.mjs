import puppeteer from 'puppeteer';
import fs from 'node:fs';
import { parse } from 'dotenv';

const env = Object.assign({}, ...['.env', '.env.local'].filter(fs.existsSync).map(file => parse(fs.readFileSync(file))));
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const authKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
export const userId = '11111111-1111-4111-8111-111111111111';
export const workoutId = '22222222-2222-4222-8222-222222222222';
const coachId = '33333333-3333-4333-8333-333333333333';
export const profile = { id:userId, full_name:'Aluno Demonstração QA', role:'student', status:'active', preferences:{focusMode:false}, avatar_url:null };
const student = { id:userId, coach_id:coachId, consultancy_expires_at:'2099-12-31T23:59:59Z', weight_kg:75, height_cm:175, birth_date:'1995-05-15', gender:'male' };
const workout = { id:workoutId, routine_id:'qa-routine', title:'Treino A', name:'Treino A', description:'Peito e costas', order_index:0 };
const item = { id:'qa-item', workout_id:workoutId, order_index:0, coach_notes:'Controle a descida e mantenha a postura.', exercise:{id:'qa-exercise', name:'Supino reto', video_url:'', description:'Mantenha os pés apoiados.', exercise_type:'reps'}, sets:[{id:'qa-set',set_order:1,type:'working',weight_target:20,reps_target:'8-12',rest_seconds:60,rpe_target:8,set_method:'dropset',drop_count:2}] };
export async function setupPage(browser,{width=375,height=812,activeWorkout=null,fixtures={},preloadStorage={}}={}) {
  // Every scenario needs its own origin storage and service worker registrations.
  const context=await browser.createBrowserContext();
  const page=await context.newPage();
  await page.setViewport({width,height});
  const errors=[], warnings=[], requests=[], writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error') errors.push(message.text()); if(message.type()==='warn') warnings.push(message.text());});
  await page.setRequestInterception(true);
  page.on('request',request=>{
    if(request.isInterceptResolutionHandled()) return;
    const url=new URL(request.url());
    if(url.origin===new URL(supabaseUrl).origin || url.pathname.startsWith('/api/')) {
      const method=request.method(), table=url.pathname.split('/').at(-1);
      requests.push({method,table,query:url.search});
      if(!['GET','HEAD','OPTIONS'].includes(method)) writes.push({method,table});
      let data=[];
      if(table==='profiles') data=url.searchParams.get('id')===`eq.${coachId}`?{full_name:'Coach QA',phone:null}:profile;
      if(table==='students_data') data=student;
      if(table==='coaches_data') data={subscription_expires_at:'2099-12-31T23:59:59Z'};
      if(table==='student_assignments') data={id:'qa-assignment',routine_id:'qa-routine',routines:{id:'qa-routine',name:'Rotina QA',description:'Rotina para validação',duration_weeks:8}};
      if(table==='workouts') data=url.searchParams.has('id')?workout:[workout];
      if(table==='workout_items') data=[item];
      if(table==='user') data={id:userId,email:'qa@example.invalid',aud:'authenticated',user_metadata:{role:'student'}};
      if(table==='workout_logs' && request.headers().accept?.includes('object')) data=null;
      if(Object.hasOwn(fixtures,table)) {
        const fixture=fixtures[table];
        data=typeof fixture==='function'?fixture(url,request):fixture;
      }
      const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range','content-range':'0-0/0'};
      request.respond({status:200,contentType:'application/json',headers,body:method==='OPTIONS'?'':JSON.stringify(data)});
    } else request.continue();
  });
  await page.evaluateOnNewDocument(({authKey,userId,profile,activeWorkout,preloadStorage})=>{
    const encode = value=>btoa(JSON.stringify(value)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_');
    const user={id:userId,email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{role:'student'}};
    const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:userId,exp:4102444800,role:'authenticated',aud:'authenticated'})}.qa-signature`;
    localStorage.setItem(authKey,JSON.stringify({access_token:token,refresh_token:'qa-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user}));
    localStorage.setItem(`fc_auth_profile_${userId}`,JSON.stringify({role:'student',status:'active',expiresAt:'2099-12-31T23:59:59Z',coachExpiresAt:'2099-12-31T23:59:59Z',preferences:profile.preferences}));
    if(activeWorkout) localStorage.setItem(`active_workout_${userId}`,JSON.stringify(activeWorkout));
    for(const [key,value] of Object.entries(preloadStorage))localStorage.setItem(key,value);
    const effects={storageWrites:[],indexedWrites:[],audioCalls:[],notifications:[],vibrations:[],wakeLocks:[]};
    window.__qaEffects=effects;
    for(const method of ['setItem','removeItem','clear']) {
      const original=Storage.prototype[method];
      Storage.prototype[method]=function(...args){effects.storageWrites.push({method,key:args[0]||null});return original.apply(this,args);};
    }
    if(window.IDBObjectStore)for(const method of ['add','put','delete','clear']) {
      const original=IDBObjectStore.prototype[method];
      IDBObjectStore.prototype[method]=function(...args){effects.indexedWrites.push({method,store:this.name});return original.apply(this,args);};
    }
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){effects.audioCalls.push({method:'media.play',tag:this.tagName});return play.apply(this,args);};
    for(const name of ['AudioContext','webkitAudioContext'])if(window[name]) {
      const Original=window[name];
      window[name]=new Proxy(Original,{construct(target,args){effects.audioCalls.push({method:name});return Reflect.construct(target,args);}});
    }
    if(window.Notification)window.Notification=new Proxy(window.Notification,{construct(target,args){effects.notifications.push({method:'Notification'});return Reflect.construct(target,args);}});
    if(navigator.vibrate){const vibrate=navigator.vibrate.bind(navigator);navigator.vibrate=(...args)=>{effects.vibrations.push(args);return vibrate(...args);};}
    if(navigator.wakeLock?.request){const request=navigator.wakeLock.request.bind(navigator.wakeLock);navigator.wakeLock.request=(...args)=>{effects.wakeLocks.push(args);return request(...args);};}
  },{authKey,userId,profile,activeWorkout,preloadStorage});
  return {page,errors,warnings,requests,writes};
}
export async function clickText(page,text) {
  const found=await page.evaluate(text=>{
    const el=[...document.querySelectorAll('button,a')].find(el=>el.innerText.trim()===text || el.getAttribute('aria-label')===text);
    if(!el) return false;
    el.scrollIntoView({block:'center'}); el.click();return true;
  },text);
  if(!found) throw new Error(`Control não encontrado: ${text}`);
}
if(process.argv.includes('--smoke')) {
 const browser=await puppeteer.launch({headless:true});
 try {
  const state=await setupPage(browser);
  await state.page.goto('http://127.0.0.1:3000/#/student/profile',{waitUntil:'networkidle0'});
  console.log(JSON.stringify({url:state.page.url(),body:(await state.page.$eval('body',el=>el.innerText)).slice(-2400),errors:state.errors,writes:state.writes},null,2));
  await state.page.screenshot({path:'.qatest/student-tutorial-profile-smoke.png'});
 } finally {await browser.close();}
}
