// node render.js start end outdir  -> JPEG frames [start,end)
const { chromium } = require('playwright');
const [,, A, B, OUT] = process.argv; const a = +A, b = +B;
(async()=>{const br=await chromium.launch();const p=await br.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+process.cwd()+'/index.html');await p.waitForFunction(()=>window.READY);
require('fs').mkdirSync(OUT,{recursive:true});
const t0=Date.now();
for(let f=a; f<b; f++){
  await p.evaluate(async f=>{await window.renderFrame(f/25,f);},f);
  await p.screenshot({path:`${OUT}/${String(f).padStart(5,'0')}.jpg`,type:'jpeg',quality:93});
  if((f-a)%250===0) console.log(A, f, ((Date.now()-t0)/1000/(f-a+1)).toFixed(3),'s/frame');
}
await br.close();})();
