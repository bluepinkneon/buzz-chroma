export const AGENT_PREFERENCES_KEY='com.ranveer.bluepinkneon:agents:v1';
// Only the user's opt-in booleans are stored here. Connections and credentials
// belong entirely to Buzz's host/helper, never to plugin preferences.
export function agentPreferences(manager,{storage=localStorage,changed=()=>{}}={}) {
  let enabled={native:false,external:false},notice='',closed=false,generation=0;
  try {
    const raw=storage.getItem(AGENT_PREFERENCES_KEY);
    if(raw!==null) {
      const saved=JSON.parse(raw);
      if(!saved||typeof saved!=='object'||Array.isArray(saved)||Object.keys(saved).length!==2||typeof saved.native!=='boolean'||typeof saved.external!=='boolean')throw Error('invalid preferences');
      enabled={native:saved.native,external:saved.external};
    }
  } catch {notice='Could not read agent access preferences. Both connections are off until you choose.';}
  const apply=async()=>{
    const current=++generation;
    try{await manager.set({...enabled});}
    catch{if(!closed&&current===generation){notice='Could not change agent access. Check the connection status and try again.';changed();}}
  };
  return {
    get:()=>({...enabled}),
    notice:()=>notice,
    start(){if(enabled.native||enabled.external)return apply();return Promise.resolve();},
    async set(patch) {
      if(closed)throw Error('Agent settings are inactive');
      if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!['native','external'].includes(k)||typeof patch[k]!=='boolean'))throw TypeError('Expected agent access booleans');
      enabled={...enabled,...patch};notice='';
      try{storage.setItem(AGENT_PREFERENCES_KEY,JSON.stringify(enabled));}
      catch{notice='Agent access changed for this session, but could not be saved on this device.';}
      changed();await apply();
    },
    async dispose(){closed=true;await manager.dispose();},
  };
}
