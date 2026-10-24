const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');

const D=1024, ENT=D+17408;
const U=(b,o)=>b.readUInt32LE(o), F=(b,o)=>b.readFloatLE(o);
const put=(b,o,v)=>b.writeUInt32LE(v>>>0,o), flt=(b,o,v)=>b.writeFloatLE(v,o);
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<0.0002,`${msg}: ${a} != ${b}`);
function entity(b,i,type,x,y,state=0,timer=0) {
  const a=ENT+i*64;b.fill(0,a,a+64);
  [type,type,state,timer].forEach((v,k)=>b.writeInt32LE(v,a+k*4));
  [x,y,0,0,x,y,0,0].forEach((v,k)=>flt(b,a+16+k*4,v));
  put(b,796,Math.max(U(b,796),i+1));
}

async function main() {
  const tools=process.env.HB_CHECK_TOOLS||path.join(require('./launcher.cjs').root(),'homebrew-launcher');
  await fs.mkdir('/tmp/opencode',{recursive:true});
  const dir=await fs.mkdtemp('/tmp/opencode/celeste-classic-ns2-check-');
  const data=await fs.readFile(path.join(__dirname,'assets/data.bin'));
  const state=await fs.readFile(path.join(__dirname,'assets/state.bin'));
  const initial=Buffer.concat([state,data]);
  assert.equal(U(data,0),0x43454c31,'data magic');
  assert.equal(data.length,65536+1024*512,'packed length');
  const solidTile=Array.from({length:128},(_,i)=>i).find(i=>(data[16448+i]&17)===1);
  assert.ok(solidTile>0,'solid tile found');
  async function run(s,buttons=0,frames=1,connected=1,stick=[0,0],shader=path.join(__dirname,'app.comp.spv')) {
    const input=Buffer.alloc(64);put(input,8,buttons);put(input,32,connected);
    input.writeInt32LE(stick[0],16);input.writeInt32LE(stick[1],20);
    await fs.writeFile(path.join(dir,'state'),s);
    await fs.writeFile(path.join(dir,'input'),Buffer.concat(Array(frames).fill(input)));
    execFileSync(path.join(tools,'game-compute-check'),[path.join(dir,'state'),path.join(dir,'output'),
      shader,path.join(dir,'input'),String(frames)],
      {env:{...process.env,HB_FULL_OUTPUT:'1'},stdio:'pipe'});
    return (await fs.readFile(path.join(dir,'output'))).subarray(0,initial.length);
  }
  async function tick(s,buttons=0,connected=1,stick=[0,0]) {
    const copy=Buffer.from(s);put(copy,88,1); // Next frame is an even/simulation frame.
    return run(copy,buttons,1,connected,stick);
  }
  const title=await run(initial);
  assert.equal(U(title,784),31,'title room');assert.equal(U(title,788),0,'title mode');
  let out=await run(title,1);
  assert.equal(U(out,784),0,'start first room');assert.equal(U(out,788),1,'playing');
  near(F(out,816),8,'original spawn X');near(F(out,820),96,'original spawn Y');
  const started=Buffer.from(out);
  function fixture(ground=false) {
    const s=Buffer.from(started);
    s.fill(0,D+8256,D+16448);s.fill(0,ENT,ENT+96*64);
    put(s,796,0);put(s,84,0);put(s,844,0);put(s,956,0);
    for(const offset of [992,996,1000,1004,864,868,876,112,116]) put(s,offset,0);
    put(s,784,0);put(s,788,1);put(s,792,0);put(s,836,1);put(s,840,1);
    [0,0,1,0].forEach((v,k)=>s.writeInt32LE(v,800+k*4));
    [64,ground?112:60,0,0].forEach((v,k)=>flt(s,816+k*4,v));
    for(const offset of [96,100,104,108]) flt(s,offset,0);
    flt(s,68,1);put(s,920,1);
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
      if(x===0||x===15||ground&&y===15) s[D+8256+x+y*128]=solidTile;
    }
    return s;
  }
  let s=fixture(true);out=await tick(s,1);
  near(F(out,828),-2,'ground jump');assert.equal(U(out,804),0,'jump buffer consumed');
  out=await tick(out,0);assert.ok(F(out,820)<112,'jump moves upward');
  out=await tick(fixture(true),16384);near(F(out,824),.6,'ground acceleration');
  out=await tick(out,16384);near(F(out,816),66,'inclusive movement steps preserved');
  s=fixture(true);
  const iceTile=Array.from({length:128},(_,i)=>i).find(i=>(data[16448+i]&17)===17);
  assert.ok(iceTile>0,'ice tile found');
  for(let x=1;x<15;x++) s[D+8256+x+15*128]=iceTile;
  out=await tick(s,16384);near(F(out,824),.05,'ice acceleration');
  out=await tick(fixture(),0);near(F(out,828),.105,'low-speed gravity');
  s=fixture();put(s,800,3);out=await tick(s,1);near(F(out,828),-2,'coyote jump');
  out=await tick(fixture(),1);assert.equal(U(out,804),4,'air jump buffered');
  flt(out,820,112);for(let x=1;x<15;x++) out[D+8256+x+15*128]=solidTile;
  out=await tick(out,0);near(F(out,828),-2,'buffered jump on landing');
  s=fixture();flt(s,816,7);out=await tick(s,1);
  near(F(out,824),2,'wall jump pushes away');near(F(out,828),-2,'wall jump rises');
  out=await tick(fixture(),4|16384);
  near(F(out,824),5,'horizontal dash');near(F(out,828),0,'horizontal dash Y');
  assert.equal(U(out,808),0,'dash charge consumed');assert.equal(U(out,1000),2,'dash freeze');
  const dashX=F(out,816);out=await tick(out,4|16384);near(F(out,816),dashX,'first freeze');
  out=await tick(out,4|16384);near(F(out,816),dashX,'second freeze');
  out=await tick(out,4|16384);near(F(out,816),dashX+6,'dash resumes with original move loop');
  out=await tick(fixture(),4|8192|16384);
  near(F(out,824),3.5355339,'diagonal dash X');near(F(out,828),-3.5355339,'diagonal dash Y');
  out=await tick(fixture(),4);near(F(out,824),1,'supplied Lua neutral dash');
  s=fixture();put(s,808,0);out=await tick(s,4|8192);assert.equal(U(out,1000),0,'no dash without charge');
  s=fixture(true);put(s,808,0);out=await tick(s);assert.equal(U(out,808),1,'ground refills dash');
  s=fixture();put(s,88,0);out=await run(s,4|16384);assert.equal(U(out,808),1,'skipped frame does not simulate');
  assert.equal(U(out,956)&32,32,'dash edge buffered');
  out=await run(out,16384);assert.equal(U(out,808),0,'short dash tap survives skipped frame');
  s=fixture();flt(s,816,64);flt(s,820,111);s[D+8256+8+14*128]=17;
  out=await tick(s);assert.equal(U(out,792),1,'spike death');assert.equal(U(out,840),0,'dead flag');
  assert.equal(U(out,1004),15,'respawn delay');
  s=fixture();flt(s,820,130);out=await tick(s);assert.equal(U(out,792),1,'bottom death');
  for(let i=0;i<15;i++) out=await tick(out);
  assert.equal(U(out,840),1,'respawn alive');assert.equal(U(out,1004),0,'respawn timer reset');
  s=fixture();entity(s,0,26,64,60);put(s,808,0);out=await tick(s);
  assert.equal(U(out,992),1,'berry room bit');assert.equal(U(out,ENT),0,'berry removed');
  assert.equal(U(out,808),1,'berry refills dash');
  s=fixture();entity(s,0,22,64,60);put(s,808,0);out=await tick(s);
  assert.equal(U(out,808),1,'balloon refill');assert.equal(U(out,ENT+12),60,'balloon cooldown');
  s=fixture();entity(s,0,28,96,80);flt(s,72,1);out=await tick(s);
  assert.equal(U(out,ENT+8),1,'winged berry flees after dash');
  assert.ok(F(out,ENT+20)<80,'winged berry rises');
  s=fixture();entity(s,0,18,64,64);out=await tick(s);
  near(F(out,828),-3,'spring bounce');near(F(out,820),60,'spring snaps player');
  s=fixture();flt(s,820,92);entity(s,0,23,64,100);out=await tick(s);
  assert.equal(U(out,ENT+8),1,'floor starts collapsing');
  for(let i=0;i<15;i++) out=await tick(out);
  assert.equal(U(out,ENT+8),2,'floor disappears');
  flt(out,816,24);flt(out,820,50);put(out,ENT+12,1);
  out=await tick(out);assert.equal(U(out,ENT+8),0,'floor returns when unoccupied');
  s=fixture();flt(s,820,92);entity(s,0,11,64,100);out=await tick(s);
  assert.ok(F(out,816)<64,'moving platform carries standing player');
  s=fixture();flt(s,820,106);flt(s,828,-2);entity(s,0,11,64,100);out=await tick(s);
  near(F(out,820),103,'moving platform is one-way from below');
  s=fixture();entity(s,0,64,64,60);flt(s,108,10);out=await tick(s);
  assert.equal(U(out,ENT),26,'dash breaks wall into berry');
  s=fixture();entity(s,0,8,64,60);out=await tick(s);
  assert.equal(U(out,868),1,'key collected');
  entity(out,0,20,96,80,0,1);out=await tick(out);
  assert.equal(U(out,ENT),26,'key opens chest into berry');
  s=fixture();entity(s,0,102,64,60);out=await tick(s);
  assert.equal(U(out,836),2,'orb grants double dash');assert.equal(U(out,808),2,'orb fills two charges');
  s=fixture(true);entity(s,0,96,64,104);out=await tick(s);
  assert.equal(U(out,876),1,'large chest starts cinematic pause');
  for(let i=0;i<61;i++) out=await tick(out);
  assert.equal(U(out,876),0,'large chest releases player');
  assert.equal(U(out,872),1,'large chest changes sky');
  assert.ok(Array.from({length:U(out,796)},(_,i)=>U(out,ENT+i*64)).includes(102),'large chest creates orb');
  // Room progression uses original data and preserves the run's collectibles.
  let rooms=Buffer.from(started);put(rooms,992,1);put(rooms,836,2);
  for(let room=1;room<=30;room++) {
    // Warp through a safe top tile, not into a side-facing ceiling spike.
    const current=U(rooms,784);
    const exitX=Array.from({length:14},(_,x)=>x+1).find(x=>
      ![43,59].includes(rooms[D+8256+(current%8)*16+x+Math.floor(current/8)*16*128]));
    assert.notEqual(exitX,undefined,'safe exit fixture');
    flt(rooms,816,exitX*8);flt(rooms,820,-5);flt(rooms,824,0);flt(rooms,828,0);
    put(rooms,1000,0);put(rooms,1004,0);put(rooms,840,1);put(rooms,876,0);
    rooms=await tick(rooms);
    assert.equal(U(rooms,784),room,'room transition '+room);
    assert.ok(U(rooms,796)<96,'bounded room entities');
    assert.equal(U(rooms,992),1,'berries survive progression');
    assert.equal(U(rooms,836),2,'double dash survives progression');
  }
  let flag=-1;for(let i=0;i<U(rooms,796);i++) if(U(rooms,ENT+i*64)===118) flag=i;
  assert.ok(flag>=0,'summit flag loaded');
  flt(rooms,816,F(rooms,ENT+flag*64+16));flt(rooms,820,F(rooms,ENT+flag*64+20));
  flt(rooms,824,0);flt(rooms,828,0);out=await tick(rooms);
  assert.equal(U(out,788),3,'summit completion');
  const summit=Buffer.from(out);
  const tap=async(state,button)=>run(await run(state,0),button);
  const selected=(state,index)=>{const copy=Buffer.from(state);put(copy,928,index);return copy;};
  const menu=await run(started,1024);
  assert.equal(U(menu,788),2,'Plus opens menu');assert.equal(U(menu,924),1,'main menu page');
  assert.equal(U(menu,932),1,'menu remembers gameplay mode');assert.equal(U(menu,1016),0,'Plus does not exit');
  let paused=await run(menu,0,100);near(F(paused,820),F(menu,820),'menu freezes position');
  assert.equal(U(paused,996),U(menu,996),'menu freezes clock');
  out=await run(paused,1024);assert.equal(U(out,788),1,'Plus closes main menu');
  out=await run(out,1024,10);assert.equal(U(out,788),1,'held Plus does not reopen');
  out=await run(started,1024);assert.equal(U(out,924),1,'Plus opens same menu');
  out=await tap(out,1024);assert.equal(U(out,788),1,'Plus closes menu');
  out=await run(menu,32768);assert.equal(U(out,928),1,'menu Down selects retry');
  out=await run(out,32768,17);assert.equal(U(out,928),1,'navigation initial repeat delay');
  out=await run(out,32768);assert.equal(U(out,928),2,'held navigation repeats');
  const controls=await tap(out,1);assert.equal(U(controls,924),2,'controls page');
  out=await run(controls,1,5);assert.equal(U(out,924),2,'held confirm does not navigate');
  out=await tap(out,2);assert.equal(U(out,924),1,'B returns from controls');
  out=await run(out,2,5);assert.equal(U(out,924),1,'held B does not close a second page');
  out=await tap(out,32768);assert.equal(U(out,928),3,'menu Down selects settings');
  out=await tap(out,32768);assert.equal(U(out,928),4,'menu Down selects credits');
  const credits=await tap(out,1);assert.equal(U(credits,924),3,'credits page');
  out=await tap(credits,1024);assert.equal(U(out,924),1,'Plus returns from credits');
  assert.equal(U(out,1016),0,'back from credits never exits');
  out=await run(menu,0,1,1,[0,-32767]);assert.equal(U(out,928),1,'stick menu navigation');
  out=await tap(selected(menu,1),1);
  assert.equal(U(out,788),1,'retry resumes gameplay');assert.equal(U(out,792),1,'menu retry counts a death');
  assert.equal(U(out,1004),15,'menu retry begins respawn delay');
  out=await tap(selected(menu,5),1);
  assert.equal(U(out,924),4,'restart confirmation');assert.equal(U(out,936),0,'restart defaults to cancel');
  const restartConfirm=Buffer.from(out);
  out=await run(out,1,10);assert.equal(U(out,924),4,'held A cannot confirm twice');
  out=await tap(out,1);assert.equal(U(out,924),1,'confirming Cancel returns to menu');
  assert.equal(U(out,996),U(menu,996),'cancel leaves run untouched');
  out=await tap(selected(menu,5),1);out=await tap(out,32768);assert.equal(U(out,936),1,'select restart');
  out=await tap(out,2);assert.equal(U(out,924),1,'B cancels selected restart');
  out=await tap(selected(menu,5),1);out=await tap(out,32768);put(out,992,7);
  out=await tap(out,1);
  assert.equal(U(out,788),1,'confirmed restart plays');assert.equal(U(out,784),0,'restart first room');
  assert.equal(U(out,992),0,'restart clears berries');assert.equal(U(out,924),0,'restart clears menu');
  const leaveHelp=await tap(selected(menu,6),1);
  assert.equal(U(leaveHelp,924),5,'leave entry shows manual SmileBASIC instructions');
  assert.equal(U(leaveHelp,1016),0,'manual instructions do not request the broken launcher return');
  out=await tap(leaveHelp,1);assert.equal(U(out,924),5,'A does not falsely promise to close SmileBASIC');
  out=await tap(out,32768);out=await tap(out,1);
  assert.equal(U(out,1016),0,'leave help has no hidden quit confirmation');
  out=await tap(leaveHelp,2);assert.equal(U(out,924),1,'B returns from manual instructions');
  out=await run(started,0,1,0);assert.equal(U(out,788),2,'disconnect pauses');
  assert.equal(U(out,924),1,'disconnect opens usable main menu');
  out=await run(credits,2048|1,5,0);assert.equal(U(out,924),3,'disconnected input ignored');
  out=await run(started,2048,1,0);assert.equal(U(out,1016),0,'disconnected Minus does not exit');
  const titleMenu=await run(title,1024);assert.equal(U(titleMenu,932),0,'title menu return mode');
  out=await tap(titleMenu,32768);assert.equal(U(out,928),2,'skip unavailable retry on title');
  out=await tap(selected(titleMenu,5),1);assert.equal(U(out,924),1,'restart disabled on title');
  out=await tap(titleMenu,2);out=await run(out,2,5);assert.equal(U(out,788),0,'B back does not accidentally start title');
  out=await tap(titleMenu,1);out=await run(out,1,5);assert.equal(U(out,788),0,'A back does not accidentally start title');
  out=await run(summit,1);assert.equal(U(out,932),3,'results menu return mode');
  assert.equal(U(out,928),5,'results highlights restart without executing it');
  out=await tap(out,2);assert.equal(U(out,788),3,'back returns to summit results');
  out=await run(fixture(true),1024);out=await tap(out,2);out=await run(out,2,4);
  assert.equal(U(out,788),1,'B resumes');assert.ok(F(out,828)>=0,'menu B does not leak into jump');
  out=await run(started,2);assert.equal(U(out,1016),0,'B is jump, not exit');
  out=await run(started,64);assert.equal(U(out,792),1,'L retries room');

  assert.equal(U(started,948),0,'outside stats off by default');assert.equal(U(started,952),0,'filter off by default');
  const settings=await tap(selected(menu,3),1);
  assert.equal(U(settings,924),7,'settings page');assert.equal(U(settings,124),0,'initial settings cursor');
  out=await tap(settings,1);assert.equal(U(out,948),1,'toggle outside stats');
  out=await tap(out,32768);assert.equal(U(out,124),1,'select filter');
  out=await tap(out,1);assert.equal(U(out,952),1,'scanline filter');
  const settingsEnabled=Buffer.from(out);
  out=await tap(out,16384);assert.equal(U(out,952),2,'right cycles to LCD');
  out=await tap(out,16384);assert.equal(U(out,952),3,'right cycles to monochrome');
  out=await tap(out,16384);assert.equal(U(out,952),0,'filter wraps');
  out=await tap(out,4096);assert.equal(U(out,952),3,'left cycles backwards');
  out=await run(out,4096,8);assert.equal(U(out,952),3,'held left does not repeatedly change filter');
  out=await tap(out,2);assert.equal(U(out,924),1,'back from settings');
  assert.equal(U(out,948),1,'stats preference retained');assert.equal(U(out,952),3,'filter preference retained');
  out=await tap(selected(out,5),1);out=await tap(out,32768);out=await tap(out,1);
  assert.equal(U(out,788),1,'restart with settings');assert.equal(U(out,948),1,'stats survive run restart');
  assert.equal(U(out,952),3,'filter survives run restart');
  out=await tap(settingsEnabled,32768);assert.equal(U(out,124),2,'display defaults row');
  out=await tap(out,1);assert.equal(U(out,948),0,'reset stats default');assert.equal(U(out,952),0,'reset filter default');
  out=await tap(out,32768);out=await tap(out,1);assert.equal(U(out,924),1,'settings Back item');

  for (const [name,state] of [['startup',initial],['title',title],['gameplay',started],['main menu',menu],
    ['controls',controls],['credits',credits],['settings',settings],['restart confirm',restartConfirm],
    ['leave help',leaveHelp],['summit',summit]]) {
    const before=Buffer.from(state);put(before,84,0);
    out=await run(before,2048);
    assert.equal(U(out,1016),0,'Minus does not invoke broken return from '+name);
    assert.equal(U(out,924),5,'Minus shows leave instructions from '+name);
    assert.equal(U(out,788),2,'leave help pauses '+name);
    if(name!=='startup') {
      assert.equal(U(out,996),U(before,996),'leave help does not simulate '+name);
    }
    assert.equal(U(out,84),2048,'leave help records held input');
  }
  out=await run(started,1024|2048);assert.equal(U(out,1016),0,'simultaneous menu/help buttons do not request return');
  assert.equal(U(out,924),5,'Minus leave help takes priority over main menu');

  const scene=await tick(started,0);
  const cleanScene=Buffer.from(scene);put(cleanScene,112,60);
  const withStats=Buffer.from(cleanScene);put(withStats,948,1);
  const filters=[1,2,3].map(value=>{const b=Buffer.from(cleanScene);put(b,952,value);return b;});
  for(const [name,snapshot] of [['title',title],['room-entry',scene],['gameplay',cleanScene],
    ['menu',paused],['controls',controls],['credits',credits],['restart-confirm',restartConfirm],
    ['leave-instructions',leaveHelp],['summit',summit],
    ['settings',settingsEnabled],['outside-stats',withStats],['scanlines',filters[0]],['lcd',filters[1]],['monochrome',filters[2]]]) {
    const copy=Buffer.from(snapshot);flt(copy,960,0);
    await fs.writeFile(path.join(dir,'render-state'),copy.subarray(0,D));
    await fs.writeFile(path.join(dir,'render-data'),copy.subarray(D));
    const rgba=path.join(dir,name+'.rgba');
    execFileSync(path.join(tools,'game-render'),[path.join(dir,'render-state'),path.join(dir,'render-data'),__dirname,rgba],
      {env:{...process.env,HB_SHADER_PREFIX:'app'},stdio:'pipe'});
    execFileSync('python3',['-c',
      'from PIL import Image; import sys; Image.frombytes("RGBA",(1920,1080),open(sys.argv[1],"rb").read()).save(sys.argv[2])',
      rgba,path.join(dir,name+'.png')]);
  }
  const pixels=await fs.readFile(path.join(dir,'gameplay.rgba'));
  for(let y=0;y<1080;y++)for(let x=0;x<1920;x++) {
    if(x>=505&&x<1415&&y>=85&&y<995)continue;
    const i=(y*1920+x)*4;
    assert.equal(pixels[i]|pixels[i+1]|pixels[i+2],0,'no UI in letterbox');
  }
  for(const name of ['outside-stats','scanlines','lcd','monochrome']) {
    const image=await fs.readFile(path.join(dir,name+'.rgba'));
    assert.ok(!pixels.equals(image),name+' changes the image');
  }
  console.log('Passed: gameplay/menu regressions, manual SmileBASIC leave instructions, no broken return requests, settings, filters and GPU previews.');
  console.log('Previews: '+dir);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
