const DEFAULT_MATH_DAYS = 45;
const ENGLISH_DAYS = 45;
const course = [
  ['01.基础30讲导学',1],['02.零基础',15],['03.第1讲',15],['04.第2讲',6],['05.第3讲',4],['06.第4讲',4],['07.第5讲',10],['08.第6讲',6],['09.第7讲',4],['10.第8讲',8],['11.第9讲',10],['12.第10讲',4],['13.第11讲',3],['14.第12讲',4],['15.第13讲',8],['16.第14讲',7],['17.第15讲',12],['18.第16讲',12],['18.第17讲',6],['19.第18讲',10],['20.核心计算通关',7]
].map(([title,count])=>({title,count}));
const STORE='rike-study-v1', today=dateOnly(new Date());
const initialState={startDate:today,mathDays:DEFAULT_MATH_DAYS,defaults:{math:90,english:30},durations:{},proofs:{},completed:{},customTasks:[]};
let state=loadState(), selectedDate=today, durationEditing=null, customEditingId=null, installPrompt=null;
const icons={
  math:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>',
  english:'<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z"/></svg>',
  custom:'<svg viewBox="0 0 24 24"><path d="M9 4h6l1 2h3v15H5V6h3Z"/><path d="m8 13 2.5 2.5L16 10"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-8"/></svg>'
};
function allocateCourseDays(planDays=state.mathDays){
  const total=course.reduce((sum,f)=>sum+f.count,0);
  const result=course.map((folder,index)=>{const ideal=folder.count/total*planDays,days=Math.max(1,Math.floor(ideal));return {...folder,index,days,remainder:ideal-days};});
  let assigned=result.reduce((sum,f)=>sum+f.days,0),cursor=0;
  const order=[...result].sort((a,b)=>b.remainder-a.remainder||b.count-a.count);
  while(assigned<planDays){order[cursor%order.length].days++;assigned++;cursor++;}
  return result.sort((a,b)=>a.index-b.index);
}
function mathPlan(){const allocations=allocateCourseDays();return {allocations,schedule:allocations.flatMap(folder=>Array.from({length:folder.days},(_,part)=>({...folder,part:part+1})))};}
function dateOnly(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function parseDate(key){const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d);}
function addDays(key,amount){const date=parseDate(key);date.setDate(date.getDate()+amount);return dateOnly(date);}
function dayOffset(key){return Math.round((parseDate(key)-parseDate(state.startDate))/86400000);}
function formatDate(key,full=false){return new Intl.DateTimeFormat('zh-CN',full?{year:'numeric',month:'long',day:'numeric',weekday:'long'}:{month:'long',day:'numeric',weekday:'short'}).format(parseDate(key));}
function loadState(){try{const saved=JSON.parse(localStorage.getItem(STORE)||'{}');return {...initialState,...saved,mathDays:Math.max(course.length,Math.min(365,Number(saved.mathDays)||DEFAULT_MATH_DAYS)),defaults:{...initialState.defaults,...(saved.defaults||{})},durations:saved.durations||{},proofs:saved.proofs||{},completed:saved.completed||{},customTasks:Array.isArray(saved.customTasks)?saved.customTasks.map(task=>({...task,totalDays:Math.max(1,Math.min(365,Number(task.totalDays)||(task.repeat?DEFAULT_MATH_DAYS:1)))})):[]};}catch{return JSON.parse(JSON.stringify(initialState));}}
function saveState(){localStorage.setItem(STORE,JSON.stringify(state));}
function keyFor(type,date=selectedDate){return `${date}:${type}`;}
function customTaskForType(type){return state.customTasks.find(task=>`custom-${task.id}`===type);}
function durationFor(type,date=selectedDate){return state.durations[keyFor(type,date)]??state.defaults[type]??customTaskForType(type)?.duration??30;}
function escapeText(value){const el=document.createElement('span');el.textContent=value;return el.innerHTML;}

