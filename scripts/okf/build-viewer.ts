// Phase 4 — self-contained OKF bundle viewer. Walks the bundle and emits one
// dependency-free HTML file (okf-bundle/_viewer.html) that renders the concept
// graph: search, type filter, clickable relationships, and a neighborhood graph.
// Open it directly in a browser — no server, no data leaves the page.
//
//   tsx scripts/okf/build-viewer.ts

import { readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { resolve, join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../okf-bundle");

const paths: string[] = [];
const idx = new Map<string, number>();
const meta = new Map<string, { type: string; title: string; tags: string[]; links: string[] }>();

function walk(dir: string) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!p.endsWith(".md") || f === "index.md" || f === "log.md") continue;
    const concept = relative(OUT, p).replace(/\\/g, "/").replace(/\.md$/, "");
    idx.set(concept, paths.length); paths.push(concept);
    const head = readFileSync(p, "utf-8").split("\n# Record")[0]!;
    const type = head.match(/^type:\s*"?(.*?)"?\s*$/m)?.[1] ?? "";
    const title = head.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? concept;
    const tagsLine = head.match(/^tags:\s*\[(.*)\]\s*$/m)?.[1] ?? "";
    const tags = tagsLine ? tagsLine.split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean) : [];
    const links: string[] = [];
    for (const m of head.matchAll(/\]\((\/[^)]+?)\.md\)/g)) { const t = m[1]!.slice(1); if (t !== concept) links.push(t); }
    meta.set(concept, { type, title, tags, links });
  }
}
walk(OUT);

