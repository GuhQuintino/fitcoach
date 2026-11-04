import fs from 'node:fs';
import ts from 'typescript';
import {userId,profile} from './student-tutorial-browser.mjs';

const source=fs.readFileSync('utils/studentDemoFixtures.ts','utf8');
const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const demo=await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
export const routine=demo.STUDENT_DEMO_ROUTINE;
export const workouts=demo.STUDENT_DEMO_WORKOUTS;
export const exercises=demo.createStudentDemoExercises();
export const realFixtures={
 profiles:url=>url.searchParams.get('id')===`eq.${userId}`?{...profile,full_name:'Aluno Demonstração',avatar_url:'/icon-192.png'}:{full_name:'Gustavo',avatar_url:null,phone:null},
 students_data:{id:userId,coach_id:'33333333-3333-4333-8333-333333333333',consultancy_expires_at:'2099-12-31T23:59:59Z',weight_kg:70,height_cm:175,birth_date:'1995-01-01'},
 student_assignments:{id:'qa-assignment',routine_id:routine.id,routines:routine},
 workouts:url=>url.searchParams.has('id')?workouts[0]:workouts,
 workout_items:exercises.map((exercise,index)=>({id:exercise.workout_item_id,order_index:index,coach_notes:exercise.notes,exercise:{id:exercise.id,name:exercise.name,video_url:exercise.video_url,description:exercise.description,exercise_type:exercise.exercise_type},sets:exercise.sets.map((set,setIndex)=>({...set,set_order:setIndex+1}))})),
 workout_logs:url=>url.searchParams.get('select')?.includes('set_logs')?[{finished_at:'2026-11-01T12:00:00Z',set_logs:exercises.flatMap(exercise=>exercise.sets.map(()=>({exercise_id:exercise.id,weight_kg:20,reps_completed:10,rpe_actual:6,exercise:{exercise_type:'reps'}})))}]:url.searchParams.get('select')==='workout_id'?null:[],
};

export async function settle(page,selector) {
 await page.waitForSelector(selector);
 await page.waitForFunction(()=>getComputedStyle(document.body).fontFamily.includes('DM Sans'));
 return page.evaluate(async selector=>{
  const images=[...document.querySelectorAll(selector+' img')];
  await Promise.all(images.map(image=>image.decode().catch(()=>undefined)));
  const fontsReady=await Promise.race([document.fonts.ready.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),5000))]);
  const sample=()=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.x,r.y,r.width,r.height,scrollY].join(',');};
  let last=sample(),stable=0;
  for(let frame=0;frame<180&&stable<5;frame++) {await new Promise(requestAnimationFrame);const next=sample();stable=next===last?stable+1:0;last=next;}
  return {fontsReady,stableFrames:stable};
 },selector);
}

export async function rectangle(page,selector) {
 return page.$eval(selector,el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,x:r.x,y:r.y+scrollY,width:r.width,height:r.height,font:getComputedStyle(el).fontFamily,main:!!el.closest('main'),nav:!!document.querySelector('nav[aria-label="Navegação Principal"]')};});
}

export function seedDemoSafety() {
 const lastUpdate=new Date(Date.now()-5*3600000).toISOString();
 const active=JSON.stringify({userId,workoutId:'qa-real-stale',exercises:[{id:'keep-real',sets:[{completed:true,weight:'42'},{completed:true},{completed:true}]}],startTime:new Date(Date.now()-6*3600000).toISOString(),lastUpdate,workoutSeconds:1200,isWorkoutPaused:true});
 const queue=JSON.stringify([{id:'qa-offline-pending',type:'workout_complete',payload:{workoutLog:{student_id:userId,workout_id:null,started_at:'2026-11-01T12:00:00Z',finished_at:'2026-11-01T13:00:00Z',effort_rating:7},setLogs:[],exerciseFeedbacks:[]},createdAt:lastUpdate,retryCount:0}]);
 return {[`active_workout_${userId}`]:active,active_workout:active,fc_offline_sync_queue:queue,[`fc_cache_dashboard_${userId}`]:JSON.stringify({data:{sentinel:'dashboard-cache-original'},cachedAt:1}),[`fc_cache_selection_${userId}`]:JSON.stringify({data:{sentinel:'selection-cache-original'},cachedAt:1}),['fc_cache_workout_tutorial-demo']:JSON.stringify({data:{sentinel:'workout-cache-original'},cachedAt:1})};
}
