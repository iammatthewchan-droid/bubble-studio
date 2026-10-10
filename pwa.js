(()=>{
 'use strict';
 if(window.__bubbleStudioPWA)return;window.__bubbleStudioPWA=true;
 const VERSION='2.0',DATE='10 October 2026',KEY='bubble-studio-draft-v1';
 document.title='Bubble Studio · v'+VERSION;
 const style=document.createElement('style');style.textContent=`
 .app-tools{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:16px 0;border-top:1px solid var(--line);color:var(--muted);font:13px/1.5 Inter,Arial,sans-serif}
 .app-tools strong{font-weight:600}.app-tools small{font-size:14px;color:#b8b7c5}.app-tools button{width:auto;min-height:44px;padding:7px 12px;font-size:14px;margin:0}
 .app-tools .spacer{flex:1}.app-notice{padding:12px 28px;background:#242230;color:#efedf6;font:14px/1.6 system-ui,sans-serif}.app-notice button{width:auto;margin:0 8px;padding:7px 12px;font-size:14px}
 .app-tools [hidden],.app-notice[hidden]{display:none!important}.app-help{padding:12px 0;color:#cbc9d6;font:14px/1.6 system-ui,sans-serif;border-bottom:1px solid #383943}.app-help summary{cursor:pointer}.app-help p{max-width:900px}
 @media(max-width:650px){.app-tools button{min-height:48px}.app-tools,.app-help{padding:12px 0}.app-notice{padding:12px 16px}.app-tools .spacer{display:none}.app-tools small{width:100%}}
 `;document.head.append(style);
 const bar=document.createElement('section');bar.className='app-tools';bar.setAttribute('aria-label','App version and updates');
 bar.innerHTML='<strong>Bubble Studio · v2.0 · r26 · Internal review</strong><small>Updated <time datetime="2026-10-10">10 October 2026</time> · HKT</small><span class="spacer"></span><span id="offline-state" role="status">Preparing offline access…</span><button id="install-app" hidden>Install app</button><button id="check-update">Check for updates</button>';
 document.querySelector('footer').append(bar);
 const notice=document.createElement('section');notice.className='app-notice';notice.hidden=true;notice.setAttribute('aria-live','polite');bar.after(notice);
 const help=document.createElement('details');help.className='app-help';help.innerHTML='<summary>Install, updates &amp; release history</summary><p>Use this same address on desktop and smartphone. On iPhone, use Safari and Add to Home Screen if you want an app shortcut. In Chrome or Edge, use “Install app” when offered or the browser’s app-install command. On supported Safari versions, use Add to Dock. Installation options depend on your browser.</p><p>Open online once and wait for “Ready offline” before relying on offline access. The editor and exports then work without internet. Your draft is saved on this device/browser, not synced. Clearing browser data removes drafts and offline access. Export important artwork as a backup.</p><p>Updates download when online. Choose “Save &amp; update” to activate one. Choosing Later keeps this open session unchanged; closing all app windows can activate a downloaded update for the next launch. No reinstall is needed for normal editor updates.</p><p><strong>v1.1 · 29 September 2026 (HKT)</strong> — Installable web app, offline support, device-local drafts, update prompts, corrected two-line options and unrestricted manual breaks. Your original Mac app is not changed.</p>';
 help.insertAdjacentHTML('beforeend','<p><strong>v2.0 · 29 September 2026 (HKT)</strong> — Bubble / Caption modes; separate Name and Caption fields. Caption is always one line, maximum 50 characters including spaces and punctuation. Source typography and colours stay locked; the shared left margin is moved one extra capital-C width, with two-C right clearance. Separate device-local drafts. Offline installation now accepts the host’s verified HTML-address redirects.</p><p>The standalone offline file works without the website, but cannot automatically fetch updates. The installed web app updates at this same address when online and when your network allows access.</p>');
 notice.after(help);
 help.insertAdjacentHTML('beforeend','<p><strong>r25 · 10 October 2026</strong> — One Bubble / Caption switch; mobile preview directly below your text, larger touch targets and reliable text-event handling. Bubble fill remains 77% opaque; Caption typography and transparent end fades are preserved.</p>');
 const state=document.getElementById('offline-state'),check=document.getElementById('check-update');
 let registration=null,offlineReady=false,installPrompt=null,saveFailed=false;
 function snapshot(){return{caption:$('caption').value,manual,size:$('size').value,sizeStandard:'r24',corner:document.querySelector('input[name=corner]:checked').value,lineCount:$('line-count').value,selectedBreak,format:$('format').value,pngScale:$('png-scale').value,savedAt:new Date().toISOString()};}
 function save(){window.Studio?.save();try{const s=JSON.stringify(snapshot());localStorage.setItem(KEY,s);sessionStorage.setItem(KEY,s);saveFailed=false;return true;}catch{saveFailed=true;state.textContent='Draft not saved — export a backup';return false;}}
 try{
  const raw=sessionStorage.getItem(KEY)||localStorage.getItem(KEY);const s=raw?JSON.parse(raw):null;
  if(s&&typeof s.caption==='string'){
   $('caption').value=s.caption;
   if(Number(s.size)>=16&&Number(s.size)<=120)$('size').value=!s.sizeStandard&&Number(s.size)===40?38:s.size;
   if(['top-left','top-right','bottom-left','bottom-right'].includes(s.corner))document.querySelector('input[name=corner][value="'+s.corner+'"]').checked=true;
   if(['0','1','2','3'].includes(s.lineCount))$('line-count').value=s.lineCount;
   if(['png','svg','ai'].includes(s.format))$('format').value=s.format;
   if(['1','2','4'].includes(s.pngScale))$('png-scale').value=s.pngScale;
   changeFormat();
   setMode(!!s.manual,typeof s.selectedBreak==='string'?s.selectedBreak:null);
  }
 }catch{state.textContent='Saved draft unavailable';}
 for(const event of ['input','change','click'])document.querySelector('main').addEventListener(event,save);
 window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
 function status(){if(saveFailed)return;state.textContent=offlineReady?(navigator.onLine?'Ready offline':'Offline · ready'):navigator.onLine?'Preparing offline access…':'Offline setup incomplete';}
 window.addEventListener('online',()=>{status();registration?.update().catch(()=>{});});window.addEventListener('offline',status);
 async function offerUpdate(worker){
  let label='A new version';
  const channel=new MessageChannel();const release=await new Promise(resolve=>{const timeout=setTimeout(()=>resolve(null),1500);channel.port1.onmessage=e=>{clearTimeout(timeout);resolve(e.data);};worker.postMessage({type:'GET_RELEASE'},[channel.port2]);});
  if(release?.version)label='Version '+release.version+' · '+release.date;
  notice.replaceChildren(document.createTextNode(label+' is ready. '));notice.hidden=false;
  const apply=document.createElement('button');apply.textContent='Save & update';apply.onclick=()=>{if(!save()){notice.append(document.createTextNode(' Please export your artwork before updating; draft saving is unavailable.'));return;}apply.disabled=true;worker.postMessage({type:'ACTIVATE_UPDATE'});};
  const later=document.createElement('button');later.textContent='Later';later.onclick=()=>{notice.hidden=true;};notice.append(apply,later);
 }
 let previousController=navigator.serviceWorker?.controller;
 if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='OFFLINE_ERROR')state.textContent='Offline setup failed — '+event.data.message;});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(previousController){save();location.reload();}else{previousController=navigator.serviceWorker.controller;offlineReady=true;status();}});
  navigator.serviceWorker.register('/bubble-studio/sw.js',{updateViaCache:'none'}).then(reg=>{
   registration=reg;
   navigator.serviceWorker.ready.then(()=>{offlineReady=true;status();});
   if(reg.waiting)offerUpdate(reg.waiting);
   reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offerUpdate(worker);if(worker.state==='redundant'&&!offlineReady)state.textContent='Offline setup failed — retry online';});});
   reg.update().catch(()=>{});
  }).catch(()=>{state.textContent='Offline setup unavailable in this browser';check.disabled=true;});
 }else{state.textContent='Offline file · online updates unavailable';check.disabled=true;}
 check.onclick=async()=>{if(!navigator.onLine){state.textContent='Connect to check for updates';return;}if(!registration)return;check.disabled=true;try{await registration.update();if(registration.waiting)await offerUpdate(registration.waiting);else state.textContent=registration.installing?'Downloading update…':'No ready update · v'+VERSION;}catch{state.textContent='Update check failed · current version retained';}finally{check.disabled=false;}};
 const install=document.getElementById('install-app');
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;install.hidden=false;});
 install.onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;install.hidden=true;};
 window.addEventListener('appinstalled',()=>{install.hidden=true;});
})();
