const CACHE='wildlife-journal-v13';
const SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
const REMOTE=['static.inaturalist.org','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
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
