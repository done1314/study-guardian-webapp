const course = [
  { title: '01.基础30讲导学', count: 1 },
  { title: '02.零基础', count: 15 },
  { title: '03.第1讲', count: 15 },
  { title: '04.第2讲', count: 6 },
  { title: '05.第3讲', count: 4 },
  { title: '06.第4讲', count: 4 },
  { title: '07.第5讲', count: 10 },
  { title: '08.第6讲', count: 6 },
  { title: '09.第7讲', count: 4 },
  { title: '10.第8讲', count: 8 },
  { title: '11.第9讲', count: 10 },
  { title: '12.第10讲', count: 4 },
  { title: '13.第11讲', count: 3 },
  { title: '14.第12讲', count: 4 },
  { title: '15.第13讲', count: 8 },
  { title: '16.第14讲', count: 7 },
  { title: '17.第15讲', count: 12 },
  { title: '18.第16讲', count: 12 },
  { title: '18.第17讲', count: 6 },
  { title: '19.第18讲', count: 10 },
  { title: '20.核心计算通关', count: 7 }
];
const STORE = 'rike-study-v1';
const today = dateOnly(new Date());
const initialState = { startDate: today, defaults: { math: 90, english: 30 }, durations: {}, proofs: {}, completed: {} };
let state = loadState();
let selectedDate = today;
let editing = null;

const icons = {
  math: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>',
  english: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-8"/></svg>'
};

