const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const {webcrypto}=require('node:crypto');
const repo=__dirname+'/..';
const report=[];
async function test(name,fn){await fn();report.push(name);}
class Element {
 constructor(doc){this.doc=doc;this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.children=[];this.classes=new Set();this.isConnected=true;this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),toggle:(c,v)=>v?this.classes.add(c):this.classes.delete(c)};}
 addEventListener(ev,fn){(this.listeners[ev]??=[]).push(fn);}
 async emit(ev){for(const fn of this.listeners[ev]??[])await fn({preventDefault(){}});}
 setAttribute(k,v){this[k]=v;}
 append(el){this.children.push(el);}
 replaceChildren(){this.children=[];}
 focus(){this.doc.activeElement=this;}
 showModal(){this.open=true;}
 close(){this.open=false;this.emit('close');}
}
function client(){
 const nodes=new Map(), saved=new Map(), calls=[], queue=[];
 const document={};document.querySelector=s=>{if(!nodes.has(s))nodes.set(s,new Element(document));return nodes.get(s);};
 document.createElement=()=>new Element(document);document.activeElement=document.querySelector('#btnPublicar');
 const window={CALA_RANKING_URL:'https://example.test/functions/v1/cala-ranking'};
 const fetch=async(url,opts)=>{calls.push(opts?.body?JSON.parse(opts.body):null);const next=queue.shift();if(next instanceof Error)throw next;if(typeof next==='function')return next();assert(next,'Resposta simulada ausente');return{ok:!next.error,json:async()=>next};};
 vm.runInNewContext(fs.readFileSync(repo+'/ranking.js','utf8'),{window,document,fetch,setTimeout,clearTimeout,AbortController,TypeError,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}});
 const $=s=>document.querySelector(s), q=window.CalaRanking;
 async function abrir(){q.fim(37);await $('#btnPublicar').emit('click');}
 return{$,q,window,nodes,saved,calls,queue,abrir,submit:()=>$('#rankingForm').emit('submit')};
}
const rows=[{position:1,name:'Nome <img src=x>',name_key:'nome',score:300}];
const sucesso={created:false,improved:false,name:'Nome <img src=x>',name_key:'nome',best:300,position:1,rows};
(async()=>{
await test('Convite abre com a pontuação final e sem guardar o PIN',async()=>{const c=client();await c.abrir();assert.equal(c.$('#rankingPontos').textContent,'37 pontos nesta rodada');assert(c.$('#rankingDialog').open);assert.equal(c.$('#rankingPin').value,'');assert.equal(c.saved.size,0);});
await test('PIN precisa de quatro números e nome tem limite de 24 caracteres',async()=>{const c=client();await c.abrir();c.$('#rankingNome').value='Gilzão';c.$('#rankingPin').value='123';await c.submit();assert.equal(c.calls.length,0);c.$('#rankingPin').value='0047';c.$('#rankingNome').value='x'.repeat(25);await c.submit();assert.equal(c.calls.length,0);});
await test('Nome novo exige aviso e repetição do código antes de criar',async()=>{const c=client();await c.abrir();c.$('#rankingNome').value='  Teste   Novo ';c.$('#rankingPin').value='0047';c.queue.push({exists:false});await c.submit();assert.equal(c.calls.length,1);assert.equal(c.calls[0].name,'Teste Novo');assert(!('pin' in c.calls[0]));assert.equal(c.$('#rankingNovo').hidden,false);assert(c.$('#rankingConfirmar').required);c.$('#rankingConfirmar').value='0048';await c.submit();assert.equal(c.calls.length,1);c.$('#rankingConfirmar').value='0047';c.queue.push({...sucesso,created:true,improved:true});await c.submit();assert.equal(c.calls[1].pin,'0047');assert.equal(c.calls[1].create,true);assert.equal(c.calls[1].score,37);assert.equal(c.$('#rankingPin').value,'');assert.equal(c.$('#rankingConfirmar').value,'');assert.equal([...c.saved.values()].includes('0047'),false);assert(c.$('#btnPublicar').disabled);});
await test('Código incorreto mantém formulário e não confirma publicação',async()=>{const c=client();await c.abrir();c.$('#rankingNome').value='Nome';c.$('#rankingPin').value='1234';c.queue.push({exists:true},{error:'wrong_pin',message:'Código incorreto.'});await c.submit();assert.equal(c.$('#rankingCadastro').hidden,false);assert.equal(c.$('#btnPublicar').disabled,false);assert.equal(c.saved.size,0);assert.equal(c.$('#rankingMensagem').textContent,'Código incorreto.');});
await test('Pontuação menor preserva o recorde e destaca o próprio nome com texto seguro',async()=>{const c=client();await c.abrir();c.$('#rankingNome').value='Nome';c.$('#rankingPin').value='0047';c.queue.push({exists:true},sucesso);await c.submit();assert.match(c.$('#rankingResultado').textContent,/recorde maior foi mantido/);assert.match(c.$('#rankingResultado').textContent,/300 pontos/);assert(c.$('#rankingLinhas').children[0].classes.has('voce'));assert.equal(c.$('#rankingLinhas').children[0].children[1].textContent,'Nome <img src=x>');});
await test('Falha de rede permite tentar novamente sem perder a pontuação',async()=>{const c=client();await c.abrir();c.$('#rankingNome').value='Nome';c.$('#rankingPin').value='0047';c.queue.push(new TypeError('offline'));await c.submit();assert.match(c.$('#rankingMensagem').textContent,/conectar/);assert.equal(c.$('#rankingEnviar').disabled,false);c.queue.push({exists:true},sucesso);await c.submit();assert.equal(c.calls.at(-1).score,37);});
await test('Cliques duplicados não enviam duas pontuações',async()=>{const c=client();await c.abrir();c.$('#rankingNome').value='Nome';c.$('#rankingPin').value='0047';let resolver;c.queue.push(()=>new Promise(r=>resolver=r));const first=c.submit();await c.submit();assert.equal(c.calls.length,1);c.queue.push(sucesso);resolver({ok:true,json:async()=>({exists:true})});await first;assert.equal(c.calls.length,2);});
await test('Reiniciar a rodada ignora resposta antiga e desativa consulta durante o jogo',async()=>{const c=client();await c.abrir();c.$('#rankingNome').value='Nome';c.$('#rankingPin').value='0047';let resolver;c.queue.push(()=>new Promise(r=>resolver=r));const first=c.submit();c.q.inicio();resolver({ok:true,json:async()=>({exists:true})});await first;assert.equal(c.calls.length,1);assert.equal(c.$('#btnRanking').disabled,true);assert.equal(c.$('#rankingPin').value,'');assert.equal(c.$('#rankingEnviar').disabled,false);});
await test('Fechar apaga códigos e devolve foco ao botão',async()=>{const c=client();await c.abrir();c.$('#rankingPin').value='0047';c.$('#rankingConfirmar').value='0047';await c.$('#rankingFechar').emit('click');assert.equal(c.$('#rankingPin').value,'');assert.equal(c.$('#rankingConfirmar').value,'');assert.equal(c.$('#rankingDialog').open,false);});
await test('Nome ocupado durante criação pede nova tentativa sem trocar o código do dono',async()=>{const c=client();await c.abrir();c.$('#rankingNome').value='Nome';c.$('#rankingPin').value='0047';c.queue.push({exists:false});await c.submit();c.$('#rankingConfirmar').value='0047';c.queue.push({error:'name_taken',message:'Nome ocupado'});await c.submit();assert.equal(c.$('#rankingNovo').hidden,true);assert.equal(c.$('#rankingConfirmar').required,false);assert.equal(c.$('#btnPublicar').disabled,false);});
await test('Ranking vazio e indisponível têm mensagens e nova tentativa',async()=>{const c=client();c.queue.push({rows:[]});await c.$('#btnRanking').emit('click');await new Promise(setImmediate);assert.match(c.$('#rankingResultado').textContent,/vazio/);c.queue.push({error:'unavailable',message:'Indisponível'});await c.$('#rankingAtualizar').emit('click');assert.equal(c.$('#rankingResultado').textContent,'Indisponível');assert.equal(c.$('#rankingAtualizar').disabled,false);});

let handler;const rpcCalls=[];let dbReply=[];
const code=stripTypeScriptTypes(fs.readFileSync(repo+'/supabase/functions/cala-ranking/index.ts','utf8'));
new vm.Script(code);
vm.runInNewContext(code,{Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://example.test':k==='SUPABASE_SECRET_KEYS'?'{}':'server-only'},serve:fn=>handler=fn},Response,Request,TextEncoder,TextDecoder,Uint8Array,AbortSignal,crypto:webcrypto,fetch:async(url,opts)=>{rpcCalls.push({url,body:JSON.parse(opts.body),headers:opts.headers});return{ok:true,json:async()=>dbReply};}});
async function request(data,origin='https://andremarrano.github.io',method='POST'){const req=new Request('https://example.test/cala-ranking',{method,headers:{Origin:origin,'Content-Type':'application/json','x-forwarded-for':'192.0.2.1'},...(method==='POST'?{body:JSON.stringify(data)}:{})});const r=await handler(req);return{status:r.status,headers:r.headers,body:r.status===204?null:await r.json()};}
await test('API atende leitura e CORS sem expor credenciais',async()=>{dbReply=rows;const r=await request(null,undefined,'GET');assert.equal(r.status,200);assert.equal(r.body.rows.length,1);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://andremarrano.github.io');assert(!JSON.stringify(r.body).includes('server-only'));assert.equal((await request(null,undefined,'OPTIONS')).status,204);});
await test('API rejeita origem desconhecida, código inválido e pontos fora do limite',async()=>{const n=rpcCalls.length;assert.equal((await request({},'https://evil.test')).status,403);for(const [pin,score] of [['123',20],[47,20],['0047',1801],['0047',1.5]]){assert.equal((await request({action:'submit',name:'Nome',pin,score,create:false})).status,400);}assert.equal(rpcCalls.length,n);});
await test('API normaliza nome e guarda somente hash do endereço de rede',async()=>{dbReply={exists:true};assert.equal((await request({action:'inspect',name:' Ｎome  Novo '})).status,200);const last=rpcCalls.at(-1);assert.equal(last.body.p_name,'Nome Novo');assert.match(last.body.p_ip,/^[a-f0-9]{64}$/);assert(!JSON.stringify(last.body).includes('192.0.2.1'));});
await test('API preserva zeros no PIN e devolve erro do servidor sem publicar',async()=>{dbReply={error:'wrong_pin'};const r=await request({action:'submit',name:'Nome',pin:'0047',score:37,create:false});assert.equal(r.status,403);assert.match(r.body.message,/não foi registrada/);assert.equal(rpcCalls.at(-1).body.p_pin,'0047');assert.equal(r.body.pin,undefined);});
await test('API aplica retorno de limite de tentativas',async()=>{dbReply={error:'rate_limited'};assert.equal((await request({action:'submit',name:'Nome',pin:'0047',score:37,create:false})).status,429);});
console.log(report.join('\n'));

})().catch(e=>{console.error(e);process.exitCode=1;});
