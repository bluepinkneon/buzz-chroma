export const parse=color=>{
 if(typeof color!=='string')throw new Error('unresolved color '+String(color));
 let hex=color.trim().replace(/^#/,'');
 if(hex.length===3||hex.length===4)hex=[...hex].map(c=>c+c).join('');
 if(!/^[\da-f]{6}([\da-f]{2})?$/i.test(hex))throw new Error('unsupported color '+color);
 const v=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);v.push(hex.length===8?parseInt(hex.slice(6,8),16)/255:1);return v;
};
export const over=(src,dst,opacity=1)=>{
 const a=src[3]*opacity,remaining=dst[3]*(1-a),out=a+remaining;
 return [0,1,2].map(i=>out?(src[i]*a+dst[i]*remaining)/out:0).concat(out);
};
export function measure(text,bg){
 text=over(text,bg);
 const lin=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
 const y=x=>x[0]*.2126+x[1]*.7152+x[2]*.0722;
 const a=y(text.slice(0,3).map(lin)),b=y(bg.slice(0,3).map(lin));
 const wcag=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 const ay=x=>x[0]**2.4*.2126729+x[1]**2.4*.7151522+x[2]**2.4*.072175;
 let t=ay(text),s=ay(bg);t=t>.022?t:t+(.022-t)**1.414;s=s>.022?s:s+(.022-s)**1.414;
 let lc=0;
 if(Math.abs(s-t)>=.0005){if(s>t){const v=(s**.56-t**.57)*1.14;if(v>=.1)lc=(v-.027)*100;}else{const v=(s**.65-t**.62)*1.14;if(v<=-.1)lc=(v+.027)*100;}}
 return {wcag,apcaAbs:Math.abs(lc)};
}
const byteHex=rgba=>'#'+rgba.slice(0,3).map(c=>Math.round(c*255).toString(16).padStart(2,'0')).join('');