function dateOnly(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function parseDate(key) { const [y,m,d]=key.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(key,n) { const d=parseDate(key); d.setDate(d.getDate()+n); return dateOnly(d); }
function dayOffset(key) { return Math.round((parseDate(key)-parseDate(state.startDate))/86400000); }
function formatDate(key, full=false) { const d=parseDate(key); return new Intl.DateTimeFormat('zh-CN',full?{year:'numeric',month:'long',day:'numeric',weekday:'long'}:{month:'long',day:'numeric',weekday:'short'}).format(d); }
function loadState(){ try { return {...initialState,...JSON.parse(localStorage.getItem(STORE)||'{}')}; } catch { return structuredClone(initialState); } }
function saveState(){ localStorage.setItem(STORE,JSON.stringify(state)); }
function keyFor(type,date=selectedDate){ return `${date}:${type}`; }
function durationFor(type,date=selectedDate){ return state.durations[keyFor(type,date)] ?? state.defaults[type]; }

function renderDateStrip(){
  const wrap=document.querySelector('#dateStrip'); wrap.innerHTML='';
  for(let i=-3;i<=3;i++){
    const key=addDays(selectedDate,i), d=parseDate(key), b=document.createElement('button');
    b.className='date-button'+(key===selectedDate?' selected':''); b.dataset.date=key;
    if(key<state.startDate)b.disabled=true;
    b.setAttribute('aria-label',formatDate(key,true)); if(key===selectedDate)b.setAttribute('aria-current','date');
    b.innerHTML=`<span>${['日','一','二','三','四','五','六'][d.getDay()]}</span><strong>${d.getDate()}</strong>`;
    b.addEventListener('click',()=>{selectedDate=key; renderToday();}); wrap.append(b);
  }
}

function taskData(){
  const index=Math.max(0,dayOffset(selectedDate));
  const lesson=course[index%course.length];
  const round=Math.floor(index/course.length)+1;
  return [
    {type:'math',label:`数学 · 第 ${index%course.length+1} / ${course.length} 天`,title:lesson.title,detail:round>1?`第 ${round} 轮复习 · 文件夹内 ${lesson.count} 项 · 完成后拍照`:`学习整个文件夹 · 内含 ${lesson.count} 项 · 完成后拍照`},
    {type:'english',label:'英语 · 每日阅读',title:`完成第 ${index+1} 篇阅读`,detail:'精读一篇文章，标出生词与长难句后拍照'}
  ];
}

function renderToday(){
  document.querySelector('#fullDate').textContent=formatDate(selectedDate,true)+(selectedDate===today?' · 今天':'');
  document.querySelector('#todayTitle').textContent=selectedDate===today?'今天，稳稳向前。':'这一天，也算数。';
  renderDateStrip(); const tasks=taskData(), list=document.querySelector('#taskList'); list.innerHTML='';
  tasks.forEach(renderTask); const total=tasks.reduce((n,t)=>n+durationFor(t.type),0); document.querySelector('#totalDuration').textContent=`共 ${total} 分钟`;
  const complete=tasks.filter(t=>state.completed[keyFor(t.type)]).length, percent=complete*50;
  document.querySelector('#progressValue').textContent=`${percent}%`; document.querySelector('#progressRing').style.setProperty('--p',`${percent*3.6}deg`);
  document.querySelector('#progressMessage').textContent=complete===2?'今日任务已完成。去好好休息吧。':complete===1?'已经完成一半，继续保持。':'完成两项日课，就算赢下今天。';
}

function renderTask(task){
  const node=document.querySelector('#taskTemplate').content.firstElementChild.cloneNode(true), proof=state.proofs[keyFor(task.type)], done=state.completed[keyFor(task.type)];
  node.classList.add(task.type); if(done)node.classList.add('completed'); node.querySelector('.subject-icon').innerHTML=icons[task.type]; node.querySelector('.subject-label').textContent=task.label; node.querySelector('h3').textContent=task.title; node.querySelector('.task-detail').textContent=task.detail;
  const duration=node.querySelector('.duration-pill'); duration.textContent=`${durationFor(task.type)} 分钟`; duration.addEventListener('click',()=>openDuration(task));
  const input=node.querySelector('.photo-input'), upload=node.querySelector('.upload-button'), replace=node.querySelector('.replace-proof'), preview=node.querySelector('.proof-preview'), complete=node.querySelector('.complete-button');
  if(proof){ showProof(preview,upload,proof); complete.disabled=false; complete.textContent=done?'已完成':'完成打卡'; }
  upload.addEventListener('click',()=>input.click()); replace.addEventListener('click',()=>input.click()); input.addEventListener('change',()=>handlePhoto(input.files[0],task.type));
  complete.addEventListener('click',()=>{ if(!state.proofs[keyFor(task.type)])return; state.completed[keyFor(task.type)]=!state.completed[keyFor(task.type)]; saveState(); renderToday(); });
  document.querySelector('#taskList').append(node);
}
function showProof(preview,upload,proof){ upload.hidden=true; preview.hidden=false; preview.querySelector('img').src=proof.data; preview.querySelector('.proof-name').textContent=proof.name; }
function handlePhoto(file,type){ if(!file)return; const img=new Image(), reader=new FileReader(); reader.onload=()=>{img.onload=()=>{const scale=Math.min(1,960/img.width), canvas=document.createElement('canvas'); canvas.width=img.width*scale; canvas.height=img.height*scale; canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); state.proofs[keyFor(type)]={name:file.name,data:canvas.toDataURL('image/jpeg',.72)}; saveState(); renderToday();}; img.src=reader.result;}; reader.readAsDataURL(file); }

function openSheet(id){ document.querySelector('#sheetBackdrop').hidden=false; document.querySelector(id).hidden=false; }
function closeSheets(){ document.querySelector('#sheetBackdrop').hidden=true; document.querySelectorAll('.sheet').forEach(s=>s.hidden=true); editing=null; }
function openDuration(task){ editing=task; document.querySelector('#durationSubject').textContent=task.label; document.querySelector('#durationInput').value=durationFor(task.type); openSheet('#durationSheet'); setTimeout(()=>document.querySelector('#durationInput').focus(),80); }

function renderPlan(){
  const current=Math.max(0,dayOffset(today))%course.length; document.querySelector('#planSummary').innerHTML=`<div class="summary-card"><strong>${course.length} 天</strong><span>一轮数学计划</span></div><div class="summary-card"><strong>${formatDate(state.startDate)}</strong><span>计划开始日期</span></div>`; document.querySelector('#courseCount').textContent=`${course.length} 个文件夹`;
  const catalog=document.querySelector('#courseCatalog'); catalog.innerHTML='';
  course.forEach((folder,index)=>{const row=document.createElement('div');row.className='catalog-folder'+(index===current?' current':'');row.innerHTML=`<span class="folder-number">${String(index+1).padStart(2,'0')}</span><div><strong>${folder.title}</strong><span>${formatDate(addDays(state.startDate,index))}</span></div><span class="folder-count">${folder.count} 项</span>`;catalog.append(row);});
}

function renderProgress(){
  const entries=Object.entries(state.completed).filter(([,v])=>v), days=new Set(entries.map(([k])=>k.split(':')[0])), minutes=entries.reduce((sum,[k])=>sum+durationFor(k.split(':')[1],k.split(':')[0]),0);
  document.querySelector('#statsGrid').innerHTML=`<div class="stat-card"><strong>${days.size}</strong><span>打卡天数</span></div><div class="stat-card"><strong>${entries.length}</strong><span>完成任务</span></div><div class="stat-card"><strong>${minutes}</strong><span>投入分钟</span></div>`;
  const history=document.querySelector('#historyList'); history.innerHTML=''; if(!entries.length){history.innerHTML='<div class="empty-history">完成第一次拍照打卡后，记录会出现在这里。</div>';return;}
  entries.sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12).forEach(([k])=>{const [date,type]=k.split(':'), row=document.createElement('div'); row.className='history-row'; row.innerHTML=`<span class="history-dot">${icons.check}</span><div><strong>${type==='math'?'数学学习':'英语阅读'}</strong><span>${formatDate(date)} · ${durationFor(type,date)} 分钟</span></div>`; history.append(row);});
}

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(t=>{t.classList.toggle('active',t===tab);t.removeAttribute('aria-current')});tab.setAttribute('aria-current','page');document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===tab.dataset.view));if(tab.dataset.view==='planView')renderPlan();if(tab.dataset.view==='progressView')renderProgress();window.scrollTo({top:0,behavior:'smooth'});}));
document.querySelector('#todayShortcut').addEventListener('click',()=>{selectedDate=today;document.querySelector('[data-view="todayView"]').click();renderToday();});
document.querySelector('#openSettings').addEventListener('click',()=>{document.querySelector('#mathDefault').value=state.defaults.math;document.querySelector('#englishDefault').value=state.defaults.english;openSheet('#settingsSheet');});
document.querySelectorAll('[data-close-sheet]').forEach(b=>b.addEventListener('click',closeSheets)); document.querySelector('#sheetBackdrop').addEventListener('click',closeSheets);
document.querySelector('#presetRow').addEventListener('click',e=>{if(e.target.tagName==='BUTTON')document.querySelector('#durationInput').value=e.target.textContent;});
document.querySelector('#saveDuration').addEventListener('click',()=>{const value=Math.max(5,Math.min(480,Number(document.querySelector('#durationInput').value)||30));state.durations[keyFor(editing.type)]=value;saveState();closeSheets();renderToday();});
document.querySelector('#saveSettings').addEventListener('click',()=>{state.defaults.math=Math.max(5,Math.min(480,Number(document.querySelector('#mathDefault').value)||90));state.defaults.english=Math.max(5,Math.min(480,Number(document.querySelector('#englishDefault').value)||30));saveState();closeSheets();renderToday();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheets();});
renderToday();
