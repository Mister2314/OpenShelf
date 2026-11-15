import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../server/r2-worker.mjs';
const id='00000000-0000-4000-8000-000000000099';
const objects=new Map();let row={id,status:'draft',r2_key:null},failedUpdate=false;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{
 const admin=init.headers.Authorization==='Bearer admin';
 if(String(url).endsWith('rpc/is_admin'))return Response.json(admin);
 if(init.method==='PATCH'){if(failedUpdate)return new Response('fail',{status:500});Object.assign(row,JSON.parse(init.body));return Response.json([row]);}
 if(init.method==='DELETE'){row=null;return Response.json([]);}
 return Response.json(row&&(row.status==='published'||admin)?[row]:[]);
};
const env={SUPABASE_URL:'https://test.invalid',SUPABASE_PUBLISHABLE_KEY:'public',BOOKS:{
 async put(key,bytes){objects.set(key,bytes);},async get(key){const bytes=objects.get(key);return bytes?{body:bytes,size:bytes.length}:null;},async delete(key){objects.delete(key);},async list(){return {objects:[...objects].map(([key,b])=>({key,size:b.length})),truncated:false};}
}};
const request=(method,token,body,origin='http://localhost:5173')=>new Request(`https://storage.invalid/books/${id}/file`,{method,headers:{Origin:origin,...(token?{Authorization:`Bearer ${token}`}:{}) ,'Content-Type':'application/epub+zip'},body});
try{
 for(const file of ['garden','sea']){
 const bytes=fs.readFileSync(`tests/fixtures/${file}.epub`);
 assert.equal((await worker.fetch(request('PUT',null,bytes),env)).status,401);
 assert.equal((await worker.fetch(request('PUT','reader',bytes),env)).status,403);
 assert.equal((await worker.fetch(request('PUT','admin',bytes,'https://evil.invalid'),env)).status,403);
 assert.equal((await worker.fetch(request('PUT','admin',bytes),env)).status,200);
 assert.equal(objects.size,1);
 assert.equal((await worker.fetch(request('GET',null),env)).status,404);
 row.status='published';
 const result=await worker.fetch(request('GET',null),env);assert.equal(result.status,200);assert.deepEqual(Buffer.from(await result.arrayBuffer()),bytes);
 row.status='draft';
 }
 assert.equal((await worker.fetch(request('PUT','admin',new Uint8Array(100)),env)).status,400);
 const oldKey=row.r2_key;failedUpdate=true;
 assert.equal((await worker.fetch(request('PUT','admin',fs.readFileSync('tests/fixtures/garden.epub')),env)).status,502);
 assert.equal(objects.size,1);assert.equal(row.r2_key,oldKey);failedUpdate=false;
 assert.equal((await worker.fetch(request('DELETE','admin'),env)).status,204);assert.equal(objects.size,0);
 console.log('PASS: Worker unit tests using two real EPUB archives: auth denial, origin denial, upload/replacement/retrieval byte integrity, draft privacy, invalid EPUB, rollback, deletion. External services are isolated test doubles; this is NOT a live R2 end-to-end test.');
}finally{globalThis.fetch=originalFetch;}