const N = paths.length;
const T: string[] = [], Y: string[] = [], G: string[][] = [], L: number[][] = [];
for (let i = 0; i < N; i++) {
  const m = meta.get(paths[i]!)!;
  T[i] = m.title; Y[i] = m.type; G[i] = m.tags;
  L[i] = [...new Set(m.links.map((t) => idx.get(t)).filter((x): x is number => x !== undefined))];
}
const data = JSON.stringify({ P: paths, T, Y, G, L });

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>OKF Bundle Viewer</title>
<style>
:root{--bg:#0f1420;--panel:#171e2e;--line:#26304a;--fg:#dbe3f4;--mut:#8a98b8;--acc:#5b8cff;--chip:#222d44}
*{box-sizing:border-box}body{margin:0;font:13px/1.5 ui-sans-serif,system-ui,Segoe UI,Roboto;background:var(--bg);color:var(--fg);height:100vh;display:flex;flex-direction:column}
header{padding:10px 14px;border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
header b{color:#fff}header .mut{color:var(--mut)}
input,select{background:var(--panel);border:1px solid var(--line);color:var(--fg);border-radius:6px;padding:6px 9px;font:inherit}
input{flex:1;min-width:180px}
main{flex:1;display:grid;grid-template-columns:340px 1fr;min-height:0}
#list{border-right:1px solid var(--line);overflow:auto}
.row{padding:6px 12px;cursor:pointer;border-bottom:1px solid #1c2335;display:flex;gap:8px;align-items:baseline}
.row:hover{background:var(--panel)}.row.sel{background:#1d2740}
.row .n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.badge{font-size:10px;color:var(--mut);background:var(--chip);border-radius:4px;padding:1px 6px;white-space:nowrap}
#detail{overflow:auto;padding:16px 20px}
#detail h2{margin:0 0 2px;color:#fff}.tags{margin:8px 0}.tag{display:inline-block;background:var(--chip);color:var(--mut);border-radius:4px;padding:2px 7px;margin:0 5px 5px 0;font-size:11px}
.sec{margin-top:16px}.sec h3{margin:0 0 6px;color:var(--acc);font-size:12px;text-transform:uppercase;letter-spacing:.5px}
a.link{color:var(--fg);cursor:pointer;text-decoration:none;border-bottom:1px dotted #44537a;margin-right:2px}
a.link:hover{color:var(--acc)}
.grp{margin:3px 0;color:var(--mut)}.grp b{color:var(--fg);font-weight:600;text-transform:capitalize}
svg{width:100%;height:420px;background:#0c111c;border:1px solid var(--line);border-radius:8px;margin-top:8px}
.node{cursor:pointer}.node text{fill:var(--fg);font-size:10px}.edge{stroke:#33405f}
.hint{color:var(--mut);font-size:12px}
</style></head><body>
<header><b>OKF Bundle Viewer</b><span class="mut">D365 Knowledge Bundle · <span id="cnt"></span> concepts</span>
<input id="q" placeholder="Search concepts…" autocomplete="off"><select id="ty"></select></header>
<main><div id="list"></div><div id="detail"><p class="hint">Select a concept to explore its blast radius.</p></div></main>
<script>
const D=${data};
const N=D.P.length, folder=p=>p.split('/')[0];
const inc=Array.from({length:N},()=>[]); for(let i=0;i<N;i++)for(const j of D.L[i])inc[j].push(i);
const types=[...new Set(D.Y)].sort();
const tySel=document.getElementById('ty'); tySel.innerHTML='<option value="">All types ('+N+')</option>'+types.map(t=>'<option>'+t+'</option>').join('');
document.getElementById('cnt').textContent=N.toLocaleString();
const listEl=document.getElementById('list'), detEl=document.getElementById('detail'), qEl=document.getElementById('q');
let sel=-1;
function order(){const q=qEl.value.toLowerCase(),ty=tySel.value;const out=[];for(let i=0;i<N;i++){if(ty&&D.Y[i]!==ty)continue;if(q&&!(D.T[i].toLowerCase().includes(q)||D.P[i].includes(q)))continue;out.push(i);if(out.length>=600)break;}return out;}
function renderList(){const ids=order();listEl.innerHTML=ids.map(i=>'<div class="row'+(i===sel?' sel':'')+'" data-i="'+i+'"><span class="n">'+esc(D.T[i])+'</span><span class="badge">'+esc(D.Y[i])+'</span></div>').join('')||'<p class="hint" style="padding:12px">No matches.</p>';}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function group(ids){const g={};for(const i of ids){(g[folder(D.P[i])]??=[]).push(i);}return Object.entries(g).sort((a,b)=>b[1].length-a[1].length);}
function linksHtml(ids){return group(ids).map(([f,arr])=>'<div class="grp"><b>'+f+'</b> ('+arr.length+'): '+arr.slice(0,40).map(i=>'<a class="link" data-i="'+i+'">'+esc(D.T[i])+'</a>').join(', ')+(arr.length>40?' …+'+(arr.length-40):'')+'</div>').join('');}
function select(i){sel=i;renderList();const out=D.L[i],ic=inc[i];const all=[...new Set([...out,...ic])];
 detEl.innerHTML='<h2>'+esc(D.T[i])+'</h2><div class="mut">'+esc(D.Y[i])+' · <code>'+esc(D.P[i])+'</code></div>'
 +(D.G[i].length?'<div class="tags">'+D.G[i].map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</div>':'')
 +'<div class="sec"><h3>Blast radius — '+all.length+' directly connected</h3>'+graph(i,all)+'</div>'
 +'<div class="sec"><h3>Depends on → '+out.length+'</h3>'+(out.length?linksHtml(out):'<span class="hint">none</span>')+'</div>'
 +'<div class="sec"><h3>Referenced by ← '+ic.length+'</h3>'+(ic.length?linksHtml(ic):'<span class="hint">none</span>')+'</div>';
 detEl.scrollTop=0;}
const palette={};let pc=0;const colors=['#5b8cff','#ff7eb6','#7ee787','#ffa657','#d2a8ff','#79c0ff','#ffd866','#ff9492','#56d4dd'];
function color(t){return palette[t]??=colors[pc++%colors.length];}
function graph(center,neigh){const ns=neigh.slice(0,48);const cx=300,cy=200,r=160;let s='<svg viewBox="0 0 600 410">';
 ns.forEach((j,k)=>{const a=k/ns.length*2*Math.PI,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);s+='<line class="edge" x1="'+cx+'" y1="'+cy+'" x2="'+x+'" y2="'+y+'"/>';});
 ns.forEach((j,k)=>{const a=k/ns.length*2*Math.PI,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);s+='<g class="node" data-i="'+j+'"><circle cx="'+x+'" cy="'+y+'" r="5" fill="'+color(D.Y[j])+'"/><title>'+esc(D.T[j])+' ('+esc(D.Y[j])+')</title></g>';});
 s+='<g class="node"><circle cx="'+cx+'" cy="'+cy+'" r="9" fill="#fff"/><text x="'+(cx+12)+'" y="'+(cy+4)+'">'+esc(D.T[center])+'</text></g>';
 s+='</svg>'+(neigh.length>48?'<div class="hint">showing 48 of '+neigh.length+' neighbors</div>':'');return s;}
document.addEventListener('click',e=>{const el=e.target.closest('[data-i]');if(el)select(+el.dataset.i);});
qEl.addEventListener('input',renderList);tySel.addEventListener('change',renderList);
renderList();
</script></body></html>`;

writeFileSync(join(OUT, "_viewer.html"), html);
console.log(`viewer → okf-bundle/_viewer.html  (${N} concepts, ${(html.length / 1024 / 1024).toFixed(1)} MB, self-contained)`);