function renderDateStrip(){
  const wrap=document.querySelector('#dateStrip');wrap.innerHTML='';
  for(let i=-3;i<=3;i++){
    const key=addDays(selectedDate,i),date=parseDate(key),button=document.createElement('button');
    button.className='date-button'+(key===selectedDate?' selected':'');button.setAttribute('aria-label',formatDate(key,true));
    if(key===selectedDate)button.setAttribute('aria-current','date');
    button.innerHTML=`<span>${['日','一','二','三','四','五','六'][date.getDay()]}</span><strong>${date.getDate()}</strong>`;
    button.addEventListener('click',()=>{selectedDate=key;renderToday();});wrap.append(button);
  }
}
function taskData(){
  const offset=dayOffset(selectedDate),tasks=[];
  if(offset>=0&&offset<state.mathDays){
    const lesson=mathPlan().schedule[offset];
    tasks.push({type:'math',kind:'math',label:`数学 · ${state.mathDays} 天计划 ${offset+1} / ${state.mathDays}`,title:lesson.title,detail:`文件夹学习第 ${lesson.part} / ${lesson.days} 天 · 共 ${lesson.count} 项 · 完成后拍照`});
  }
  if(offset>=0&&offset<ENGLISH_DAYS)tasks.push({type:'english',kind:'english',label:`英语 · ${ENGLISH_DAYS} 天计划 ${offset+1} / ${ENGLISH_DAYS}`,title:`完成第 ${offset+1} 篇阅读`,detail:'精读一篇文章，标出生词与长难句后拍照'});
  state.customTasks.forEach(task=>{const taskOffset=Math.round((parseDate(selectedDate)-parseDate(task.startDate))/86400000);if(taskOffset>=0&&taskOffset<task.totalDays)tasks.push({type:`custom-${task.id}`,kind:'custom',label:`自定义任务 · ${taskOffset+1} / ${task.totalDays} 天`,title:task.title,detail:`${formatDate(task.startDate)}开始 · 每天完成后拍照`});});
  return tasks;
}
function renderToday(){
  document.querySelector('#fullDate').textContent=formatDate(selectedDate,true)+(selectedDate===today?' · 今天':'');
  document.querySelector('#todayTitle').textContent=selectedDate===today?'今天，稳稳向前。':'这一天，也算数。';renderDateStrip();
  const tasks=taskData(),list=document.querySelector('#taskList');list.innerHTML='';
  if(tasks.length)tasks.forEach(renderTask);else list.innerHTML='<div class="custom-empty">这一天还没有任务。可在“计划”中添加任务或调整开始日期。</div>';
  const total=tasks.reduce((sum,task)=>sum+durationFor(task.type),0),complete=tasks.filter(task=>state.completed[keyFor(task.type)]).length,percent=tasks.length?Math.round(complete/tasks.length*100):0;
  document.querySelector('#totalDuration').textContent=tasks.length?`共 ${total} 分钟`:'轻松一天';document.querySelector('#progressValue').textContent=`${percent}%`;document.querySelector('#progressRing').style.setProperty('--p',`${percent*3.6}deg`);
  document.querySelector('#progressMessage').textContent=!tasks.length?'今天没有安排，留一点空间给自己。':complete===tasks.length?'今日任务已完成。去好好休息吧。':complete?`已完成 ${complete} / ${tasks.length} 项，继续保持。`:`完成今天的 ${tasks.length} 项任务，就算赢下今天。`;
}
function renderTask(task){
  const node=document.querySelector('#taskTemplate').content.firstElementChild.cloneNode(true),proof=state.proofs[keyFor(task.type)],done=state.completed[keyFor(task.type)];
  node.classList.add(task.kind);if(done)node.classList.add('completed');node.querySelector('.subject-icon').innerHTML=icons[task.kind];node.querySelector('.subject-label').textContent=task.label;node.querySelector('h3').textContent=task.title;node.querySelector('.task-detail').textContent=task.detail;
  const duration=node.querySelector('.duration-pill');duration.textContent=`${durationFor(task.type)} 分钟`;duration.addEventListener('click',()=>openDuration(task));
  const input=node.querySelector('.photo-input'),upload=node.querySelector('.upload-button'),replace=node.querySelector('.replace-proof'),preview=node.querySelector('.proof-preview'),complete=node.querySelector('.complete-button');
  if(proof){showProof(preview,upload,proof);complete.disabled=false;complete.textContent=done?'已完成':'完成打卡';}
  upload.addEventListener('click',()=>input.click());replace.addEventListener('click',()=>input.click());input.addEventListener('change',()=>handlePhoto(input.files[0],task.type));
  complete.addEventListener('click',()=>{if(!state.proofs[keyFor(task.type)])return;state.completed[keyFor(task.type)]=!state.completed[keyFor(task.type)];saveState();renderToday();});document.querySelector('#taskList').append(node);
}
function showProof(preview,upload,proof){upload.hidden=true;preview.hidden=false;preview.querySelector('img').src=proof.data;preview.querySelector('.proof-name').textContent=proof.name;}
function handlePhoto(file,type){if(!file)return;const image=new Image(),reader=new FileReader();reader.onload=()=>{image.onload=()=>{const scale=Math.min(1,960/image.width),canvas=document.createElement('canvas');canvas.width=image.width*scale;canvas.height=image.height*scale;canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);state.proofs[keyFor(type)]={name:file.name,data:canvas.toDataURL('image/jpeg',.72)};saveState();renderToday();};image.src=reader.result;};reader.readAsDataURL(file);}
function openSheet(id){document.querySelector('#sheetBackdrop').hidden=false;document.querySelector(id).hidden=false;}
function closeSheets(){document.querySelector('#sheetBackdrop').hidden=true;document.querySelectorAll('.sheet').forEach(sheet=>sheet.hidden=true);durationEditing=null;customEditingId=null;}
function openDuration(task){durationEditing=task;document.querySelector('#durationSubject').textContent=task.label;document.querySelector('#durationInput').value=durationFor(task.type);openSheet('#durationSheet');setTimeout(()=>document.querySelector('#durationInput').focus(),80);}

