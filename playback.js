import {fadeDuration} from './palette-fade.js';

export const MAX_PLAY_STEPS=16,MAX_PLAY_MS=300000;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function normalizeSteps(input,normalize) {
  if(!Array.isArray(input)||input.length<1||input.length>MAX_PLAY_STEPS)throw TypeError('Playback needs 1–16 steps');
  if(JSON.stringify(input).length>32768)throw TypeError('Playback steps are too large');
  let durationMs=0;
  const steps=Array.from(input,step=>{
    if(!step||typeof step!=='object'||Array.isArray(step)||Object.keys(step).some(key=>!['look','fadeMs','holdMs'].includes(key))||!Object.hasOwn(step,'look'))throw TypeError('Each step needs look, fadeMs and holdMs');
    const fadeMs=fadeDuration(step.fadeMs),holdMs=step.holdMs;
    if(!Number.isSafeInteger(holdMs)||holdMs<1000||holdMs>MAX_PLAY_MS)throw TypeError('holdMs must be 1000–300000 milliseconds');
    durationMs+=fadeMs+holdMs;
    const look=freeze(structuredClone(normalize(step.look)));
    return Object.freeze({look,fadeMs,holdMs});
  });
  if(durationMs>MAX_PLAY_MS)throw TypeError('Playback must finish within 300000 milliseconds');
  return Object.freeze({steps:Object.freeze(steps),durationMs});
}

// One finite program owns one existing look lease. No agent turn or polling
// keeps it alive. Completion releases the lease instead of replaying a snapshot.
export function createPlayback({makeLook,changed=()=>{},now=()=>performance.now(),
  delay=(fn,ms)=>setTimeout(fn,ms),clear=id=>clearTimeout(id),identify=()=>crypto.randomUUID()}) {
  let current=null;
  const state=job=>job?{id:job.id,name:job.name,status:job.status,step:job.index+1,total:job.plan.steps.length}:null;
  function finish(job,status) {
    if(!job||!['fading','holding'].includes(job.status))return;
    job.status=status;if(job.timer!==null)clear(job.timer);job.timer=null;
    if(current===job)current=null;
    job.lease?.dispose();changed();for(const fn of job.finished){try{fn();}catch{}}job.finished.clear();
  }
  function inspect(job,event) {
    if(current!==job||job.status!=='fading'||!job.lease)return;
    if(event?.status==='failed')return finish(job,'failed');
    if(!job.lease.active()||now()>job.deadline)return finish(job,'cancelled');
    if(job.lease.transition().status!=='idle')return;
    job.status='holding';changed();
    job.timer=delay(()=>{
      job.timer=null;
      if(current!==job||job.status!=='holding')return;
      if(!job.lease.active()||now()>job.deadline)return finish(job,'cancelled');
      if(job.index+1===job.plan.steps.length)return finish(job,'completed');
      job.index++;job.status='fading';const step=job.plan.steps[job.index];
      try{job.lease.update({...step.look,fadeMs:step.fadeMs});inspect(job);}
      catch{finish(job,'failed');}
    },job.plan.steps[job.index].holdMs);
  }
  return Object.freeze({
    start(plan,name='Animation') {
      const previous=current,job={id:identify(),name,plan,index:0,status:'fading',timer:null,lease:null,finished:new Set(),deadline:now()+plan.durationMs+MAX_PLAY_STEPS*100};
      current=job;
      try{const first=plan.steps[0];job.lease=makeLook({...first.look,fadeMs:first.fadeMs},event=>inspect(job,event));}
      catch(error){current=previous;throw error;}
      finish(previous,'replaced');inspect(job);changed();
      return Object.freeze({dispose:()=>finish(job,'cancelled'),state:()=>state(job),onFinish:fn=>{job.finished.add(fn);return ()=>job.finished.delete(fn);},restorationAppearance:()=>job.lease.restorationAppearance()});
    },
    state:()=>state(current),
    cancel:reason=>finish(current,reason??'cancelled'),
  });
}
