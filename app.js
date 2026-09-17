import {defaultModel} from './model-default.js?v=20260917';
import {selectRoleVoice} from './role-voice.js';
import {AudioCapture} from './audio-capture.js';
const audioCapture=new AudioCapture();
import {Conversation} from './conversation.js?v=20260917';
import {AuthSession,authMessage} from './auth-session.js';
import { API_BASE } from './config.js';
import { Voice } from './voice.js?v=20260917';
import { checkCustomerText } from './privacy.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const paths = {
  home:'M3 10l9-7 9 7M5 9v11h5v-6h4v6h5V9',
  target:'M21 12a9 9 0 1 1-9-9m0 4a5 5 0 1 0 5 5m-5 0 9-9m-5 0h5v5',
  phone:'M8 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-4l-5-2-2 3a15 15 0 0 1-7-7l3-2-2-5',
  chat:'M21 11a8 8 0 0 1-8 8H7l-5 3 1-6a8 8 0 0 1-1-5 9.5 9.5 0 0 1 19 0M7 10h10M7 14h6',
  book:'M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3V4m9 2v15',
  spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3',
  arrow:'M5 12h14m-5-5 5 5-5 5',
  check:'m5 12 4 4L19 6',
  shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3m-4 9 3 3 5-6',
  mic:'M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0V4m-3 7v1a6 6 0 0 0 12 0v-1m-6 7v4m-3 0h6',
  sound:'M11 4 5 9H2v6h3l6 5V4m4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  stop:'M5 5h14v14H5V5',
  key:'M9 14a5 5 0 1 1 2-5h10v4h-3v3h-4v-3h-3',
  clock:'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  leaf:'M20 3C7 2 2 8 5 16c6 6 16 1 15-13M4 21 16 9',
  external:'M14 3h7v7m0-7-11 11M10 3H3v18h18v-7',
  back:'M19 12H5m5-5-5 5 5 5',
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.spark}"/></svg>`;
const btn = (label, action, type='primary', extra='') => `<button type="button" class="button ${type}" data-action="${action}" ${extra}>${label}</button>`;
const providers = {google:{name:'Google AI Studio',mark:'G',url:'https://aistudio.google.com/',images:['google-1.png','google-2.png']}};
const featureList = [
  { id:'pain',title:'客戶潛在痛點分析',icon:'target',description:'從概括背景出發，找到三個值得探索的需求方向。',tag:'面談前準備',action:'開始分析',live:true },
  { id:'phone',title:'電話約訪語音演練',icon:'phone',description:'先聽教練示範，再練習開口。把每一次約訪，說得更自然。',tag:'雙模式 · 語音互動',action:'開始練習',live:true },
  { id:'needs',title:'發掘需求角色扮演',icon:'chat',description:'練習聽懂客戶，問出真正的需求。' },
  { id:'product',title:'商品行銷演練',icon:'book',description:'把商品知識，轉化成有溫度的說明。' },
  { id:'discuss',title:'教練即時討論',icon:'spark',description:'業務疑問，與教練一起理清方向。' },
];
const state = { config:{},user:null,credentials:[],activeId:'',route:'home',busy:false,error:'',pain:null,customer:null,phone:null,feedback:null,mode:'practice',provider:'google',models:[],inspected:false,editingId:null,localImport:false,tutorial:'google',tutorialStep:0,authMode:'login',voiceURI:'',maleVoiceURI:'',femaleVoiceURI:'',rate:1,voiceConsent:false,autoSpeak:true };
const authStorage={getItem:k=>{try{return sessionStorage.getItem(k);}catch{return null;}},setItem:(k,v)=>{try{sessionStorage.setItem(k,v);}catch{}},removeItem:k=>{try{sessionStorage.removeItem(k);}catch{}}};
const auth=new AuthSession(authStorage);
let token = '';
try { token = sessionStorage.getItem('hao.auth') || ''; } catch {}
let toastTimer;
let configStatus='loading';
function configNotice() {
  if(configStatus==='ready')return state.config.authConfigured?'':'<div class="hint warn">服務已連線，但登入服務尚未完成設定，請聯絡管理者。</div>';
  return `<div class="hint warn"><strong>尚未連上登入服務</strong><p>${API_BASE?'雲端服務暫時無法連線，請稍後按重新連線。':'請先啟動資料夾中的「啟動預覽.cmd」，並從它開啟的網址使用 App。'}</p><p>目前網址：${esc(location.origin)}</p>${btn('重新連線','reload-config','secondary')}</div>`;
}
async function loadConfig() {
  configStatus='loading';
  try {
    const config=await api('/api/config');
    if(typeof config.authConfigured!=='boolean'||typeof config.localPreview!=='boolean')throw new Error('此網址沒有提供 App 的登入服務。請從「啟動預覽.cmd」開啟。');
    state.config=config;configStatus='ready';state.error='';
  }catch(e){configStatus='error';throw e;}
}
function toast(message) { const t=$('#toast'); t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),6000); }
async function api(path, method='GET', data) {
  if(!['/api/config','/api/auth/local'].includes(path) && auth.value)token=await auth.token(state.config.firebaseApiKey);
  let res;
  try { res = await fetch(API_BASE + path, {cache:'no-store',method,credentials:'include',headers:{'Content-Type':'application/json','X-Hao-Client':'web',...(token?{Authorization:`Bearer ${token}`}:{})},...(data!==undefined?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(path==='/api/config'?10000:175000)}); }
  catch { throw new Error('服務連線中斷，請確認網路後重試；若持續發生，請聯絡管理者。'); }
  let json;try{json=await res.json();}catch{throw new Error('服務尚未準備好，請稍後再試。');}
  if(!res.ok) { const error=new Error(json.error?.message || '操作失敗，請重試。');error.code=json.error?.code;throw error; }
  return json;
}
function localGet(key, fallback) { try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;} }
function localSet(key,value) { try{localStorage.setItem(key,JSON.stringify(value));}catch{toast('瀏覽器無法保存本機偏好，這次仍可繼續使用。');} }
function preferences() { return state.user ? `hao.${state.user.uid}.preferences` : 'hao.visitor.preferences'; }
function historyKey() { return `hao.${state.user?.uid}.summaries`; }
function savePrefs() { localSet(preferences(),{activeId:state.activeId,voiceURI:state.voiceURI,maleVoiceURI:state.maleVoiceURI,femaleVoiceURI:state.femaleVoiceURI,rate:state.rate,voiceConsent:state.voiceConsent,autoSpeak:state.autoSpeak}); }
function syncVoiceControls(){
  const list=voice.chineseVoices;
  for(const [id,preference,label] of [['voice-select','voiceURI','裝置預設中文音色'],['maleVoiceURI','maleVoiceURI','自動選擇台灣中文男聲'],['femaleVoiceURI','femaleVoiceURI','自動選擇台灣中文女聲']]){
    const select=document.getElementById(id);if(!select)continue;
    const signature=list.map(v=>v.voiceURI).join('|');if(select.dataset.voices===signature)continue;
    select.dataset.voices=signature;
    select.innerHTML=`<option value="">${label}</option>`+list.map(v=>`<option value="${esc(v.voiceURI)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('');
    select.value=list.some(v=>v.voiceURI===state[preference])?state[preference]:'';
    if(id==='voice-select'&&select.nextElementSibling)select.nextElementSibling.textContent=list.length?`偵測到 ${list.length} 個中文音色。`:'裝置尚未提供中文音色清單；朗讀時會再自動偵測。';
  }
}
const voice = new Voice(()=>{queueMicrotask(()=>{const el=$('#voice-state');if(el){el.textContent=voice.status;el.classList.toggle('recording',voice.listening);} const roleLabel=$('#role-voice-label');if(roleLabel)roleLabel.textContent=roleVoiceLabel();syncVoiceControls();});});
window.addEventListener('focus',()=>voice.refresh());
setTimeout(()=>voice.refresh(),500);setTimeout(()=>voice.refresh(),2000);
async function loadUser(strict=false) {
  try {
    const me=await api('/api/me');state.user=me.user;state.credentials=me.credentials.filter(c=>c.provider==='google');
    const prefs=localGet(preferences(),{});Object.assign(state,{activeId:prefs.activeId||'',voiceURI:prefs.voiceURI||'',maleVoiceURI:prefs.maleVoiceURI||'',femaleVoiceURI:prefs.femaleVoiceURI||'',rate:prefs.rate||1,voiceConsent:prefs.voiceConsent===true,autoSpeak:prefs.autoSpeak!==false});
    if(!state.credentials.some(c=>c.id===state.activeId))state.activeId=state.credentials[0]?.id||'';
  }catch(error){state.user=null;state.credentials=[];state.activeId='';if(strict)throw error;}
}
function header(title, sub, eyebrow='YOUR PRACTICE SPACE') { return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1 class="page-title">${title}</h1><p class="page-subtitle">${sub}</p></div></div>`; }
function shell(content) {
  const route=state.route;
  const navigation=[{id:'home',title:'我的練習空間',icon:'home'},...featureList];
  return `<aside class="sidebar"><a class="brand" href="#home"><img src="./assets/app-icon.png" alt=""><div class="brand-text"><div class="brand-name">豪老師 <span>Hao+</span></div><small>AI 業務教練</small></div></a><p class="nav-label">LEARN & PRACTICE</p><nav class="nav" aria-label="主要功能">${navigation.map(f=>`<a href="#${f.id}" title="${f.title}" class="${route===f.id?'active':''}" ${route===f.id?'aria-current="page"':''}>${icon(f.icon)}<span class="nav-long">${f.title}</span><span class="nav-short">${({home:"首頁",pain:"痛點分析",phone:"約訪演練"}[f.id]||f.title)}</span>${f.live===undefined&&f.id!=='home'?'<span class="soon">即將開放</span>':''}</a>`).join('')}<a class="mobile-more ${route==='settings'?'active':''}" href="#settings">${icon('settings')}<span>設定</span></a><a class="mobile-more ${route==='tutorial'?'active':''}" href="#tutorial">${icon('book')}<span>教學</span></a></nav><div class="nav-divider"></div><nav class="nav secondary-nav" aria-label="工具與設定"><a href="#tutorial" class="${route==='tutorial'?'active':''}">${icon('book')}<span>新手使用指南</span></a><a href="#settings" class="${route==='settings'?'active':''}">${icon('settings')}<span>AI 與語音設定</span></a><a href="#history" class="${route==='history'?'active':''}">${icon('clock')}<span>我的練習紀錄</span></a></nav><div class="sidebar-bottom"><div class="small-coach"><strong>${icon('leaf')} 每一次練習，都算數。</strong>不需要一次就完美。<br>先安心開口，再慢慢進步。</div><div class="sidebar-foot">HAO+ · YOUR AI COACH</div></div></aside><div class="workspace"><header class="topbar"><span class="breadcrumb">你的專屬教練 <span aria-hidden="true">／</span> ${esc(({home:'我的練習空間',settings:'AI 與語音設定',tutorial:'新手使用指南',login:'登入',history:'練習紀錄',privacy:'隱私與使用說明'}[route]||featureList.find(f=>f.id===route)?.title||''))}</span><div class="topbar-right"><button class="button secondary" data-action="theme" aria-label="切換淺色或暗色">${theme==='dark'?'☀ 淺色':'☾ 暗色'}</button><span class="badge">${state.config.localPreview?'本機預覽版':'首輪測試版'}</span><button class="user-button" data-action="${state.user?'account-menu':'go-login'}"><span class="avatar">${state.user?'練':'登'}</span><span class="user-name">${state.user?esc(state.user.name):'登入 / 註冊'}</span></button></div></header><main class="main" id="main" tabindex="-1">${content}<footer class="footer"><span>© 豪老師 Hao+ · 練好每一次對話，陪你走好每一步。</span><span>生成內容僅供自學參考，請勿公開分享。 <a href="#privacy">隱私與使用說明</a></span></footer></main></div>`;
}
function home() {
  const cred=state.credentials.find(c=>c.id===state.activeId);
  return `<div class="page-heading"><div><p class="eyebrow">A LITTLE PRACTICE, A LITTLE BETTER.</p><h1 class="page-title">今天，也為自己進步一點。</h1><p class="page-subtitle">歡迎來到你的練習空間。今天最想提升哪個方面？</p></div><span class="page-date">${new Intl.DateTimeFormat('zh-TW',{month:'long',day:'numeric',weekday:'short'}).format(new Date())}</span></div><section class="hero"><div class="hero-copy"><div class="hero-kicker">${icon('spark')} YOUR PERSONAL SALES COACH</div><h2>把練習留給這裡，<br>把自信帶到客戶面前。</h2><p>我是豪老師，陪你準備、演練，再一起修正。<br>從一句自然的開場，開始今天的進步。</p><a class="button light" href="#phone">開始一場約訪練習 ${icon('arrow')}</a></div><div class="hero-art" aria-hidden="true"><div class="practice-note"><div class="note-top">${icon('mic')} 今天的開口練習</div><div class="note-line">「您好，現在方便<br>讓我用一分鐘說明嗎？」</div><div class="note-bottom"><span>先尊重，再開啟對話。</span><span class="wave">${'<i></i>'.repeat(8)}</span></div><div class="note-check">${icon('check')}</div></div></div></section><div class="section-head"><h2>今天，從哪裡開始？</h2><p>為每個業務時刻，做好準備</p></div><section class="feature-grid" aria-label="練習功能">${featureList.map(f=>`<a class="feature ${f.live?'':'small'}" href="#${f.id}"><div class="feature-top"><div class="feature-icon ${f.id==='phone'?'gold':!f.live?'muted':''}">${icon(f.icon)}</div><span class="status ${f.live?'':'soon'}">${f.live?'開始探索':'開發中'}</span></div><h3>${f.title}</h3><p>${f.description}</p>${f.live?`<div class="feature-footer"><span>${f.tag}</span><strong>${f.action} ↗</strong></div>`:''}</a>`).join('')}</section><div class="home-bottom"><div class="tip-card">${icon('key')}<div><h3>${cred?'AI 已連線，準備好練習':'第一次來？先準備你的 AI 通行證'}</h3><p>${cred?`${esc(providers[cred.provider].name)} · 已保存金鑰，下次登入不用再貼。`:'使用自己的 API Key，選擇適合你的免費模型。依照 Google AI Studio 的實際畫面教學即可完成。'}</p><a href="#${cred?'settings':'tutorial'}">${cred?'查看模型設定':'查看新手申請指南'} →</a></div></div><div class="tip-card">${icon('shield')}<div><h3>安心練習，從保護客戶開始</h3><p>只填性別、年齡與概括背景，請勿輸入姓名、電話或上傳個資截圖。業務員網路言行應遵守招攬與招募相關規範。</p></div></div></div>`;
}
function gate() {
  if(!state.user)return `<div class="hint warn">先登入，讓教練記住你的 AI 設定。 <a href="#login">登入或註冊 →</a></div>`;
  if(!state.activeId)return `<div class="hint warn">開始前，請先保存自己的 API Key 並選擇模型。 <a href="#settings">前往連線設定 →</a></div>`;
  return '';
}
function customerFields(c=state.customer||{}) {
  return `<div class="form-grid"><label class="field">客戶性別<select name="gender"><option ${c.gender==='未提供'?'selected':''}>未提供</option>${['男','女','其他'].map(x=>`<option ${c.gender===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="field">客戶年齡<input name="age" maxlength="30" value="${esc(c.age||'')}" placeholder="例如：年約 40 歲" autocomplete="off"></label></div><label class="field">客戶背景 <span class="hidden">只填概括資料</span><textarea name="background" maxlength="1200" placeholder="例如：雙薪家庭，有一位學齡孩子，工作忙碌，最近開始關心家庭保障。知道多少就寫多少。" autocomplete="off">${esc(c.background||'')}</textarea><small>不需要知道所有細節。請用概括描述，勿填姓名、電話、地址及保單號碼。</small></label>`;
}
function operationError() { return `<div class="hint error">${esc(state.error)}${state.activeId&&/429/.test(state.error)?`<p>${btn('保留內容，改選免費模型','recover-model','secondary')}</p>`:''}</div>`; }
function statusBox() { return `<div id="operation-status" role="status" aria-live="polite">${state.error?operationError():''}</div>`; }
function sourceHtml(source,reference) {
  if(!source)return '';
  return `<div class="source">${icon('shield')} 已取得官方正文 · <a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}${reference?` 第 ${reference.article} 條${reference.clause?`第${esc(reference.clause)}款`:""}`:''} ↗</a><br>查詢時間：${esc(new Date(source.checkedAt).toLocaleString('zh-TW'))} · ${esc(source.version)}${reference?`<details><summary>查看本次引用依據</summary><blockquote>${esc(reference.quote)}</blockquote>這是依本次來源提供的自學建議，不等同個案法律意見。</details>`:''}</div>`;
}
function painPage() {
  return `${header('先理解客戶，再找到方向。','三個潛在痛點，是待驗證的假設，也是開啟對話的起點。','PREPARE · 客戶潛在痛點分析')}${gate()}<div class="two-col wide-left"><section class="panel"><div class="step-label">01 · 認識這位客戶</div><h2>你目前知道哪些背景？</h2><div class="chips"><button class="chip" data-action="sample" data-sample="family">試填：雙薪家庭</button><button class="chip" data-action="sample" data-sample="retire">試填：準備退休</button><button class="chip" data-action="sample" data-sample="young">試填：職場新鮮人</button></div><form id="pain-form">${customerFields()}<div class="hint">${icon('shield')} 僅接受文字概括資料，禁止上傳或貼上個資截圖。</div><div class="flex" style="margin-top:20px"><button class="button" type="submit" ${!state.activeId?'disabled':''}>${icon('spark')} 分析三個探索方向</button></div>${statusBox()}</form></section><aside class="panel"><div class="step-label">COACH'S NOTE</div><h2>先好奇，不急著下結論。</h2><p>同樣的年齡與家庭背景，每個人的在意之處仍然不同。教練會協助你整理：</p><ol class="numbered"><li><strong>可能在意什麼</strong><br>以已知背景提出三個需求假設。</li><li><strong>為什麼值得探索</strong><br>區分已知資訊與還需要確認的地方。</li><li><strong>第一句可以怎麼問</strong><br>用不預設答案的提問，聽見真正的需要。</li></ol><div class="hint">每次分析先取得官方法規正文；來源無法取得時暫停回答。</div></aside></div>${state.pain?`<section id="pain-result"><div class="section-head"><h2>三個值得探索的方向</h2><span class="badge">待驗證假設</span></div><p class="page-subtitle">${esc(state.pain.answer.intro)}</p><div class="stack" style="margin-top:20px">${state.pain.answer.pains.map((p,i)=>`<article class="result-card"><div class="result-title"><span class="result-number">0${i+1}</span><h3>${esc(p.title)}</h3></div><p><strong>已知依據：</strong>${esc(p.basis)}</p><p><strong>潛在需求：</strong>${esc(p.hypothesis)}</p><div class="quote">可以先問：「${esc(p.question)}」</div><p><strong>初次接觸：</strong>${esc(p.opening)}</p>${btn('帶著這個方向練約訪 '+icon('arrow'),'use-pain','ghost',`data-index="${i}"`)}</article>`).join('')}</div><div class="hint">${esc(state.pain.answer.caution)}</div>${sourceHtml(state.pain.source,state.pain.answer.reference)}</section>`:''}`;
}
function phoneSetup() {
  const sc=state.phoneDraft||{};
  return `${header('先練一句自然的開場。','先看範例，再選擇聽教練示範，或自己開口練習。','PRACTICE · 電話約訪語音演練')}${gate()}<div class="progress"><span class="active">1 設定情境</span>→<span>2 參考範例</span>→<span>3 對話練習</span>→<span>4 教練回饋</span></div><form id="phone-form"><div class="two-col"><section class="panel"><div class="step-label">01 · 客戶與情境</div><h2>這一通電話，想邀約誰？</h2>${customerFields()}<label class="field">你與客戶的關係<select name="relationship">${['初次接觸','朋友或熟人','既有客戶','朋友介紹'].map(x=>`<option ${sc.relationship===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="field">這次約訪的目的<input name="purpose" maxlength="160" value="${esc(sc.purpose||'邀約一次家庭保障需求面談')}" placeholder="例如：邀約 20 分鐘了解家庭保障需求"></label></section><section class="panel"><div class="step-label">02 · 選擇你的練習方式</div><label class="mode-option"><input type="radio" name="mode" value="practice" ${state.mode==='practice'?'checked':''}><span><strong>我來練習 · AI 扮演客戶</strong><small>你扮演業務，教練依情境回應。結束後提供你的表達回饋。</small></span></label><label class="mode-option"><input type="radio" name="mode" value="demo" ${state.mode==='demo'?'checked':''}><span><strong>教練示範 · AI 扮演業務</strong><small>你扮演客戶，觀察教練如何開場、處理拒絕並邀約。</small></span></label><label class="field" style="margin-top:24px">預期客戶反應<input name="reaction" maxlength="160" value="${esc(sc.reaction||'願意聽，但時間有限')}" placeholder="例如：沒時間、沒興趣、想再考慮"></label><label class="field">挑戰程度<select name="difficulty">${['入門','進階','挑戰'].map(x=>`<option ${sc.difficulty===x?'selected':''}>${x}</option>`).join('')}</select></label><div class="hint">練習途中專注對話，不即時查核或打斷；結束後逐句檢視原句、規定依據與建議說法，並納入回饋評分。</div><button class="button full" type="submit" style="margin-top:22px" ${!state.activeId?'disabled':''}>${icon('spark')} 準備參考範例</button>${statusBox()}</section></div></form>`;
}
function phoneExample() {
  const p=state.phone;
  return `${header('先有參考，再安心開口。','這份範例是練習依據，你可以用自己的說話方式表達。','PRACTICE · 演練前範例')}<div class="progress"><span>1 設定情境</span>→<span class="active">2 參考範例</span>→<span>3 對話練習</span>→<span>4 教練回饋</span></div><div class="two-col wide-left"><section class="panel"><span class="badge">${p.mode==='practice'?'你扮業務 · AI 扮客戶':'AI 扮業務 · 你扮客戶'}</span><h2 style="margin-top:20px">${esc(p.answer.title)}</h2><div class="script">${esc(p.answer.script)}</div><div class="flex">${btn(icon('sound')+' 聽聽範例','read-example','secondary')}${btn(icon('stop')+' 停止','voice-stop','secondary')}</div>${sourceHtml(p.source,p.answer.reference)}</section><section class="panel"><h2>記住三個小重點</h2><ol class="numbered">${p.answer.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><div class="hint">按「開始語音對話」後，說完會自動送出；教練說完會自動接續收音。也可以選擇單句輸入後手動送出。</div><a class="button ghost" href="#settings">先試聽音色與測試麥克風 →</a>${btn('我準備好了，開始對話 '+icon('arrow'),'start-dialogue','primary','class="full"')}${btn('返回調整情境','restart','ghost')}</section></div>`;
}
function phoneChat() {
  const p=state.phone;
  return `${header('把這裡，當作一次真實對話。',p.mode==='practice'?'你是業務，AI 是客戶。先確認對方是否方便，再自然地說明來意。':'你是客戶，AI 是業務。可以提出疑問，觀察教練的示範。','PRACTICE · 正在演練')}<div class="chat-layout"><section class="panel chat"><div class="chat-header"><div class="flex"><span class="avatar">${p.mode==='practice'?'客':'豪'}</span><strong>${p.mode==='practice'?'模擬客戶':'豪老師 · 示範業務'}</strong><span class="badge">${state.phoneDraft?.difficulty||'入門'}</span></div><span>已練習 ${p.messages.filter(m=>m.role==='user').length} 輪</span></div><div class="chat-messages" id="chat-messages">${p.messages.map(m=>`<div class="bubble-wrap ${m.role}"><div class="bubble-label">${m.role==='user'?'你':m.role==='coach'?'教練 · 暫停並修正':p.mode==='practice'?'模擬客戶':'教練示範'}</div><div class="bubble">${esc(m.content)}</div>${m.concern?`<div class="hint warn" style="margin-top:10px"><strong>${m.concern.level==='violation'?'需修正的表達':'合規疑慮，先釐清'}</strong><p>${esc(m.concern.reason)}</p><strong>試著重說：</strong><br>${esc(m.concern.replacement)}</div>${sourceHtml(m.source,m.concern.reference)}`:''}</div>`).join('')}</div><form class="chat-input" id="turn-form">${p.mode==='practice'?`<label class="check"><input type="checkbox" id="audio-consent" ${p.audioConsent?'checked':''} ${p.ended?'disabled':''}><span>本場聲音評估：同意在「開始語音對話」時暫存我的發言（最多 3 分鐘），結束後送給 Google Gemini 評估語調、流暢度與表達穩定度。使用所選模型的免費額度；不另接付費語音服務。單句語音輸入與打字不錄音。取消勾選會清除錄音。</span></label><p class="hint">已暫存 ${p.audioClips?.length||0} 句聲音。原始錄音不寫入 App 資料庫；重整、登出或換場會清除。請勿口述個資。</p>`:''}<label class="field" for="message">${p.ended?'本場已結束，請查看回饋':'換你說一句'}</label><textarea id="message" name="message" maxlength="1200" placeholder="點麥克風說話，或在這裡輸入…" ${p.ended?'disabled':''}></textarea><div class="flex">${btn(icon('mic')+' 開始語音對話','conversation','primary',p.ended?'disabled':'')}${btn('單句語音輸入','mic','secondary',p.ended?'disabled':'')}${btn('播放上一句並繼續','replay-reply','secondary',p.ended?'disabled':'')}${btn(icon('stop')+' 停止','voice-stop','secondary')}<button class="button" type="submit" ${p.ended?'disabled':''}>送出這一句 ${icon('arrow')}</button></div><div id="voice-state" class="voice-state" style="margin-top:12px">${esc(voice.status)}</div><div class="chat-hint">本場先完整演練，結束後才逐句查核與指正。按一次開始，聽到提示後即可說話；AI 說完會自動繼續收音。短暫安靜不用再按開始。請保持本頁開啟；按停止可暫停。請勿口述客戶個資，辨識不清時可改用文字。</div>${statusBox()}</form><div class="flex" style="padding:0 22px 20px">${btn('結束並查看回饋','feedback','secondary',!p.messages.some(m=>m.role==='user')?'disabled':'')}${btn('再看參考範例','show-example','ghost')}</div></section><aside class="panel chat-side"><div class="step-label">YOUR COACH IS HERE</div><h3>不必急著成交，<br>先練好這次邀約。</h3><p>聽懂對方的顧慮，用一句簡單的話接住，再提出下一步。</p><div class="hint">遇到卡住的地方也沒關係。教練會在結束後，先肯定亮點，再一起調整。</div><p class="hint" id="role-voice-label">${esc(roleVoiceLabel())}</p><div class="source">本場模型：${esc(p.model)}<br>本場保持角色與模型一致。</div></aside></div>`;
}
function reviewHtml(f){
  return '<div class="section-head"><h2>本場逐句合規檢討</h2></div><p>已檢視 '+esc(f.reviewedTurns??'—')+' 句'+(f.demo?' AI 業務示範':'學員業務話術')+'。</p>'+(f.violations?.length?f.violations.map(v=>'<article class="result-card"><h3>第 '+esc(v.turn)+' 句 · '+esc(v.issue||'合規表達')+'</h3><p><strong>'+(v.level==='violation'?'需修正':v.level==='unverified'?'待補查規定':'合規疑慮')+'</strong></p><blockquote>'+esc(v.original)+'</blockquote><p>'+esc(v.reason)+'</p><p><strong>建議重說：</strong>'+esc(v.replacement)+'</p>'+(v.reference?sourceHtml(v.source,v.reference):'<p>目前官方來源不足，不作確定違規判定，需補查相應規定。</p>')+'</article>').join(''):'<p>本次檢查未發現需列出的問題；不代表所有法規與自律規範均已涵蓋。</p>');
}
function feedbackPage() {
  const f=state.feedback;
  if(f.demo)return `${header('先觀察，再換你試試。','這一場是教練示範，不計入你的業務能力分數。','REFLECT · 示範回顧')}<section class="panel"><p>${esc(f.message)}</p><div class="script">${esc(f.example.script)}</div>${reviewHtml(f)}${btn('換我扮演業務，再練一次','practice-again')}${sourceHtml(f.source,f.example.reference)}</section>`;
  const names=['說話流暢度','聲音語調的親切感','客戶談話的內容掌握','用戶的自信心','用戶的專業度'];
  return `${header('每一次回顧，都是下一步。','先看見做得好的地方，再挑一個小地方調整。','REFLECT · 教練回饋')}<section class="panel"><div class="step-label">你這次做得很好的地方</div><h2>值得肯定的進步</h2><p>${esc(f.answer.praise)}</p><div class="score-grid">${names.map(name=>{const s=f.answer.scores.find(s=>s.item===name);return `<div class="score"><h3>${name}</h3>${s?.stars!=null?`<div class="stars" aria-label="${s.stars} 顆星，滿分五顆星">${'★'.repeat(Math.floor(s.stars))}${s.stars%1?'◐':''}</div><small>${s.stars} / 5 顆星 · ${s.basis==='audio'?'聲音評估':'逐字稿評估'}</small>`:'<div class="stars-muted">無法評估</div><small>目前沒有足夠的<br>聲音或表達證據</small>'}</div>`;}).join('')}</div><div class="hint">${f.audioReviewed?`聲音評估涵蓋 ${f.audioCoverage.recorded} / ${f.audioCoverage.total} 句，共 ${f.audioCoverage.seconds} 秒。自信心僅評本次聲音表達的穩定與明確，屬 AI 教學參考；不代表心理狀態。`:'未取得聲音評分。請在新場次勾選「本場聲音評估」，再用「開始語音對話」練習；先前未錄下的聲音無法補評。'}${f.audioError?`<p>${esc(f.audioError)}</p>`:''}${!f.audioReviewed&&state.phone?.audioClips?.length?btn('重試聲音評估','audio-feedback','secondary'):''}</div><div class="section-head"><h2>把調整，變成下一次的進步</h2></div>${f.answer.scores.map(s=>`<article class="result-card"><h3>${esc(s.item)}</h3><p>依據：${esc(s.evidence)}</p><p>${esc(s.advice)}</p></article>`).join('')}<ol class="numbered">${f.answer.improvements.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><h3>下次可以這樣說</h3><div class="quote">${esc(f.answer.rewrite)}</div>${reviewHtml(f)}${sourceHtml(f.source,f.answer.reference)}<div class="flex" style="margin-top:24px">${btn('同情境再練一次 '+icon('arrow'),'practice-again')}${btn('保存本機回饋摘要','save-summary','secondary')}<a class="button ghost" href="#home">回到練習空間</a></div></section>`;
}
function phonePage() { return state.feedback?feedbackPage():!state.phone?phoneSetup():state.phone.stage==='example'?phoneExample():phoneChat(); }
function modelOptions(selected='') { return `<option value="">請選擇模型</option>${state.models.map(m=>`<option value="${esc(m.id)}" ${m.id===selected?'selected':''}>${esc(m.name)} · ${esc(m.fee)}</option>`).join('')}`; }
function settingsPage() {
  return `${header('讓教練，用你習慣的方式陪練。','設定 AI 通行證、選擇模型，再試試聲音。','SETTINGS · AI 與語音設定')}${!state.user?gate():''}<div class="two-col"><div class="stack"><section class="panel"><div class="step-label">01 · AI 連線</div><h2>使用自己的 API Key</h2><p>使用 Google AI Studio 申請的 Key 即可。保存後加密綁定你的帳號，下次登入不用重新貼上。</p>${!state.user?`<div class="hint warn"><strong>這個瀏覽器尚未登入。</strong><p>Chrome 與預覽視窗不共用登入狀態。請先登入，才能驗證與保存 Key。</p>${state.config.localPreview?btn("先進入本機測試，再設定 Key","local-login-settings","secondary"):"<a class=button href=#login>前往登入</a>"}</div>`:""}${state.localImport||state.editingId?`<div class="hint"><strong>${state.localImport?"目前正在使用資料夾的測試 Key":"目前正在更換已保存 Key 的模型"}</strong><p>此模式不需要重新輸入 Key。若要換另一把，請按下方按鈕。</p>${btn("改用另一把 API Key","new-key","secondary")}</div>`:""}<form id="key-form"><input type="hidden" id="provider" name="provider" value="google"><p class="hint">Google AI Studio · Gemini 模型</p><label class="field">API Key<input type="password" id="api-key" name="key" autocomplete="off" spellcheck="false" maxlength="2048" placeholder="貼上你自己申請的 Key" ${state.localImport||state.editingId?'disabled':''}><small>完整 Key 不會保存在瀏覽器。 <a href="#tutorial">還沒有 Key？看實際畫面教學 →</a></small></label>${btn('驗證並載入模型','inspect-key','secondary',!state.user?'disabled':'')}<label class="field" style="margin-top:22px">選擇這次使用的模型<select id="model" name="model" ${!state.models.length?'disabled':''}>${modelOptions(state.selectedModel)}</select><small>${state.models.length?`已取得 ${state.models.length} 個相容模型。模型目錄不代表剩餘額度。`:'貼上 Key 後，先按「驗證並載入模型」。'}</small></label><label class="check" id="free-confirmation"><input type="checkbox" name="freeConfirmed"><span>我已確認 Google 帳號維持免費方案，所選模型亦有可用的免費額度。App 不會替我開啟付費。</span></label><button type="submit" class="button full" ${!state.inspected?'disabled':''}>${icon('shield')} 儲存並開始</button>${statusBox()}</form></section>${state.credentials.length?`<section class="panel"><h2>已保存的連線</h2>${state.credentials.map(c=>`<div class="key-item ${c.id===state.activeId?'active':''}"><div class="flex"><strong>${esc(providers[c.provider].name)}</strong><span class="badge">${c.id===state.activeId?'目前使用':'已加密保存'}</span></div><p>Key ···· ${esc(c.tail)}<br>上次模型：${esc(c.model)}</p><div class="flex">${btn('使用此連線','select-credential','small secondary',`data-id="${c.id}"`)}${btn('重選模型','edit-credential','small ghost',`data-id="${c.id}"`)}${btn('移除','delete-credential','small ghost',`data-id="${c.id}"`)}</div></div>`).join('')}</section>`:''}</div><div class="stack"><section class="panel"><div class="step-label">02 · 免費語音</div><h2>找到舒服的聲音與節奏</h2><p>使用瀏覽器及裝置提供的語音功能，無需語音 Key，不接付費語音服務。</p><div class="list-row"><span>文字朗讀</span><span class="badge">${voice.synth?'瀏覽器提供此功能':'此瀏覽器不支援'}</span></div><div class="list-row"><span>語音辨識</span><span class="badge">${voice.Recognition?'可進行收音測試':'此瀏覽器不支援'}</span></div><p style="font-size:11px">功能存在不等於實測成功，請使用下方按鈕確認。台灣語調會在整體穩定後逐步優化。</p><label class="field">朗讀音色<select id="voice-select"><option value="">裝置預設中文音色</option>${voice.chineseVoices.map(v=>`<option value="${esc(v.voiceURI)}" ${state.voiceURI===v.voiceURI?'selected':''}>${esc(v.name)} · ${esc(v.lang)}${v.localService?' · 裝置音色':''}</option>`).join('')}</select><small>${voice.chineseVoices.length?`偵測到 ${voice.chineseVoices.length} 個中文音色。`:'目前尚未取得中文音色，可稍後按重新偵測。'}</small></label>${roleVoiceSettings()}<label class="field">說話速度<select id="voice-rate">${[[.85,'稍慢'],[1,'自然'],[1.15,'稍快']].map(([v,t])=>`<option value="${v}" ${state.rate===v?'selected':''}>${t}</option>`).join('')}</select></label><div class="flex">${btn(icon('sound')+' 試聽教練','voice-test','secondary')}${btn('重新偵測','voice-refresh','ghost')}</div><label class="check"><input type="checkbox" id="voice-consent" ${state.voiceConsent?'checked':''}><span>我了解語音辨識可能由瀏覽器傳到其雲端服務，不會口述客戶個資。同意開啟收音。</span></label><label class="check"><input type="checkbox" id="auto-speak" ${state.autoSpeak?'checked':''}><span>演練時自動朗讀 AI 回應。</span></label><div class="flex">${btn(icon('mic')+' 測試麥克風','mic-test','secondary')}${btn(icon('stop')+' 停止','voice-stop','secondary')}</div><div id="voice-state" class="voice-state" style="margin-top:14px">麥克風未開啟</div><div id="voice-test-result" class="hint" style="margin-top:14px">試說：「您好，現在方便聊一分鐘嗎？」辨識結果會顯示在這裡，不送給 AI。</div></section><section class="panel"><h3>你的資料如何保存？</h3><p>API Key 在後端加密保存；練習中的文字暫時加密保存，逾期清除。回饋摘要由你選擇是否存到這個裝置。</p><a class="button ghost" href="#privacy">查看資料使用說明 →</a></section></div></div>`;
}
const guideSteps = {
  google:[{title:'先點左下角的鑰匙',text:'登入 Google AI Studio，找到左側選單最下方的鑰匙圖示。圖卡保留了原始紅箭頭，照著點即可。',image:'google-1.png'},{title:'點右上角 Create API key',text:'進入 API Keys 頁面後，點右上角紅框中的「Create API key」（建立 API 金鑰）。',image:'google-2.png'},{title:'建立、複製，回到教練',text:'依平台提示選擇或建立專案，完成後複製完整 Key。回 App 選 Google Gemini，貼上 Key、驗證並選模型，再儲存。這個後續畫面尚未補拍，因此先提供文字指引。'}],
};
function tutorialPage() {
  const p=providers[state.tutorial],steps=guideSteps[state.tutorial],step=steps[state.tutorialStep];
  return `${header('跟著畫面，一步一步就會了。','API Key 是讓教練使用你 AI 帳戶的通行證。跟著 Google AI Studio 教學開始即可。','GET STARTED · 新手申請指南')}<div class="pill-tabs">${Object.entries(providers).map(([id,p])=>`<button class="${id===state.tutorial?'active':''}" data-action="tutorial-provider" data-id="${id}">${p.name}</button>`).join('')}</div><div class="two-col wide-left"><section class="panel"><div class="step-label">${esc(p.name)} · 步驟 ${state.tutorialStep+1} / ${steps.length}</div><h2>${step.title}</h2><p>${step.text}</p><a class="button secondary" href="${p.url}" target="_blank" rel="noopener noreferrer">開啟 ${p.name} 申請頁 ${icon('external')}</a>${step.image?`<img class="tutorial-image" src="./assets/tutorials/${step.image}" alt="${esc(step.title)}的實際操作畫面與紅色標示" data-action="zoom-image" data-image="${step.image}" loading="lazy" decoding="async">`:'<div class="hint" style="margin:24px 0">建立後的完整 Key 不要截圖傳給別人。若忘記複製，請依平台提供的查看或重新建立方式處理。</div>'}<div class="flex" style="justify-content:space-between;margin-top:20px">${btn('← 上一步','tutorial-prev','secondary',state.tutorialStep===0?'disabled':'')}${state.tutorialStep<steps.length-1?btn('下一步 →','tutorial-next'): '<a class="button" href="#settings">回 App 設定 Key →</a>'}</div></section><aside class="panel"><h2>先知道這三件事</h2><ol class="numbered"><li><strong>免費建立 Key，不等於無限使用。</strong><br>Google 的免費方案也有額度與速度限制。</li><li><strong>先保持免費方案。</strong><br>不要為了開始練習而開啟付費帳單、加值或升級。</li><li><strong>保存一次，下次不用再貼。</strong><br>在 App 按「儲存並開始」，就會加密記住 Key 與上次模型。</li></ol><h3>卡住了嗎？</h3><details><summary>找不到按鈕</summary><p>先確認已登入。使用上方申請頁連結，對照頁面標題與紅框；介面改版時以實際平台為準。</p></details><details><summary>顯示 429 或 Rate limit</summary><p>表示暫時使用過快或免費額度用完，稍後再試。App 不自動轉付費。</p></details><details><summary>金鑰無效或清單空白</summary><p>確認完整複製 Google AI Studio 的 Key；重新載入模型。有清單不代表帳號當下仍有額度。</p></details></aside></div>`;
}
function loginPage() {
  const mode=state.authMode, configured=configStatus==='ready'&&state.config.authConfigured;
  return `${header('歡迎，開始你的練習旅程。','登入後，教練會記住你的 AI 連線與模型選擇。','WELCOME · 登入與註冊')}<div class="two-col"><section class="panel login-panel" style="width:100%;margin-top:0"><div class="brand"><img src="./assets/app-icon.png" alt=""><div class="brand-name">豪老師 <span>Hao+</span></div></div><h2>${mode==='register'?'建立你的帳號':mode==='reset'?'重設密碼':'很高興，今天也一起練習。'}</h2>${configNotice()}<div id="google-signin" style="margin-top:20px"></div>${!configured?'<button class="button secondary full" disabled style="margin-top:20px">G　使用 Google 帳號登入 · 請先連上登入服務</button>':''}<div class="divider">或使用 E-mail</div><form id="auth-form"><label class="field">E-mail<input name="email" type="email" autocomplete="email" required placeholder="你的 E-mail" ${!configured?'disabled':''}></label>${mode!=='reset'?`<label class="field">密碼<input name="password" type="password" autocomplete="${mode==='register'?'new-password':'current-password'}" minlength="${mode==='register'?8:1}" required placeholder="${mode==='register'?'至少 8 個字元':'輸入原帳號密碼'}" ${!configured?'disabled':''}></label>`:''}<button class="button full" ${!configured?'disabled':''}>${mode==='register'?'註冊並寄送驗證信':mode==='reset'?'寄送密碼重設信':'登入'}</button></form><div class="links"><button class="link-button" data-action="auth-mode" data-mode="${mode==='login'?'register':'login'}">${mode==='login'?'還沒有帳號？免費註冊':'返回登入'}</button><button class="link-button" data-action="auth-mode" data-mode="reset">忘記密碼</button></div><div class="links"><button class="link-button" data-action="resend-verification">重寄信箱驗證信</button></div>${state.config.localPreview?`<div class="divider">本機預覽</div>${btn('進入本機測試帳號 '+icon('arrow'),'local-login','secondary full')}<p style="font-size:11px">不會建立雲端帳號或寄送郵件，僅用於這台電腦的功能預覽。</p>`:''}${statusBox()}</section><aside class="stack"><section class="panel"><h2>先準備一把 AI 通行證</h2><p>你可以先看申請教學，不需要登入。依照 Google AI Studio 教學申請 Key，再回來開始練習。</p><div class="stack">${Object.entries(providers).map(([id,p])=>`<a href="#tutorial" class="provider-card" data-action="tutorial-provider" data-id="${id}"><span class="provider-logo">${p.mark}</span><span><strong>${p.name}</strong><p>實際截圖 · 中文步驟說明</p></span>${icon('arrow')}</a>`).join('')}</div></section><div class="tip-card">${icon('shield')}<div><h3>僅供自學與練習</h3><p>生成內容請勿公開分享。請遵守保險招攬與招募相關規範，並保護客戶的個人資料。</p></div></div></aside></div>`;
}
function historyPage() {
  const history=state.user?localGet(historyKey(),[]):[];
  return `${header('看見自己，一次次的進步。','只保存你主動留下的回饋摘要，依帳號隔離於這個裝置。','YOUR PROGRESS · 練習紀錄')}<section class="panel">${history.length?history.map((h,i)=>`<div class="list-row"><div><strong>電話約訪 · ${esc(h.mode==='demo'?'教練示範':'模擬練習')}</strong><small>${esc(new Date(h.date).toLocaleString('zh-TW'))} · ${esc(h.model)}</small><p>${esc(h.praise)}</p></div>${btn('刪除','delete-history','small secondary',`data-index="${i}"`)}</div>`).join(''):`<div class="empty"><div class="feature-icon">${icon('leaf')}</div><h2>你的第一步，可以從今天開始。</h2><p>完成約訪練習後，按「保存本機回饋摘要」，就能在這裡回顧。</p><a class="button" href="#phone">開始一場練習 ${icon('arrow')}</a></div>`}</section>`;
}
function privacyPage() { return `${header('安心練習，也清楚知道資料去哪裡。','以下是首輪測試版的實際資料處理方式。','PRIVACY · 隱私與使用說明')}<section class="panel stack"><div><h2>客戶資料，只寫概括背景</h2><p>只接受性別、年齡與背景；請勿提供真實姓名、聯絡方式、詳細地址、證件或保單號碼。系統攔截常見識別格式及圖片，但無法保證辨識所有個資，請在輸入前自行去識別。</p></div><div><h2>API Key 加密保存</h2><p>金鑰傳至受控後端，以 AES-GCM 加密並綁定你的帳號。使用時由後端解密傳給你選擇的 AI 服務商，不會交給其他學員使用。這不是端對端或零知識加密。瀏覽器只取得遮罩與模型偏好。App 內移除 Key 不等同平台撤銷 Key。</p></div><div><h2>文字與語音</h2><p>概括背景、演練逐字稿與相關官方法規正文會傳給你選擇的 AI 服務商。語音辨識可能由瀏覽器送至其雲端服務；只有另行勾選「本場聲音評估」才會暫存並在結束時送出錄音；錄音僅保留於本頁記憶體，經後端轉送 Google，不寫入 App 資料庫；評估成功、重整、登出或換場即清除，失敗時暫留本頁供重試。Google 的資料處理依其服務條款，App 無法承諾 Google 不留存。第一次開啟收音前需同意。</p></div><div><h2>演練與回饋保存</h2><p>演練中的文字在後端加密暫存，閒置兩小時後不可再讀，定期清除；登出會刪除此帳號的進行中演練。回饋摘要只在你按保存時存於本機，依帳號隔離，可逐筆刪除。尚無跨裝置練習紀錄同步。</p></div><div><h2>官方查核與能力界線</h2><p>範例、分析及結束回饋時取得全國法規資料庫的保險業務員管理規則並核對引用。演練對話不逐句查核學員，也不即時指正；結束後按逐字稿完整檢視。這不代表涵蓋所有公會自律規範或個案法律、稅務與理賠問題。未涵蓋的專業問題不作結論。合規警示需要按語境判斷，不能以關鍵字直接定罪。</p></div><div><h2>免費與使用限制</h2><p>本版不提供付費模型切換。僅使用 Google AI Studio；請自行確認帳號及所選 Gemini 模型有免費額度。額度耗盡時等候或手動重選，不自動改平台、模型或計費方式。</p></div><div><h2>刪除帳號</h2><p>刪除帳號會移除後端保存的 Key 及演練，並清除此裝置的回饋摘要。雲端備份的保留及防復原處理列為公開部署前必要檢查，本機預覽不宣稱已有跨裝置刪除。</p>${state.user?btn('刪除我的帳號與資料','delete-account','danger'):''}</div></section>`; }
function comingSoon() { const f=featureList.find(f=>f.id===state.route); return `${header(f.title,f.description,'COMING SOON · 持續成長中')}<section class="panel empty"><div class="feature-icon">${icon(f.icon)}</div><h2>功能開發中...敬請期待...</h2><p>我們先把客戶痛點分析與電話約訪練習做好，接著再陪你探索更多業務情境。</p><a class="button" href="#home">回到練習空間 ${icon('arrow')}</a></section>`; }
function render() {
  const pages={home,pain:painPage,phone:phonePage,settings:settingsPage,tutorial:tutorialPage,login:loginPage,history:historyPage,privacy:privacyPage};
  $('#app').innerHTML=shell((pages[state.route]||comingSoon)());
  if(state.route==='login')setupGoogle();
  const chat=$('#chat-messages');if(chat)chat.scrollTop=chat.scrollHeight;
}
function route() {
  const next=location.hash.slice(1)||'home';
  if(!['home','pain','phone','settings','tutorial','login','history','privacy','needs','product','discuss'].includes(next)){location.hash='home';return;}
  conversation.stop();state.route=next;state.error='';render();window.scrollTo(0,0);
}
async function work(label, action) {
  if(state.busy)return;
  state.busy=true;state.error='';
  const status=$('#operation-status');if(status)status.innerHTML=`<div class="loading-line"><span class="spinner"></span>${esc(label)}</div>`;
  const buttons=[...document.querySelectorAll('form button, [data-action="feedback"], [data-action="start-dialogue"], [data-action="import-local"], [data-action="local-login"]')];
  buttons.forEach(b=>{if(b.dataset.action==='voice-stop')return;b.dataset.wasDisabled=String(b.disabled);b.disabled=true;});
  try {await action();}catch(error){state.error=error.message;const e=$('#operation-status');if(e)e.innerHTML=operationError();toast(error.message);}
  finally{state.busy=false;buttons.forEach(b=>{if(b.dataset.action==='voice-stop')return;b.disabled=b.dataset.wasDisabled==='true';});}
}
async function sendTurn(text,audio) {
  voice.stop();
  const message=checkCustomerText(text.trim());
  if(!message)throw new Error('請先說一句話或輸入文字。');
  const phone=state.phone;
  const r=await api('/api/practice/'+phone.id+'/turn','POST',{message});
  if(state.phone!==phone)throw new Error('本場已切換。');
  phone.messages.push({role:'user',content:message},{role:'assistant',content:r.answer.reply});
  if(audio&&phone.audioConsent){phone.audioClips ||= [];const duration=phone.audioClips.reduce((n,c)=>n+c.duration,0);if(duration+audio.duration<=180&&audio.duration>=.3)phone.audioClips.push({...audio,turn:phone.messages.filter(m=>m.role==='user').length});else toast('聲音評估最多保留 3 分鐘；其他對話仍可繼續。');}
  phone.ended=r.answer.ended;render();
  return {ended:phone.ended,reply:r.answer.reply};
}
const conversation=new Conversation(voice,async (text,audio)=>{
  if(state.busy)throw new Error('教練仍在回應，請稍後再開始。');
  let answer;await work('已聽到，教練正在回應…',async()=>{answer=await sendTurn(text,audio);});
  if(!answer)throw new Error(state.error||'連線未完成，已暫停語音。');return answer;
},()=>({prepareAudio:state.phone?.audioConsent?()=>audioCapture.start():null,finishAudio:()=>audioCapture.finish(),cancelAudio:()=>audioCapture.cancel(),voiceURI:currentRoleVoice().voice?.voiceURI||state.voiceURI,rate:state.rate,onText:text=>{const el=$('#message');if(el)el.value=text;}}),toast);
document.addEventListener('visibilitychange',()=>{if(document.hidden)conversation.stop();});
let theme=localGet('hao.theme','light');
function applyTheme(){document.documentElement.dataset.theme=theme;}
applyTheme();
function customerFrom(form) { const f=new FormData(form);return {gender:checkCustomerText(f.get('gender')),age:checkCustomerText(f.get('age')),background:checkCustomerText(f.get('background'))}; }
function currentRoleVoice(){return selectRoleVoice(voice.chineseVoices,{mode:state.phone?.mode,gender:state.phone?.customerGender,preferred:state.voiceURI,male:state.maleVoiceURI,female:state.femaleVoiceURI});}
function roleVoiceLabel(){const selected=currentRoleVoice();return selected.automatic?(selected.matched?'客戶'+selected.gender+'聲：'+selected.voice.name:'此裝置未找到可確認的'+selected.gender+'聲，暫用預設音色；可到語音設定指定。'):'教練／預設音色：'+(selected.voice?.name||'裝置預設');}
function speakReply(text){voice.speak(text,currentRoleVoice().voice?.voiceURI||state.voiceURI,state.rate);}
function speak(text) { voice.speak(text,state.voiceURI,state.rate); }
function resetKey() {state.models=[];state.inspected=false;state.editingId=null;state.localImport=false;state.selectedModel='';}
function openModal(title,content) { const m=$('#modal');m.innerHTML=`<div class="modal-head"><h2>${title}</h2><button class="close" data-action="close-modal" aria-label="關閉">×</button></div>${content}`;m.showModal(); }
function requireVoiceConsent() {
  if(state.voiceConsent)return true;
  openModal('開啟語音前，先了解資料處理','<p>語音辨識可能由瀏覽器傳送到其雲端服務。請不要口述客戶姓名、電話或其他個人資料。只有另行勾選「本場聲音評估」才會暫存並在結束時送出錄音；App 不永久保存原始錄音。</p>'+btn('我了解並同意開啟收音','consent-voice')+'<p>同意後，再按一次麥克風開始測試。</p>');return false;
}
async function firebase(method,data) {
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${encodeURIComponent(state.config.firebaseApiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const json=await response.json();if(!response.ok)throw new Error(authMessage(json.error?.message||''));return json;
}
function setToken(value) {if(!value)auth.clear();token=value;try{if(value)sessionStorage.setItem('hao.auth',value);else sessionStorage.removeItem('hao.auth');}catch{}}
async function setupGoogle() {
  if(!state.config.googleClientId||!state.config.authConfigured)return;
  if(!window.google?.accounts){if(!$('#google-script')){const s=document.createElement('script');s.id='google-script';s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=setupGoogle;s.onerror=()=>{const h=$('#google-signin');if(h)h.textContent='Google 登入元件載入失敗，請檢查網路後重新整理，或先使用 E-mail 登入。';};document.head.append(s);}return;}
  window.google.accounts.id.initialize({client_id:state.config.googleClientId,callback: async response=>{await work('正在登入…',async()=>{const user=await firebase('signInWithIdp',{postBody:new URLSearchParams({id_token:response.credential,providerId:'google.com'}).toString(),requestUri:location.origin+'/',returnSecureToken:true});setToken(auth.save(user));await loadUser(true);if(!state.user)throw new Error('登入驗證未完成，請重試。');location.hash='home';});}});
  const holder=$('#google-signin');if(holder)window.google.accounts.id.renderButton(holder,{theme:'outline',size:'large',text:'signin_with',locale:'zh_TW',width:Math.min(300,holder.clientWidth||300)});
}
document.addEventListener('submit',e=>{
  const form=e.target;if(!(form instanceof HTMLFormElement))return;e.preventDefault();
  const f=new FormData(form);
  if(form.id==='pain-form')work('取得官方條文、整理三項假設並查核回覆…',async()=>{state.customer=customerFrom(form);state.pain=await api('/api/coach/pain','POST',{customer:state.customer,credentialId:state.activeId});render();$('#pain-result')?.scrollIntoView({behavior:'smooth',block:'start'});});
  if(form.id==='phone-form')work('取得官方條文，準備邀約範例並查核內容…',async()=>{state.customer=customerFrom(form);state.mode=String(f.get('mode'));state.phoneDraft={relationship:String(f.get('relationship')),purpose:checkCustomerText(f.get('purpose')),reaction:checkCustomerText(f.get('reaction')),difficulty:String(f.get('difficulty'))};state.phone={...await api('/api/practice','POST',{customer:state.customer,scenario:state.phoneDraft,mode:state.mode,credentialId:state.activeId}),stage:'example',messages:[],customerGender:state.customer.gender};state.feedback=null;render();window.scrollTo(0,0);});
  if(form.id==='turn-form'){conversation.stop();work('正在準備角色回應…',async()=>{const r=await sendTurn(String(f.get('message')||''));if(state.autoSpeak)speakReply(r.reply);});}
  if(form.id==='key-form')work('確認模型，並加密保存連線…',async()=>{const model=String(f.get('model')||'');if(!model)throw new Error('請先選擇一個模型。');let r;if(state.editingId)r=await api(`/api/credentials/${state.editingId}`,'POST',{model,freeConfirmed:f.get('freeConfirmed')==='on'});else r=await api('/api/credentials','POST',{provider:String(f.get('provider')),key:String(f.get('key')||'').trim(),model,freeConfirmed:f.get('freeConfirmed')==='on'});state.activeId=r.credential.id;savePrefs();resetKey();await loadUser();if(state.resumeRoute){const resume=state.resumeRoute;state.resumeRoute='';if(resume==='phone'){conversation.stop();state.phone=null;state.feedback=null;}location.hash=resume;}render();toast('已加密保存，並記住你選擇的模型。下次不用重新貼 Key。');});
  if(form.id==='auth-form')work('正在處理帳號…',async()=>{const email=String(f.get('email')),password=String(f.get('password')||'');if(state.authMode==='reset'){await firebase('sendOobCode',{requestType:'PASSWORD_RESET',email});toast('若此帳號可重設密碼，請到信箱查看重設郵件。');}else if(state.authMode==='register'){const u=await firebase('signUp',{email,password,returnSecureToken:true});await firebase('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:u.idToken});toast('已寄送驗證信。完成信箱驗證後，請回來登入。');state.authMode='login';render();}else{const u=await firebase('signInWithPassword',{email,password,returnSecureToken:true});setToken(auth.save(u));await loadUser(true);if(!state.user){setToken('');throw new Error('請先完成 E-mail 驗證，再重新登入。');}location.hash='home';}});
});
document.addEventListener('click',async e=>{
  if(e.target.closest('a.skip')){e.preventDefault();$('#main')?.focus();return;}
  const target=e.target.closest('[data-action]');if(!target)return;
  const action=target.dataset.action;
  if(target.tagName==='A'&&action)e.preventDefault();
  try {
    if(action==='theme'){theme=theme==='dark'?'light':'dark';localSet('hao.theme',theme);applyTheme();render();}
    if(action==='recover-model')await work('保留輸入，載入免費模型…',async()=>{
      const r=await api(`/api/credentials/${state.activeId}/models`);
      state.resumeRoute=['pain','phone'].includes(state.route)?state.route:'';
      Object.assign(state,{models:r.models,provider:r.credential.provider,editingId:r.credential.id,localImport:false,inspected:true,selectedModel:r.credential.model});
      location.hash='settings';render();
      toast('已保留情境。請確認模型後按「儲存並開始」；更換後的語音演練會開新場次。');
    });
    if(action==='conversation'&&requireVoiceConsent()){conversation.start('語音已開啟，請開始說話。');}
    if(action==='replay-reply'&&requireVoiceConsent()){const last=state.phone?.messages.filter(m=>m.role==='assistant').at(-1);conversation.start(last?.content||'語音已開啟，請開始說話。');}
    if(action==='go-login')location.hash='login';
    if(action==='reload-config')await work('正在重新連線…',async()=>{await loadConfig();await loadUser();render();});
    if(action==='close-modal')$('#modal').close();
    if(action==='account-menu')openModal('你的練習帳號',`<p>${esc(state.user.name)}${state.user.local?' · 僅本機測試身份':''}</p><div class="flex"><a class="button secondary" href="#settings" data-action="account-settings">AI 與語音設定</a>${btn('登出','logout','secondary')}</div>`);
    if(action==='account-settings'){$('#modal').close();location.hash='settings';}
    if(action==='logout')await work('正在登出…',async()=>{await api('/api/auth/logout','POST',{});voice.stop();setToken('');Object.assign(state,{user:null,credentials:[],activeId:'',phone:null,feedback:null,pain:null,customer:null});resetKey();$('#modal').close();location.hash='login';render();});
    if(action==='new-key'){resetKey();render();$('#api-key')?.focus();}
    if(action==='local-login-settings')await work('正在開啟本機測試帳號…',async()=>{await api('/api/auth/local','POST',{});setToken('');await loadUser(true);resetKey();render();$('#api-key')?.focus();});
    if(action==='local-login')await work('正在開啟本機測試帳號…',async()=>{await api('/api/auth/local','POST',{});setToken('');await loadUser(true);location.hash='home';render();});
    if(action==='sample') {const examples={family:{gender:'未提供',age:'年約 40 歲',background:'雙薪家庭，有一位學齡孩子，工作忙碌，最近開始關心家庭保障。'},retire:{gender:'未提供',age:'年約 58 歲',background:'預計數年後退休，有成年子女，希望了解退休後生活安排與醫療保障。'},young:{gender:'未提供',age:'年約 26 歲',background:'剛開始工作，收入穩定但預算有限，對保險不熟悉，希望先了解基本保障。'}};state.customer=examples[target.dataset.sample];render();}
    if(action==='use-pain'){state.phoneDraft={purpose:state.pain.answer.pains[Number(target.dataset.index)].opening};state.phone=null;state.feedback=null;location.hash='phone';}
    if(action==='inspect-key')await work('驗證金鑰並載入目前模型…',async()=>{const key=$('#api-key').value.trim();const provider=$('#provider').value;const r=await api('/api/credentials/inspect','POST',{provider,key});state.models=r.models;state.selectedModel=defaultModel(r.models);state.inspected=true;state.provider=provider;state.localImport=false;state.editingId=null;render();$('#api-key').value=key;if(!r.models.length)toast('目前沒有可用的相容免費模型，請稍後重試。');else if(!state.selectedModel)toast('此 Key 的模型清單未提供 Gemini Flash-Lite Latest，請選擇其他可用模型。');});
    if(action==='select-credential'){state.activeId=target.dataset.id;savePrefs();render();toast('已選用這個連線，下次會記住。');}
    if(action==='edit-credential')await work('重新確認可用模型…',async()=>{const r=await api(`/api/credentials/${target.dataset.id}/models`);state.models=r.models;state.provider=r.credential.provider;state.selectedModel=r.credential.model;state.editingId=r.credential.id;state.localImport=false;state.inspected=true;render();if(!r.models.some(m=>m.id===r.credential.model))toast('上次模型目前不可用，請手動重選。');});
    if(action==='delete-credential')openModal('移除已保存的 Key？',`<p>App 將刪除這把加密 Key 及其模型偏好。若要撤銷金鑰，仍需到原平台操作。</p>${btn('確定移除','confirm-delete-key','danger',`data-id="${target.dataset.id}"`)}`);
    if(action==='confirm-delete-key')await work('正在移除…',async()=>{await api(`/api/credentials/${target.dataset.id}`,'DELETE');await loadUser();resetKey();$('#modal').close();render();toast('已移除保存的 Key。');});
    if(action==='tutorial-provider'){state.tutorial=target.dataset.id;state.tutorialStep=0;if(state.route!=='tutorial')location.hash='tutorial';else render();}
    if(action==='tutorial-next'){state.tutorialStep++;render();window.scrollTo(0,0);}
    if(action==='tutorial-prev'){state.tutorialStep--;render();}
    if(action==='zoom-image')openModal('實際操作畫面',`<img class="tutorial-image large" src="./assets/tutorials/${esc(target.dataset.image)}" alt="放大的 API Key 申請教學">`);
    if(action==='voice-refresh'){voice.refresh();render();}
    if(action==='voice-test')speak('您好，我是豪老師。很高興陪你一起練習。今天，我們先從一句自然的開場開始。');
    if(action==='voice-stop')conversation.stop();
    if(action==='read-example')speak(state.phone.answer.script);
    if(action==='mic-test'&&requireVoiceConsent())voice.listen(text=>{const el=$('#voice-test-result');if(el)el.textContent=text;},toast);
    if(action==='mic'&&requireVoiceConsent()){conversation.stop();voice.listen(text=>{const el=$('#message');if(el)el.value=text;},toast);}
    if(action==='consent-voice'){state.voiceConsent=true;savePrefs();$('#modal').close();toast('已同意，請再按麥克風開始收音。');}
    if(action==='start-dialogue'){voice.stop();state.phone.stage='chat';if(!state.phone.messages.length)state.phone.messages.push({role:'assistant',content:state.phone.mode==='practice'?'喂，您好？':'您好，我是 OO 人壽的 OO。想跟您聊聊保障需求，現在方便嗎？'});render();}
    if(action==='show-example'){conversation.stop();state.phone.stage='example';render();}
    if(action==='restart'||action==='practice-again')await work('正在準備新場次…',async()=>{conversation.stop();if(state.phone)await api(`/api/practice/${state.phone.id}`,'DELETE');state.phone=null;state.feedback=null;if(action==='practice-again')state.mode='practice';render();});
    if(action==='feedback')await work('正在查核演練內容，整理有依據的回饋…',async()=>{conversation.stop();let response;for(let step=0;step<8;step++){response=await api(`/api/practice/${state.phone.id}/feedback`,'POST',{});if(!response.pending)break;state.phone.ended=true;const status=$('#operation-status');if(status)status.textContent='已檢查 '+response.reviewedTurns+' / '+response.totalTurns+' 句；正在完成事後檢討與評分…';}if(response.pending)throw new Error('檢查進度已保存，請再按回饋接續。');state.feedback=response;if(state.phone.audioConsent&&state.phone.audioClips?.length&&!response.demo)await audioFeedback();render();window.scrollTo(0,0);});
    if(action==='audio-feedback')await work('正在聆聽本場聲音，補上評估…',async()=>{await audioFeedback();render();});
    if(action==='save-summary'){const list=localGet(historyKey(),[]);if(list.some(x=>x.id===state.phone.id)){toast('這場摘要已保存。');return;}list.unshift({id:state.phone.id,date:new Date().toISOString(),mode:state.phone.mode,model:state.phone.model,praise:state.feedback.answer.praise,scores:state.feedback.answer.scores.map(s=>({item:s.item,stars:s.stars})),violations:state.feedback.violations,reviewedTurns:state.feedback.reviewedTurns});localSet(historyKey(),list.slice(0,50));toast('已保存到此帳號在這個裝置的回饋摘要。');}
    if(action==='delete-history'){const list=localGet(historyKey(),[]);list.splice(Number(target.dataset.index),1);localSet(historyKey(),list);render();}
    if(action==='resend-verification')await work('正在重寄驗證信…',async()=>{if(!auth.value)throw new Error('請先輸入 E-mail 與密碼登入，再按重寄驗證信。');const idToken=await auth.token(state.config.firebaseApiKey);await firebase('sendOobCode',{requestType:'VERIFY_EMAIL',idToken});toast('已寄出驗證信，完成後請重新登入。');});
    if(action==='auth-mode'){state.authMode=target.dataset.mode;render();}
    if(action==='delete-account')openModal('刪除帳號與資料？','<p>此操作會移除保存的 Key、後端演練與這個裝置的摘要。完成後需重新註冊及設定。</p>'+btn('確定刪除帳號','confirm-delete-account','danger'));
    if(action==='confirm-delete-account')await work('正在刪除帳號資料…',async()=>{await api('/api/account','DELETE');try{localStorage.removeItem(historyKey());localStorage.removeItem(preferences());}catch{}await api('/api/auth/logout','POST',{}).catch(()=>{});setToken('');Object.assign(state,{user:null,credentials:[],activeId:'',phone:null,feedback:null,pain:null,customer:null});$('#modal').close();location.hash='login';render();toast('帳號與可用資料已刪除。');});
  }catch(error){toast(error.message);}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='provider'){state.provider=t.value;resetKey();render();}
  if(t.id==='api-key'){state.inspected=false;state.models=[];const m=$('#model');if(m){m.innerHTML='<option>Key 已更動，請重新驗證</option>';m.disabled=true;}const b=$('#key-form button[type="submit"]');if(b)b.disabled=true;}
  if(t.id==='voice-select'){state.voiceURI=t.value;savePrefs();}
  if(t.id==='voice-rate'){state.rate=Number(t.value);savePrefs();}
  if(t.id==='audio-consent'){conversation.stop();state.phone.audioConsent=t.checked;if(!t.checked)state.phone.audioClips=[];render();}
  if(['maleVoiceURI','femaleVoiceURI'].includes(t.id)){state[t.id]=t.value;savePrefs();}
  if(t.id==='voice-consent'){state.voiceConsent=t.checked;savePrefs();if(!t.checked)conversation.stop();}
  if(t.id==='auto-speak'){state.autoSpeak=t.checked;savePrefs();}
});
for(const event of ['paste','drop'])document.addEventListener(event,e=>{if(e.target.closest('textarea,input')&&(e.clipboardData?.files?.length||e.dataTransfer?.files?.length)){e.preventDefault();toast('不接受圖片或檔案。請用性別、年齡及概括背景描述客戶。');}});
window.addEventListener('hashchange',route);
window.addEventListener('beforeunload',()=>voice.stop());
window.addEventListener('offline',()=>toast('目前已離線。畫面仍可閱讀，AI 練習需連線後重試。'));
try{await loadConfig();await loadUser();}catch(e){state.error=e.message;toast('尚未連上登入服務，請啟動本機預覽後按「重新連線」。');}
route();
if('serviceWorker' in navigator) {
  if(['localhost','127.0.0.1'].includes(location.hostname)) {
    navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.filter(r=>new URL(r.active?.scriptURL||r.installing?.scriptURL||r.waiting?.scriptURL||location.href).pathname==='/sw.js').map(r=>r.unregister()))).catch(()=>{});
  } else if(configStatus==='ready'&&!state.config.localPreview)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}




async function audioFeedback(){
  const phone=state.phone;if(!phone?.audioConsent||!phone.audioClips?.length)return;
  const status=$('#operation-status');if(status)status.textContent='文字回饋已完成，正在聆聽本場錄音…';
  try{const result=await api('/api/practice/'+phone.id+'/audio-feedback','POST',{consent:true,clips:phone.audioClips});if(state.phone!==phone)return;state.feedback=result;phone.audioClips=[];}
  catch(e){if(state.phone===phone){state.feedback.audioError='聲音評估尚未完成：'+e.message+'。文字回饋仍可閱讀，錄音暫留本頁供重試。';toast(state.feedback.audioError);}}
}

function roleVoiceSettings(){return '<h3>客戶角色自動音色</h3><p>客戶選男生或女生時自動使用對應音色；教練示範與範例仍使用上方音色。沒有對應音色時，可自行指定。</p>'+[['男','maleVoiceURI'],['女','femaleVoiceURI']].map(([gender,key])=>'<label class="field">客戶'+gender+'聲<select id="'+key+'"><option value="">自動選擇台灣中文'+gender+'聲</option>'+voice.chineseVoices.map(v=>'<option value="'+esc(v.voiceURI)+'" '+(state[key]===v.voiceURI?'selected':'')+'>'+esc(v.name)+'</option>').join('')+'</select></label>').join('');}
