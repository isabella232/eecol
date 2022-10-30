/* eslint-disable */
/*
 * @license
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
function e(e){return"string"==typeof e.Required&&["x","yes","true"].includes(e.Required.toLowerCase())}function t(e){return e&&"string"==typeof e?e.split(" ").filter((e=>!!e)).map(((e,t)=>{const n=e.toLowerCase();return 0===t?n:n.substring(0,1).toUpperCase()+n.substring(1)})).join(""):e}function n(e){const t={};return[...e.elements].forEach((e=>{"checkbox"===e.type?e.checked&&(t[e.id]=e.value):e.id&&(t[e.id]=e.value)})),t}function a(e,a,o){const r=document.createElement("button");var c;return r.textContent=a[t(e.Label)]||e.Label,r.classList.add("button"),e.Variant&&r.classList.add((c=e.Variant)&&"string"==typeof c?c.toLowerCase().replace(/[^0-9a-z]/gi,"-"):""),"submit"===e.Type||o||e.Event?(r.addEventListener("click",(async t=>{t.preventDefault();const a=r.closest("form");if(e.Event&&a.dispatchEvent(new CustomEvent("form-event",{detail:{type:e.Event}})),"submit"!==e.Type)return;if(!a.checkValidity())return;const c=n(a);o&&"function"==typeof o?(r.setAttribute("disabled",""),await o.call(null,c)):(r.setAttribute("disabled",""),await async function(e,t){const n=await fetch(e.dataset.action,{method:"POST",cache:"no-cache",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:t})});return await n.text(),t}(a,c)),e.Extra&&(window.location.href=e.Extra)})),r):r}function o(n,a){const o=document.createElement("input");return o.type=n.Type,o.id=n.Field,o.setAttribute("placeholder",a[t(n.Placeholder)]||n.Placeholder),e(n.Required)&&o.setAttribute("required","required"),n.Autocomplete&&o.setAttribute("autocomplete",n.Autocomplete),o}function r(n,a){const o=document.createElement("label");return o.setAttribute("for",n.Field),o.textContent=a[t(n.Label)]||n.Label,e(n.Required)&&o.classList.add("required"),o}function c(e,t){const a=n(e);t.forEach((t=>{const{type:n,condition:{key:o,operator:r,value:c}}=t.rule;"visible"===n&&"eq"===r&&(a[o]===c?e.querySelector(`.${t.fieldId}`).classList.remove("hidden"):e.querySelector(`.${t.fieldId}`).classList.add("hidden"))}))}async function i(n,i={}){const s=i.absoluteDefinitionURL?n:new URL(n).pathname;let{submissionURL:l,action:d}=i;l||([l]=s.split(".json"));const u=await fetch(s),p=await u.json(),m=document.createElement("form"),b=[];d||null===d?"string"==typeof d&&(m.dataset.action=d,d=void 0):m.dataset.action=l,i.autocomplete&&m.setAttribute("autocomplete",i.autocomplete);const f=i.placeholders||{};return p.data.forEach((n=>{n.Type=n.Type||"text";const c=document.createElement("div"),i=n.Style?` form-${n.Style}`:"",s=`form-${n.Field}-wrapper${i}`;switch(c.className=s,c.classList.add("field-wrapper"),n.Type){case"select":c.append(r(n,f)),c.append(function(n,a){const o=document.createElement("select");if(o.id=n.Field,n.Placeholder){const e=document.createElement("option");e.textContent=a[t(n.Placeholder)]||n.Placeholder,e.setAttribute("selected",""),e.setAttribute("disabled",""),o.append(e)}return n.Options.split(",").forEach((e=>{const n=document.createElement("option");e=e.trim(),n.textContent=a[t(e)]||e,n.value=e,o.append(n)})),e(n.Required)&&o.setAttribute("required","required"),n.Autocomplete&&o.setAttribute("autocomplete",n.Autocomplete),o}(n,f));break;case"heading":c.append(function(e,n){const a=document.createElement("h3");return a.textContent=n[t(e.Label)]||e.Label,a}(n,f));break;case"checkbox":c.append(o(n,f)),c.append(r(n,f));break;case"text-area":c.append(r(n,f)),c.append(function(n,a){const o=document.createElement("textarea");return o.id=n.Field,o.setAttribute("placeholder",a[t(n.Placeholder)]||n.Placeholder),e(n.Required)&&o.setAttribute("required","required"),n.Autocomplete&&o.setAttribute("autocomplete",n.Autocomplete),o}(n,f));break;case"submit":c.append(a(n,f,d));break;case"button":c.append(a(n,f));break;default:c.append(r(n,f)),c.append(o(n,f))}if(n.Rules)try{b.push({fieldId:s,rule:JSON.parse(n.Rules)})}catch(e){console.log(`Invalid Rule ${n.Rules}: ${e}`)}m.append(c)})),m.addEventListener("change",(()=>c(m,b))),c(m,b),m}export{i as createForm};