// Exercises the real launcher JS runtime with the GPU-produced exit snapshot.
// This tests the request/command handoff, not native console worker stop/join.
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
module.exports=async function({snapshot,directory,label='menu'}) {
  const root=require('../launcher.cjs').root();
  const folder=path.join(directory,'host-runtime-'+label),apps=path.join(folder,'apps');
  await fs.mkdir(apps,{recursive:true});
  await fs.cp(path.resolve(__dirname,'..'),path.join(apps,'celeste-classic-ns2'),{recursive:true});
  const memory=Buffer.alloc(8*1024*1024);
  const rpc={a:{session:'offline-exit-test'},
    async read(address,length){return Buffer.from(memory.subarray(address,address+length));},
    async write(address,bytes){bytes.copy(memory,address);}};
  const menu={catalog:{root:apps},controls:{mapped:0,bytes:memory.length},commands:[['menu-command']]};
  const runtime=await require(path.join(root,'homebrew-launcher/app-runtime.cjs')).create({
    rpc,menu,directory:folder,prepareApp:async()=>({ready:true,scratchRestored:true,commands:[['app-command']]})
  });
  memory.writeUInt32LE(1,1012);
  assert.deepEqual(await runtime.afterBatch(),['app-command']);
  assert.equal(runtime.active.app.id,'celeste-classic-ns2');
  assert.equal(snapshot.readUInt32LE(1016),1,'GPU snapshot contains documented exit request');
  snapshot.copy(memory);
  assert.deepEqual(await runtime.afterBatch(),['menu-command'],'launcher selects menu commands');
  assert.equal(runtime.active,null,'launcher clears active app');
  assert.equal(memory.readUInt32LE(1016),0,'menu initialization clears request');
  assert.equal(runtime.report.transitions.at(-1).event,'return','return transition recorded');
  await runtime.close();
};
