// Buzz 0.7.9 re-reads these three computed colors when the root's style
// attribute changes. Publish the real values there, rather than synthetic
// resize events or a second terminal theme. ANSI is not consumed by that host.
const TERMINAL_ROLES = ["--surface-panel", "--text-standard", "--affordance-accent"];
export function ownTerminalColors(style) {
  const owned = new Map();
  const read = name => ({value:style.getPropertyValue(name),priority:style.getPropertyPriority(name)});
  const same = (a,b) => a.value===b.value&&a.priority===b.priority;
  return {
    apply(roles) {
      for(const name of TERMINAL_ROLES) {
        const current=read(name),previous=owned.get(name);
        // A foreign writer's latest value becomes the restoration baseline.
        const baseline=previous&&same(current,previous.applied)?previous.baseline:current;
        const applied={value:roles[name],priority:"important"};
        if(!same(current,applied))style.setProperty(name,applied.value,applied.priority);
        owned.set(name,{baseline,applied});
      }
    },
    restore() {
      for(const [name,{baseline,applied}] of owned) {
        if(!same(read(name),applied))continue;
        if(baseline.value)style.setProperty(name,baseline.value,baseline.priority);
        else style.removeProperty(name);
      }
      owned.clear();
    },
  };
}
