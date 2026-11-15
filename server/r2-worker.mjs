const LIMIT=50*1024*1024;
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');
  const allowed=(env.ALLOWED_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173').split(',');
  const headers={'Vary':'Origin','Cache-Control':'no-store'};
  if(origin&&allowed.includes(origin))headers['Access-Control-Allow-Origin']=origin;
  const respond=(body,status=200,extra={})=>new Response(body,{status,headers:{...headers,...extra}});
  if(origin&&!allowed.includes(origin))return respond('Origin not allowed',403);
  if(request.method==='OPTIONS')return respond(null,204,{'Access-Control-Allow-Methods':'GET,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type'});
  const authorization=request.headers.get('Authorization');
  const db=async(path,init={})=>{
   const r=await fetch(env.SUPABASE_URL+'/rest/v1/'+path,{...init,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,...(authorization?{Authorization:authorization}:{}),'Content-Type':'application/json',Prefer:'return=representation',...init.headers}});
   if(!r.ok)throw new Error(`Database request failed (${r.status})`);
   return r.status===204?null:r.json();
  };
  try{
   const path=new URL(request.url).pathname;
   const match=path.match(/^\/books\/([0-9a-f-]{36})\/file$/);
   if(!match&&path!=='/usage')return respond('Not found',404);
   if(request.method!=='GET'||path==='/usage'){
    if(!authorization)return respond('Sign in required',401);
    if(await db('rpc/is_admin',{method:'POST',body:'{}'})!==true)return respond('Administrator access required',403);
   }
   if(path==='/usage'){
    if(request.method!=='GET')return respond('Method not allowed',405);
    let cursor,bytes=0,objects=0;
    do{const page=await env.BOOKS.list({cursor});for(const o of page.objects){bytes+=o.size;objects++;}cursor=page.truncated?page.cursor:undefined;}while(cursor);
    return respond(JSON.stringify({bytes,objects}),200,{'Content-Type':'application/json'});
   }
   const id=match[1];const rows=await db(`books?id=eq.${id}&select=id,r2_key,status`);const book=rows[0];
   if(!book)return respond('Book not found or inaccessible',404);
   if(request.method==='GET'){
    if(!book.r2_key)return respond('No EPUB has been uploaded',404);
    const object=await env.BOOKS.get(book.r2_key);if(!object)return respond('EPUB file missing',404);
    return respond(object.body,200,{'Content-Type':'application/epub+zip','Content-Length':String(object.size),'X-Content-Type-Options':'nosniff'});
   }
   if(request.method==='PUT'){
    if(request.headers.get('Content-Type')!=='application/epub+zip')return respond('EPUB content type required',415);
    if(Number(request.headers.get('Content-Length'))>LIMIT)return respond('Maximum EPUB size is 50 MB',413);
    const reader=request.body?.getReader();if(!reader)return respond('Empty upload',400);
    const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();return respond('Maximum EPUB size is 50 MB',413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    // EPUB requires the first ZIP entry to be an uncompressed mimetype file.
    if(size<58)return respond('Invalid EPUB',400);
    const view=new DataView(bytes.buffer),text=new TextDecoder();
    const nameLength=view.getUint16(26,true),extraLength=view.getUint16(28,true),start=30+nameLength+extraLength;
    if(view.getUint32(0,true)!==0x04034b50||view.getUint16(8,true)!==0||text.decode(bytes.slice(30,30+nameLength))!=='mimetype'||text.decode(bytes.slice(start,start+20))!=='application/epub+zip')return respond('Invalid EPUB mimetype entry',400);
    const key=`catalog/${id}/${crypto.randomUUID()}.epub`;
    await env.BOOKS.put(key,bytes,{httpMetadata:{contentType:'application/epub+zip'}});
    try{const updated=await db(`books?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({r2_key:key,file_size:size})});if(!updated.length)throw new Error('Book update was not authorized');}
    catch(error){await env.BOOKS.delete(key);throw error;}
    if(book.r2_key)await env.BOOKS.delete(book.r2_key);
    return respond(JSON.stringify({size}),200,{'Content-Type':'application/json'});
   }
   if(request.method==='DELETE'){
    // Preserve the catalog row until R2 deletion succeeds. Unpublish first.
    await db(`books?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({status:'draft'})});
    if(book.r2_key)await env.BOOKS.delete(book.r2_key);
    await db(`books?id=eq.${id}`,{method:'DELETE'});
    return respond(null,204);
   }
   return respond('Method not allowed',405);
  }catch(error){console.error(JSON.stringify({event:'storage_failure',message:error.message}));return respond(error.message,502);}
 }
};
