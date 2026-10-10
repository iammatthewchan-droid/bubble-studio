/* Change BUILD, HTML build metadata and release.json together for every release. */
const BUILD='2.0-2026-10-10-r26';
const CACHE='bubble-studio-'+BUILD;
const HTML=['/bubble-studio/','/bubble-studio/index.html','/bubble-studio/studio.html','/bubble-studio/studio-r26.html','/bubble-studio/Bubble-Studio.html'];
const ASSETS=[...HTML,'/bubble-studio/pwa.js','/bubble-studio/manifest.webmanifest','/bubble-studio/icon-192.png','/bubble-studio/icon-512.png','/bubble-studio/release.json'];
const aliases={'/bubble-studio/studio':'/bubble-studio/studio.html','/bubble-studio/studio-r26':'/bubble-studio/studio-r26.html','/bubble-studio/Bubble-Studio':'/bubble-studio/Bubble-Studio.html'};
function expectedPaths(path){return path==='/bubble-studio/index.html'?['/bubble-studio/index.html','/bubble-studio/']:[path,...Object.keys(aliases).filter(alias=>aliases[alias]===path)];}
function sameAsset(response,path){
 const final=new URL(response.url);
 return response.ok&&final.origin===self.location.origin&&expectedPaths(path).includes(final.pathname);
}
function buildOrder(build){
 const match=/^2\.0-(\d{4}-\d{2}-\d{2})-r(\d+)$/.exec(build||'');
 return match?Number(match[1].replace(/-/g,''))*100000+Number(match[2]):0;
}
async function editorBuild(response,path){
 if(!sameAsset(response,path)||!response.headers.get('content-type')?.includes('text/html'))return null;
 const html=await response.clone().text();
 const build=html.match(/<meta name="bubble-studio-build" content="([^"]+)">/)?.[1];
 return build&&html.includes('data-bubble-outline="connected"')&&html.includes('caption-font-data')?build:null;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{
  for(const path of ASSETS){
   const response=await fetch(new Request(path,{cache:'no-store'}));
   if(!sameAsset(response,path))throw Error('Offline package unavailable: '+path);
   if(path==='/bubble-studio/release.json'&&(await response.clone().json()).build!==BUILD)throw Error('Release mismatch');
   if(HTML.includes(path)&&await editorBuild(response,path)!==BUILD)throw Error('Editor build mismatch: '+path);
   await cache.put(path,response);
  }
 }catch(error){
  await caches.delete(CACHE);
  for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage({type:'OFFLINE_ERROR',message:error.message});
  throw error;
 }
 // Save & update, or closing the old app windows, still controls activation.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await self.clients.claim();
 const names=(await caches.keys()).filter(name=>name.startsWith('bubble-studio-'));
 await Promise.all(names.filter(name=>name!==CACHE).slice(0,-1).map(name=>caches.delete(name)));
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
 if(event.data?.type==='GET_RELEASE')event.ports[0]?.postMessage({version:'2.0',date:'2026-10-10',build:BUILD});
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const key=aliases[url.pathname]||url.pathname;
 if(!ASSETS.includes(key))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(HTML.includes(key)){
   // Prefer current server bytes and accept a newer verified build, so this
   // worker cannot pin the editor to an earlier release during a future update.
   try{
    const response=await fetch(new Request(event.request,{cache:'no-store'}));
    if(buildOrder(await editorBuild(response,key))<buildOrder(BUILD))throw Error('Outdated editor');
    try{await cache.put(key,response.clone());}catch{}
    return response;
   }catch(error){
    const cached=await cache.match(key);
    if(cached&&buildOrder(await editorBuild(cached,key))>=buildOrder(BUILD))return cached;
    throw error;
   }
  }
  const cached=await cache.match(key);
  return cached||fetch(event.request);
 })());
});