function renderPlan(){
  const offset=dayOffset(today),endDate=addDays(state.startDate,state.mathDays-1),{allocations}=mathPlan();
  document.querySelector('#planSummary').innerHTML=`<div class="summary-card"><strong>数学 ${state.mathDays} 天</strong><span>${formatDate(state.startDate)}开始</span></div><div class="summary-card"><strong>${formatDate(endDate)}</strong><span>数学完成日期</span></div>`;document.querySelector('#courseCount').textContent=`${course.length} 个文件夹`;
  const catalog=document.querySelector('#courseCatalog');catalog.innerHTML='';let cursor=0;
  allocations.forEach((folder,index)=>{const start=cursor,end=cursor+folder.days-1,row=document.createElement('div');row.className='catalog-folder'+(offset>=start&&offset<=end?' current':'');const dates=folder.days===1?formatDate(addDays(state.startDate,start)):`${formatDate(addDays(state.startDate,start))} — ${formatDate(addDays(state.startDate,end))}`;row.innerHTML=`<span class="folder-number">${String(index+1).padStart(2,'0')}</span><div><strong>${folder.title}</strong><span>${dates}</span></div><span class="folder-count">${folder.days} 天</span>`;catalog.append(row);cursor+=folder.days;});renderCustomTaskList();
}
function renderCustomTaskList(){
  const list=document.querySelector('#customTaskList');list.innerHTML='';if(!state.customTasks.length){list.innerHTML='<div class="custom-empty">还没有自定义任务。添加后会出现在对应日期，并使用相同的专注时长和拍照打卡。</div>';return;}
  state.customTasks.forEach(task=>{const row=document.createElement('div');row.className='custom-row';row.innerHTML=`<span class="custom-row-icon">${icons.custom}</span><div><strong>${escapeText(task.title)}</strong><span>${formatDate(task.startDate)}开始 · 共 ${task.totalDays} 天 · 每天 ${task.duration} 分钟</span></div><button class="edit-task" aria-label="编辑 ${escapeText(task.title)}">›</button>`;row.querySelector('.edit-task').addEventListener('click',()=>openTaskSheet(task.id));list.append(row);});
}
function openTaskSheet(id=null){
  customEditingId=id;const task=state.customTasks.find(item=>item.id===id);document.querySelector('#taskSheetTitle').textContent=task?'编辑任务':'添加任务';document.querySelector('#customTitle').value=task?.title||'';document.querySelector('#customStartDate').value=task?.startDate||selectedDate;document.querySelector('#customTotalDays').value=task?.totalDays||1;document.querySelector('#customDuration').value=task?.duration||30;document.querySelector('#deleteTask').hidden=!task;document.querySelector('#taskError').hidden=true;openSheet('#taskSheet');setTimeout(()=>document.querySelector('#customTitle').focus(),80);
}
function renderProgress(){
  const entries=Object.entries(state.completed).filter(([,value])=>value),days=new Set(entries.map(([key])=>key.slice(0,10))),minutes=entries.reduce((sum,[key])=>sum+durationFor(key.slice(11),key.slice(0,10)),0);document.querySelector('#statsGrid').innerHTML=`<div class="stat-card"><strong>${days.size}</strong><span>打卡天数</span></div><div class="stat-card"><strong>${entries.length}</strong><span>完成任务</span></div><div class="stat-card"><strong>${minutes}</strong><span>投入分钟</span></div>`;
  const history=document.querySelector('#historyList');history.innerHTML='';if(!entries.length){history.innerHTML='<div class="empty-history">完成第一次拍照打卡后，记录会出现在这里。</div>';return;}
  entries.sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12).forEach(([key])=>{const date=key.slice(0,10),type=key.slice(11),custom=customTaskForType(type),label=type==='math'?'数学学习':type==='english'?'英语阅读':custom?.title||'自定义任务',row=document.createElement('div');row.className='history-row';row.innerHTML=`<span class="history-dot">${icons.check}</span><div><strong>${escapeText(label)}</strong><span>${formatDate(date)} · ${durationFor(type,date)} 分钟</span></div>`;history.append(row);});
}

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(item=>{item.classList.toggle('active',item===tab);item.removeAttribute('aria-current');});tab.setAttribute('aria-current','page');document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id===tab.dataset.view));if(tab.dataset.view==='planView')renderPlan();if(tab.dataset.view==='progressView')renderProgress();window.scrollTo({top:0,behavior:'smooth'});}));
document.querySelector('#todayShortcut').addEventListener('click',()=>{selectedDate=today;document.querySelector('[data-view="todayView"]').click();renderToday();});
document.querySelector('#openSettings').addEventListener('click',()=>{document.querySelector('#planStartDate').value=state.startDate;document.querySelector('#mathPlanDays').value=state.mathDays;document.querySelector('#mathDefault').value=state.defaults.math;document.querySelector('#englishDefault').value=state.defaults.english;document.querySelector('#installHint').hidden=true;openSheet('#settingsSheet');});
document.querySelector('#openAddTask').addEventListener('click',()=>openTaskSheet());document.querySelectorAll('[data-close-sheet]').forEach(button=>button.addEventListener('click',closeSheets));document.querySelector('#sheetBackdrop').addEventListener('click',closeSheets);
document.querySelector('#presetRow').addEventListener('click',event=>{if(event.target.tagName==='BUTTON')document.querySelector('#durationInput').value=event.target.textContent;});
document.querySelector('#saveDuration').addEventListener('click',()=>{const value=Math.max(5,Math.min(480,Number(document.querySelector('#durationInput').value)||30));state.durations[keyFor(durationEditing.type)]=value;saveState();closeSheets();renderToday();});
document.querySelector('#saveSettings').addEventListener('click',()=>{state.startDate=document.querySelector('#planStartDate').value||today;state.mathDays=Math.max(course.length,Math.min(365,Number(document.querySelector('#mathPlanDays').value)||DEFAULT_MATH_DAYS));state.defaults.math=Math.max(5,Math.min(480,Number(document.querySelector('#mathDefault').value)||90));state.defaults.english=Math.max(5,Math.min(480,Number(document.querySelector('#englishDefault').value)||30));saveState();closeSheets();renderToday();renderPlan();});
document.querySelector('#saveTask').addEventListener('click',()=>{const title=document.querySelector('#customTitle').value.trim();if(!title){document.querySelector('#taskError').hidden=false;return;}const task={id:customEditingId||`${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,title,startDate:document.querySelector('#customStartDate').value||selectedDate,totalDays:Math.max(1,Math.min(365,Number(document.querySelector('#customTotalDays').value)||1)),duration:Math.max(5,Math.min(480,Number(document.querySelector('#customDuration').value)||30))},index=state.customTasks.findIndex(item=>item.id===customEditingId);if(index>=0)state.customTasks[index]=task;else state.customTasks.push(task);saveState();closeSheets();renderPlan();renderToday();});
document.querySelector('#deleteTask').addEventListener('click',()=>{const task=state.customTasks.find(item=>item.id===customEditingId);if(!task||!window.confirm(`删除“${task.title}”？`))return;const marker=`custom-${task.id}`;state.customTasks=state.customTasks.filter(item=>item.id!==task.id);['durations','proofs','completed'].forEach(group=>Object.keys(state[group]).filter(key=>key.includes(marker)).forEach(key=>delete state[group][key]));saveState();closeSheets();renderPlan();renderToday();});
document.querySelector('#installApp').addEventListener('click',async()=>{const hint=document.querySelector('#installHint');if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;closeSheets();return;}hint.textContent=/iphone|ipad|ipod/i.test(navigator.userAgent)?'在 Safari 中点击“分享”，然后选择“添加到主屏幕”。':'在浏览器菜单中选择“安装应用”或“添加到主屏幕”。';hint.hidden=false;});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSheets();});if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js');renderToday();
