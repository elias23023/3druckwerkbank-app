import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const D=process.argv[2];
const OUT=process.argv[3]; fs.mkdirSync(OUT,{recursive:true});
async function sheet(name, files, cols, w, h, bg){
  const rows=Math.ceil(files.length/cols); const comps=[];
  for(let i=0;i<files.length;i++){
    const buf=await sharp(files[i]).resize(w,h,{fit:'contain',background:bg}).png().toBuffer();
    const label=Buffer.from(`<svg width="${w}" height="22"><rect width="${w}" height="22" fill="#000a"/><text x="4" y="16" font-size="13" fill="#fff" font-family="sans-serif">${i+1}. ${path.basename(files[i]).replace(/\(1\)|\.png/g,'').slice(0,48)}</text></svg>`);
    comps.push({input:buf,left:(i%cols)*w,top:Math.floor(i/cols)*h},{input:label,left:(i%cols)*w,top:Math.floor(i/cols)*h});
  }
  await sharp({create:{width:cols*w,height:rows*h,channels:4,background:bg}}).composite(comps).jpeg({quality:80}).toFile(path.join(OUT,name+'.jpg'));
}
const ls=(d)=>fs.readdirSync(path.join(D,d)).filter(f=>f.endsWith('.png')).sort().map(f=>path.join(D,d,f));
await sheet('1-hauptinseln', [...ls('01_Grosse_Hauptinseln_transparent'),...ls('05_Fruehere_Hauptinselvarianten')], 4, 480, 320, '#1a2238');
await sheet('2-motive', ls('03_Weitere_Inselmotive'), 5, 360, 360, '#1a2238');
await sheet('3-szenen', ls('02_Seitenszenen'), 4, 480, 270, '#000');
const L=['00_Bisherige_Varianten','01_Fruehling','02_Sommer','03_Herbst','04_Winter'].flatMap(s=>ls('04_Landschaftshintergruende/'+s));
await sheet('4-landschaften', L, 4, 480, 270, '#000');
console.log('ok');
