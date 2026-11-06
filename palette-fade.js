// Finite input-hue fades. Every visible sample still goes through the role
// generator; final CSS colors are never interpolated independently of their inks.
const wrap = value => ((Math.round(value)%360)+360)%360;
const arc = (a,b) => ((b-a+540)%360)-180;
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
export function fadeDuration(value=0) {
  if(!Number.isInteger(value)||value<0||value>300000)
    throw new TypeError('fadeMs must be an integer from 0 to 300000');
  // Short changes are cuts; avoid a fast animated flashing mode.
  if(value>0&&value<1000)throw new TypeError('Animated fades must last at least 1000 milliseconds');
  return value;
}
export function canFade(from,to) {
  return from.theme==='bluepinkneon'&&to.theme==='bluepinkneon'
    &&['mode','appearance','neutral','surfaceOffset','neutralGround'].every(key=>from[key]===to[key])
    &&same(from.neutrals,to.neutrals);
}
export function fadeChoice(from,to,progress) {
  if(progress>=1)return structuredClone(to);
  if(progress<=0||!canFade(from,to))return structuredClone(from);
  const t=(1-Math.cos(Math.PI*progress))/2;
  const angle=(a,b)=>wrap(a+arc(a,b)*t);
  const rotation=angle(from.rotation,to.rotation);
  const next={...structuredClone(to),localName:null,rotation,
    hues:from.hues.map((h,index)=>wrap(angle(wrap(h+from.rotation),wrap(to.hues[index]+to.rotation))-rotation))};
  if(from.monoHue!==null||to.monoHue!==null)
    next.monoHue=wrap(angle(wrap((from.monoHue??from.hues[0])+from.rotation),wrap((to.monoHue??to.hues[0])+to.rotation))-rotation);
  return next;
}

// One scheduler per live handle. A non-top handle never computes invisible
// palettes. A hidden window and reduced motion finish as a cut; covering an
// older handle pauses it until that handle is visible again.
export function createPaletteFade({read,write,isTop,changed=()=>{},failed=()=>{},
  now=()=>performance.now(),request=fn=>requestAnimationFrame(fn),cancel=id=>cancelAnimationFrame(id)}) {
  let frame=null,job=null,closed=false;
  const unschedule=()=>{if(frame!==null)cancel(frame);frame=null;};
  const notify=()=>changed();
  const elapsed=()=>job?Math.min(job.duration,job.elapsed+(job.hidden?0:Math.max(0,now()-job.since))):0;
  const schedule=()=>{if(!closed&&job&&!job.hidden&&frame===null)frame=request(tick);};
  function tick() {
    frame=null;if(closed||!job||job.hidden)return;
    const time=now();
    // The engine solves both polarities. Bound rendering work to 12 samples/s.
    if(time-job.last<1000/12){schedule();return;}
    job.last=time;
    const p=elapsed()/job.duration;
    if(!isTop()){job.elapsed=elapsed();job.hidden=true;notify();return;}
    try {
      const next=fadeChoice(job.from,job.to,p);
      if(!same(next,read()))write(next);
    } catch(error){job=null;failed(error);notify();return;}
    if(p>=1){job=null;notify();}else schedule();
  }
  return {
    start(target,duration,{hidden=false,reduced=false,covered=false}={}) {
      if(closed)throw new Error('Look handle is inactive');
      duration=fadeDuration(duration);
      const from=structuredClone(read());
      // Polarity, mode and neutral/ground changes cannot safely fade through
      // arbitrary midpoints. Commit the complete target atomically instead.
      if(!duration||reduced||hidden||!canFade(from,target)) {
        write(structuredClone(target));unschedule();job=null;notify();return;
      }
      unschedule();job={from,to:structuredClone(target),duration,elapsed:0,since:now(),last:-Infinity,hidden:covered};
      notify();schedule();
    },
    visibility(hidden) {if(hidden)this.reduce();},
    reveal(hidden=false) {
      if(job&&job.hidden&&!hidden&&isTop()){job.hidden=false;job.since=now();schedule();}
    },
    reduce() {
      if(!job)return;const target=job.to;
      try {write(structuredClone(target));unschedule();job=null;notify();}
      catch(error){unschedule();job=null;failed(error);notify();}
    },
    state() {return job?{status:job.hidden?'paused':'fading',fadeMs:job.duration,elapsedMs:Math.round(elapsed()),target:structuredClone(job.to)}:{status:'idle'};},
    dispose(){closed=true;unschedule();job=null;},
  };
}
