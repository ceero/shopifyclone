import{i as e}from"./rolldown-runtime-aKtaBQYM.js";import{i as t,o as n,r,t as i}from"./deploy-urls-C_mnVA4y.js";import{t as a}from"./dist-DJQtccsE.js";var o=e(a(),1),s=`
  .vc-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
  }
  .vc-modal {
    background: #111;
    border: 1px solid #333;
    padding: 24px;
    min-width: 450px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }
  .vc-modal h2 {
    margin: 0 0 8px 0;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .vc-sheet-label {
    color: #666;
    font-size: 11px;
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .vc-changed-sections {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 10px 0 16px;
  }
  .vc-changed-tag {
    display: inline-block;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid;
  }
  .vc-no-changes {
    color: #555;
    font-size: 11px;
    margin: 10px 0 16px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .vc-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #333;
    background: #0a0a0a;
    color: #fff;
    font-size: 13px;
    font-family: inherit;
    margin-bottom: 12px;
    outline: none;
    transition: border-color 0.15s;
  }
  .vc-input:focus {
    border-color: #fff;
  }
  .vc-input::placeholder {
    color: #555;
  }
  .vc-btn {
    padding: 10px 20px;
    border: 1px solid #333;
    background: #111;
    color: #fff;
    font-size: 12px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .vc-btn:hover {
    background: #222;
    border-color: #555;
  }
  .vc-btn-primary {
    background: #fff;
    color: #000;
    border-color: #fff;
  }
  .vc-btn-primary:hover {
    background: #ddd;
    border-color: #ddd;
  }
  .vc-btn-row {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 20px;
  }
  .vc-section-title {
    color: #666;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  .vc-unsaved-dot {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background: #f44;
    border-radius: 50%;
    pointer-events: none;
  }
  .vc-select {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #333;
    background: #0a0a0a;
    color: #fff;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
  }
  .vc-select:focus {
    border-color: #fff;
  }
  .vc-select option {
    background: #111;
    color: #fff;
  }
  .vc-state-list {
    max-height: 340px;
    overflow-y: auto;
    margin-bottom: 16px;
  }
  .vc-state-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid #222;
    margin-bottom: 4px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .vc-state-row:hover {
    border-color: #444;
    background: #1a1a1a;
  }
  .vc-state-row.selected {
    border-color: #fff;
    background: #1a1a1a;
  }
  .vc-state-row .vc-state-name {
    color: #fff;
    font-size: 12px;
    font-weight: 600;
  }
  .vc-state-row .vc-state-meta {
    color: #555;
    font-size: 10px;
  }
  .vc-state-row .vc-state-section-tag {
    padding: 2px 6px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid #444;
    color: #999;
    white-space: nowrap;
  }
  .vc-empty {
    color: #555;
    font-size: 11px;
    text-align: center;
    padding: 24px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .vc-filter-row {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .vc-deploy-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border: 1px solid #333;
    margin-bottom: 16px;
  }
  .vc-deploy-row .vc-deploy-label {
    color: #999;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .vc-btn-deploy {
    padding: 6px 14px;
    border: 1px solid #555;
    background: transparent;
    color: #fff;
    font-size: 11px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .vc-btn-deploy:hover {
    background: #222;
    border-color: #888;
  }
  .vc-btn-deploy:disabled {
    opacity: 0.4;
    cursor: default;
  }
`,c=!1;function l(){if(c||typeof document>`u`)return;let e=document.createElement(`style`);e.textContent=s,document.head.appendChild(e);let t=document.createElement(`style`);t.textContent=`
    @keyframes slideUp {
      from { transform: translate(-50%, 20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `,document.head.appendChild(t),c=!0}function u(){let e=document.createElement(`div`);e.className=`vc-overlay`,e.style.zIndex=`999999`,document.body.appendChild(e);let t=document.createElement(`div`);t.className=`vc-modal`,e.appendChild(t);let n=()=>e.remove();return e.addEventListener(`click`,t=>{t.target===e&&n()}),{modal:t,close:n,overlay:e}}function d(e){let t=document.createElement(`div`);return t.textContent=e,t.innerHTML}function f(){return window.location.pathname.replace(/\/theatre$/,``)}function p(e){try{return o.default.createContentOfSaveFile(e)}catch{return}}function m(e){let t=document.createElement(`div`);t.style.cssText=`
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    color: #000;
    padding: 12px 24px;
    font-family: 'SF Mono', monospace;
    font-size: 12px;
    z-index: 999999;
    animation: slideUp 0.3s ease;
  `,t.textContent=e,document.body.appendChild(t),setTimeout(()=>{t.style.opacity=`0`,t.style.transition=`opacity 0.3s`,setTimeout(()=>t.remove(),300)},2e3)}var h={PULL_STATE_URL:`theatre-pull-state-url`,PULL_STATE_NAME:`theatre-pull-state-name`,PULL_SECTION:`theatre-pull-section`,PULL_CURRENT_STATE:`theatre-pull-current-state`,PULL_STATE_JSON:`theatre-pull-state-json`,LAST_AUTHOR:`theatre-last-author`},g=new Set(Object.values(h));function _(){return typeof window>`u`?``:localStorage.getItem(h.LAST_AUTHOR)||``}function v(e){typeof window>`u`||localStorage.setItem(h.LAST_AUTHOR,e)}function y(){if(typeof localStorage>`u`)return;let e=[];for(let t=0;t<localStorage.length;t++){let n=localStorage.key(t);!n||g.has(n)||n.includes(`theatre`)&&e.push(n)}e.forEach(e=>localStorage.removeItem(e))}function b(){return typeof window>`u`?!1:!!localStorage.getItem(h.PULL_STATE_URL)}function x(){if(typeof window>`u`)return null;let e=localStorage.getItem(h.PULL_STATE_URL);if(!e)return null;let t=localStorage.getItem(h.PULL_STATE_NAME)||`unknown`,n=localStorage.getItem(h.PULL_SECTION)||null,r=null,i=localStorage.getItem(h.PULL_CURRENT_STATE);if(i)try{r=JSON.parse(i)}catch{}return localStorage.removeItem(h.PULL_STATE_URL),localStorage.removeItem(h.PULL_STATE_NAME),localStorage.removeItem(h.PULL_SECTION),localStorage.removeItem(h.PULL_CURRENT_STATE),{url:e,name:t,section:n,currentState:r}}function S(e){localStorage.setItem(h.PULL_STATE_JSON,JSON.stringify(e))}function C(){let e=localStorage.getItem(h.PULL_STATE_JSON);if(localStorage.removeItem(h.PULL_STATE_JSON),!e)return null;try{return JSON.parse(e)}catch{return null}}function w(e,t,n,r){localStorage.setItem(h.PULL_STATE_URL,e),localStorage.setItem(h.PULL_STATE_NAME,t),n&&localStorage.setItem(h.PULL_SECTION,n),r&&localStorage.setItem(h.PULL_CURRENT_STATE,JSON.stringify(r))}async function T(e){try{return await(await fetch(`${f()}/theatre-api`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)})).json()}catch(e){return{success:!1,error:e.message}}}function E(e,t){let{modal:n,close:r}=u(),i=_(),{changedSections:a,onPushSuccess:o}=t,s=p(e.address.projectId),c=Object.keys(s?.sheetsById??{}),l=t.activeSheetId,f=!1,h=()=>{let t=a.length>0?`<div class="vc-changed-sections">
          ${a.map(e=>`<span class="vc-changed-tag" style="border-color:#66666655; background:#66666614; color:#999; opacity:${l===e||l===`all`?`1`:`0.35`}">${e}</span>`).join(``)}
        </div>`:`<div class="vc-no-changes">No sections changed since last load.</div>`;n.innerHTML=`
      <h2>Push Version</h2>

      <div class="vc-section-title">Section to push</div>
      <select class="vc-select" id="vc-section-select" style="width:100%;margin-bottom:16px">
        ${c.map(e=>`
          <option value="${e}" ${l===e?`selected`:``}>
            ${e}${a.includes(e)?` ●`:``}
          </option>
        `).join(``)}
        <option value="all" ${l===`all`?`selected`:``}>
          All Sections
        </option>
      </select>

      <div class="vc-section-title">Changed sections</div>
      ${t}

      <input type="text" class="vc-input" id="vc-author" placeholder="Your name" value="${d(i)}" />
      <input type="text" class="vc-input" id="vc-name" placeholder="Version name" />
      <input type="text" class="vc-input" id="vc-key" placeholder="Preview key (auto-generated)" />

      <div class="vc-btn-row" style="flex-wrap: wrap; gap: 8px;">
        <button class="vc-btn" id="vc-cancel">Cancel</button>
        <button class="vc-btn vc-btn-primary" id="vc-push-shopify" ${f?`disabled`:``}>
          ${f?`Pushing...`:l===`all`?`Push All`:`Push ${l}`}
        </button>
      </div>
    `;let s=n.querySelector(`#vc-section-select`);s.addEventListener(`change`,()=>{l=s.value,h()}),n.querySelector(`#vc-cancel`).addEventListener(`click`,r);let u=n.querySelector(`#vc-name`),g=n.querySelector(`#vc-key`);u&&u.addEventListener(`input`,()=>{if(g&&!g.dataset.manual){let e=u.value.trim().toLowerCase().replace(/[^a-z0-9]+/g,`-`).replace(/^-|-$/g,``),t=(l===`all`?`all`:l).toLowerCase();g.value=e?`${t}-${e}`:``}}),g&&g.addEventListener(`input`,()=>{g.dataset.manual=`true`}),n.querySelector(`#vc-push-shopify`).addEventListener(`click`,async()=>{let t=n.querySelector(`#vc-author`).value.trim(),i=n.querySelector(`#vc-name`).value.trim(),a=n.querySelector(`#vc-key`).value.trim();if(!t||!i){alert(`Please fill in both fields`);return}f=!0,h();let s=p(e.address.projectId)??{},c,u;if(l===`all`)c=s,u=`all`;else{let e=s.sheetsById;c={sheetsById:{[l]:e?.[l]},definitionVersion:s.definitionVersion,revisionHistory:s.revisionHistory},u=l}let d=await T({state:c,name:i,section:u,author:t,projectName:e.address.projectId,key:a||void 0});d.success?(v(t),o(),r(),m(l===`all`?`Pushed all sections to Shopify!`:`Pushed ${l} to Shopify!`)):(f=!1,h(),alert(`Push failed: ${d.error}`))})};h(),n.querySelector(`#vc-author`)?.focus()}async function D(e){try{let t=new URLSearchParams({action:`list`});e&&t.set(`section`,e);let n=await fetch(`${f()}/theatre-api?${t}`);return n.ok?await n.json():{success:!1,error:`HTTP ${n.status}`}}catch(e){return{success:!1,error:e.message}}}function O(e){if(!e||typeof e!=`object`)return!1;let t=e;return typeof t.sheetsById==`object`&&t.sheetsById!==null}async function k(){let e=i();if(e.size===0)return null;let t=await Promise.all(Array.from(e.entries()).map(async([e,t])=>{try{let n=await fetch(t);if(!n.ok)return null;let r=await n.json();return O(r)?{name:e,state:r}:null}catch{return null}})),r={};for(let e of t){if(!e)continue;let{name:t,state:n}=e,i=n.sheetsById[t]??n.sheetsById.Scene??Object.values(n.sheetsById)[0];i&&(r[t]=i)}return Object.keys(r).length===0?null:{definitionVersion:n,revisionHistory:[],sheetsById:r}}function A(e,t){let{modal:n,close:r}=u(),a=[],o=null,s=t??`all`,c=!0,l=!1,f=!1,h=null,g=t??null,_=i().size>0,v=()=>{let t=s===`all`?a:a.filter(e=>e.section===s||e.section===`all`),i=t.length>0?t.map(e=>`
              <div class="vc-state-row ${e.handle===o?`selected`:``}" data-handle="${d(e.handle)}">
                <span class="vc-state-section-tag" style="border-color:#66666655; color:#999">${d(e.section||`—`)}</span>
                <div style="flex:1;min-width:0">
                  <div class="vc-state-name">${d(e.name)}</div>
                  <div class="vc-state-meta">${d(e.author)} · ${d(e.version)}${e.key?` · key: ${d(e.key)}`:``}</div>
                </div>
              </div>`).join(``):`<div class="vc-empty">${c?`Loading…`:`No versions found for ${g??`this section`}`}</div>`,u=g?`<div style="color:#fff;font-size:12px;font-weight:600;margin-bottom:12px;font-family:'SF Mono',monospace;text-transform:uppercase;letter-spacing:0.5px">${d(g)}</div>`:``;n.innerHTML=`
      <h2>Pull Version</h2>
      ${u}
      ${_?`<div class="vc-deploy-row">
          <span class="vc-deploy-label">Current production state</span>
          <button class="vc-btn-deploy" id="vc-match-deploy" ${f?`disabled`:``}>
            ${f?`Loading…`:`Match Deploy`}
          </button>
        </div>`:``}
      <div class="vc-section-title">${_?`Or select`:`Select`} a version to load into the editor</div>
      ${h?`<div style="color:#f44;font-size:11px;margin-bottom:12px">${d(h)}</div>`:``}
      <div class="vc-state-list">${i}</div>
      <div class="vc-btn-row">
        <button class="vc-btn" id="vc-cancel">Cancel</button>
        <button class="vc-btn vc-btn-primary" id="vc-pull-confirm" ${!o||l?`disabled`:``}>
          ${l?`Pulling…`:`Pull`}
        </button>
      </div>
    `,n.querySelectorAll(`.vc-state-row`).forEach(e=>{e.addEventListener(`click`,()=>{o=e.getAttribute(`data-handle`),v()})}),n.querySelector(`#vc-cancel`).addEventListener(`click`,r),n.querySelector(`#vc-match-deploy`)?.addEventListener(`click`,async()=>{f=!0,h=null,v();let e=await k();if(!e){f=!1,h=`Failed to fetch deployed state from CDN`,v();return}r(),m(`Loading deployed state…`),y(),S({...e}),w(`deploy`,`Production Deploy`),setTimeout(()=>window.location.reload(),100)}),n.querySelector(`#vc-pull-confirm`).addEventListener(`click`,async()=>{if(!o)return;l=!0,h=null,v();let t=a.find(e=>e.handle===o);if(!t||!t.fileUrl){l=!1,h=`No file URL available for this version`,v();return}let n=t.section!==`all`;r(),m(n?`Loading ${t.section} from "${t.name}"…`:`Loading "${t.name}"…`);let i;n&&(i=p(e.address.projectId));let s;try{let e=await fetch(t.fileUrl);e.ok&&(s=await e.json())}catch{}y(),s&&S(s),w(t.fileUrl,t.name,n?t.section:void 0,i),setTimeout(()=>window.location.reload(),100)})};v(),D(t).then(e=>{c=!1,e.success&&e.states?a=e.states:h=e.error||`Failed to load states`,v()})}var j=!1,M=null;function N(e){M=e}function P(e){if(!M)return[];let t=p(e.address.projectId)?.sheetsById;if(!t)return[];let n=new Set([...Object.keys(M),...Object.keys(t)]),r=[];for(let e of n)JSON.stringify(M[e]||null)!==JSON.stringify(t[e]||null)&&r.push(e);return r}function F(){let e=document.querySelector(`[data-vc-push-button]`);if(!e)return;let t=e.querySelector(`.vc-unsaved-dot`);j&&!t?(t=document.createElement(`span`),t.className=`vc-unsaved-dot`,e.appendChild(t),e.style.position=`relative`):!j&&t&&t.remove()}function I(){j||(j=!0,F())}function L(){j=!1,F()}function R(){let e=()=>{let e=document.querySelector(`[title="Push Version"]`);if(!e)return!1;let n=document.createElement(`span`);return n.style.cssText=`
      color: #666;
      font-family: 'SF Mono', monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 0 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    `,n.textContent=`SECTION: ${r}`,e.parentElement?.insertBefore(n,e),t(n),!0};if(e())return;let n=new MutationObserver(()=>{e()&&n.disconnect()});n.observe(document.body,{childList:!0,subtree:!0})}var z=!1;function B(e){z||(z=!0,l(),setTimeout(()=>{document.addEventListener(`pointerup`,e=>{let t=e.target;(t.closest(`[class*="theatre"]`)||t.closest(`[data-theatre]`)||t.closest(`.vc-`)===null)&&!t.closest(`.vc-overlay`)&&t.closest(`[class*="theatre"]`)&&I()})},1e3),o.default.extend({id:`version-control`,toolbars:{global(t){return t([{type:`Icon`,title:`Pull Version`,svgSource:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`,onClick:()=>A(e,r)},{type:`Icon`,title:`Push Version`,svgSource:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,onClick:()=>E(e,{activeSheetId:r,changedSections:P(e),onPushSuccess:L})}]),()=>{}}}}),setTimeout(()=>{document.querySelectorAll(`[class*="theatre"] button`).forEach(e=>{e.getAttribute(`title`)===`Push Version`&&e.setAttribute(`data-vc-push-button`,`true`)})},500),R())}export{p as a,b as i,B as initVersionControlExtension,x as n,C as r,N as setInitialSheetsById,y as t};
