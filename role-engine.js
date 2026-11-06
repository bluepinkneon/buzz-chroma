// Independent role-engine prototype. Source palette arrays are never mutated.
// NEW colors gamut-map by reducing C at fixed OKLCH L and h before 8-bit rounding.
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const radians=h=>h*Math.PI/180;
function linearRgb(l,c,h) {
  const a=c*Math.cos(radians(h)), b=c*Math.sin(radians(h));
  const x=(l+.3963377774*a+.2158037573*b)**3;
  const y=(l-.1055613458*a-.0638541728*b)**3;
  const z=(l-.0894841775*a-1.291485548*b)**3;
  return [4.0767416621*x-3.3077115913*y+.2309699292*z,
    -1.2684380046*x+2.6097574011*y-.3413193965*z,
    -.0041960863*x-.7034186147*y+1.707614701*z];
}
export function oklchHex(l,c,h) {
  l=clamp(l); c=Math.max(0,c);
  const inGamut=rgb=>rgb.every(v=>v>=-1e-9&&v<=1+1e-9);
  if (!inGamut(linearRgb(l,c,h))) {
    let lo=0,hi=c;
    for(let i=0;i<18;i++) { const mid=(lo+hi)/2;
      if(inGamut(linearRgb(l,mid,h))) lo=mid; else hi=mid;
    }
    c=lo;
  }
  const toByte=v=>Math.round(clamp(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055)*255);
  return "#"+linearRgb(l,c,h).map(v=>toByte(v).toString(16).padStart(2,"0")).join("");
}
function rgb(hex) { return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255); }
function linear(v) { return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }
export function hexOklch(hex) {
  const [r,g,b]=rgb(hex).map(linear);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  const L=.2104542553*l+.793617785*m-.0040720468*s;
  const a=1.9779984951*l-2.428592205*m+.4505937099*s;
  const bb=.0259040371*l+.7827717662*m-.808675766*s;
  return {l:L,c:Math.hypot(a,bb),h:(Math.atan2(bb,a)*180/Math.PI+360)%360,a,b:bb};
}
export function deltaE(a,b) {
  a=hexOklch(a);b=hexOklch(b);
  return 100*Math.hypot(a.l-b.l,a.a-b.a,a.b-b.b);
}
function apcaY(hex) { const [r,g,b]=rgb(hex).map(v=>v**2.4);return .2126729*r+.7151522*g+.072175*b; }
function wcagY(hex) { const [r,g,b]=rgb(hex).map(linear);return .2126*r+.7152*g+.0722*b; }
export function wcag(a,b) { const x=wcagY(a),y=wcagY(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
export function apca(text,bg) {
  let t=apcaY(text),s=apcaY(bg);
  t=t>.022?t:t+(.022-t)**1.414;s=s>.022?s:s+(.022-s)**1.414;
  if(Math.abs(s-t)<.0005) return 0;
  if(s>t) {const v=(s**.56-t**.57)*1.14;return v<.1?0:(v-.027)*100;}
  const v=(s**.65-t**.62)*1.14;return v>-.1?0:(v+.027)*100;
}
function measures(hex,backgrounds,polarity) {
  const sign=polarity==="dark"?-1:1;
  return {apca:Math.min(...backgrounds.map(bg=>sign*apca(hex,bg))),
    wcag:Math.min(...backgrounds.map(bg=>wcag(hex,bg)))};
}
// Polarity describes the BACKGROUND mode. "dark" solves light ink; "light" dark ink.
export function solveInk(h,c,backgrounds,{preferred=75,minLc=75,minWcag=4.5,polarity="dark"}={}) {
  backgrounds=[...new Set(backgrounds)];
  const endpoint=oklchHex(polarity==="dark"?1:0,c,h);
  const maximum=measures(endpoint,backgrounds,polarity);
  if(maximum.apca+1e-7<minLc||maximum.wcag+1e-7<minWcag)
    throw new Error("Infeasible ink floors: "+JSON.stringify({h,c,backgrounds,minLc,minWcag,maximum}));
  // If the preferred APCA target is impossible, the endpoint maximizes both
  // contrast measures in this polarity. Report that limitation explicitly.
  if(maximum.apca<preferred) return {hex:endpoint,...maximum,preferred,minLc,minWcag,preferredMet:false};
  const good=l=>{const x=measures(oklchHex(l,c,h),backgrounds,polarity);
    return x.apca>=preferred&&x.wcag>=minWcag;};
  let lo=0,hi=1;
  for(let i=0;i<24;i++) {
    const mid=(lo+hi)/2;
    if(good(mid)===(polarity==="dark")) hi=mid; else lo=mid;
  }
  const hex=oklchHex(polarity==="dark"?hi:lo,c,h);
  const actual=measures(hex,backgrounds,polarity);
  if(actual.apca+1e-7<minLc||actual.wcag+1e-7<minWcag)
    throw new Error("Returned ink failed measured floors: "+JSON.stringify({hex,actual,minLc,minWcag}));
  return {hex,...actual,preferred,minLc,minWcag,preferredMet:actual.apca>=preferred};
}
export function createRoleEngine(originalColors={}) {
  const signalFamilies={danger:"contrast",warning:"warm",success:"accent",info:"cool"};
  const signalAnchors=Object.fromEntries(Object.entries(signalFamilies).map(([name,family])=>{
    const hex=originalColors["--palette-"+family+"-7"]||
      ({danger:"#ff424f",warning:"#e5b300",success:"#00a574",info:"#638bff"})[name];
    return [name,hexOklch(hex)];
  }));
  return {generate(options) {
    const {hues=[224,359,179],neutrals=[false,false,false],mode="color",monoHue,
      neutral=false,appearance="dark",surfaceOffset=90}=options;
    if(!["dark","light"].includes(appearance)||!["color","mono"].includes(mode))
      throw new Error("Invalid mode or appearance");
    const isDark=appearance==="dark";
    const mono=mode==="mono";
    const hue=(index,offset=0)=>mono?(monoHue??hues[0]):hues[index]+offset;
    const c=(index,value)=>((mono?neutral:neutrals[index])?0:value);
    const color=(index,L,C,offset=0)=>oklchHex(L,c(index,C),hue(index,offset));
    // Generic surfaces use the related shadow family in color mode. All
    // decorative roles collapse to the chosen h or C=0 in monochrome mode.
    const S=isDark?{
      base:[.135,.08],panel:[.20,.10],popover:[.20,.10],inset:[.09,.06],
      hover:[.235,.10],pressed:[.305,.10],selected:[.27,.10],own:[.235,.10],
      ownHover:[.27,.10],highlight:[.305,.10],ownHighlight:[.34,.10],controlSelected:[.34,.10],
      prominent:[.50,.18],prominentHover:[.46,.18],prominentPressed:[.42,.18],
    }:{
      base:[.995,.008],panel:[.985,.012],popover:[.985,.012],inset:[1,0],
      hover:[.95,.028],pressed:[.88,.040],selected:[.915,.036],own:[.95,.028],
      ownHover:[.915,.036],highlight:[.88,.040],ownHighlight:[.845,.045],controlSelected:[.845,.045],
      prominent:[.47,.18],prominentHover:[.43,.18],prominentPressed:[.39,.18],
    };
    const primaryNames=new Set(["selected","controlSelected","highlight","prominent","prominentHover","prominentPressed"]);
    const ownNames=new Set(["own","ownHover","ownHighlight"]);
    const surfaces=Object.fromEntries(Object.entries(S).map(([name,[L,C]])=>{
      const index=ownNames.has(name)?1:0;
      return [name,color(index,L,C,primaryNames.has(name)||ownNames.has(name)?0:surfaceOffset)];
    }));
    const genericNames=["base","panel","popover","inset","hover","pressed","selected","highlight","controlSelected","ownHighlight"];
    const ownBackgroundNames=["own","ownHover","ownHighlight"];
    const prominentNames=["prominent","prominentHover","prominentPressed"];
    const backgrounds=names=>names.map(name=>surfaces[name]);
    const checks={},inks={},borders={},signals={};
    const add=(destination,name,index,backgroundNames,preferred,minLc,minWcag=4.5,polarity=appearance,chroma=.12)=>{
      const solved=solveInk(hue(index),c(index,chroma),backgrounds(backgroundNames),
        {preferred,minLc,minWcag,polarity});
      destination[name]=solved.hex;
      checks[(destination===borders?"border.":"ink.")+name]={...solved,backgroundNames};
    };
    add(inks,"standard",2,genericNames,90,75);
    add(inks,"subtle",2,genericNames,65,60);
    add(inks,"metadata",2,genericNames,50,50);
    add(inks,"disabled",2,genericNames,50,50);
    add(inks,"link",0,genericNames,80,60);
    add(inks,"linkOwn",0,ownBackgroundNames,80,60);
    add(inks,"onSelected",0,["selected","highlight","controlSelected"],90,75);
    add(inks,"selectedSubtle",2,["selected","highlight","controlSelected"],65,60);
    add(inks,"selectedMetadata",2,["selected","highlight","controlSelected"],50,50);
    add(inks,"onOwn",1,ownBackgroundNames,90,75);
    add(inks,"ownMetadata",1,ownBackgroundNames,50,50);
    add(inks,"onProminent",0,prominentNames,90,75,4.5,"dark",.05);
    add(borders,"standard",0,genericNames,0,0,1.5,appearance,.08);
    add(borders,"prominent",0,genericNames,30,30,3,appearance,.14);
    add(borders,"focus",1,genericNames,60,45,3,appearance,.18);
    // Colored alerts are an explicit exception to decorative monochrome.
    for(const [name,anchor] of Object.entries(signalAnchors)) {
      const hue=anchor.h,cc=Math.min(anchor.c,.18);
      // Amber and red are neighbors. A slightly deeper light amber wash keeps
      // warning distinct from pale red after gamut mapping and quantization.
      const Ls=isDark?[.24,.28,.32]:name==="warning"?[.93,.90,.87]:[.955,.925,.895];
      const [fill,hover,pressed]=Ls.map(L=>oklchHex(L,Math.min(cc,isDark?.12:.045),hue));
      const bgs=[fill,hover,pressed,...backgrounds(genericNames)];
      // Semantic text uses the host's Lc60 body floor with maximum available
      // chroma. Lc75 washed red into pink and light signals toward black.
      const solved=solveInk(hue,.4,bgs,{preferred:60,minLc:60,minWcag:4.5,polarity:appearance});
      const ownInk=solveInk(hue,.4,backgrounds(ownBackgroundNames),{preferred:45,minLc:45,minWcag:3,polarity:appearance});
      const icon=solveInk(hue,.4,bgs,{preferred:45,minLc:45,minWcag:3,polarity:appearance});
      signals[name]={fill,hover,pressed,ink:solved.hex,ownInk:ownInk.hex,icon:icon.hex,border:icon.hex};
      checks["signal."+name]={...solved,backgrounds:bgs};
      checks["signal."+name+".icon"]={...icon,backgrounds:bgs};
    }
    const pairs=[["panel","own"],["own","selected"],["hover","selected"],
      ["ownHover","ownHighlight"],["panel","hover"],
      ["prominent","prominentHover"],["prominentHover","prominentPressed"]];
    const separation=Object.fromEntries(pairs.map(([a,b])=>[a+"/"+b,deltaE(surfaces[a],surfaces[b])]));
    const failures=Object.entries(checks).filter(([,x])=>x.apca+1e-7<x.minLc||x.wcag+1e-7<x.minWcag)
      .map(([role,value])=>({role,...value}));
    return {surfaces,inks,borders,signals,measurements:{checks,separation,failures,passes:failures.length===0}};
  }};
}

