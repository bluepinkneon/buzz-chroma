export const AGENT_PREFERENCES_KEY='com.ranveer.bluepinkneon:agents:v2';
const LEGACY_KEY='com.ranveer.bluepinkneon:agents:v1';
// One device-local preference; tool registration belongs to Buzz.
export function agentPreferences(manager,{storage,changed=()=>{}}={}) {
  let enabled=Boolean(manager.getState().available),notice='',closed=false,generation=0;
  try {
    if(storage===undefined)storage=localStorage;
    const raw=storage.getItem(AGENT_PREFERENCES_KEY);
    if(raw!==null) {
      const saved=JSON.parse(raw);
      if(!saved||typeof saved!=='object'||Array.isArray(saved)||Object.keys(saved).length!==1||typeof saved.enabled!=='boolean')throw Error('invalid preferences');
      enabled=saved.enabled;
    } else {
      const legacy=storage.getItem(LEGACY_KEY);
      if(legacy!==null) {
        const saved=JSON.parse(legacy);
        if(!saved||typeof saved!=='object'||Array.isArray(saved)||Object.keys(saved).length!==2||typeof saved.native!=='boolean'||typeof saved.external!=='boolean')throw Error('invalid preferences');
        enabled=saved.native;
      }
    }
  } catch {enabled=false;notice='Could not read agent access preferences. Agent tools are off until you choose.';}
  const apply=async()=>{
    const current=++generation;
    try{await manager.set(enabled&&manager.getState().available);}
    catch{if(!closed&&current===generation){notice='Could not change agent access. Check the status and try again.';changed();}}
  };
  return {
    get:()=>enabled,notice:()=>notice,
    start(){return enabled?apply():Promise.resolve();},
    async set(value) {
      if(closed)throw Error('Agent settings are inactive');
      if(typeof value!=='boolean')throw TypeError('Expected an agent-access boolean');
      enabled=value;notice='';
      try{storage.setItem(AGENT_PREFERENCES_KEY,JSON.stringify({enabled}));}
      catch{notice='Agent access changed for this session, but could not be saved on this device.';}
      changed();await apply();
    },
    async dispose(){closed=true;await manager.dispose();},
  };
}
