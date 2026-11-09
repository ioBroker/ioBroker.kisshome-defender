import{createRoot as e,useEffect as t,useRef as n,useState as r,Fragment as i,jsx as a,jsxs as o}from"../../../lib/esm/react-19.js";var s=`iob-dialog-close`;function c(e){return!!e.form}var l=[`header`,`staticText`,`divider`];function u(e,t){return e==null?``:typeof e==`object`?e[t]||e.en||Object.values(e).find(e=>!!e)||``:String(e)}function d(e){let t={};for(let[n,r]of Object.entries(e.items||{}))r&&!l.includes(r.type)&&(t[n]=r.type);return t}function f(e){return typeof e==`string`?e:typeof e==`number`||typeof e==`boolean`?e.toString():JSON.stringify(e)}function p(e,t){if(t!=null)switch(e){case`number`:case`slider`:{if(typeof t==`number`)return Number.isFinite(t)?t:void 0;let e=f(t).trim().replace(`,`,`.`);if(!e)return;let n=Number(e);return Number.isFinite(n)?n:void 0}case`checkbox`:return t===!0||t===`true`||t===1||t===`1`;default:return f(t)}}function m(e,t){let n={};for(let[r,i]of Object.entries(e)){let e=p(i,t[r]);e!==void 0&&(n[r]=e)}return n}var h=`"Roboto", "Helvetica", "Arial", sans-serif`,g=Object.freeze({type:`light`,primary:`#3399CC`,primaryContrast:`#FFFFFF`,secondary:`#164477`,secondaryContrast:`#FFFFFF`,background:`#FFFFFF`,paper:`#FFFFFF`,text:`rgba(0, 0, 0, 0.87)`,textSecondary:`rgba(0, 0, 0, 0.6)`,divider:`rgba(0, 0, 0, 0.12)`,error:`#D32F2F`,warning:`#ED6C02`,info:`#0288D1`,success:`#2E7D32`,fontFamily:h,fontSize:14,borderRadius:4}),_=Object.freeze({type:`dark`,primary:`#4DABF5`,primaryContrast:`rgba(0, 0, 0, 0.87)`,secondary:`#436A93`,secondaryContrast:`#FFFFFF`,background:`#121212`,paper:`#121212`,text:`#FFFFFF`,textSecondary:`rgba(255, 255, 255, 0.7)`,divider:`rgba(255, 255, 255, 0.12)`,error:`#F44336`,warning:`#FFA726`,info:`#29B6F6`,success:`#66BB6A`,fontFamily:h,fontSize:14,borderRadius:4}),v=[`primary`,`primaryContrast`,`secondary`,`secondaryContrast`,`background`,`paper`,`text`,`textSecondary`,`divider`,`error`,`warning`,`info`,`success`,`fontFamily`],y=[`fontSize`,`borderRadius`];function b(e){return{...e===`dark`?_:g}}function x(e){if(!e||typeof e!=`object`)return b(typeof e==`string`?e:`light`);let t=e,n=b(typeof t.type==`string`?t.type:`light`);for(let e of v){let r=t[e];typeof r==`string`&&r.trim()&&(n[e]=r.trim())}for(let e of y){let r=t[e],i=typeof r==`string`?parseFloat(r):r;typeof i==`number`&&Number.isFinite(i)&&i>=0&&(n[e]=i)}return n}function S(e,t){return e.type===t.type&&v.every(n=>e[n]===t[n])&&y.every(n=>e[n]===t[n])}function C(e){return`--iob-${e.replace(/[A-Z]/g,e=>`-${e.toLowerCase()}`)}`}function w(e){let t={};for(let n of v)t[C(n)]=e[n];for(let n of y)t[C(n)]=`${e[n]}px`;return t[`color-scheme`]=e.type,t}var ee={ok:{en:`OK`,"zh-cn":`确定`},cancel:{en:`Cancel`,de:`Abbrechen`,ru:`Отмена`,pt:`Cancelar`,nl:`Annuleren`,fr:`Annuler`,it:`Annulla`,es:`Cancelar`,pl:`Anuluj`,uk:`Скасувати`,"zh-cn":`取消`},close:{en:`Close`,de:`Schließen`,ru:`Закрыть`,pt:`Fechar`,nl:`Sluiten`,fr:`Fermer`,it:`Chiudi`,es:`Cerrar`,pl:`Zamknij`,uk:`Закрити`,"zh-cn":`关闭`}},te=`
dialog {
    box-sizing: border-box;
    width: 480px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    padding: 0;
    border: 0;
    border-radius: calc(var(--iob-border-radius) * 2);
    background: var(--iob-paper);
    color: var(--iob-text);
    font-family: var(--iob-font-family);
    font-size: var(--iob-font-size);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
/* as the dialogs of MUI: a dark paper gets lighter the higher it lies */
dialog.dark { background-image: linear-gradient(rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.16)); }
dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
dialog:focus { outline: none; }
form { display: flex; flex-direction: column; height: 100%; max-height: inherit; margin: 0; }
header { display: flex; align-items: center; gap: 8px; padding: 12px 8px 12px 16px; font-size: 1.15em; font-weight: 500; }
header span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.body { flex: 1; min-height: 0; padding: 0 16px 16px; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 16px; }
button { font: inherit; padding: 6px 16px; border-radius: var(--iob-border-radius); border: 1px solid var(--iob-primary); background: transparent; color: var(--iob-primary); cursor: pointer; }
button.primary { background: var(--iob-primary); color: var(--iob-primary-contrast); }
button.close { border: 0; padding: 2px 8px; font-size: 1.4em; line-height: 1; color: var(--iob-text-secondary); }
label { display: flex; flex-direction: column; gap: 4px; }
label.check { flex-direction: row; align-items: center; gap: 8px; }
input, select, textarea { font: inherit; accent-color: var(--iob-primary); }
.help { color: var(--iob-text-secondary); font-size: 0.85em; }
h3 { margin: 4px 0 0; font-size: 1em; }
p { margin: 0; }
hr { width: 100%; border: 0; border-top: 1px solid var(--iob-divider); margin: 0; }
[hidden] { display: none !important; }
`;function ne(e){if(!e)return null;try{let t=Function(`data`,`return (${e});`);return e=>{try{return!!t(e)}catch{return!1}}}catch{return null}}function T(e){return typeof e==`string`?e:typeof e==`number`||typeof e==`boolean`?String(e):``}function re(e){let{input:t,setting:n}=e;if(t)return t instanceof HTMLInputElement&&t.type===`checkbox`?t.checked:t instanceof HTMLSelectElement?n.options?.[t.selectedIndex]?.value:t.value}function ie(e,t,n,r,i){let a={name:t,setting:n,box:e.createElement(`div`),hidden:ne(n.hidden),disabled:ne(n.disabled)},o=u(n.label,i);switch(n.type){case`header`:return a.box=e.createElement(`h3`),a.box.textContent=u(n.text,i)||o,a;case`staticText`:return a.box=e.createElement(`p`),a.box.textContent=u(n.text,i)||o,a;case`divider`:return a.box=e.createElement(`hr`),a}let s=e.createElement(`label`);a.box=s;let c=e.createElement(`span`);if(c.textContent=o||t,n.type===`checkbox`){let t=e.createElement(`input`);t.type=`checkbox`,t.checked=r===!0||r===`true`,s.className=`check`,s.append(t,c),a.input=t}else if(n.type===`select`){let t=e.createElement(`select`);for(let r of n.options||[]){let n=e.createElement(`option`);n.textContent=u(r.label,i),t.append(n)}let o=(n.options||[]).findIndex(e=>String(e.value)===T(r));t.selectedIndex=o===-1?0:o,s.append(c,t),a.input=t}else if(n.type===`text`&&(n.minRows||1)>1){let t=e.createElement(`textarea`);t.rows=n.minRows||2,t.value=T(r),s.append(c,t),a.input=t}else{let t=e.createElement(`input`),i=T(r);switch(n.type){case`number`:case`slider`:t.type=n.type===`slider`?`range`:`number`,n.min!==void 0&&(t.min=String(n.min)),n.max!==void 0&&(t.max=String(n.max)),t.step=n.step===void 0?`any`:String(n.step);break;case`password`:t.type=`password`;break;case`color`:t.type=!i||/^#[0-9a-f]{6}$/i.test(i)?`color`:`text`;break;default:t.type=`text`}if(t.value=i,t.type===`range`){let n=e.createElement(`output`);n.textContent=t.value,t.addEventListener(`input`,()=>n.textContent=t.value),c.append(`: `,n)}s.append(c,t),a.input=t}if(n.help){let t=e.createElement(`span`);t.className=`help`,t.textContent=u(n.help,i),s.append(t)}return a}function ae(e,t={}){let n=t.lang||`en`,r=document,i=e=>ee[e][n]||ee[e].en||e,a=r.createElement(`div`);a.setAttribute(`data-iob-dialog`,``);let o=a.attachShadow({mode:`open`}),l=r.createElement(`style`);l.textContent=te;let f=r.createElement(`dialog`),p=x(t.theme);f.className=p.type===`dark`?`dark`:``;for(let[e,t]of Object.entries(w(p)))f.style.setProperty(e,t);e.width&&(f.style.width=`${e.width}px`),e.height&&(f.style.height=`${e.height}px`);let h=r.createElement(`form`),g=r.createElement(`header`),_=r.createElement(`span`);_.textContent=u(e.title,n);let v=r.createElement(`button`);v.type=`button`,v.className=`close`,v.title=i(`close`),v.setAttribute(`aria-label`,i(`close`)),v.textContent=`×`,g.append(_,v);let y=r.createElement(`div`);return y.className=`body`,h.append(g,y),f.append(h),o.append(l,f),new Promise(t=>{let l=!1,p=e=>{l||(l=!0,f.open&&f.close(),a.remove(),t(e))};if(v.addEventListener(`click`,()=>p(null)),f.addEventListener(`close`,()=>p(null)),h.addEventListener(`submit`,e=>e.preventDefault()),c(e)){let t={},a=[];for(let[t,i]of Object.entries(e.form.items||{})){let o=e.data?.[t]??i.default,s=ie(r,t,i,o,n);a.push(s),y.append(s.box)}let o=()=>{for(let e of a)e.input&&(t[e.name]=re(e));return t},s=()=>{let e=o();for(let t of a)t.box.hidden=t.hidden?t.hidden(e):!1,t.input&&(t.input.disabled=t.disabled?t.disabled(e):!1)};h.addEventListener(`input`,s),h.addEventListener(`change`,s),s();let c=a.find(e=>e.input&&!e.box.hidden&&!e.input.disabled);c?.input&&(c.input.autofocus=!0);let l=r.createElement(`footer`),f=r.createElement(`button`);f.type=`button`,f.textContent=u(e.cancel,n)||i(`cancel`),f.addEventListener(`click`,()=>p(null));let g=r.createElement(`button`);g.type=`submit`,g.className=`primary`,g.textContent=u(e.ok,n)||i(`ok`),l.append(f,g),h.append(l),h.addEventListener(`submit`,()=>p(m(d(e.form),o())))}else y.append(e.element),f.addEventListener(s,e=>p(e.detail??null));r.body.append(a),f.showModal(),o.activeElement&&o.activeElement!==v||(f.tabIndex=-1,f.focus())})}function E(e){return[...new Set(e.filter(e=>typeof e==`string`&&!!e))]}var oe=[`socket`,`dialogs`,`theme`,`editMode`,`settings`,`value`],se=class extends HTMLElement{states={};objects={};#e=null;#t={};#n=x(`light`);#r=!1;#i=null;#a=void 0;#o=null;#s=!1;#c=(e,t)=>{this.#o?.states.includes(e)&&(this.states[e]=t||null,this.#_())};#l=(e,t)=>{this.#o?.objects.includes(e)&&(this.objects[e]=t||null,this.#d())};get socket(){return this.#e}set socket(e){this.#e=e||null,this.#d()}get settings(){return this.#t}set settings(e){this.#t=e||{},this.#d()}get theme(){return this.#n}set theme(e){let t=x(e);S(t,this.#n)||(this.#n=t,this.#u(),this.#_())}get editMode(){return this.#r}set editMode(e){let t=!!e;t!==this.#r&&(this.#r=t,this.#_())}get dialogs(){return this.#i}set dialogs(e){this.#i=e||null}get value(){return this.#a}set value(e){e!==this.#a&&(this.#a=e,this.#_())}connectedCallback(){for(let e of oe)if(Object.prototype.hasOwnProperty.call(this,e)){let t=this[e];delete this[e],this[e]=t}this.#u(),this.#d()}disconnectedCallback(){this.#g()}getStateIds(e){return[]}getObjectIds(e){return[]}get systemLang(){return this.#e?.systemLang||`en`}text(e){return u(e,this.systemLang)}setState(e,t){return this.#e&&!this.#r?this.#e.setState(e,t):Promise.resolve()}changeValue(e){return this.#r||this.emit(`iob-change`,e)?!1:(this.value=e,!0)}emit(e,t){return this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0,cancelable:!0}))}async openDialog(e){if(this.#r)return null;let t=this.#i?await this.#i.open(e):await ae(e,{lang:this.systemLang,theme:this.#n});return c(e)?t&&typeof t==`object`?m(d(e.form),t):null:t??null}#u(){for(let[e,t]of Object.entries(w(this.#n)))this.style.setProperty(e,t)}#d(){if(!this.isConnected)return;let e=this.#e,t=e?E(this.getStateIds(this.#t)):[],n=e?E(this.getObjectIds(this.#t)):[];this.#o&&this.#o.socket!==e&&this.#g();let r=this.#o?.states||[],i=this.#o?.objects||[],a=r.filter(e=>!t.includes(e)),o=i.filter(e=>!n.includes(e)),s=t.filter(e=>!r.includes(e)),c=n.filter(e=>!i.includes(e));e&&a.length&&e.unsubscribeState(a,this.#c),e&&o.length&&this.#h(e,o);for(let e of a)delete this.states[e];for(let e of[...a,...o])!t.includes(e)&&!n.includes(e)&&delete this.objects[e];this.#o=e&&(t.length||n.length)?{socket:e,states:t,objects:n}:null,e&&s.length&&this.#p(e,s),e&&c.length&&this.#m(e,c),this.#_()}#f(e,t,n){return this.#o?.socket===e&&this.#o[t].includes(n)}#p(e,t){e.subscribeState(t,this.#c).catch(e=>console.warn(`<${this.localName}>: cannot subscribe ${t.join(`, `)}: ${e}`));for(let n of t)e.getState(n).then(t=>{this.#f(e,`states`,n)&&this.states[n]===void 0&&(this.states[n]=t||null,this.#_())}).catch(()=>{}),e.getObject(n).then(t=>{this.#f(e,`states`,n)&&!this.#f(e,`objects`,n)&&(this.objects[n]=t||null,this.#_())}).catch(()=>{})}#m(e,t){e.subscribeObject(t,this.#l).catch(e=>console.warn(`<${this.localName}>: cannot subscribe the objects ${t.join(`, `)}: ${e}`));for(let n of t)e.getObject(n).then(t=>{this.#f(e,`objects`,n)&&(this.objects[n]=t||null,this.#d())}).catch(()=>{})}#h(e,t){e.unsubscribeObject(t,this.#l).catch(()=>{})}#g(){if(this.#o){let{socket:e,states:t,objects:n}=this.#o;t.length&&e.unsubscribeState(t,this.#c),n.length&&this.#h(e,n),this.#o=null}this.states={},this.objects={}}#_(){this.#s||(this.#s=!0,queueMicrotask(()=>{this.#s=!1,this.isConnected&&this.render()}))}};function ce(e,t){let n=typeof e==`string`?e:e.tag;customElements.get(n)||customElements.define(n,t)}var D=`iob-kisshome-defender`,O=`kisshome-defender`,k=[`status`,`statistics`,`detections`,`settings`],le=[`analysis.lastSeen`,`analysis.lastShownAlert`,`analysis.lastCreated`,`analysis.running`,`ids.status`,`ids.group`,`ids.period`,`recording.enabled`,`recording.running`,`recording.capturedFull`,`recording.nextWrite`,`recording.triggerWrite`];function A(e){let t=(e||``).trim().replace(/^system\.adapter\./,``);return/^\d+$/.test(t)?`${O}.${t}`:RegExp(`^${`kisshome-defender`.replace(/-/g,`\\-`)}\\.\\d+$`).test(t)?t:null}function j(e,t){return`${e}.info.${t}`}function M(e){return`system.adapter.${e}.alive`}function ue(e){return`system.adapter.${e}`}var N=1073741824,P=1048576,F=1024;function I(e,t,n){return e==null||isNaN(e)?`--`:t!==void 0&&t>N?`${(e/N).toFixed(1).replace(`.`,`,`)} GB`:t!==void 0&&t>P?`${(e/P).toFixed(t>12*P&&n?0:1).replace(`.`,`,`)} MB`:e<F?`${e} B`:t===void 0?e<P?`${(e/F).toFixed(+!n).replace(`.`,`,`)} KB`:e<N?`${(e/P).toFixed(+!n).replace(`.`,`,`)} MB`:`${(e/N).toFixed(+!n).replace(`.`,`,`)} GB`:e<1048576?`${(e/F).toFixed(t>12*F&&n?0:1).replace(`.`,`,`)} KB`:e<N?`${(e/P).toFixed(t>12*P&&n?0:1).replace(`.`,`,`)} MB`:`${(e/N).toFixed(t>12*N&&n?0:1).replace(`.`,`,`)} GB`}function de(e){if(e>P){let t=Math.ceil(e/P),n=10**Math.floor(Math.log10(t));return Math.ceil(t/n)*n*P}if(e<F)return F*5;let t=Math.ceil(e/F),n=10**Math.floor(Math.log10(t));return Math.ceil(t/n)*n*F}function L(e){let t=Number(e)||0,n=Math.floor(t/3600),r=Math.floor(t%3600/60),i=Math.floor(t%3600%60);return`${n>0?`${n}:`:``}${n?r.toString().padStart(2,`0`):r}:${i.toString().padStart(2,`0`)}`}function R(e){return`${Math.floor(e/60)}:${(e%60).toString().padStart(2,`0`)}`}function z(e,t){let n=e.filter(e=>e.isAlert);if(!t)return n.length;let r=n.findIndex(e=>e.uuid===t);return r===-1?n.length:n.length-r-1}function B(e){for(let t=(e?.length||0)-1;t>=0;t--)if(e[t].isAlert)return e[t];return null}function fe(e){for(let t=(e?.length||0)-1;t>=0;t--)if(!e[t].todayReport)return e[t];return null}function pe(e,t,n){let r={};for(let n of e.detections||[]){let i=n.mac.toLowerCase(),a=t?.[i];r[i]||={mac:i,name:a&&(a.desc||a.ip)||``,alert:!1,score:0,description:[],packets:null};let o=r[i];n.ml&&(o.score=Math.max(o.score,n.ml.score),o.alert=n.ml.type===`Alert`,n.ml.description&&o.alert&&o.description.push(n.ml.description));for(let e of n.suricata||[])o.score=Math.max(o.score,e.score),o.alert=e.type===`Alert`||o.alert,e.description&&e.type===`Alert`&&o.description.push(e.description);let s=e.statistics?.devices?.find(e=>e.mac.toLowerCase()===i);o.packets=s?.data_volume?s.data_volume.packet_count:null}return Object.values(r).sort((e,t)=>{let r=e.score||0,i=t.score||0;return n&&(r=+(r>=10),i=+(i>=10)),r&&i&&r!==i?i-r:r&&!i?-1:!r&&i?1:e.name&&t.name&&e.name!==t.name?e.name.localeCompare(t.name):e.name&&!t.name?-1:!e.name&&t.name?1:e.mac.localeCompare(t.mac)})}function me(e,t){let n=new Date(t);n.setHours(0,0,0,0);let r=e.filter(e=>new Date(e.time).getTime()>=n.getTime()).map(e=>(e.statistics?.analysisDurationMs||0)/1e3);if(!r.length)return null;let i=r.reduce((e,t)=>e+t,0);return{average:i/r.length,min:Math.min(...r),max:Math.max(...r),total:i}}function he(e){let t=[],n=/<strong>(.*?)<\/strong>/gi,r=0;for(let i=n.exec(e);i;i=n.exec(e))i.index>r&&t.push({text:e.substring(r,i.index),strong:!1}),t.push({text:i[1],strong:!0}),r=i.index+i[0].length;return r<e.length&&t.push({text:e.substring(r),strong:!1}),t}function ge(e,t,n,r){if(!e?.common)return``;let i=e.common.host,a=t.find(e=>e.common.enabled&&e.common.host===i)||t.find(e=>e.common.enabled)||t[0];if(!a)return``;let o=a.common.host===i?r:a.common.host;return`http${a.native.secure?`s`:``}://${o}:${a.native.port}/#tab-instances/config/system.adapter.${n}/_instances`}var _e={check:`M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z`,close:`M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z`,warning:`M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z`,info:`M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z`,expand:`M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z`,shield:`M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z`,chart:`M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z`,bell:`M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z`,settings:`M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z`,openInNew:`M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z`};function V({name:e,className:t}){return/* @__PURE__ */ a(`svg`,{className:t,viewBox:`0 0 24 24`,"aria-hidden":`true`,children:/* @__PURE__ */ a(`path`,{d:_e[e]})})}function H(e){let t=e.size?{width:e.size,height:e.size}:void 0;return!e.ok&&e.warning?/* @__PURE__ */ a(`span`,{className:`status-icon warning`,style:t,title:e.title,children:/* @__PURE__ */ a(V,{name:`warning`})}):/* @__PURE__ */ a(`span`,{className:`status-icon ${e.ok?`ok`:`bad`}`,style:t,title:e.title,children:/* @__PURE__ */ a(V,{name:e.ok?`check`:`close`})})}var U=[`#5470c6`,`#91cc75`,`#fac858`,`#ee6666`,`#73c0de`,`#3ba272`,`#fc8452`,`#9a60b4`,`#ea7ccc`],W=1e3,ve=864e5;function ye({series:e,start:t,end:n,lang:s,yName:c}){let[l,u]=r(null),d=0;for(let t of e)for(let e of t.points)d=Math.max(d,e[1]);let f=de(d),p=n-t||1,m=e=>(e-t)/p*W,h=e=>W-e/f*W,g=[0,1,2,3,4,5].map(e=>f*e/5),_=g.map(e=>I(Math.round(e),f,!0)),v=[];for(let e=t;e<=n;e+=ve)v.push(e);return/* @__PURE__ */ o(`div`,{className:`chart`,children:[/* @__PURE__ */ a(`div`,{className:`chart-name`,children:c}),/* @__PURE__ */ o(`div`,{className:`y-axis`,children:[/* @__PURE__ */ a(`span`,{className:`sizer`,children:_.reduce((e,t)=>t.length>e.length?t:e,``)}),_.map((e,t)=>/* @__PURE__ */ a(`span`,{className:`tick`,style:{bottom:`${t*20}%`},children:e},t))]}),/* @__PURE__ */ o(`div`,{className:`plot`,onPointerMove:n=>{let r=n.currentTarget.getBoundingClientRect();if(!r.width)return;let i=t+(n.clientX-r.left)/r.width*p,a=null;for(let t of e)for(let e of t.points)(a===null||Math.abs(e[0]-i)<Math.abs(a-i))&&(a=e[0]);if(a===null){u(null);return}let o=[];for(let t of e){let e=t.points.find(e=>e[0]===a);e&&o.push({key:t.key,name:t.name,color:t.color,value:e[1]})}u({x:Math.min(1,Math.max(0,(a-t)/p)),time:a,values:o})},onPointerLeave:()=>u(null),children:[/* @__PURE__ */ o(`svg`,{viewBox:`0 0 ${W} ${W}`,preserveAspectRatio:`none`,"aria-hidden":`true`,children:[g.slice(1).map((e,t)=>/* @__PURE__ */ a(`line`,{className:`grid-line`,x1:0,x2:W,y1:h(e),y2:h(e)},`y${t}`)),v.slice(1,-1).map(e=>/* @__PURE__ */ a(`line`,{className:`grid-line`,x1:m(e),x2:m(e),y1:0,y2:W},`x${e}`)),e.map(e=>/* @__PURE__ */ a(`polyline`,{className:`series`,stroke:e.color,points:[...e.points].sort((e,t)=>e[0]-t[0]).map(e=>`${m(e[0]).toFixed(1)},${h(e[1]).toFixed(1)}`).join(` `)},e.key))]}),l?/* @__PURE__ */ o(i,{children:[/* @__PURE__ */ a(`div`,{className:`cursor`,style:{left:`${l.x*100}%`}}),/* @__PURE__ */ o(`div`,{className:`tooltip`,style:l.x>.5?{right:`${(1-l.x)*100+1}%`}:{left:`${l.x*100+1}%`},children:[/* @__PURE__ */ a(`div`,{className:`tooltip-time`,children:new Date(l.time).toLocaleString(s)}),l.values.map(e=>/* @__PURE__ */ o(`div`,{className:`tooltip-row`,children:[/* @__PURE__ */ a(`span`,{className:`dot`,style:{background:e.color}}),/* @__PURE__ */ a(`span`,{className:`tooltip-name`,children:e.name}),/* @__PURE__ */ a(`b`,{children:I(e.value,d)})]},e.key))]})]}):null]}),/* @__PURE__ */ a(`div`,{}),/* @__PURE__ */ a(`div`,{className:`x-axis`,children:v.map(e=>/* @__PURE__ */ a(`span`,{style:{left:`${m(e)/W*100}%`},children:new Date(e).toLocaleDateString(s,{weekday:`short`})},e))})]})}function be({rows:e,categories:t,hidden:n,onToggle:r}){let i=t.filter(e=>!n[e.key]),s=e=>i.reduce((t,n)=>t+(e.values[n.key]||0),0),c=[...e].sort((e,t)=>s(t)-s(e)),l=Math.max(0,...c.map(s));return/* @__PURE__ */ o(`div`,{className:`bars`,children:[/* @__PURE__ */ a(`div`,{className:`legend`,children:t.map(e=>/* @__PURE__ */ o(`button`,{type:`button`,className:`chip${n[e.key]?` off`:``}`,onClick:()=>r(e.key),children:[/* @__PURE__ */ a(`span`,{className:`dot`,style:{background:e.color}}),e.name]},e.key))}),/* @__PURE__ */ a(`div`,{className:`bar-list`,children:c.map(e=>{let t=s(e);return/* @__PURE__ */ o(`div`,{className:`bar-row`,children:[/* @__PURE__ */ a(`span`,{className:`bar-name`,title:e.name,children:e.name}),/* @__PURE__ */ a(`span`,{className:`bar-track`,children:i.map(t=>e.values[t.key]?/* @__PURE__ */ a(`span`,{className:`segment`,title:`${t.name}: ${I(e.values[t.key],l)}`,style:{width:`${l?e.values[t.key]/l*100:0}%`,background:t.color}},t.key):null)}),/* @__PURE__ */ a(`span`,{className:`bar-total`,children:I(t,l)})]},e.key)})})]})}var xe=12e4,Se={status:`shield`,statistics:`chart`,detections:`bell`,settings:`settings`},G={status:`Status`,statistics:`Statistics`,detections:`Detections`,settings:`Settings`},K=[{type:`dataVolumePerDevice`,word:`By day`},{type:`dataVolumePerDay`,word:`By day (aggregated)`},{type:`dataVolumePerCountry`,word:`By country`},{type:`dataVolumePerDaytime`,word:`By day-time`}],Ce=[`0-6`,`6-12`,`12-18`,`18-24`];function q(e){try{return window.localStorage.getItem(e)}catch{return null}}function J(e,t){try{t===null?window.localStorage.removeItem(e):window.localStorage.setItem(e,t)}catch{}}function we(e,n){let[i,a]=r(()=>Date.now());return t(()=>{if(!e)return;let t=setInterval(()=>a(Date.now()),n);return()=>clearInterval(t)},[e,n]),i}function Y({text:e,editMode:t}){return/* @__PURE__ */ o(`div`,{className:`app hint${t?` edit`:``}`,children:[/* @__PURE__ */ a(V,{name:`shield`}),/* @__PURE__ */ a(`div`,{children:e})]})}function Te({parts:e}){return/* @__PURE__ */ a(i,{children:e.map((e,t)=>e.strong?/* @__PURE__ */ a(`strong`,{children:e.text},t):/* @__PURE__ */ a(`span`,{children:e.text},t))})}function Ee(e){let t=e.unseen?`${e.t(`New problem detected`)}: ${e.unseen}`:e.t(`Everything OK`),n=/* @__PURE__ */ o(i,{children:[e.button||/* @__PURE__ */ a(`span`,{}),/* @__PURE__ */ a(`span`,{className:`summary-text`,children:t}),/* @__PURE__ */ a(H,{ok:!e.unseen,warning:!0,size:`2.2em`})]});return e.onClick?/* @__PURE__ */ a(`button`,{type:`button`,className:`panel summary clickable`,onClick:e.onClick,children:n}):/* @__PURE__ */ a(`div`,{className:`panel summary`,children:n})}function De(e){let{t,values:n}=e,r=e.results?.results||[],s=z(r,n.lastSeenID),c=``;n.alive?n.idsStatus===`Error`?c=t(`engineExited`):n.recordingRunning||(c=t(`Recording is not running. Please check the log for more details`)):c=t(`Instance is not running`);let l=n.idsStatus===`Error`||n.idsStatus===`Exited`?`bad`:n.idsStatus===`No connection`||!n.idsStatus||n.idsStatus===`Unknown`?`warn`:`good`;return/* @__PURE__ */ o(i,{children:[/* @__PURE__ */ o(`div`,{className:`panel status-main`,children:[/* @__PURE__ */ a(`div`,{className:`status-rows`,children:n.alive?/* @__PURE__ */ o(i,{children:[/* @__PURE__ */ o(`div`,{className:`status-row`,children:[/* @__PURE__ */ a(H,{ok:n.recordingRunning,title:c}),/* @__PURE__ */ a(`span`,{children:t(n.recordingRunning?`Software activated`:`Software not activated`)})]}),/* @__PURE__ */ o(`div`,{className:`status-row`,children:[/* @__PURE__ */ a(H,{ok:l===`good`}),/* @__PURE__ */ o(`span`,{children:[t(`Detection engine status`),`:`,` `,/* @__PURE__ */ a(`span`,{className:`engine ${l}`,children:t(n.idsStatus||`Unknown`)})]})]}),n.recordingRunning?/* @__PURE__ */ o(`div`,{className:`status-row`,children:[/* @__PURE__ */ a(`span`,{className:`spinner`,"aria-hidden":`true`}),/* @__PURE__ */ o(`span`,{children:[t(`Recording is running`),`:`,` `,/* @__PURE__ */ a(`span`,{className:`secondary`,children:t(`%s collected`,I(n.captured))})]})]}):null]}):/* @__PURE__ */ o(i,{children:[/* @__PURE__ */ o(`div`,{className:`status-row`,children:[/* @__PURE__ */ a(H,{ok:!1}),/* @__PURE__ */ a(`span`,{children:t(`Instance is not running`)})]}),e.adminLink?/* @__PURE__ */ o(`a`,{className:`link`,href:e.adminLink,target:`settings`,rel:`noreferrer`,children:[t(`Enable the instance in the admin`),/* @__PURE__ */ a(V,{name:`openInNew`})]}):null]})}),n.alive?/* @__PURE__ */ a(`button`,{type:`button`,className:`btn`,onClick:e.onToggleProtection,children:t(n.recordingEnabled?`Deactivate protection`:`Activate protection`)}):null]}),n.alive?/* @__PURE__ */ a(Ee,{t,unseen:s,onClick:r.length?e.onDetections:void 0}):null]})}function Oe(e){let{t,values:n}=e,s=e.results?.results||[],c=n.lastTriggerWrite+xe,[l,u]=r(!1),d=we(n.alive,l?1e3:15e3),f=c>d;if(f!==l&&u(f),!n.alive)return/* @__PURE__ */ a(`div`,{className:`panel`,children:/* @__PURE__ */ a(`p`,{children:t(`Instance is not running`)})});let p=fe(s),m=z(s,n.lastSeenID),h=``;if(n.recordingRunning){let e=Math.floor((n.nextWrite-d)/1e3);h=`${t(`In %s minutes or when the maximal file size is reached`,e>120?Math.round(e/60):(Math.round(e/6)/10).toString().replace(`.`,`,`))} (${t(`%s of %s reached`,I(n.captured),`50MB`)})`}return/* @__PURE__ */ o(i,{children:[/* @__PURE__ */ o(`div`,{className:`panel detections-main`,children:[p?/* @__PURE__ */ o(`div`,{className:`field`,children:[/* @__PURE__ */ o(`span`,{className:`field-name`,children:[t(`Last control`),`:`]}),/* @__PURE__ */ a(`span`,{children:new Date(p.time).toLocaleString()})]}):/* @__PURE__ */ o(`div`,{className:`field`,children:[/* @__PURE__ */ o(`span`,{className:`field-name`,children:[t(`Last result`),`:`]}),/* @__PURE__ */ a(`span`,{children:t(`No results yet exist`)})]}),n.recordingRunning?/* @__PURE__ */ o(`div`,{className:`field`,children:[/* @__PURE__ */ o(`span`,{className:`field-name`,children:[t(`Next control`),`:`]}),/* @__PURE__ */ a(`span`,{children:h})]}):null,n.recordingRunning?/* @__PURE__ */ o(`div`,{className:`trigger`,children:[/* @__PURE__ */ o(`button`,{type:`button`,className:`btn`,disabled:n.analysisRunning||f,onClick:e.onTrigger,children:[/* @__PURE__ */ a(`span`,{children:t(`Execute control now`)}),f?/* @__PURE__ */ a(`span`,{className:`btn-note`,children:t(`Try again in %s sec.`,Math.round((c-d)/1e3))}):null]}),n.analysisRunning?/* @__PURE__ */ a(`div`,{className:`progress`}):null]}):null]}),/* @__PURE__ */ a(Ee,{t,unseen:m,button:/* @__PURE__ */ a(`button`,{type:`button`,className:`btn`,disabled:!s.length,onClick:e.onShowResults,children:t(`Show results`)})})]})}function ke(e){let{t,values:n}=e,r=Math.round((e.saveThresholdSeconds||3600)/60);return/* @__PURE__ */ o(`div`,{className:`panel settings`,children:[e.adminLink?/* @__PURE__ */ o(`div`,{className:`field`,children:[/* @__PURE__ */ a(`span`,{className:`field-name`,children:t(`Manage monitored devices`)}),/* @__PURE__ */ o(`a`,{className:`link`,href:e.adminLink,target:`settings`,rel:`noreferrer`,children:[t(`Open in Admin`),/* @__PURE__ */ a(V,{name:`openInNew`})]})]}):null,/* @__PURE__ */ o(`label`,{className:`field`,children:[/* @__PURE__ */ a(`span`,{className:`field-name`,children:t(`Protection enabled`)}),/* @__PURE__ */ a(`input`,{type:`checkbox`,className:`switch`,checked:n.recordingEnabled,disabled:!n.alive,onChange:e.onToggleProtection})]}),/* @__PURE__ */ o(`div`,{className:`field`,children:[/* @__PURE__ */ a(`span`,{className:`field-name`,children:t(`Save threshold in seconds`)}),/* @__PURE__ */ a(`span`,{children:r===60?t(`one hour`):t(`%s minutes`,r)}),/* @__PURE__ */ a(`span`,{className:`secondary note`,children:t(`thresholdHint`)})]})]})}function X(e){return Object.keys(e).map((t,n)=>({mac:t,name:e[t].info?.desc||e[t].info?.ip||t,color:U[n%U.length]}))}function Ae(e){let{t:n,values:s,load:c,loadTotals:l}=e,[u,d]=r(()=>{let e=q(`kisshome-defender-tab.statisticsTab`);return K.find(t=>t.type===e)?.type||`dataVolumePerDay`}),[f,p]=r(null),[m,h]=r(null),[g,_]=r({}),[v,y]=r({}),b=`${u}/${s.lastCreated}`;if(t(()=>{if(!s.alive)return;let e=!1;return Promise.all([c(u),l()]).then(([t,n])=>{e||(p({type:u,key:b,data:t&&typeof t==`object`?t:{}}),h(n))}).catch(t=>{console.warn(`<iob-kisshome-defender>: cannot read the statistics: ${String(t)}`),e||p({type:u,key:b,data:null})}),()=>{e=!0}},[b,u,s.alive,c,l]),!s.alive)return/* @__PURE__ */ a(`div`,{className:`panel`,children:/* @__PURE__ */ a(`p`,{children:n(`Instance is not running`)})});let x=f?.key!==b,S=f?.type===u?f.data:null,C=null;if(S&&(u===`dataVolumePerDevice`||u===`dataVolumePerDay`)){let t=S,r=X(t),s=r.filter(e=>!g[e.mac]&&t[e.mac].series?.length).map(e=>({key:e.mac,name:e.name,color:e.color,points:t[e.mac].series})),c=/* @__PURE__ */ new Date;c.setHours(0,0,0,0),c.setDate(c.getDate()+1);let l=new Date(c);l.setDate(l.getDate()-7);let u=r.every(e=>!g[e.mac]);C=r.length?/* @__PURE__ */ o(i,{children:[/* @__PURE__ */ a(`div`,{className:`chart-area`,children:/* @__PURE__ */ a(ye,{series:s,start:l.getTime(),end:c.getTime(),lang:e.lang,yName:n(`Data volume`)})}),/* @__PURE__ */ o(`div`,{className:`legend`,children:[r.length>1?/* @__PURE__ */ a(`button`,{type:`button`,className:`chip${u?``:` off`}`,onClick:()=>_(u?Object.fromEntries(r.map(e=>[e.mac,!0])):{}),children:n(`All`)}):null,r.map(e=>/* @__PURE__ */ o(`button`,{type:`button`,title:e.mac,className:`chip${g[e.mac]?` off`:``}`,onClick:()=>_({...g,[e.mac]:!g[e.mac]}),children:[/* @__PURE__ */ a(`span`,{className:`dot`,style:{background:e.color}}),e.name]},e.mac))]})]}):null}else if(S&&(u===`dataVolumePerCountry`||u===`dataVolumePerDaytime`)){let e=[],t=[];if(u===`dataVolumePerCountry`){let n=S;for(let r of X(n)){let i=n[r.mac].countries||{};if(Object.keys(i).length){e.push({key:r.mac,name:r.name,values:i});for(let e of Object.keys(i))t.find(t=>t.key===e)||t.push({key:e,name:e,color:U[t.length%U.length]})}}}else{let n=S;Ce.forEach((e,n)=>t.push({key:String(n),name:e,color:U[n]}));for(let t of X(n))n[t.mac].dayTime&&e.push({key:t.mac,name:t.name,values:n[t.mac].dayTime})}C=e.length?/* @__PURE__ */ a(`div`,{className:`chart-area`,children:/* @__PURE__ */ a(be,{rows:e,categories:t,hidden:v,onToggle:e=>y({...v,[e]:!v[e]})})}):null}return/* @__PURE__ */ o(i,{children:[/* @__PURE__ */ a(`div`,{className:`subtabs`,children:K.map(e=>/* @__PURE__ */ a(`button`,{type:`button`,className:`chip${e.type===u?` active`:``}`,onClick:()=>{d(e.type),J(`kisshome-defender-tab.statisticsTab`,e.type)},children:n(e.word)},e.type))}),/* @__PURE__ */ o(`div`,{className:`panel statistics`,children:[/* @__PURE__ */ o(`div`,{className:`panel-title`,children:[/* @__PURE__ */ a(`span`,{className:`long`,children:n(`Statistics about Data-volume in the last week`)}),/* @__PURE__ */ a(`span`,{className:`short`,children:n(`Last week statistics`)})]}),x?/* @__PURE__ */ a(`div`,{className:`progress`}):null,C||(S?/* @__PURE__ */ a(`div`,{className:`empty`,children:n(`No data available`)}):null),u===`dataVolumePerCountry`&&C?/* @__PURE__ */ o(`div`,{className:`footnote`,children:[n(`ioBroker.kisshome-defender uses the IP2Location LITE database for`),` `,/* @__PURE__ */ a(`a`,{href:`https://lite.ip2location.com`,target:`_blank`,rel:`noreferrer`,children:n(`IP geolocation`)})]}):null]}),m?.dataVolumePerDevice||m?.deviceMostCountries?/* @__PURE__ */ o(`div`,{className:`panel totals`,children:[/* @__PURE__ */ o(`div`,{className:`totals-title`,children:[/* @__PURE__ */ o(`span`,{className:`long`,children:[n(`Statistics on aggregated transmitted data volume over the past 7 days`),`:`]}),/* @__PURE__ */ o(`span`,{className:`short`,children:[n(`Statistics over the past 7 days`),`:`]})]}),m.dataVolumePerDevice?/* @__PURE__ */ o(`div`,{children:[`- `,n(`Device with the highest transmitted data volume`),`:`,` `,/* @__PURE__ */ a(`strong`,{children:m.dataVolumePerDevice})]}):null,m.deviceMostCountries?/* @__PURE__ */ o(`div`,{children:[`- `,n(`Device that contacted the most countries`),`:`,` `,/* @__PURE__ */ a(`strong`,{children:m.deviceMostCountries})]}):null]}):null]})}function je(e){let{t,view:n}=e,r;return r=n===`statistics`?/* @__PURE__ */ a(Ae,{t,lang:e.lang,values:e.values,results:e.results,load:e.load,loadTotals:e.loadTotals}):n===`detections`?/* @__PURE__ */ a(Oe,{t,values:e.values,results:e.results,onTrigger:e.onTrigger,onShowResults:e.onShowResults}):n===`settings`?/* @__PURE__ */ a(ke,{t,values:e.values,results:e.results,adminLink:e.adminLink,saveThresholdSeconds:e.saveThresholdSeconds,onToggleProtection:e.onToggleProtection}):/* @__PURE__ */ a(De,{t,values:e.values,results:e.results,adminLink:e.adminLink,onToggleProtection:e.onToggleProtection,onDetections:()=>e.onView(`detections`)}),/* @__PURE__ */ o(`div`,{className:`app view-${n}${e.editMode?` edit`:``}`,inert:e.editMode,children:[/* @__PURE__ */ o(`div`,{className:`header`,children:[/* @__PURE__ */ a(`img`,{className:`logo`,src:e.logo,alt:``}),/* @__PURE__ */ a(`span`,{className:`brand`,children:`KISSHome`}),/* @__PURE__ */ a(`div`,{className:`tabs`,role:`tablist`,children:k.map(r=>/* @__PURE__ */ o(`button`,{type:`button`,role:`tab`,"aria-selected":r===n,title:t(G[r]),className:`tab${r===n?` active`:``}${r===`settings`?` last`:``}`,onClick:()=>e.onView(r),children:[/* @__PURE__ */ a(V,{name:Se[r]}),/* @__PURE__ */ a(`span`,{className:`label`,children:t(G[r])})]},r))})]}),/* @__PURE__ */ a(`div`,{className:`body`,children:r})]})}var Me=`kisshome-defender-alarms`;function Z(e,t){e?.dispatchEvent(new CustomEvent(s,{detail:t,bubbles:!0,composed:!0}))}function Ne({t:e,item:t,group:n,secondPeriod:r}){let i=t.todayReport;if(!i)return/* @__PURE__ */ a(`div`,{className:`details`,children:e(`No status report available.`)});let s=new Date(t.time).toLocaleDateString();return/* @__PURE__ */ o(`div`,{className:`details`,children:[/* @__PURE__ */ o(`div`,{className:`details-title`,children:[/* @__PURE__ */ a(V,{name:`info`}),e(`Status Report`)]}),r?/* @__PURE__ */ o(`div`,{className:`details-text`,children:[/* @__PURE__ */ a(`div`,{children:e(`Below you will find information about checks on %s.`,s)}),/* @__PURE__ */ o(`ul`,{children:[/* @__PURE__ */ o(`li`,{children:[/* @__PURE__ */ o(`strong`,{children:[e(`Average check time`),`:`]}),` `,`${R(Math.round(i.averageDuration/1e3))} ${e(`minutes`)}`]}),/* @__PURE__ */ o(`li`,{children:[/* @__PURE__ */ o(`strong`,{children:[e(`Minimum check time`),`:`]}),` `,`${R(Math.round(i.minimalDuration/1e3))} ${e(`minutes`)}`]}),/* @__PURE__ */ o(`li`,{children:[/* @__PURE__ */ o(`strong`,{children:[e(`Maximum check time`),`:`]}),` `,`${R(Math.round(i.maximalDuration/1e3))} ${e(`minutes`)}`]}),/* @__PURE__ */ o(`li`,{children:[/* @__PURE__ */ o(`strong`,{children:[e(`Duration of checks`),`:`]}),` `,`${R(Math.round(i.totalDuration/1e3))} ${e(`minutes`)}`]})]}),/* @__PURE__ */ a(`div`,{children:e(`No anomalies were detected during the checks. Therefore, everything is in order.`)})]}):/* @__PURE__ */ a(`div`,{className:`details-text`,children:/* @__PURE__ */ a(Te,{parts:he(n===`A`?e(`<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.`,s):e(`During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.`,s,i.maxScore))})})]})}function Pe({t:e,item:t,results:n,names:r,group:i,secondPeriod:s,now:c}){let l=new Date(t.time),u=i===`A`||s,d=t.isAlert?e(`Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.`,l.toLocaleDateString(),l.toLocaleTimeString()):e(`Your smart devices were checked on %s at %s. No unusual activities were detected.`,l.toLocaleDateString(),l.toLocaleTimeString()),f=s?me(n,c):null;s&&(d+=` ${e(`The control time was %s minutes.`,L(Math.round((t.statistics?.analysisDurationMs||0)/1e3)))}`);let p=pe(t,r,u);return/* @__PURE__ */ o(`div`,{className:`details`,children:[/* @__PURE__ */ o(`div`,{className:`details-title`,children:[/* @__PURE__ */ a(H,{ok:!t.isAlert,warning:!0,size:`1.6em`}),e(t.isAlert?`Unusual activity detected!`:`Everything is OK!`)]}),/* @__PURE__ */ a(`div`,{className:`details-text italic`,children:d}),f?/* @__PURE__ */ o(`div`,{className:`details-text`,children:[/* @__PURE__ */ o(`strong`,{children:[e(`Scan details (today)`),`:`]}),/* @__PURE__ */ o(`ul`,{children:[/* @__PURE__ */ o(`li`,{children:[/* @__PURE__ */ o(`strong`,{children:[e(`Average control time`),`:`]}),` `,L(f.average),` `,e(`minutes`)]}),/* @__PURE__ */ o(`li`,{children:[/* @__PURE__ */ o(`strong`,{children:[e(`Minimal control time`),`:`]}),` `,L(f.min),` `,e(`minutes`)]}),/* @__PURE__ */ o(`li`,{children:[/* @__PURE__ */ o(`strong`,{children:[e(`Maximal control time`),`:`]}),` `,L(f.max),` `,e(`minutes`)]}),/* @__PURE__ */ o(`li`,{children:[/* @__PURE__ */ o(`strong`,{children:[e(`Duration of controls`),`:`]}),` `,L(f.total),` `,e(`minutes`)]})]})]}):null,p.length?/* @__PURE__ */ o(`div`,{className:`devices`,children:[/* @__PURE__ */ o(`div`,{className:`device head`,children:[/* @__PURE__ */ a(`span`,{children:e(`Device`)}),/* @__PURE__ */ a(`span`,{children:e(`Number of packets`)}),/* @__PURE__ */ o(`span`,{children:[e(`Anomaly Score`),`*`]}),/* @__PURE__ */ a(`span`,{children:e(`Status`)})]}),p.map(t=>/* @__PURE__ */ o(`div`,{className:`device${t.alert?` alert`:``}`,children:[/* @__PURE__ */ o(`span`,{className:`device-name`,children:[/* @__PURE__ */ a(`strong`,{children:t.name||t.mac}),t.name?/* @__PURE__ */ a(`small`,{children:t.mac}):null]}),/* @__PURE__ */ a(`span`,{className:`device-packets`,"data-label":e(`Number of packets`),children:t.packets??`--`}),/* @__PURE__ */ a(`span`,{className:`device-score ${t.alert?`bad`:`good`}`,"data-label":e(`Score`),children:u?e(t.alert?`Anomaly`:`No anomaly`):`${t.score}/100`}),/* @__PURE__ */ o(`span`,{className:`device-status`,children:[/* @__PURE__ */ a(H,{ok:!t.alert,warning:!0}),t.description.length?t.description.join(`, `):e(`Ok`)]})]},t.mac))]}):null,/* @__PURE__ */ o(`div`,{className:`footnote`,children:[/* @__PURE__ */ o(`strong`,{children:[`*`,e(`Anomaly Score`)]}),`: `,e(`tooltip_score_1`),` `,e(`tooltip_score_2`),` `,e(u?`tooltip_score_4`:`tooltip_score_3`)]})]})}function Fe(e){let{t:i}=e,[s,c]=r(()=>q(Me)===`true`),[l,u]=r(e.openUuid),d=n(null),f=e.results?.results||[],p=f.filter(e=>e.isAlert),m=[...s&&p.length?p:f].sort((e,t)=>new Date(t.time).getTime()-new Date(e.time).getTime());return t(()=>{if(e.openUuid){let t=setTimeout(()=>d.current?.querySelector(`[data-uuid="${CSS.escape(e.openUuid)}"]`)?.scrollIntoView({behavior:`smooth`,block:`start`}),300);return()=>clearTimeout(t)}},[e.openUuid]),/* @__PURE__ */ o(`div`,{className:`results`,ref:d,children:[/* @__PURE__ */ a(`div`,{className:`results-list`,children:m.length?m.map(t=>{let n=l===t.uuid;return/* @__PURE__ */ o(`div`,{"data-uuid":t.uuid,className:`result${n?` open`:``}`,children:[/* @__PURE__ */ o(`button`,{type:`button`,className:`result-head`,"aria-expanded":n,onClick:()=>u(n?``:t.uuid),children:[t.todayReport?/* @__PURE__ */ a(V,{name:`info`,className:`result-icon`}):/* @__PURE__ */ a(H,{ok:!t.isAlert,warning:!0}),/* @__PURE__ */ a(`span`,{className:`result-title`,children:i(t.todayReport?`Status report at %s`:`Test result at %s`,new Date(t.time).toLocaleString())}),/* @__PURE__ */ a(V,{name:`expand`,className:`chevron`})]}),n?t.todayReport?/* @__PURE__ */ a(Ne,{t:i,item:t,group:e.group,secondPeriod:e.secondPeriod}):/* @__PURE__ */ a(Pe,{t:i,item:t,results:f,names:e.results?.names,now:e.now,group:e.group,secondPeriod:e.secondPeriod}):null]},t.uuid)}):/* @__PURE__ */ a(`p`,{children:i(`No results available`)})}),/* @__PURE__ */ o(`div`,{className:`actions`,children:[p.length?/* @__PURE__ */ o(`label`,{className:`check`,children:[/* @__PURE__ */ a(`input`,{type:`checkbox`,checked:s,onChange:()=>{J(Me,s?`false`:`true`),c(!s)}}),i(`Show only alarms and warnings`)]}):/* @__PURE__ */ a(`span`,{}),/* @__PURE__ */ a(`button`,{type:`button`,className:`btn`,onClick:e=>Z(e.currentTarget,`close`),children:i(`Close`)})]})]})}function Ie({t:e,alert:t,onIgnore:n}){let[i,s]=r(!1),c=new Date(t.time),l=(t.detections||[]).filter(e=>e.isAlert).length,u=l===1?e(`During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.`,c.toLocaleDateString(),c.toLocaleTimeString()):e(`During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.`,c.toLocaleDateString(),c.toLocaleTimeString(),l);return/* @__PURE__ */ o(`div`,{className:`alert`,children:[/* @__PURE__ */ o(`div`,{className:`alert-main`,children:[/* @__PURE__ */ a(`div`,{className:`alert-text`,children:u}),/* @__PURE__ */ a(H,{ok:!1,warning:!0,size:`4em`})]}),/* @__PURE__ */ a(`button`,{type:`button`,className:`link`,onClick:e=>Z(e.currentTarget,`details`),children:e(`Click here to get more information`)}),/* @__PURE__ */ o(`label`,{className:`check`,children:[/* @__PURE__ */ a(`input`,{type:`checkbox`,checked:i,onChange:()=>{n(!i),s(!i)}}),e(`Do not show this alert again for 10 minutes`)]}),/* @__PURE__ */ o(`div`,{className:`actions`,children:[/* @__PURE__ */ a(`span`,{}),/* @__PURE__ */ a(`button`,{type:`button`,className:`btn`,onClick:e=>Z(e.currentTarget,`ok`),children:e(`Ok`)})]})]})}var Le={chooseInstance:`Choose an instance in the settings`,noInstance:`Instance not found`,engineExited:`Detection engine exited`,thresholdHint:`To change it, open the settings of the instance`},Re={en:Le,de:{chooseInstance:`Instanz in den Einstellungen wählen`,noInstance:`Instanz nicht gefunden`,engineExited:`Erkennungs-Engine beendet`,thresholdHint:`Zum Ändern die Einstellungen der Instanz öffnen`},ru:{chooseInstance:`Выберите экземпляр в настройках`,noInstance:`Экземпляр не найден`,engineExited:`Механизм обнаружения остановлен`,thresholdHint:`Чтобы изменить, откройте настройки экземпляра`},pt:{chooseInstance:`Escolha uma instância nas configurações`,noInstance:`Instância não encontrada`,engineExited:`O mecanismo de deteção terminou`,thresholdHint:`Para alterar, abra as configurações da instância`},nl:{chooseInstance:`Kies een instantie in de instellingen`,noInstance:`Instantie niet gevonden`,engineExited:`Detectie-engine beëindigd`,thresholdHint:`Open de instellingen van de instantie om dit te wijzigen`},fr:{chooseInstance:`Choisissez une instance dans les paramètres`,noInstance:`Instance introuvable`,engineExited:`Le moteur de détection s'est arrêté`,thresholdHint:`Pour le modifier, ouvrez les paramètres de l'instance`},it:{chooseInstance:`Scegli un'istanza nelle impostazioni`,noInstance:`Istanza non trovata`,engineExited:`Il motore di rilevamento è terminato`,thresholdHint:`Per modificarlo, apri le impostazioni dell'istanza`},es:{chooseInstance:`Elija una instancia en la configuración`,noInstance:`Instancia no encontrada`,engineExited:`El motor de detección se detuvo`,thresholdHint:`Para cambiarlo, abra la configuración de la instancia`},pl:{chooseInstance:`Wybierz instancję w ustawieniach`,noInstance:`Nie znaleziono instancji`,engineExited:`Silnik wykrywania zakończył działanie`,thresholdHint:`Aby to zmienić, otwórz ustawienia instancji`},uk:{chooseInstance:`Виберіть екземпляр у налаштуваннях`,noInstance:`Екземпляр не знайдено`,engineExited:`Механізм виявлення зупинено`,thresholdHint:`Щоб змінити, відкрийте налаштування екземпляра`},"zh-cn":{chooseInstance:`请在设置中选择实例`,noInstance:`未找到实例`,engineExited:`检测引擎已退出`,thresholdHint:`如需更改，请打开实例设置`}},Q=null;function ze(){return Q||={en:{"%s collected":`%s collected`,"%s minutes":`%s min.`,"%s of %s reached":`%s of %s reached`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.`,"Activate protection":`Activate protection`,All:`All`,Analyzing:`Analyzing`,Anomaly:`Anomaly`,"Anomaly Score":`Anomaly Score`,"Average check time":`Average check time`,"Average control time":`Average control time`,"Below you will find information about checks on %s.":`Below you will find information about checks on %s.`,"By country":`By country`,"By day":`By day`,"By day (aggregated)":`By day (aggregated)`,"By day-time":`By day-time`,"Click here to get more information":`Click here to get more information`,Close:`Close`,Configuring:`Configuring`,"Data volume":`Data volume`,"Deactivate protection":`Deactivate protection`,"Detection engine status":`Detection engine status`,Detections:`Detections`,Device:`Device`,"Device that contacted the most countries":`Device that contacted the most countries`,"Device with the highest transmitted data volume":`Device with the highest transmitted data volume`,"Do not show this alert again for 10 minutes":`Do not show this alert again for 10 minutes`,"Duration of checks":`Duration of checks`,"Duration of controls":`Duration of controls`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.`,"Enable the instance in the admin":`Enable the instance in the admin`,Error:`Error`,"Everything OK":`Everything OK`,"Everything is OK!":`Everything is OK!`,"Execute control now":`Execute control now`,Exited:`Exited`,"IP geolocation":`IP geolocation`,"In %s minutes or when the maximal file size is reached":`In %s minutes or when the maximal file size is reached`,"Instance is not running":`Instance is not running`,"Last control":`Last control`,"Last result":`Last result`,"Last week statistics":`Last week statistics`,"Manage monitored devices":`Manage monitored devices`,"Maximal control time":`Maximal control time`,"Maximum check time":`Maximum check time`,"Minimal control time":`Minimal control time`,"Minimum check time":`Minimum check time`,"New problem detected":`Unusual activities detected`,"Next control":`Next control`,"No anomalies were detected during the checks. Therefore, everything is in order.":`No anomalies were detected during the checks. Therefore, everything is in order.`,"No anomaly":`No anomaly`,"No connection":`No connection`,"No data available":`No data available`,"No results available":`No results available`,"No results yet exist":`No results yet exist`,"No status report available.":`No status report available.`,"Number of packets":`Number of packets`,Ok:`Ok`,"Open in Admin":`Open in Admin`,"Protection enabled":`Protection enabled`,"Recording is not running. Please check the log for more details":`Recording is not running. Please check the log for more details`,"Recording is running":`Recording is running`,Results:`Results`,Running:`Running`,"Save threshold in seconds":`Save threshold in seconds`,"Scan details (today)":`Scan details (today)`,Score:`Score`,Settings:`Settings`,"Show only alarms and warnings":`Show only alarms and warnings`,"Show results":`Show results`,"Software activated":`Software activated`,"Software not activated":`Software not activated`,Started:`Started`,Statistics:`Statistics`,"Statistics about Data-volume in the last week":`Statistics about Data-volume in the last week`,"Statistics on aggregated transmitted data volume over the past 7 days":`Statistics on aggregated transmitted data volume over the past 7 days`,"Statistics over the past 7 days":`Statistics over the past 7 days`,Status:`Status`,"Status Report":`Status Report`,"Status report at %s":`Status report at %s`,"Test result at %s":`Test result at %s`,"The control time was %s minutes.":`The control time was %s minutes.`,"Try again in %s sec.":`Try again in %s sec.`,Unknown:`Unknown`,"Unusual activity detected!":`Unusual activity detected!`,Weekday:`Weekday`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`Your smart devices were checked on %s at %s. No unusual activities were detected.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender uses the IP2Location LITE database for`,minutes:`minutes`,"one hour":`one hour`,tooltip_score_1:`Our software monitors your smart devices using two methods.`,tooltip_score_2:`A proven pattern recognition method detects known malware with a high degree of certainty. A modern approach is based on artificial intelligence (AI): The AI method evaluates the communication behavior of smart devices and can thus also detect new threats. However, this method is subject to greater uncertainty.`,tooltip_score_3:`In general, the higher the anomaly rating, the more likely unusual activity has occurred.`,tooltip_score_4:`Basically, the result shows whether a device's communication behavior deviates from typical patterns.`},de:{"%s collected":`%s gesammelt`,"%s minutes":`%s Min.`,"%s of %s reached":`%s von %s erreicht`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`Bei den Kontrollen am %s wurden <strong>keine Anomalie</strong> festgestellt. Demnach ist alles in Ordnung.`,"Activate protection":`Schutzsoftware aktivieren`,All:`Alle`,Analyzing:`Analysieren`,Anomaly:`Anomalie`,"Anomaly Score":`Anomalie-Bewertung`,"Average check time":`Durchschnittliche Kontrollzeit`,"Average control time":`Durchschnittliche Kontrollzeit`,"Below you will find information about checks on %s.":`Nachfolgend finden Sie Informationen zu Prüfungen am %s.`,"By country":`Nach Ländern`,"By day":`Nach Tagen`,"By day (aggregated)":`Nach Tagen (aggregiert)`,"By day-time":`Nach Uhrzeiten`,"Click here to get more information":`Klicken Sie hier für weitere Informationen`,Close:`Schließen`,Configuring:`Konfigurieren`,"Data volume":`Datenvolumen`,"Deactivate protection":`Schutzsoftware deaktivieren`,"Detection engine status":`Status der Erkennungs-Engine`,Detections:`Erkennungen`,Device:`Gerät`,"Device that contacted the most countries":`Gerät mit meisten angesprochenen Ländern`,"Device with the highest transmitted data volume":`Gerät mit dem größten übertragenen Datenvolumen`,"Do not show this alert again for 10 minutes":`10 Minuten nicht mehr zeigen`,"Duration of checks":`Dauer der Kontrollen`,"Duration of controls":`Dauer der Kontrollen`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`Bei den Kontrollen am %s wurde ein <strong>maximaler Anomalie-Bewertung von %s</strong> festgestellt. Demnach ist alles in Ordnung.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`Bei der Kontrolle am %s um %s wurden %s Anomalien gefunden.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`Bei der Kontrolle am %s um %s wurde eine Anomalie gefunden.`,"Enable the instance in the admin":`Die Instanz im Admin aktivieren`,Error:`Fehler`,"Everything OK":`Alles in Ordnung`,"Everything is OK!":`Alles in Ordnung!`,"Execute control now":`Jetzt Kontrolle durchführen`,Exited:`Fehler`,"IP geolocation":`IP-Geolokalisierung`,"In %s minutes or when the maximal file size is reached":`In %s Minute(n) oder wenn maximales Datenvolumen erreicht`,"Instance is not running":`Instanz läuft nicht`,"Last control":`Letzte Kontrolle`,"Last result":`Letzte Kontrolle`,"Last week statistics":`Statistiken der letzten Woche`,"Manage monitored devices":`Überwachte Geräte verwalten`,"Maximal control time":`Maximale Kontrollzeit`,"Maximum check time":`Maximale Kontrollzeit`,"Minimal control time":`Minimale Kontrollzeit`,"Minimum check time":`Minimale Kontrollzeit`,"New problem detected":`Ungewöhnliche Aktivität(en) erkannt`,"Next control":`Nächstes Kontrolle`,"No anomalies were detected during the checks. Therefore, everything is in order.":`Bei den Kontrollen wurde keine Anomalie festgestellt. Demnach ist alles in Ordnung.`,"No anomaly":`Keine Anomalie`,"No connection":`Keine Verbindung`,"No data available":`Keine Daten verfügbar`,"No results available":`Keine Ergebnisse verfügbar`,"No results yet exist":`Es liegen noch keine Ergebnisse vor`,"No status report available.":`Kein Statusbericht verfügbar.`,"Number of packets":`Zahl an Paketen`,Ok:`OK`,"Open in Admin":`Im Adminbereich öffnen`,"Protection enabled":`Schutz aktiviert`,"Recording is not running. Please check the log for more details":`Die Aufzeichnung läuft nicht. Weitere Informationen finden Sie im Protokoll.`,"Recording is running":`Datensammlung läuft`,Results:`Ergebnisse`,Running:`Läuft`,"Save threshold in seconds":`Speicherschwelle in Sekunden`,"Scan details (today)":`Scan-Details (heute)`,Score:`Bewertung`,Settings:`Einstellungen`,"Show only alarms and warnings":`Nur Alarme und Warnungen anzeigen`,"Show results":`Ergebnisse anzeigen`,"Software activated":`System wird überwacht`,"Software not activated":`System wird nicht überwacht`,Started:`Gestartet`,Statistics:`Statistiken`,"Statistics about Data-volume in the last week":`Statistiken zum Datenvolumen der letzten Woche`,"Statistics on aggregated transmitted data volume over the past 7 days":`Weitere Informationen zum übertragenen Datenvolumen der letzten 7 Tage`,"Statistics over the past 7 days":`Statistiken der letzten 7 Tage`,Status:`Status`,"Status Report":`Statusbericht`,"Status report at %s":`Statusbericht um %s`,"Test result at %s":`Testergebnis um %s`,"The control time was %s minutes.":`Die Kontrollzeit betrug %s Minuten.`,"Try again in %s sec.":`Erneut in %s Sek. versuchen`,Unknown:`Unbekannt`,"Unusual activity detected!":`Ungewöhnliche Aktivität erkannt!`,Weekday:`Wochentag`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`Ihre Smart-Geräte wurden am %s um %s geprüft. Es wurden keine ungewöhnlichen Aktivitäten erkannt.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`Ihre Smart-Geräte wurden am %s um %s geprüft. Bei mindestens einem Gerät wurde eine ungewöhnliche Aktivität festgestellt.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender verwendet die IP2Location LITE-Datenbank für`,minutes:`Minuten`,"one hour":`Stunde`,tooltip_score_1:`Unsere Software überwacht Ihre smarten Geräte mit zwei Verfahren.`,tooltip_score_2:`Ein bewährtes Mustererkennungsverfahren erkennt bekannte Schadsoftware mit hoher Sicherheit. Ein moderner Ansatz basiert auf künstlicher Intelligenz (KI): Das KI-Verfahren bewertet das Kommunikationsverhalten der smarten Geräte und kann so auch neue Gefahren entdecken. Allerdings ist dieses Verfahren mit mehr Unsicherheit behaftet.`,tooltip_score_3:`Grundsätzlich gilt: Das Ergebnis zeigt, wie stark das Kommunikationsverhalten eines Geräts von typischen Mustern abweicht.`,tooltip_score_4:`Grundsätzlich gilt: Das Ergebnis zeigt, ob das Kommunikationsverhalten eines Geräts von typischen Mustern abweicht.`},ru:{"%s collected":`%s собрано`,"%s minutes":`%s мин.`,"%s of %s reached":`%s из %s достигнуто`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`В ходе проверки %s <strong>аномалий</strong> не обнаружено. Следовательно, всё в порядке.`,"Activate protection":`Активировать защиту`,All:`Все`,Analyzing:`Анализируя`,Anomaly:`Аномалия`,"Anomaly Score":`Оценка аномалии`,"Average check time":`Среднее время проверки`,"Average control time":`Среднее время контроля`,"Below you will find information about checks on %s.":`Ниже вы найдете информацию о проверках %s.`,"By country":`По стране`,"By day":`Днем`,"By day (aggregated)":`По дням (агрегировано)`,"By day-time":`По дневному времени`,"Click here to get more information":`Нажмите здесь, чтобы получить более подробную информацию.`,Close:`Закрыть`,Configuring:`Настройка`,"Data volume":`Объем данных`,"Deactivate protection":`Отключить защиту`,"Detection engine status":`Состояние двигателя обнаружения`,Detections:`Обнаружения`,Device:`Устройство`,"Device that contacted the most countries":`Устройство, которое связалось с наибольшим количеством стран`,"Device with the highest transmitted data volume":`Устройство с наибольшим объемом переданных данных`,"Do not show this alert again for 10 minutes":`Не показывать это оповещение снова в течение 10 минут`,"Duration of checks":`Продолжительность проверок`,"Duration of controls":`Продолжительность контроля`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`В ходе проверки %s был обнаружен <strong>максимальный уровень аномалии %s</strong>. Следовательно, всё в порядке.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`В ходе проверки %s в %s было обнаружено %s аномалий, которые могут указывать на потенциальную угрозу безопасности.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`В ходе проверки %s в %s была обнаружена аномалия, которая может указывать на потенциальную угрозу безопасности.`,"Enable the instance in the admin":`Включите экземпляр в админке`,Error:`Ошибка`,"Everything OK":`Все в порядке`,"Everything is OK!":`Все в порядке!`,"Execute control now":`Выполнить контроль сейчас`,Exited:`Вышел`,"IP geolocation":`IP-геолокация`,"In %s minutes or when the maximal file size is reached":`Через %s минут или при достижении максимального размера файла`,"Instance is not running":`Экземпляр не запущен`,"Last control":`Последний контроль`,"Last result":`Последний результат`,"Last week statistics":`Статистика за прошлую неделю`,"Manage monitored devices":`Управление контролируемыми устройствами`,"Maximal control time":`Максимальное время контроля`,"Maximum check time":`Максимальное время проверки`,"Minimal control time":`Минимальное время контроля`,"Minimum check time":`Минимальное время проверки`,"New problem detected":`Обнаружена необычная активность`,"Next control":`Следующая проверка`,"No anomalies were detected during the checks. Therefore, everything is in order.":`В ходе проверок никаких отклонений не выявлено. Следовательно, всё в порядке.`,"No anomaly":`Нет аномалии`,"No connection":`Нет связи`,"No data available":`Нет доступных данных`,"No results available":`Результаты не найдены.`,"No results yet exist":`Результаты пока не найдены.`,"No status report available.":`Отчет о состоянии недоступен.`,"Number of packets":`Количество пакетов`,Ok:`Хорошо`,"Open in Admin":`Открыть в Администраторе`,"Protection enabled":`Защита включена`,"Recording is not running. Please check the log for more details":`Запись не ведётся. Подробности смотрите в журнале.`,"Recording is running":`Запись идет`,Results:`Результаты`,Running:`Бег`,"Save threshold in seconds":`Порог сохранения в секундах`,"Scan details (today)":`Подробности сканирования (сегодня)`,Score:`Счет`,Settings:`Настройки`,"Show only alarms and warnings":`Показывать только сигналы тревоги и предупреждения`,"Show results":`Показать результаты`,"Software activated":`Программное обеспечение активировано`,"Software not activated":`Программное обеспечение не активировано`,Started:`Начато`,Statistics:`Статистика`,"Statistics about Data-volume in the last week":`Статистика по объему данных за последнюю неделю`,"Statistics on aggregated transmitted data volume over the past 7 days":`Статистика по совокупному объему переданных данных за последние 7 дней`,"Statistics over the past 7 days":`Статистика за последние 7 дней`,Status:`Статус`,"Status Report":`Отчет о состоянии`,"Status report at %s":`Отчет о состоянии в %s`,"Test result at %s":`Результат теста в %s`,"The control time was %s minutes.":`Контрольное время составило %s минут.`,"Try again in %s sec.":`Попробуйте еще раз через %s сек.`,Unknown:`Неизвестный`,"Unusual activity detected!":`Обнаружена необычная активность!`,Weekday:`Будний день`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`Ваши смарт-устройства были проверены %s в %s. Никаких необычных действий не обнаружено.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`Ваши смарт-устройства были проверены %s в %s. Как минимум на одном устройстве обнаружена необычная активность.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender использует базу данных IP2Location LITE для`,minutes:`минут`,"one hour":`один час`,tooltip_score_1:`Наше программное обеспечение контролирует ваши смарт-устройства двумя методами.`,tooltip_score_2:`Проверенный метод распознавания образов позволяет с высокой степенью уверенности обнаруживать известные вредоносные программы. Современный подход основан на искусственном интеллекте (ИИ): метод ИИ оценивает коммуникационное поведение умных устройств и, таким образом, может также обнаруживать новые угрозы. Однако этот метод подвержен большей неопределенности.`,tooltip_score_3:`В целом, чем выше рейтинг аномалии, тем больше вероятность того, что произошла необычная активность.`,tooltip_score_4:`По сути, результат показывает, отклоняется ли поведение связи устройства от типичных шаблонов.`},pt:{"%s collected":`%s coletados`,"%s minutes":`%s mín.`,"%s of %s reached":`%s de %s alcançados`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`Nenhuma anomalia foi detectada durante as verificações em %s. Portanto, tudo está em ordem.`,"Activate protection":`Ativar proteção`,All:`Todos`,Analyzing:`Analisando`,Anomaly:`Anomalia`,"Anomaly Score":`Pontuação de anomalia`,"Average check time":`Tempo médio de verificação`,"Average control time":`Tempo médio de controle`,"Below you will find information about checks on %s.":`Abaixo você encontrará informações sobre verificações em %s.`,"By country":`Por país`,"By day":`De dia`,"By day (aggregated)":`Por dia (agregado)`,"By day-time":`Durante o dia`,"Click here to get more information":`Clique aqui para obter mais informações`,Close:`Fechar`,Configuring:`Configurando`,"Data volume":`Volume de dados`,"Deactivate protection":`Desativar proteção`,"Detection engine status":`Status do mecanismo de detecção`,Detections:`Detecções`,Device:`Dispositivo`,"Device that contacted the most countries":`Dispositivo que contatou mais países`,"Device with the highest transmitted data volume":`Dispositivo com maior volume de dados transmitidos`,"Do not show this alert again for 10 minutes":`Não mostrar este alerta novamente por 10 minutos`,"Duration of checks":`Duração das verificações`,"Duration of controls":`Duração dos controles`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`Durante as verificações em %s, foi detectada uma <strong>pontuação máxima de anomalia de %s</strong>. Portanto, tudo está em ordem.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`Durante a inspeção em %s às %s, foram detectadas %s anomalias que poderiam indicar um potencial risco de segurança.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`Durante a inspeção em %s às %s, foi detectada uma anomalia que poderia indicar um potencial risco de segurança.`,"Enable the instance in the admin":`Habilitar a instância no administrador`,Error:`Erro`,"Everything OK":`Tudo bem`,"Everything is OK!":`Está tudo bem!`,"Execute control now":`Execute o controle agora`,Exited:`Saiu`,"IP geolocation":`Geolocalização de IP`,"In %s minutes or when the maximal file size is reached":`Em %s minutos ou quando o tamanho máximo do arquivo for atingido`,"Instance is not running":`A instância não está em execução`,"Last control":`Último controle`,"Last result":`Último resultado`,"Last week statistics":`Estatísticas da semana passada`,"Manage monitored devices":`Gerenciar dispositivos monitorados`,"Maximal control time":`Tempo máximo de controle`,"Maximum check time":`Tempo máximo de verificação`,"Minimal control time":`Tempo mínimo de controle`,"Minimum check time":`Tempo mínimo de verificação`,"New problem detected":`Atividades incomuns detectadas`,"Next control":`Próximo controle`,"No anomalies were detected during the checks. Therefore, everything is in order.":`Nenhuma anomalia foi detectada durante as verificações. Portanto, tudo está em ordem.`,"No anomaly":`Nenhuma anomalia`,"No connection":`Sem conexão`,"No data available":`Nenhum dado disponível`,"No results available":`Nenhum resultado disponível`,"No results yet exist":`Ainda não existem resultados`,"No status report available.":`Nenhum relatório de status disponível.`,"Number of packets":`Número de pacotes`,Ok:`OK`,"Open in Admin":`Abrir no Admin`,"Protection enabled":`Proteção habilitada`,"Recording is not running. Please check the log for more details":`A gravação não está em andamento. Verifique o log para mais detalhes.`,"Recording is running":`A gravação está em andamento`,Results:`Resultados`,Running:`Correndo`,"Save threshold in seconds":`Limite de economia em segundos`,"Scan details (today)":`Detalhes da digitalização (hoje)`,Score:`Pontuação`,Settings:`Configurações`,"Show only alarms and warnings":`Mostrar apenas alarmes e avisos`,"Show results":`Mostrar resultados`,"Software activated":`Software ativado`,"Software not activated":`Software não ativado`,Started:`Iniciado`,Statistics:`Estatísticas`,"Statistics about Data-volume in the last week":`Estatísticas sobre volume de dados na última semana`,"Statistics on aggregated transmitted data volume over the past 7 days":`Estatísticas sobre o volume agregado de dados transmitidos nos últimos 7 dias`,"Statistics over the past 7 days":`Estatísticas dos últimos 7 dias`,Status:`Status`,"Status Report":`Relatório de status`,"Status report at %s":`Relatório de status em %s`,"Test result at %s":`Resultado do teste em %s`,"The control time was %s minutes.":`O tempo de controle foi de %s minutos.`,"Try again in %s sec.":`Tente novamente em %s seg.`,Unknown:`Desconhecido`,"Unusual activity detected!":`Atividade incomum detectada!`,Weekday:`Dia da semana`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`Seus dispositivos inteligentes foram verificados em %s às %s. Nenhuma atividade incomum foi detectada.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`Seus dispositivos inteligentes foram verificados em %s às %s. Atividade incomum foi detectada em pelo menos um dispositivo.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender usa o banco de dados IP2Location LITE para`,minutes:`minutos`,"one hour":`uma hora`,tooltip_score_1:`Nosso software monitora seus dispositivos inteligentes usando dois métodos.`,tooltip_score_2:`Um método comprovado de reconhecimento de padrões detecta malware conhecido com alto grau de certeza. Uma abordagem moderna se baseia em inteligência artificial (IA): o método de IA avalia o comportamento de comunicação de dispositivos inteligentes e, assim, também pode detectar novas ameaças. No entanto, esse método está sujeito a maior incerteza.`,tooltip_score_3:`Em geral, quanto maior a classificação de anomalia, maior a probabilidade de ter ocorrido atividade incomum.`,tooltip_score_4:`Basicamente, o resultado mostra se o comportamento de comunicação de um dispositivo se desvia dos padrões típicos.`},nl:{"%s collected":`%s verzameld`,"%s minutes":`%s min.`,"%s of %s reached":`%s van %s bereikt`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`Er zijn <strong>geen afwijkingen</strong> gedetecteerd tijdens de controles op %s. Alles is dus in orde.`,"Activate protection":`Bescherming activeren`,All:`Alle`,Analyzing:`Analyseren`,Anomaly:`Anomalie`,"Anomaly Score":`Anomalie Score`,"Average check time":`Gemiddelde controletijd`,"Average control time":`Gemiddelde controletijd`,"Below you will find information about checks on %s.":`Hieronder vindt u informatie over controles op %s.`,"By country":`Per land`,"By day":`Overdag`,"By day (aggregated)":`Overdag (geaggregeerd)`,"By day-time":`Overdag`,"Click here to get more information":`Klik hier voor meer informatie`,Close:`Dichtbij`,Configuring:`Configureren`,"Data volume":`Gegevensvolume`,"Deactivate protection":`Bescherming deactiveren`,"Detection engine status":`Status van de detectie-engine`,Detections:`Detecties`,Device:`Apparaat`,"Device that contacted the most countries":`Apparaat dat de meeste landen heeft gecontacteerd`,"Device with the highest transmitted data volume":`Apparaat met het hoogste verzonden datavolume`,"Do not show this alert again for 10 minutes":`Toon deze waarschuwing niet meer gedurende 10 minuten`,"Duration of checks":`Duur van de controles`,"Duration of controls":`Duur van de controles`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`Tijdens de controles op %s werd een <strong>maximale anomaliescore van %s</strong> gedetecteerd. Alles is dus in orde.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`Tijdens de inspectie op %s om %s zijn er %s anomalieën gedetecteerd die kunnen wijzen op een mogelijk beveiligingsrisico.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`Tijdens de inspectie op %s om %s werd een afwijking vastgesteld die kan duiden op een mogelijk veiligheidsrisico.`,"Enable the instance in the admin":`Schakel het exemplaar in de beheerder in`,Error:`Fout`,"Everything OK":`Alles oké`,"Everything is OK!":`Alles is OK!`,"Execute control now":`Voer nu de controle uit`,Exited:`Uitgetreden`,"IP geolocation":`IP-geolocatie`,"In %s minutes or when the maximal file size is reached":`In %s minuten of wanneer de maximale bestandsgrootte is bereikt`,"Instance is not running":`Instantie wordt niet uitgevoerd`,"Last control":`Laatste controle`,"Last result":`Laatste resultaat`,"Last week statistics":`Statistieken van vorige week`,"Manage monitored devices":`Beheer bewaakte apparaten`,"Maximal control time":`Maximale controletijd`,"Maximum check time":`Maximale controletijd`,"Minimal control time":`Minimale controletijd`,"Minimum check time":`Minimale controletijd`,"New problem detected":`Ongebruikelijke activiteiten gedetecteerd`,"Next control":`Volgende controle`,"No anomalies were detected during the checks. Therefore, everything is in order.":`Er zijn geen afwijkingen geconstateerd tijdens de controles. Alles is dus in orde.`,"No anomaly":`Geen anomalie`,"No connection":`Geen verbinding`,"No data available":`Geen gegevens beschikbaar`,"No results available":`Geen resultaten beschikbaar`,"No results yet exist":`Er zijn nog geen resultaten beschikbaar`,"No status report available.":`Geen statusrapport beschikbaar.`,"Number of packets":`Aantal pakketten`,Ok:`OK`,"Open in Admin":`Openen in Admin`,"Protection enabled":`Bescherming ingeschakeld`,"Recording is not running. Please check the log for more details":`De opname is niet actief. Controleer het logbestand voor meer informatie.`,"Recording is running":`Opname is bezig`,Results:`Resultaten`,Running:`Rennen`,"Save threshold in seconds":`Drempelwaarde in seconden opslaan`,"Scan details (today)":`Scandetails (vandaag)`,Score:`Score`,Settings:`Instellingen`,"Show only alarms and warnings":`Alleen alarmen en waarschuwingen weergeven`,"Show results":`Resultaten weergeven`,"Software activated":`Software geactiveerd`,"Software not activated":`Software niet geactiveerd`,Started:`Begonnen`,Statistics:`Statistieken`,"Statistics about Data-volume in the last week":`Statistieken over Datavolume in de afgelopen week`,"Statistics on aggregated transmitted data volume over the past 7 days":`Statistieken over het totale verzonden datavolume van de afgelopen 7 dagen`,"Statistics over the past 7 days":`Statistieken van de afgelopen 7 dagen`,Status:`Status`,"Status Report":`Statusrapport`,"Status report at %s":`Statusrapport op %s`,"Test result at %s":`Testresultaat op %s`,"The control time was %s minutes.":`De controletijd bedroeg %s minuten.`,"Try again in %s sec.":`Probeer het over %s sec. opnieuw.`,Unknown:`Onbekend`,"Unusual activity detected!":`Ongebruikelijke activiteit gedetecteerd!`,Weekday:`Weekdag`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`Je slimme apparaten zijn op %s om %s gecontroleerd. Er zijn geen ongebruikelijke activiteiten gedetecteerd.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`Je slimme apparaten zijn op %s om %s gecontroleerd. Er is ongebruikelijke activiteit gedetecteerd op minstens één apparaat.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender gebruikt de IP2Location LITE-database voor`,minutes:`notulen`,"one hour":`een uur`,tooltip_score_1:`Onze software bewaakt uw slimme apparaten op twee manieren.`,tooltip_score_2:`Een beproefde patroonherkenningsmethode detecteert bekende malware met een hoge mate van zekerheid. Een moderne aanpak is gebaseerd op kunstmatige intelligentie (AI): de AI-methode evalueert het communicatiegedrag van slimme apparaten en kan zo ook nieuwe bedreigingen detecteren. Deze methode is echter onderhevig aan grotere onzekerheid.`,tooltip_score_3:`Over het algemeen geldt: hoe hoger de anomalieclassificatie, hoe waarschijnlijker het is dat er ongebruikelijke activiteit heeft plaatsgevonden.`,tooltip_score_4:`In principe geeft het resultaat aan of het communicatiegedrag van een apparaat afwijkt van de gebruikelijke patronen.`},fr:{"%s collected":`%s collectés`,"%s minutes":`%s min.`,"%s of %s reached":`%s de %s atteint`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`Aucune anomalie n'a été détectée lors des vérifications sur %s. Tout est donc en ordre.`,"Activate protection":`Activer la protection`,All:`Tous`,Analyzing:`Analyser`,Anomaly:`Anomalie`,"Anomaly Score":`Score d'anomalie`,"Average check time":`Temps de contrôle moyen`,"Average control time":`Temps de contrôle moyen`,"Below you will find information about checks on %s.":`Vous trouverez ci-dessous des informations sur les contrôles sur %s.`,"By country":`Par pays`,"By day":`De jour`,"By day (aggregated)":`Par jour (agrégés)`,"By day-time":`De jour`,"Click here to get more information":`Cliquez ici pour obtenir plus d'informations`,Close:`Fermer`,Configuring:`Configuration`,"Data volume":`Volume de données`,"Deactivate protection":`Désactiver la protection`,"Detection engine status":`État du moteur de détection`,Detections:`Détections`,Device:`Appareil`,"Device that contacted the most countries":`Appareil qui a contacté le plus de pays`,"Device with the highest transmitted data volume":`Appareil avec le volume de données transmis le plus élevé`,"Do not show this alert again for 10 minutes":`Ne plus afficher cette alerte pendant 10 minutes`,"Duration of checks":`Durée des contrôles`,"Duration of controls":`Durée des contrôles`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`Lors des vérifications sur %s, un score d'anomalie maximal de %s a été détecté. Par conséquent, tout est en ordre.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`Lors de l'inspection sur %s à %s, %s anomalies ont été détectées qui pourraient indiquer un risque de sécurité potentiel.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`Lors de l'inspection sur %s à %s, une anomalie a été détectée qui pourrait indiquer un risque de sécurité potentiel.`,"Enable the instance in the admin":`Activer l'instance dans l'administrateur`,Error:`Erreur`,"Everything OK":`Tout va bien`,"Everything is OK!":`Tout va bien !`,"Execute control now":`Exécuter le contrôle maintenant`,Exited:`Sorti`,"IP geolocation":`Géolocalisation IP`,"In %s minutes or when the maximal file size is reached":`Dans %s minutes ou lorsque la taille maximale du fichier est atteinte`,"Instance is not running":`L'instance n'est pas en cours d'exécution`,"Last control":`Dernier contrôle`,"Last result":`Dernier résultat`,"Last week statistics":`Statistiques de la semaine dernière`,"Manage monitored devices":`Gérer les appareils surveillés`,"Maximal control time":`Temps de contrôle maximal`,"Maximum check time":`Temps de contrôle maximal`,"Minimal control time":`Temps de contrôle minimal`,"Minimum check time":`Temps de contrôle minimum`,"New problem detected":`Activités inhabituelles détectées`,"Next control":`Contrôle suivant`,"No anomalies were detected during the checks. Therefore, everything is in order.":`Aucune anomalie n'a été détectée lors des contrôles. Tout est donc en ordre.`,"No anomaly":`Aucune anomalie`,"No connection":`Aucune connexion`,"No data available":`Aucune donnée disponible`,"No results available":`Aucun résultat disponible`,"No results yet exist":`Aucun résultat n'existe encore`,"No status report available.":`Aucun rapport d'état disponible.`,"Number of packets":`Nombre de paquets`,Ok:`D'accord`,"Open in Admin":`Ouvrir dans l'administrateur`,"Protection enabled":`Protection activée`,"Recording is not running. Please check the log for more details":`L'enregistrement n'est pas en cours. Veuillez consulter le journal pour plus de détails.`,"Recording is running":`L'enregistrement est en cours`,Results:`Résultats`,Running:`En cours d'exécution`,"Save threshold in seconds":`Seuil de sauvegarde en secondes`,"Scan details (today)":`Détails de l'analyse (aujourd'hui)`,Score:`Score`,Settings:`Paramètres`,"Show only alarms and warnings":`Afficher uniquement les alarmes et les avertissements`,"Show results":`Afficher les résultats`,"Software activated":`Logiciel activé`,"Software not activated":`Logiciel non activé`,Started:`Commencé`,Statistics:`Statistiques`,"Statistics about Data-volume in the last week":`Statistiques sur le volume de données au cours de la semaine dernière`,"Statistics on aggregated transmitted data volume over the past 7 days":`Statistiques sur le volume de données transmises agrégées au cours des 7 derniers jours`,"Statistics over the past 7 days":`Statistiques des 7 derniers jours`,Status:`Statut`,"Status Report":`Rapport de situation`,"Status report at %s":`Rapport d'état à %s`,"Test result at %s":`Résultat du test à %s`,"The control time was %s minutes.":`Le temps de contrôle était de %s minutes.`,"Try again in %s sec.":`Réessayez dans %s sec.`,Unknown:`Inconnu`,"Unusual activity detected!":`Activité inhabituelle détectée\xA0!`,Weekday:`Jour de la semaine`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`Vos appareils connectés ont été vérifiés le %s à %s. Aucune activité inhabituelle n'a été détectée.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`Vos appareils connectés ont été vérifiés le %s à %s. Une activité inhabituelle a été détectée sur au moins un appareil.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender utilise la base de données IP2Location LITE pour`,minutes:`minutes`,"one hour":`une heure`,tooltip_score_1:`Notre logiciel surveille vos appareils intelligents à l’aide de deux méthodes.`,tooltip_score_2:`Une méthode éprouvée de reconnaissance de formes détecte les logiciels malveillants connus avec un haut degré de certitude. Une approche moderne repose sur l'intelligence artificielle (IA)\xA0: cette méthode évalue le comportement de communication des appareils intelligents et peut ainsi détecter de nouvelles menaces. Cependant, cette méthode est soumise à une plus grande incertitude.`,tooltip_score_3:`En général, plus le niveau d’anomalie est élevé, plus il est probable qu’une activité inhabituelle se soit produite.`,tooltip_score_4:`En résumé, le résultat indique si le comportement de communication d'un appareil s'écarte des schémas typiques.`},it:{"%s collected":`%s raccolti`,"%s minutes":`%s minimo`,"%s of %s reached":`%s di %s raggiunti`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`<strong>Non sono state rilevate anomalie</strong> durante i controlli su %s. Pertanto, tutto è in ordine.`,"Activate protection":`Attiva la protezione`,All:`Tutto`,Analyzing:`Analizzando`,Anomaly:`Anomalia`,"Anomaly Score":`Punteggio anomalo`,"Average check time":`Tempo medio di controllo`,"Average control time":`Tempo medio di controllo`,"Below you will find information about checks on %s.":`Di seguito troverai informazioni sui controlli su %s.`,"By country":`Per paese`,"By day":`Di giorno`,"By day (aggregated)":`Per giorno (aggregato)`,"By day-time":`Di giorno`,"Click here to get more information":`Clicca qui per avere maggiori informazioni`,Close:`Vicino`,Configuring:`Configurazione`,"Data volume":`Volume di dati`,"Deactivate protection":`Disattiva la protezione`,"Detection engine status":`Stato del motore di rilevamento`,Detections:`Rilevazioni`,Device:`Dispositivo`,"Device that contacted the most countries":`Dispositivo che ha contattato la maggior parte dei paesi`,"Device with the highest transmitted data volume":`Dispositivo con il volume di dati trasmesso più elevato`,"Do not show this alert again for 10 minutes":`Non mostrare più questo avviso per 10 minuti`,"Duration of checks":`Durata dei controlli`,"Duration of controls":`Durata dei controlli`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`Durante i controlli su %s, è stato rilevato un <strong>punteggio massimo di anomalia pari a %s</strong>. Pertanto, tutto è in ordine.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`Durante l'ispezione su %s presso %s, sono state rilevate %s anomalie che potrebbero indicare un potenziale rischio per la sicurezza.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`Durante l'ispezione su %s presso %s, è stata rilevata un'anomalia che potrebbe indicare un potenziale rischio per la sicurezza.`,"Enable the instance in the admin":`Abilita l'istanza nell'amministrazione`,Error:`Errore`,"Everything OK":`Tutto OK`,"Everything is OK!":`Tutto ok!`,"Execute control now":`Esegui il controllo ora`,Exited:`Uscito`,"IP geolocation":`Geolocalizzazione IP`,"In %s minutes or when the maximal file size is reached":`In %s minuti o quando viene raggiunta la dimensione massima del file`,"Instance is not running":`L'istanza non è in esecuzione`,"Last control":`Ultimo controllo`,"Last result":`Ultimo risultato`,"Last week statistics":`Statistiche della scorsa settimana`,"Manage monitored devices":`Gestire i dispositivi monitorati`,"Maximal control time":`Tempo massimo di controllo`,"Maximum check time":`Tempo massimo di controllo`,"Minimal control time":`Tempo di controllo minimo`,"Minimum check time":`Tempo minimo di controllo`,"New problem detected":`Rilevate attività insolite`,"Next control":`Controllo successivo`,"No anomalies were detected during the checks. Therefore, everything is in order.":`Durante i controlli non sono state rilevate anomalie. Pertanto, tutto è in regola.`,"No anomaly":`Nessuna anomalia`,"No connection":`Nessuna connessione`,"No data available":`Nessun dato disponibile`,"No results available":`Nessun risultato disponibile`,"No results yet exist":`Non ci sono ancora risultati`,"No status report available.":`Nessun rapporto sullo stato disponibile.`,"Number of packets":`Numero di pacchetti`,Ok:`OK`,"Open in Admin":`Apri in Amministrazione`,"Protection enabled":`Protezione abilitata`,"Recording is not running. Please check the log for more details":`La registrazione non è in corso. Per maggiori dettagli, consultare il registro.`,"Recording is running":`La registrazione è in esecuzione`,Results:`Risultati`,Running:`Corsa`,"Save threshold in seconds":`Salva la soglia in secondi`,"Scan details (today)":`Dettagli della scansione (oggi)`,Score:`Punto`,Settings:`Impostazioni`,"Show only alarms and warnings":`Mostra solo allarmi e avvisi`,"Show results":`Mostra risultati`,"Software activated":`Software attivato`,"Software not activated":`Software non attivato`,Started:`Iniziato`,Statistics:`Statistiche`,"Statistics about Data-volume in the last week":`Statistiche sul volume di dati nell'ultima settimana`,"Statistics on aggregated transmitted data volume over the past 7 days":`Statistiche sul volume aggregato di dati trasmessi negli ultimi 7 giorni`,"Statistics over the past 7 days":`Statistiche degli ultimi 7 giorni`,Status:`Stato`,"Status Report":`Rapporto sullo stato`,"Status report at %s":`Rapporto sullo stato a %s`,"Test result at %s":`Risultato del test a %s`,"The control time was %s minutes.":`Il tempo di controllo è stato di %s minuti.`,"Try again in %s sec.":`Riprova tra %s sec.`,Unknown:`Sconosciuto`,"Unusual activity detected!":`Rilevata attività insolita!`,Weekday:`Giorno feriale`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`I tuoi dispositivi intelligenti sono stati controllati il %s alle %s. Non sono state rilevate attività insolite.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`I tuoi dispositivi intelligenti sono stati controllati il %s alle %s. È stata rilevata un'attività insolita su almeno un dispositivo.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender utilizza il database IP2Location LITE per`,minutes:`minuti`,"one hour":`un'ora`,tooltip_score_1:`Il nostro software monitora i tuoi dispositivi intelligenti utilizzando due metodi.`,tooltip_score_2:`Un metodo di riconoscimento di pattern collaudato rileva malware noti con un elevato grado di certezza. Un approccio moderno si basa sull'intelligenza artificiale (IA): il metodo di IA valuta il comportamento di comunicazione dei dispositivi intelligenti e può quindi rilevare anche nuove minacce. Tuttavia, questo metodo è soggetto a maggiore incertezza.`,tooltip_score_3:`In generale, più alto è il punteggio dell'anomalia, più è probabile che si sia verificata un'attività insolita.`,tooltip_score_4:`In pratica, il risultato mostra se il comportamento comunicativo di un dispositivo si discosta dai modelli tipici.`},es:{"%s collected":`%s recolectados`,"%s minutes":`%s mínimo.`,"%s of %s reached":`%s de %s alcanzado`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`No se detectaron anomalías durante las comprobaciones de %s. Por lo tanto, todo está en orden.`,"Activate protection":`Activar la protección`,All:`Todo`,Analyzing:`Analizando`,Anomaly:`Anomalía`,"Anomaly Score":`Puntuación de anomalía`,"Average check time":`Tiempo promedio de verificación`,"Average control time":`Tiempo medio de control`,"Below you will find information about checks on %s.":`A continuación encontrará información sobre las comprobaciones realizadas en %s.`,"By country":`Por país`,"By day":`De día`,"By day (aggregated)":`Por día (agregado)`,"By day-time":`De día`,"Click here to get more information":`Haga clic aquí para obtener más información`,Close:`Cerca`,Configuring:`Configuración`,"Data volume":`Volumen de datos`,"Deactivate protection":`Desactivar la protección`,"Detection engine status":`Estado del motor de detección`,Detections:`Detecciones`,Device:`Dispositivo`,"Device that contacted the most countries":`Dispositivo que contactó con más países`,"Device with the highest transmitted data volume":`Dispositivo con el mayor volumen de datos transmitidos`,"Do not show this alert again for 10 minutes":`No volver a mostrar esta alerta durante 10 minutos`,"Duration of checks":`Duración de los controles`,"Duration of controls":`Duración de los controles`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`Durante las comprobaciones en %s, se detectó una puntuación máxima de anomalía de %s. Por lo tanto, todo está en orden.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`Durante la inspección de %s a las %s, se detectaron %s anomalías que podrían indicar un riesgo potencial de seguridad.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`Durante la inspección de %s a las %s, se detectó una anomalía que podría indicar un riesgo potencial de seguridad.`,"Enable the instance in the admin":`Habilitar la instancia en el administrador`,Error:`Error`,"Everything OK":`Todo bien`,"Everything is OK!":`¡Todo está bien!`,"Execute control now":`Ejecutar control ahora`,Exited:`Salió`,"IP geolocation":`Geolocalización de IP`,"In %s minutes or when the maximal file size is reached":`En %s minutos o cuando se alcanza el tamaño máximo del archivo`,"Instance is not running":`La instancia no se está ejecutando`,"Last control":`Último control`,"Last result":`Último resultado`,"Last week statistics":`Estadísticas de la semana pasada`,"Manage monitored devices":`Administrar dispositivos monitoreados`,"Maximal control time":`Tiempo máximo de control`,"Maximum check time":`Tiempo máximo de verificación`,"Minimal control time":`Tiempo mínimo de control`,"Minimum check time":`Tiempo mínimo de verificación`,"New problem detected":`Se detectaron actividades inusuales`,"Next control":`Siguiente control`,"No anomalies were detected during the checks. Therefore, everything is in order.":`No se detectaron anomalías durante las comprobaciones. Por lo tanto, todo está en orden.`,"No anomaly":`No hay ninguna anomalía`,"No connection":`Sin conexión`,"No data available":`No hay datos disponibles`,"No results available":`No hay resultados disponibles`,"No results yet exist":`Aún no existen resultados`,"No status report available.":`No hay informe de estado disponible`,"Number of packets":`Número de paquetes`,Ok:`De acuerdo`,"Open in Admin":`Abrir en Admin`,"Protection enabled":`Protección habilitada`,"Recording is not running. Please check the log for more details":`La grabación no se está ejecutando. Consulte el registro para obtener más información.`,"Recording is running":`La grabación se está ejecutando`,Results:`Resultados`,Running:`Correr`,"Save threshold in seconds":`Umbral de ahorro en segundos`,"Scan details (today)":`Detalles del escaneo (hoy)`,Score:`Puntaje`,Settings:`Ajustes`,"Show only alarms and warnings":`Mostrar solo alarmas y advertencias`,"Show results":`Mostrar resultados`,"Software activated":`Software activado`,"Software not activated":`Software no activado`,Started:`Comenzó`,Statistics:`Estadística`,"Statistics about Data-volume in the last week":`Estadísticas sobre el volumen de datos en la última semana`,"Statistics on aggregated transmitted data volume over the past 7 days":`Estadísticas sobre el volumen agregado de datos transmitidos durante los últimos 7 días`,"Statistics over the past 7 days":`Estadísticas de los últimos 7 días`,Status:`Estado`,"Status Report":`Informe de estado`,"Status report at %s":`Informe de estado en %s`,"Test result at %s":`Resultado de la prueba en %s`,"The control time was %s minutes.":`El tiempo de control fue de %s minutos.`,"Try again in %s sec.":`Inténtalo de nuevo en %s seg.`,Unknown:`Desconocido`,"Unusual activity detected!":`¡Actividad inusual detectada!`,Weekday:`Día laborable`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`Sus dispositivos inteligentes fueron revisados el %s a las %s. No se detectaron actividades inusuales.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`Sus dispositivos inteligentes fueron revisados el %s a las %s. Se detectó actividad inusual en al menos un dispositivo.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender utiliza la base de datos IP2Location LITE para`,minutes:`minutos`,"one hour":`una hora`,tooltip_score_1:`Nuestro software monitorea sus dispositivos inteligentes utilizando dos métodos.`,tooltip_score_2:`Un método probado de reconocimiento de patrones detecta malware conocido con un alto grado de certeza. Un enfoque moderno se basa en la inteligencia artificial (IA): este método evalúa el comportamiento de comunicación de los dispositivos inteligentes y, por lo tanto, también puede detectar nuevas amenazas. Sin embargo, este método está sujeto a una mayor incertidumbre.`,tooltip_score_3:`En general, cuanto mayor sea el índice de anomalía, mayor será la probabilidad de que se haya producido una actividad inusual.`,tooltip_score_4:`Básicamente, el resultado muestra si el comportamiento de comunicación de un dispositivo se desvía de los patrones típicos.`},pl:{"%s collected":`%s zebrano`,"%s minutes":`%s min.`,"%s of %s reached":`%s z %s osiągnięto`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`<strong>Nie wykryto żadnych anomalii</strong> podczas kontroli %s. Oznacza to, że wszystko jest w porządku.`,"Activate protection":`Aktywuj ochronę`,All:`Wszystko`,Analyzing:`Analizowanie`,Anomaly:`Anomalia`,"Anomaly Score":`Wynik anomalii`,"Average check time":`Średni czas kontroli`,"Average control time":`Średni czas kontroli`,"Below you will find information about checks on %s.":`Poniżej znajdziesz informacje dotyczące kontroli %s.`,"By country":`Według kraju`,"By day":`W dzień`,"By day (aggregated)":`Według dnia (łącznie)`,"By day-time":`W ciągu dnia`,"Click here to get more information":`Kliknij tutaj, aby uzyskać więcej informacji`,Close:`Zamknąć`,Configuring:`Konfigurowanie`,"Data volume":`Objętość danych`,"Deactivate protection":`Dezaktywuj ochronę`,"Detection engine status":`Stan silnika detekcji`,Detections:`Wykrycia`,Device:`Urządzenie`,"Device that contacted the most countries":`Urządzenie, które nawiązało kontakt z największą liczbą krajów`,"Device with the highest transmitted data volume":`Urządzenie o największej ilości przesłanych danych`,"Do not show this alert again for 10 minutes":`Nie pokazuj tego alertu ponownie przez 10 minut`,"Duration of checks":`Czas trwania kontroli`,"Duration of controls":`Czas trwania kontroli`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`Podczas sprawdzania %s wykryto <strong>maksymalny wynik anomalii %s</strong>. Oznacza to, że wszystko jest w porządku.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`Podczas inspekcji %s w %s wykryto %s anomalii, które mogą wskazywać na potencjalne zagrożenie bezpieczeństwa.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`Podczas inspekcji %s o godz. %s wykryto anomalię, która może wskazywać na potencjalne zagrożenie bezpieczeństwa.`,"Enable the instance in the admin":`Włącz instancję w panelu administracyjnym`,Error:`Błąd`,"Everything OK":`Wszystko OK`,"Everything is OK!":`Wszystko jest OK!`,"Execute control now":`Wykonaj teraz kontrolę`,Exited:`Wyszedł`,"IP geolocation":`Geolokalizacja IP`,"In %s minutes or when the maximal file size is reached":`Za %s minut lub gdy osiągnięty zostanie maksymalny rozmiar pliku`,"Instance is not running":`Instancja nie jest uruchomiona`,"Last control":`Ostatnia kontrola`,"Last result":`Ostatni wynik`,"Last week statistics":`Statystyki z zeszłego tygodnia`,"Manage monitored devices":`Zarządzaj monitorowanymi urządzeniami`,"Maximal control time":`Maksymalny czas sterowania`,"Maximum check time":`Maksymalny czas kontroli`,"Minimal control time":`Minimalny czas sterowania`,"Minimum check time":`Minimalny czas kontroli`,"New problem detected":`Wykryto nietypowe działania`,"Next control":`Następna kontrola`,"No anomalies were detected during the checks. Therefore, everything is in order.":`Podczas kontroli nie stwierdzono żadnych nieprawidłowości. Wszystko jest zatem w porządku.`,"No anomaly":`Brak anomalii`,"No connection":`Brak połączenia`,"No data available":`Brak dostępnych danych`,"No results available":`Brak dostępnych wyników`,"No results yet exist":`Brak jeszcze wyników`,"No status report available.":`Brak dostępnego raportu o stanie.`,"Number of packets":`Liczba pakietów`,Ok:`OK`,"Open in Admin":`Otwórz w Adminie`,"Protection enabled":`Ochrona włączona`,"Recording is not running. Please check the log for more details":`Nagrywanie nie działa. Sprawdź dziennik, aby uzyskać więcej szczegółów.`,"Recording is running":`Nagrywanie jest uruchomione`,Results:`Wyniki`,Running:`Działanie`,"Save threshold in seconds":`Zapisz próg w sekundach`,"Scan details (today)":`Szczegóły skanowania (dzisiaj)`,Score:`Wynik`,Settings:`Ustawienia`,"Show only alarms and warnings":`Pokaż tylko alarmy i ostrzeżenia`,"Show results":`Pokaż wyniki`,"Software activated":`Oprogramowanie aktywowane`,"Software not activated":`Oprogramowanie nie zostało aktywowane`,Started:`Rozpoczęto`,Statistics:`Statystyka`,"Statistics about Data-volume in the last week":`Statystyki dotyczące wolumenu danych w ostatnim tygodniu`,"Statistics on aggregated transmitted data volume over the past 7 days":`Statystyki dotyczące łącznego wolumenu przesłanych danych w ciągu ostatnich 7 dni`,"Statistics over the past 7 days":`Statystyki z ostatnich 7 dni`,Status:`Status`,"Status Report":`Raport o stanie`,"Status report at %s":`Raport o stanie w %s`,"Test result at %s":`Wynik testu w %s`,"The control time was %s minutes.":`Czas kontroli wynosił %s minut.`,"Try again in %s sec.":`Spróbuj ponownie za %s sek.`,Unknown:`Nieznany`,"Unusual activity detected!":`Wykryto nietypową aktywność!`,Weekday:`Dzień powszedni`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`Twoje urządzenia inteligentne zostały sprawdzone %s o %s. Nie wykryto żadnych nietypowych działań.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`Twoje urządzenia inteligentne zostały sprawdzone na %s o %s. Wykryto nietypową aktywność na co najmniej jednym urządzeniu.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender używa bazy danych IP2Location LITE do`,minutes:`protokół`,"one hour":`jedna godzina`,tooltip_score_1:`Nasze oprogramowanie monitoruje Twoje inteligentne urządzenia za pomocą dwóch metod.`,tooltip_score_2:`Sprawdzona metoda rozpoznawania wzorców wykrywa znane złośliwe oprogramowanie z dużą pewnością. Nowoczesne podejście opiera się na sztucznej inteligencji (AI): metoda AI ocenia zachowania komunikacyjne inteligentnych urządzeń i dzięki temu może wykrywać nowe zagrożenia. Metoda ta jest jednak obarczona większą niepewnością.`,tooltip_score_3:`Ogólnie rzecz biorąc, im wyższy stopień anomalii, tym większe prawdopodobieństwo wystąpienia nietypowej aktywności.`,tooltip_score_4:`Wynik pokazuje zasadniczo, czy zachowanie komunikacyjne urządzenia odbiega od typowych wzorców.`},uk:{"%s collected":`Зібрано %s`,"%s minutes":`%s хв.`,"%s of %s reached":`Досягнуто %s %s`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`Під час перевірок %s <strong>аномалій</strong> не виявлено. Отже, все гаразд.`,"Activate protection":`Активувати захист`,All:`Усі`,Analyzing:`Аналіз`,Anomaly:`Аномалія`,"Anomaly Score":`Оцінка аномалій`,"Average check time":`Середній час перевірки`,"Average control time":`Середній час контролю`,"Below you will find information about checks on %s.":`Нижче ви знайдете інформацію про перевірки %s.`,"By country":`За країною`,"By day":`Вдень`,"By day (aggregated)":`За день (узагальнено)`,"By day-time":`Вдень`,"Click here to get more information":`Натисніть тут, щоб отримати більше інформації`,Close:`Закрити`,Configuring:`Налаштування`,"Data volume":`Обсяг даних`,"Deactivate protection":`Деактивувати захист`,"Detection engine status":`Стан механізму виявлення`,Detections:`Виявлення`,Device:`Пристрій`,"Device that contacted the most countries":`Пристрій, який зв'язався з найбільшою кількістю країн`,"Device with the highest transmitted data volume":`Пристрій з найбільшим обсягом переданих даних`,"Do not show this alert again for 10 minutes":`Не показувати це сповіщення протягом 10 хвилин`,"Duration of checks":`Тривалість перевірок`,"Duration of controls":`Тривалість контролю`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`Під час перевірок %s було виявлено <strong>максимальний бал аномалії %s</strong>. Отже, все гаразд.`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`Під час перевірки %s за адресою %s було виявлено %s аномалій, які можуть свідчити про потенційну загрозу безпеці.`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`Під час перевірки %s за адресою %s було виявлено аномалію, яка може свідчити про потенційну загрозу безпеці.`,"Enable the instance in the admin":`Увімкніть екземпляр в адміністративній панелі`,Error:`Помилка`,"Everything OK":`Все гаразд`,"Everything is OK!":`Все гаразд!`,"Execute control now":`Виконайте контроль зараз`,Exited:`Вихід`,"IP geolocation":`Геолокація IP-адрес`,"In %s minutes or when the maximal file size is reached":`Через %s хвилин або коли буде досягнуто максимального розміру файлу`,"Instance is not running":`Екземпляр не працює`,"Last control":`Останній контроль`,"Last result":`Останній результат`,"Last week statistics":`Статистика минулого тижня`,"Manage monitored devices":`Керування пристроями, що контролюються`,"Maximal control time":`Максимальний час керування`,"Maximum check time":`Максимальний час перевірки`,"Minimal control time":`Мінімальний час контролю`,"Minimum check time":`Мінімальний час перевірки`,"New problem detected":`Виявлено незвичайну активність`,"Next control":`Наступний контроль`,"No anomalies were detected during the checks. Therefore, everything is in order.":`Під час перевірок жодних аномалій не виявлено. Отже, все гаразд.`,"No anomaly":`Без аномалії`,"No connection":`Немає з'єднання`,"No data available":`Дані недоступні`,"No results available":`Немає результатів`,"No results yet exist":`Результатів поки що немає`,"No status report available.":`Звіт про стан недоступний.`,"Number of packets":`Кількість пакетів`,Ok:`Гаразд`,"Open in Admin":`Відкрити в адміністраторі`,"Protection enabled":`Захист увімкнено`,"Recording is not running. Please check the log for more details":`Запис не виконується. Будь ласка, перевірте журнал для отримання додаткової інформації.`,"Recording is running":`Запис триває`,Results:`Результати`,Running:`Біг`,"Save threshold in seconds":`Збереження порогу за секунди`,"Scan details (today)":`Деталі сканування (сьогодні)`,Score:`Рахунок`,Settings:`Налаштування`,"Show only alarms and warnings":`Показувати лише тривоги та попередження`,"Show results":`Показати результати`,"Software activated":`Програмне забезпечення активовано`,"Software not activated":`Програмне забезпечення не активовано`,Started:`Розпочато`,Statistics:`Статистика`,"Statistics about Data-volume in the last week":`Статистика щодо обсягу даних за останній тиждень`,"Statistics on aggregated transmitted data volume over the past 7 days":`Статистика щодо сумарного обсягу переданих даних за останні 7 днів`,"Statistics over the past 7 days":`Статистика за останні 7 днів`,Status:`Статус`,"Status Report":`Звіт про стан`,"Status report at %s":`Звіт про стан о %s`,"Test result at %s":`Результат тесту о %s`,"The control time was %s minutes.":`Контрольний час становив %s хвилин.`,"Try again in %s sec.":`Спробуйте ще раз через %s сек.`,Unknown:`Невідомо`,"Unusual activity detected!":`Виявлено незвичайну активність!`,Weekday:`Будній день`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`Ваші смарт-пристрої було перевірено %s о %s. Незвичайної активності не виявлено.`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`Ваші смарт-пристрої було перевірено %s о %s. Виявлено незвичну активність щонайменше на одному пристрої.`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender використовує базу даних IP2Location LITE для`,minutes:`хвилин`,"one hour":`одна година`,tooltip_score_1:`Наше програмне забезпечення контролює ваші смарт-пристрої двома способами.`,tooltip_score_2:`Перевірений метод розпізнавання образів виявляє відоме шкідливе програмне забезпечення з високим ступенем впевненості. Сучасний підхід базується на штучному інтелекті (ШІ): метод ШІ оцінює комунікаційну поведінку смарт-пристроїв і таким чином може також виявляти нові загрози. Однак цей метод схильний до більшої невизначеності.`,tooltip_score_3:`Загалом, чим вищий рейтинг аномалії, тим більша ймовірність того, що відбулася незвичайна активність.`,tooltip_score_4:`По суті, результат показує, чи відхиляється комунікаційна поведінка пристрою від типових шаблонів.`},"zh-cn":{"%s collected":`已收集 %s`,"%s minutes":`%s 分钟`,"%s of %s reached":`已达到 %s（共 %s）`,"<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.":`对 %s 的检查<strong>未发现任何异常</strong>。因此，一切正常。`,"Activate protection":`激活保护`,All:`全部`,Analyzing:`分析`,Anomaly:`异常`,"Anomaly Score":`异常分数`,"Average check time":`平均检查时间`,"Average control time":`平均控制时间`,"Below you will find information about checks on %s.":`下面您将找到有关 %s 检查的信息。`,"By country":`按国家`,"By day":`白天`,"By day (aggregated)":`按天（汇总）`,"By day-time":`白天`,"Click here to get more information":`点击此处获取更多信息`,Close:`关闭`,Configuring:`配置`,"Data volume":`数据量`,"Deactivate protection":`停用保护`,"Detection engine status":`检测引擎状态`,Detections:`检测`,Device:`设备`,"Device that contacted the most countries":`联系最多国家/地区的设备`,"Device with the highest transmitted data volume":`传输数据量最高的设备`,"Do not show this alert again for 10 minutes":`10 分钟内不再显示此警报`,"Duration of checks":`检查时长`,"Duration of controls":`管控持续时间`,"During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.":`在对 %s 进行检查时，检测到<strong>最大异常分数为 %s</strong>。因此，一切正常。`,"During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.":`在 %s 的 %s 检查期间，检测到 %s 异常，这可能表明存在潜在的安全风险。`,"During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.":`在对 %s 的 %s 进行检查时，检测到了可能表明存在潜在安全风险的异常。`,"Enable the instance in the admin":`在管理员中启用实例`,Error:`错误`,"Everything OK":`一切正常`,"Everything is OK!":`一切正常！`,"Execute control now":`立即执行控制`,Exited:`已退出`,"IP geolocation":`IP 地理定位`,"In %s minutes or when the maximal file size is reached":`%s 分钟后或达到最大文件大小时`,"Instance is not running":`实例未运行`,"Last control":`最后控制`,"Last result":`最后结果`,"Last week statistics":`上周统计数据`,"Manage monitored devices":`管理受监控的设备`,"Maximal control time":`最大控制时间`,"Maximum check time":`最长检查时间`,"Minimal control time":`最短控制时间`,"Minimum check time":`最短检查时间`,"New problem detected":`检测到异常活动`,"Next control":`下一个控件`,"No anomalies were detected during the checks. Therefore, everything is in order.":`检查过程中未发现任何异常。因此，一切正常。`,"No anomaly":`无异常`,"No connection":`无连接`,"No data available":`无可用数据`,"No results available":`没有可用结果`,"No results yet exist":`尚无结果`,"No status report available.":`没有可用的状态报告。`,"Number of packets":`数据包数量`,Ok:`好的`,"Open in Admin":`在管理员中打开`,"Protection enabled":`保护已启用`,"Recording is not running. Please check the log for more details":`录制未运行。请查看日志了解更多详细信息`,"Recording is running":`正在录制`,Results:`结果`,Running:`跑步`,"Save threshold in seconds":`保存阈值（以秒为单位）`,"Scan details (today)":`扫描详情（今日）`,Score:`分数`,Settings:`设置`,"Show only alarms and warnings":`仅显示警报和警告`,"Show results":`显示结果`,"Software activated":`软件已激活`,"Software not activated":`软件未激活`,Started:`已开始`,Statistics:`统计数据`,"Statistics about Data-volume in the last week":`上周数据量统计`,"Statistics on aggregated transmitted data volume over the past 7 days":`过去7天累计传输数据量统计`,"Statistics over the past 7 days":`过去7天的统计数据`,Status:`地位`,"Status Report":`状态报告`,"Status report at %s":`%s 的状态报告`,"Test result at %s":`%s 的测试结果`,"The control time was %s minutes.":`控制时间为%s分钟。`,"Try again in %s sec.":`请在 %s 秒后重试。`,Unknown:`未知`,"Unusual activity detected!":`检测到异常活动！`,Weekday:`工作日`,"Your smart devices were checked on %s at %s. No unusual activities were detected.":`您的智能设备已于 %s 于 %s 检查。未检测到任何异常活动。`,"Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.":`您的智能设备已于 %s 于 %s 检查。至少有一台设备检测到异常活动。`,"ioBroker.kisshome-defender uses the IP2Location LITE database for":`ioBroker.kisshome-defender 使用 IP2Location LITE 数据库`,minutes:`分钟`,"one hour":`一小时`,tooltip_score_1:`我们的软件使用两种方法监控您的智能设备。`,tooltip_score_2:`经过验证的模式识别方法能够高度准确地检测已知恶意软件。现代方法基于人工智能 (AI)：AI 方法评估智能设备的通信行为，因此也能检测新的威胁。然而，这种方法的不确定性较大。`,tooltip_score_3:`一般来说，异常等级越高，发生异常活动的可能性就越大。`,tooltip_score_4:`基本上，结果显示设备的通信行为是否偏离了典型模式。`}},Q}function Be(e,t,...n){let r=ze(),i=Re[e]?.[t]||Le[t]||r[e]?.[t]||r.en?.[t]||t;for(let e of n)i=i.replace(`%s`,()=>String(e));return i}function Ve(e){return(t,...n)=>Be(e,t,...n)}var He=`
* {
    box-sizing: border-box;
}
.btn {
    font: inherit;
    font-size: 0.9em;
    font-weight: 500;
    letter-spacing: 0.02em;
    margin: 0;
    border: none;
    border-radius: var(--iob-border-radius, 4px);
    padding: 0.5em 1.1em;
    background: var(--iob-primary, #3399cc);
    color: var(--iob-primary-contrast, #fff);
    cursor: pointer;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1em;
    max-width: 100%;
    flex: none;
}
.btn:hover:not(:disabled) {
    filter: brightness(1.1);
}
.btn:focus-visible,
.link:focus-visible,
.chip:focus-visible,
.tab:focus-visible,
.result-head:focus-visible {
    outline: 2px solid var(--iob-primary, #3399cc);
    outline-offset: 2px;
}
.btn:disabled {
    cursor: default;
    opacity: 0.45;
}
.btn-note {
    font-size: 0.75em;
    font-style: italic;
    opacity: 0.8;
}
.link {
    font: inherit;
    color: var(--iob-primary, #3399cc);
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-decoration: underline;
    text-align: left;
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
}
.link svg {
    width: 1em;
    height: 1em;
    fill: currentColor;
    flex: none;
}
.status-icon {
    flex: none;
    width: 1.6em;
    height: 1.6em;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
}
.status-icon.ok {
    background: var(--iob-success, #4caf50);
}
.status-icon.bad {
    background: var(--iob-error, #f44336);
}
.status-icon.warning {
    border-radius: 0;
    color: var(--iob-error, #f44336);
}
.status-icon svg {
    width: 80%;
    height: 80%;
    fill: currentColor;
}
.status-icon.warning svg {
    width: 100%;
    height: 100%;
}
.secondary {
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.check {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    cursor: pointer;
}
.check input {
    width: 1.1em;
    height: 1.1em;
    margin: 0;
    accent-color: var(--iob-primary, #3399cc);
    cursor: pointer;
}
.actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}
.footnote {
    font-size: 0.8em;
    font-style: italic;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.footnote a {
    color: inherit;
}
`,Ue=`
:host {
    display: block;
    width: 100%;
    height: 100%;
}
.mount {
    width: 100%;
    height: 100%;
    /* the size of the box does not depend on what is in it - no loop between measuring and laying out */
    container-type: size;
}
${He}
.app {
    --gap: clamp(4px, 2.2cqmin, 12px);
    --line: var(--iob-divider, rgba(0, 0, 0, 0.12));
    --radius: calc(var(--iob-border-radius, 4px) * 2);
    --hover: color-mix(in srgb, currentColor 8%, transparent);
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-size: clamp(11px, 3.6cqmin, 16px);
    line-height: 1.35;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}
.app.edit {
    pointer-events: none;
}
.hint {
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    text-align: center;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.hint svg {
    width: clamp(20px, 12cqmin, 40px);
    height: clamp(20px, 12cqmin, 40px);
    fill: currentColor;
}
.header {
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--gap);
    padding: 0 var(--gap);
    border-bottom: 1px solid var(--line);
    min-height: 2.8em;
}
.logo {
    width: 1.9em;
    height: 1.9em;
    flex: none;
    object-fit: contain;
}
.brand {
    font-weight: 600;
    letter-spacing: 0.05em;
    white-space: nowrap;
}
.tabs {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: flex-end;
    align-self: stretch;
    overflow-x: auto;
    scrollbar-width: none;
}
.tab {
    font: inherit;
    font-size: 0.9em;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin: 0;
    padding: 0 0.7em;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    white-space: nowrap;
    flex: none;
}
.tab:hover {
    background: var(--hover);
}
.tab.active {
    color: var(--iob-primary, #3399cc);
    border-bottom-color: var(--iob-primary, #3399cc);
}
.tab.last {
    font-style: italic;
    margin-left: 0.6em;
}
.tab svg {
    width: 1.25em;
    height: 1.25em;
    fill: currentColor;
    flex: none;
}
.body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--gap);
    display: flex;
    flex-direction: column;
    gap: var(--gap);
}
.panel {
    font: inherit;
    color: inherit;
    text-align: left;
    background: transparent;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: var(--gap) calc(var(--gap) * 1.5);
    margin: 0;
    min-width: 0;
}
.panel p {
    margin: 0;
}
.panel.clickable {
    cursor: pointer;
}
.panel.clickable:hover {
    background: var(--hover);
}
.status-main {
    flex: 1;
    min-height: min-content;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: calc(var(--gap) * 1.5);
}
.status-rows {
    display: flex;
    flex-direction: column;
    gap: calc(var(--gap) * 0.9);
    font-size: 1.1em;
    max-width: 100%;
}
.status-row {
    display: flex;
    align-items: center;
    gap: 0.6em;
}
.engine.good {
    color: var(--iob-success, #4caf50);
}
.engine.warn {
    color: var(--iob-warning, #ff9800);
}
.engine.bad {
    color: var(--iob-error, #f44336);
}
.spinner {
    flex: none;
    width: 1.6em;
    height: 1.6em;
    border-radius: 50%;
    border: 0.22em solid color-mix(in srgb, currentColor 18%, transparent);
    border-top-color: var(--iob-primary, #3399cc);
    animation: spin 1s linear infinite;
}
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
.progress {
    flex: none;
    position: relative;
    height: 4px;
    width: 100%;
    overflow: hidden;
    border-radius: 2px;
    background: color-mix(in srgb, var(--iob-primary, #3399cc) 25%, transparent);
}
.progress::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40%;
    background: var(--iob-primary, #3399cc);
    animation: slide 1.4s ease-in-out infinite;
}
@keyframes slide {
    from {
        left: -40%;
    }
    to {
        left: 100%;
    }
}
.summary {
    flex: none;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    font-size: 1.1em;
}
.summary-text {
    flex: 1;
    text-align: center;
}
.detections-main,
.settings {
    flex: 1;
    min-height: min-content;
    display: flex;
    flex-direction: column;
    gap: calc(var(--gap) * 1.2);
}
.field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3em 0.8em;
}
.field-name {
    font-weight: 600;
    min-width: min(16em, 100%);
}
.note {
    flex-basis: 100%;
    font-size: 0.85em;
}
.trigger {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--gap) calc(var(--gap) * 2);
}
.trigger .progress {
    flex: 1;
    min-width: 6em;
    width: auto;
}
.switch {
    appearance: none;
    -webkit-appearance: none;
    position: relative;
    width: 2.6em;
    height: 1.4em;
    margin: 0;
    border-radius: 0.7em;
    background: color-mix(in srgb, currentColor 30%, transparent);
    cursor: pointer;
    transition: background 0.15s;
    flex: none;
}
.switch::after {
    content: '';
    position: absolute;
    top: 0.15em;
    left: 0.15em;
    width: 1.1em;
    height: 1.1em;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    transition: left 0.15s;
}
.switch:checked {
    background: var(--iob-primary, #3399cc);
}
.switch:checked::after {
    left: 1.35em;
}
.switch:disabled {
    opacity: 0.45;
    cursor: default;
}
.subtabs,
.legend {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35em;
}
.legend {
    max-height: 4.6em;
    overflow-y: auto;
}
.chip {
    font: inherit;
    font-size: 0.85em;
    color: inherit;
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 1em;
    padding: 0.2em 0.75em;
    margin: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}
.chip:hover {
    background: var(--hover);
}
.chip.active {
    background: var(--iob-primary, #3399cc);
    border-color: var(--iob-primary, #3399cc);
    color: var(--iob-primary-contrast, #fff);
}
.chip.off {
    opacity: 0.45;
    text-decoration: line-through;
}
.dot {
    flex: none;
    width: 0.7em;
    height: 0.7em;
    border-radius: 50%;
}
.statistics {
    flex: 1;
    min-height: 12em;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
}
.panel-title,
.totals-title {
    font-weight: 600;
}
.short {
    display: none;
}
.chart-area {
    flex: 1;
    min-height: 0;
    position: relative;
}
.empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.chart {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto 1fr auto;
    column-gap: 0.4em;
    padding-right: 1em;
    font-size: 0.8em;
}
.chart-name {
    grid-column: 1 / span 2;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
    padding-bottom: 0.3em;
}
.y-axis {
    position: relative;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.y-axis .sizer {
    display: block;
    visibility: hidden;
    height: 0;
    white-space: nowrap;
}
.y-axis .tick {
    position: absolute;
    right: 0;
    transform: translateY(50%);
    white-space: nowrap;
}
.plot {
    position: relative;
    min-height: 0;
    border-left: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    touch-action: pan-y;
}
.plot svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
}
.grid-line {
    stroke: var(--line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
}
.series {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
}
.cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
    pointer-events: none;
}
.tooltip {
    position: absolute;
    top: 0.3em;
    z-index: 1;
    max-width: 70%;
    max-height: calc(100% - 0.6em);
    overflow: hidden;
    padding: 0.3em 0.6em;
    background: var(--iob-paper, #fff);
    border: 1px solid var(--line);
    border-radius: var(--iob-border-radius, 4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    pointer-events: none;
}
.tooltip-time {
    font-weight: 600;
}
.tooltip-row {
    display: flex;
    align-items: center;
    gap: 0.4em;
    white-space: nowrap;
}
.tooltip-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.x-axis {
    position: relative;
    height: 1.6em;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.x-axis span {
    position: absolute;
    top: 0.3em;
    transform: translateX(-50%);
    white-space: nowrap;
}
.bars {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
}
.bar-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    font-size: 0.85em;
}
.bar-row {
    display: grid;
    grid-template-columns: minmax(3em, 32%) 1fr auto;
    align-items: center;
    gap: 0.5em;
}
.bar-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.bar-track {
    display: flex;
    height: 1em;
    min-width: 0;
}
.segment {
    height: 100%;
    min-width: 1px;
}
.segment:first-child {
    border-radius: 2px 0 0 2px;
}
.segment:last-child {
    border-radius: 0 2px 2px 0;
}
.bar-total {
    white-space: nowrap;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.totals {
    flex: none;
    font-size: 0.9em;
}
@container (max-width: 560px) {
    .tab .label {
        display: none;
    }
    .long {
        display: none;
    }
    .short {
        display: inline;
    }
}
@container (max-width: 340px) {
    .brand {
        display: none;
    }
}
`,We=`
:host {
    display: block;
}
${He}
.results,
.alert {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 16px;
    line-height: 1.4;
}
.results-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.results-list p {
    margin: 0;
}
.result {
    border: 1px solid var(--iob-divider, rgba(0, 0, 0, 0.12));
    border-radius: var(--iob-border-radius, 4px);
    overflow: hidden;
}
.result-head {
    font: inherit;
    color: inherit;
    width: 100%;
    margin: 0;
    border: none;
    padding: 8px 12px;
    background: color-mix(in srgb, currentColor 6%, transparent);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
}
.result-head:hover {
    background: color-mix(in srgb, currentColor 11%, transparent);
}
.result-icon {
    width: 1.6em;
    height: 1.6em;
    fill: currentColor;
    flex: none;
}
.result-title {
    flex: 1;
}
.chevron {
    width: 1.5em;
    height: 1.5em;
    fill: currentColor;
    flex: none;
    transition: transform 0.15s;
}
.result.open .chevron {
    transform: rotate(180deg);
}
.details {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.details-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.3em;
    font-weight: 600;
}
.details-title > svg {
    width: 1.6em;
    height: 1.6em;
    fill: currentColor;
    flex: none;
}
.details-text ul {
    margin: 4px 0;
    padding-left: 1.4em;
}
.italic {
    font-style: italic;
}
.devices {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--iob-divider, rgba(0, 0, 0, 0.12));
    border-radius: var(--iob-border-radius, 4px);
    overflow: hidden;
}
.device {
    display: grid;
    grid-template-columns: minmax(10em, 2fr) 7em 8em 3fr;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-top: 1px solid var(--iob-divider, rgba(0, 0, 0, 0.12));
}
.device.head {
    border-top: none;
    font-weight: 600;
    background: color-mix(in srgb, currentColor 8%, transparent);
}
.device-name {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow-wrap: anywhere;
}
.device-name small {
    font-style: italic;
    opacity: 0.8;
}
.device-packets {
    text-align: center;
}
.device-score {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 6px;
    border-radius: var(--iob-border-radius, 4px);
    color: #fff;
}
.device-score.good {
    background: var(--iob-success, #4caf50);
}
.device-score.bad {
    background: var(--iob-error, #f44336);
}
.device-status {
    display: flex;
    align-items: center;
    gap: 8px;
}
.device.alert .device-status {
    color: var(--iob-error, #f44336);
}
@container (max-width: 600px) {
    .device {
        grid-template-columns: 1fr auto;
    }
    .device.head {
        display: none;
    }
    .device-name,
    .device-status {
        grid-column: 1 / span 2;
    }
    .device-packets,
    .device-score {
        text-align: left;
        justify-content: flex-start;
    }
    .device-packets::before,
    .device-score::before {
        content: attr(data-label) ': ';
        font-weight: 600;
        margin-right: 4px;
    }
    .device-score::before {
        color: #fff;
    }
}
.alert-main {
    display: flex;
    align-items: center;
    gap: 24px;
}
.alert-text {
    flex: 1;
    font-size: 1.2em;
    font-weight: 600;
}
`,Ge=`kisshome-defender-tab`,Ke=`ignoreNewAlerts`,qe=`../${O}.svg`;function $(t){let n=document.createElement(`div`);for(let[e,r]of Object.entries(t))n.style.setProperty(e,r);let r=n.attachShadow({mode:`open`}),i=document.createElement(`style`);i.textContent=We;let a=document.createElement(`div`);return r.append(i,a),{element:n,root:e(a)}}ce(D,class extends se{#e;#t=null;#n;#r=null;#i=null;#a=``;#o=``;#s=``;#c=``;#l=null;#u=!1;#d;constructor(){super();let e=this.attachShadow({mode:`open`}),t=document.createElement(`style`);t.textContent=Ue,this.#e=document.createElement(`div`),this.#e.className=`mount`,e.append(t,this.#e);let n=q(Ge);this.#n=k.find(e=>e===n)||`status`,this.#d=new URL(qe,import.meta.url).href}disconnectedCallback(){super.disconnectedCallback(),this.#t?.unmount(),this.#t=null}getStateIds(e){let t=A(e.instance);return t?[M(t),...le.map(e=>j(t,e))]:[]}getObjectIds(e){let t=A(e.instance);return t?[ue(t)]:[]}#f=()=>Ve(this.systemLang);#p(e,t){return this.states[j(e,t)]}#m(e){let t=t=>this.#p(e,t)?.val,n=t(`recording.nextWrite`);return{alive:!!this.states[M(e)]?.val,recordingEnabled:!!t(`recording.enabled`),recordingRunning:!!t(`recording.running`),captured:Number(t(`recording.capturedFull`))||0,nextWrite:n&&new Date(n).getTime()||0,analysisRunning:!!t(`analysis.running`),idsStatus:String(t(`ids.status`)||``),lastTriggerWrite:this.#p(e,`recording.triggerWrite`)?.lc||0,lastSeenID:String(t(`analysis.lastSeen`)||``),lastCreated:String(t(`analysis.lastCreated`)??``),group:t(`ids.group`)===`B`?`B`:`A`,secondPeriod:!!t(`ids.period`)}}#h(){this.isConnected&&this.render()}#g=e=>{this.#n=e,J(Ge,e),this.#h()};#_=async e=>{let t=this.#r;return this.socket&&t?this.socket.sendTo(t,`getData`,{type:e}):null};#v=async()=>{let e=this.#r;return this.socket&&e?this.socket.sendTo(e,`getTotals`,{}):null};#y=()=>{let e=this.#r;e&&this.setState(j(e,`recording.enabled`),!this.#p(e,`recording.enabled`)?.val)};#b=()=>{this.#r&&this.setState(j(this.#r,`recording.triggerWrite`),!0)};#x=()=>{this.#T(``)};#S(e){let t=this.socket,n=[M(e),j(e,`analysis.lastCreated`),j(e,`analysis.lastSeen`),j(e,`analysis.lastShownAlert`)];if(!t||n.some(e=>this.states[e]===void 0))return;if(!this.states[M(e)]?.val){this.#a=``;return}let r=`${e}/${String(this.#p(e,`analysis.lastCreated`)?.val??``)}`;r!==this.#a&&(this.#a=r,t.sendTo(e,`getData`,{type:`allStatistics`}).then(t=>{this.#a===r&&t&&Array.isArray(t.results)&&(this.#i=t,this.#C(e,t),this.#h())}).catch(t=>console.warn(`<${D}>: cannot read the results of ${e}: ${String(t)}`)))}#C(e,t){let n=B(t.results);if(!n||this.editMode||!this.socket||[this.#o,this.#p(e,`analysis.lastShownAlert`)?.val,this.#p(e,`analysis.lastSeen`)?.val].includes(n.uuid))return;this.#o=n.uuid,this.socket.setState(j(e,`analysis.lastShownAlert`),n.uuid,!0);let r=new Date(q(Ke)||0).getTime()||0;this.settings.alertDialog!==!1&&r<=Date.now()&&!this.#l&&!this.#u&&this.#w(n)}async#w(e){let t=this.#f(),{element:n,root:r}=$(w(this.theme)),i=!1;r.render(/* @__PURE__ */ a(Ie,{t,alert:e,onIgnore:e=>i=e})),this.#u=!0;let o=null;try{o=await this.openDialog({title:t(`Unusual activity detected!`),element:n,width:640})}finally{this.#u=!1,r.unmount()}J(Ke,i?new Date(Date.now()+6e5).toISOString():null),o===`details`&&(this.#g(`detections`),await this.#T(e.uuid))}async#T(e){let t=this.#r;if(this.editMode||this.#l||!t)return;let n=this.#f(),{element:r,root:i}=$(w(this.theme));this.#l=()=>{let r=this.#m(t);i.render(/* @__PURE__ */ a(Fe,{t:n,results:this.#i,group:r.group,secondPeriod:r.secondPeriod,openUuid:e,now:Date.now()}))},this.#l();try{await this.openDialog({title:n(`Results`),element:r,width:1e3,height:720})}finally{this.#l=null,i.unmount()}let o=B(this.#i?.results);o&&this.socket&&!this.editMode&&this.#r===t&&this.socket.setState(j(t,`analysis.lastSeen`),o.uuid,!0)}#E(e,t){let n=this.socket;n&&t&&this.#c!==e&&(this.#c=e,n.getObjectViewSystem(`instance`,`system.adapter.admin.`,`system.adapter.admin.香`).then(n=>{this.#c===e&&(this.#s=ge(t,Object.values(n),e,window.location.hostname),this.#h())}).catch(()=>{}))}render(){this.#t||=e(this.#e);let t=this.#f(),n=A(this.settings.instance);if(n!==this.#r&&(this.#r=n,this.#i=null,this.#a=``,this.#o=``,this.#s=``,this.#c=``),!n){this.#t.render(/* @__PURE__ */ a(Y,{text:t(`chooseInstance`),editMode:this.editMode}));return}let r=this.objects[ue(n)];if(r===null){this.#t.render(/* @__PURE__ */ a(Y,{text:`${t(`noInstance`)}: ${n}`,editMode:this.editMode}));return}this.#S(n),this.#E(n,r);let i=Number(r?.native?.saveThresholdSeconds);this.#t.render(/* @__PURE__ */ a(je,{t,lang:this.systemLang,editMode:this.editMode,view:this.#n,logo:this.#d,values:this.#m(n),results:this.#i,adminLink:this.#s,saveThresholdSeconds:i>0?i:null,onView:this.#g,onToggleProtection:this.#y,onTrigger:this.#b,onShowResults:this.#x,load:this.#_,loadTotals:this.#v},n)),this.#l?.()}});