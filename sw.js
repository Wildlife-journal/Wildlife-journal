const CACHE='wildlife-journal-v24';
const SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
const REMOTE=['static.inaturalist.org','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!=='wj-share').map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request; const u=new URL(r.url);
  /* photos shared from the phone gallery: keep them for the app, then open it */
  if(r.method==='POST' && u.origin===location.origin && u.pathname.endsWith('/share-target')){
    e.respondWith((async()=>{
      try{
        const fd=await r.formData();
        const files=fd.getAll('photos').filter(f=>f&&f.size);
        await caches.delete('wj-share');
        const c=await caches.open('wj-share');
        let i=0;
        for(const f of files){
          await c.put('shared/'+(i++),new Response(f,{headers:{'Content-Type':f.type||'image/jpeg','X-Last-Modified':String(f.lastModified||0)}}));
        }
      }catch(err){}
      return Response.redirect(new URL('./?shared=1',self.registration.scope).href,303);
    })());
    return;
  }
  if(r.method!=='GET') return;
  const own=u.origin===location.origin;
  if(!own && REMOTE.indexOf(u.hostname)<0) return;
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(r,{ignoreSearch:own});
    const net=fetch(r).then(res=>{ if(res&&(res.ok||res.type==='opaque')) c.put(r,res.clone()); return res; }).catch(()=>null);
    if(hit){ e.waitUntil(net); return hit; }
    const res=await net;
    if(res) return res;
    if(r.mode==='navigate'){ const home=await c.match('index.html'); if(home) return home; }
    return new Response('',{status:504});
  }));
});
