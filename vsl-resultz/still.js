// usage: node still.js t1 t2 ... -> stills/t.jpg
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CON',m.text())});
await p.goto('file://'+process.cwd()+'/index.html');await p.waitForFunction(()=>window.READY);
require('fs').mkdirSync('stills',{recursive:true});
for(const a of process.argv.slice(2)){const t=parseFloat(a);
 await p.evaluate(async t=>{await window.renderFrame(t,Math.round(t*25));},t);
 await p.waitForTimeout(30);
 await p.screenshot({path:`stills/${a}.jpg`,type:'jpeg',quality:85});}
await b.close();})();
