/* Device-local recovery only. The server remains authoritative. */
(() => {
 let dbPromise;
 const db=()=>dbPromise??=(new Promise((resolve,reject)=>{const r=indexedDB.open('nord-journal-recovery',1);r.onupgradeneeded=()=>{r.result.createObjectStore('drafts',{keyPath:'key'});r.result.createObjectStore('media',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));
 async function run(store,mode,action){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(store,mode),r=action(t.objectStore(store));let value;r.onsuccess=()=>value=r.result;t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
 window.NordDrafts={all:s=>run(s,'readonly',o=>o.getAll()),get:(s,k)=>run(s,'readonly',o=>o.get(k)),put:(s,v)=>run(s,'readwrite',o=>o.put(v)),remove:(s,k)=>run(s,'readwrite',o=>o.delete(k))};
})();
