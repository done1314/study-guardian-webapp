const DEFAULT_MATH_DAYS = 45;
const ENGLISH_DAYS = 45;
const STORE = 'rike-study-v1';
const course = [
  ['01.基础30讲导学',1],['02.零基础',15],['03.第1讲',15],['04.第2讲',6],['05.第3讲',4],['06.第4讲',4],['07.第5讲',10],['08.第6讲',6],['09.第7讲',4],['10.第8讲',8],['11.第9讲',10],['12.第10讲',4],['13.第11讲',3],['14.第12讲',4],['15.第13讲',8],['16.第14讲',7],['17.第15讲',12],['18.第16讲',12],['18.第17讲',6],['19.第18讲',10],['20.核心计算通关',7]
].map(([title,count])=>({title,count}));
const today = dateOnly(new Date());
const initialState = {schemaVersion:3,startDate:today,mathDays:DEFAULT_MATH_DAYS,defaults:{math:90,english:30},durations:{},proofs:{},completed:{},customTasks:[],restDays:{},advanceEvents:[],focusLogs:[],focusDrafts:{},focusTimer:null};
let state = loadState();
let selectedDate = today;
let progressDate = today;
let progressPeriod = 'day';
let durationEditing = null;
let customEditingId = null;
let installPrompt = null;
let focusTask = null;
let focusInterval = null;
let selectedCustomIcon = 'language';

const icons = {
  math:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2"/></svg>',
  english:'<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z"/></svg>',
  custom:'<svg viewBox="0 0 24 24"><path d="M9 4h6l1 2h3v15H5V6h3Z"/><path d="m8 13 2.5 2.5L16 10"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-8"/></svg>'
};
const chartColors = ['#6155f5','#34c759','#ff9f0a','#0088ff','#ff375f','#5ac8fa','#af52de','#8e8e93'];
const subjectIconOptions = [
  ['language','语文'],['math','数学'],['english','英语'],['physics','物理'],['chemistry','化学'],['biology','生物'],['history','历史'],['geography','地理'],['politics','政治'],['technology','信息技术'],['music','音乐'],['art','美术']
];
const subjectIconKeys = new Set(subjectIconOptions.map(([key])=>key));
function iconMarkup(key){const safe=subjectIconKeys.has(key)?key:'language';return `<span class="subject-sprite icon-${safe}" aria-hidden="true"></span>`;}
function defaultIconForCategory(category=''){const value=category.toLowerCase();if(value.includes('数学'))return'math';if(value.includes('英语')||value.includes('英文'))return'english';if(value.includes('物理'))return'physics';if(value.includes('化学'))return'chemistry';if(value.includes('生物'))return'biology';if(value.includes('历史'))return'history';if(value.includes('地理'))return'geography';if(value.includes('政治'))return'politics';if(value.includes('信息')||value.includes('计算机')||value.includes('专业'))return'technology';if(value.includes('音乐'))return'music';if(value.includes('美术'))return'art';return'language';}

function dateOnly(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function parseDate(key){const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d);}
function addDays(key,amount){const date=parseDate(key);date.setDate(date.getDate()+amount);return dateOnly(date);}
function addMonths(key,amount){const date=parseDate(key);date.setDate(1);date.setMonth(date.getMonth()+amount);return dateOnly(date);}
function daysBetween(start,end){return Math.round((parseDate(end)-parseDate(start))/86400000);}
function formatDate(key,full=false){return new Intl.DateTimeFormat('zh-CN',full?{year:'numeric',month:'long',day:'numeric',weekday:'long'}:{month:'long',day:'numeric',weekday:'short'}).format(parseDate(key));}
function escapeText(value){const el=document.createElement('span');el.textContent=value;return el.innerHTML;}
function formatMinutes(value){const minutes=Math.round(value);if(minutes<60)return `${minutes} 分钟`;const hours=Math.floor(minutes/60),rest=minutes%60;return rest?`${hours} 小时 ${rest} 分钟`:`${hours} 小时`;}
function formatFocusSeconds(value){const seconds=Math.max(0,Math.round(value));return seconds<60?`${seconds} 秒`:formatMinutes(seconds/60);}

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORE)||'{}');
    const merged={...initialState,...saved,schemaVersion:3,mathDays:Math.max(course.length,Math.min(365,Number(saved.mathDays)||DEFAULT_MATH_DAYS)),defaults:{...initialState.defaults,...(saved.defaults||{})},durations:saved.durations||{},proofs:saved.proofs||{},completed:saved.completed||{},restDays:saved.restDays||{},advanceEvents:Array.isArray(saved.advanceEvents)?saved.advanceEvents:[],focusLogs:Array.isArray(saved.focusLogs)?saved.focusLogs:[],focusDrafts:saved.focusDrafts||{},focusTimer:saved.focusTimer||null,customTasks:Array.isArray(saved.customTasks)?saved.customTasks.map(task=>({...task,category:task.category||'其他',icon:['language','math','english','physics','chemistry','biology','history','geography','politics','technology','music','art'].includes(task.icon)?task.icon:defaultIconForCategory(task.category),totalDays:Math.max(1,Math.min(365,Number(task.totalDays)||(task.repeat?DEFAULT_MATH_DAYS:1)))})):[]};
    if(!saved.schemaVersion||saved.schemaVersion<2)migrateLegacy(merged,saved);
    if(!saved.schemaVersion||saved.schemaVersion<3)migrateFocusLogs(merged);
    if(merged.focusTimer?.running){merged.focusTimer.elapsedSeconds=Math.min(merged.focusTimer.durationSeconds,(merged.focusTimer.elapsedSeconds||0)+Math.floor((Date.now()-merged.focusTimer.startedAt)/1000));merged.focusTimer.running=false;}
    return merged;
  }catch{return JSON.parse(JSON.stringify(initialState));}
}
function migrateLegacy(next,saved){
  const migratedCompleted={},migratedProofs={},migratedDurations={};
  Object.entries(saved.completed||{}).forEach(([key,value])=>{
    const match=key.match(/^(\d{4}-\d{2}-\d{2}):(math|english|custom-.+)$/);if(!match||!value)return;
    const [,date,seriesId]=match;let start=saved.startDate||today,category=seriesId==='math'?'数学':seriesId==='english'?'英语':'其他',title=category;
    if(seriesId.startsWith('custom-')){const custom=next.customTasks.find(task=>`custom-${task.id}`===seriesId);if(custom){start=custom.startDate;category=custom.category;title=custom.title;}}
    const index=Math.max(0,daysBetween(start,date)),itemId=`${seriesId}:${index}`,minutes=(saved.durations||{})[key]??(seriesId==='math'?next.defaults.math:seriesId==='english'?next.defaults.english:30);
    migratedCompleted[itemId]={completedDate:date,plannedDate:date,minutes,category,title};
    if((saved.proofs||{})[key])migratedProofs[itemId]=saved.proofs[key];
    if((saved.durations||{})[key])migratedDurations[itemId]=saved.durations[key];
  });
  next.completed=migratedCompleted;next.proofs=migratedProofs;next.durations=migratedDurations;
}
function migrateFocusLogs(next){next.focusLogs=Object.entries(next.completed).filter(([,entry])=>entry?.completedDate).map(([itemId,entry],index)=>({id:`migrated-${index}`,itemId,date:entry.completedDate,seconds:Math.max(60,Number(entry.minutes||0)*60),category:entry.category||'其他',title:entry.title||'学习任务'}));}
function saveState(){localStorage.setItem(STORE,JSON.stringify(state));}

function allocateCourseDays(planDays=state.mathDays){
  const total=course.reduce((sum,folder)=>sum+folder.count,0);
  const result=course.map((folder,index)=>{const ideal=folder.count/total*planDays,days=Math.max(1,Math.floor(ideal));return {...folder,index,days,remainder:ideal-days};});
  let assigned=result.reduce((sum,folder)=>sum+folder.days,0),cursor=0;
  const order=[...result].sort((a,b)=>b.remainder-a.remainder||b.count-a.count);
  while(assigned<planDays){order[cursor%order.length].days++;assigned++;cursor++;}
  return result.sort((a,b)=>a.index-b.index);
}
function mathPlan(){const allocations=allocateCourseDays();return {allocations,schedule:allocations.flatMap(folder=>Array.from({length:folder.days},(_,part)=>({...folder,part:part+1})))};}
function seriesDefinitions(){
  const schedule=mathPlan().schedule;
  return [
    {id:'math',kind:'math',icon:'math',category:'数学',startDate:state.startDate,totalDays:state.mathDays,defaultDuration:state.defaults.math,itemAt:index=>({title:schedule[index].title,detail:`文件夹学习第 ${schedule[index].part} / ${schedule[index].days} 天 · 共 ${schedule[index].count} 项 · 完成后拍照`})},
    {id:'english',kind:'english',icon:'english',category:'英语',startDate:state.startDate,totalDays:ENGLISH_DAYS,defaultDuration:state.defaults.english,itemAt:index=>({title:`完成第 ${index+1} 篇阅读`,detail:'精读一篇文章，标出生词与长难句后拍照'})},
    ...state.customTasks.map(task=>({id:`custom-${task.id}`,kind:'custom',icon:task.icon,category:task.category,startDate:task.startDate,totalDays:task.totalDays,defaultDuration:task.duration,itemAt:index=>({title:task.title,detail:`${task.category} · 第 ${index+1} / ${task.totalDays} 天 · 完成后拍照`})}))
  ];
}
function restCount(start,date){return Object.keys(state.restDays).filter(key=>state.restDays[key]&&key>=start&&key<=date).length;}
function advanceCount(seriesId,date){return state.advanceEvents.filter(event=>event.seriesId===seriesId&&event.targetDate<=date).length;}
function scheduledIndex(series,date){return daysBetween(series.startDate,date)-restCount(series.startDate,date)+advanceCount(series.id,date);}
function taskForSeries(series,date){
  if(date<series.startDate||state.restDays[date])return null;
  const index=scheduledIndex(series,date);if(index<0||index>=series.totalDays)return null;
  const item=series.itemAt(index);return {...series,...item,index,itemId:`${series.id}:${index}`,label:`${series.category} · ${index+1} / ${series.totalDays} 天`};
}
function taskData(date=selectedDate){return seriesDefinitions().map(series=>taskForSeries(series,date)).filter(Boolean);}
function durationFor(task){return state.durations[task.itemId]??task.defaultDuration??30;}
function completionFor(task){return state.completed[task.itemId];}
function completedEntries(){return Object.entries(state.completed).filter(([,entry])=>entry&&typeof entry==='object'&&entry.completedDate);}

function renderDateStrip(){
  const wrap=document.querySelector('#dateStrip');wrap.innerHTML='';
  for(let i=-3;i<=3;i++){
    const key=addDays(selectedDate,i),date=parseDate(key),button=document.createElement('button');button.className='date-button'+(key===selectedDate?' selected':'');button.setAttribute('aria-label',formatDate(key,true));if(key===selectedDate)button.setAttribute('aria-current','date');
    button.innerHTML=`<span>${['日','一','二','三','四','五','六'][date.getDay()]}</span><strong>${date.getDate()}</strong>`;button.addEventListener('click',()=>{selectedDate=key;renderToday();});wrap.append(button);
  }
}
function renderToday(){
  document.querySelector('#fullDate').textContent=formatDate(selectedDate,true)+(selectedDate===today?' · 今天':'');document.querySelector('#todayTitle').textContent=state.restDays[selectedDate]?'今天，好好休息。':selectedDate===today?'今天，稳稳向前。':'这一天，也算数。';renderDateStrip();
  document.querySelector('#backToToday').hidden=selectedDate===today;
  const rest=document.querySelector('#restToday'),hasCompletedToday=completedEntries().some(([,entry])=>entry.plannedDate===today);
  rest.hidden=selectedDate!==today||(!state.restDays[today]&&hasCompletedToday);rest.classList.toggle('resting',Boolean(state.restDays[today]));rest.querySelector('strong').textContent=state.restDays[today]?'取消今天休息':'今天休息';rest.querySelector('small').textContent=state.restDays[today]?'恢复今天原有任务':'未完成任务将顺延一天';
  const tasks=taskData(),list=document.querySelector('#taskList');list.innerHTML='';if(tasks.length)tasks.forEach(renderTask);else list.innerHTML=`<div class="custom-empty">${state.restDays[selectedDate]?'今天已设为休息日，任务已顺延。':'这一天还没有任务。可在“计划”中添加任务或调整开始日期。'}</div>`;
  const total=tasks.reduce((sum,task)=>sum+durationFor(task),0),complete=tasks.filter(completionFor).length,percent=tasks.length?Math.round(complete/tasks.length*100):0;
  document.querySelector('#totalDuration').textContent=tasks.length?`共 ${total} 分钟`:'轻松一天';document.querySelector('#progressValue').textContent=`${percent}%`;document.querySelector('#progressRing').style.setProperty('--p',`${percent*3.6}deg`);
  document.querySelector('#progressMessage').textContent=state.restDays[selectedDate]?'休息也是计划的一部分。':!tasks.length?'今天没有安排，留一点空间给自己。':complete===tasks.length?'今日任务已完成。去好好休息吧。':complete?`已完成 ${complete} / ${tasks.length} 项，继续保持。`:`完成今天的 ${tasks.length} 项任务，就算赢下今天。`;
}
function renderTask(task){
  const node=document.querySelector('#taskTemplate').content.firstElementChild.cloneNode(true),proof=state.proofs[task.itemId],done=completionFor(task);node.classList.add(task.kind);if(done)node.classList.add('completed');node.querySelector('.subject-icon').innerHTML=iconMarkup(task.icon);node.querySelector('.subject-label').textContent=task.label;node.querySelector('h3').textContent=task.title;node.querySelector('.task-detail').textContent=task.detail;
  const duration=node.querySelector('.duration-pill');duration.textContent=`专注 ${durationFor(task)} 分钟`;duration.addEventListener('click',()=>openDuration(task));
  const focus=node.querySelector('.focus-button'),focused=focusSecondsForItem(task.itemId),isRunning=state.focusTimer?.itemId===task.itemId&&state.focusTimer.running;focus.classList.toggle('running',isRunning);focus.querySelector('strong').textContent=isRunning?'番茄钟进行中':'开始番茄专注';focus.querySelector('small').textContent=focused?`已专注 ${formatFocusSeconds(focused)}`:`本轮 ${durationFor(task)} 分钟`;focus.addEventListener('click',()=>openFocusTimer(task));
  const input=node.querySelector('.photo-input'),upload=node.querySelector('.upload-button'),replace=node.querySelector('.replace-proof'),preview=node.querySelector('.proof-preview'),complete=node.querySelector('.complete-button');
  if(proof){showProof(preview,upload,proof);complete.disabled=false;}complete.textContent=done?'已完成':selectedDate>today?'提前完成并记录专注':'完成打卡并记录专注';
  upload.addEventListener('click',()=>input.click());replace.addEventListener('click',()=>input.click());input.addEventListener('change',()=>handlePhoto(input.files[0],task));complete.addEventListener('click',()=>toggleComplete(task));document.querySelector('#taskList').append(node);
}
function focusSecondsForItem(itemId){return state.focusLogs.filter(log=>log.itemId===itemId).reduce((sum,log)=>sum+Number(log.seconds||0),0);}
function toggleComplete(task){
  const existing=completionFor(task);
  if(existing){delete state.completed[task.itemId];state.advanceEvents=state.advanceEvents.filter(event=>event.itemId!==task.itemId);}
  else{
    if(!state.proofs[task.itemId])return;
    state.completed[task.itemId]={completedDate:today,plannedDate:selectedDate,minutes:durationFor(task),category:task.category,title:task.title,seriesId:task.id,index:task.index};
    if(selectedDate>today&&!state.advanceEvents.some(event=>event.itemId===task.itemId))state.advanceEvents.push({seriesId:task.id,itemId:task.itemId,targetDate:selectedDate});
  }
  saveState();renderToday();
}
function showProof(preview,upload,proof){upload.hidden=true;preview.hidden=false;preview.querySelector('img').src=proof.data;preview.querySelector('.proof-name').textContent=proof.name;}
function handlePhoto(file,task){if(!file)return;const image=new Image(),reader=new FileReader();reader.onload=()=>{image.onload=()=>{const scale=Math.min(1,960/image.width),canvas=document.createElement('canvas');canvas.width=image.width*scale;canvas.height=image.height*scale;canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);state.proofs[task.itemId]={name:file.name,data:canvas.toDataURL('image/jpeg',.72)};saveState();renderToday();};image.src=reader.result;};reader.readAsDataURL(file);}

function openSheet(id){document.querySelector('#sheetBackdrop').hidden=false;document.querySelector(id).hidden=false;}
function closeSheets(){pauseFocusTimer();document.querySelector('#sheetBackdrop').hidden=true;document.querySelectorAll('.sheet').forEach(sheet=>sheet.hidden=true);durationEditing=null;customEditingId=null;}
function openDuration(task){durationEditing=task;document.querySelector('#durationSubject').textContent=`${task.category} · ${task.title}`;document.querySelector('#durationInput').value=durationFor(task);openSheet('#durationSheet');setTimeout(()=>document.querySelector('#durationInput').focus(),80);}

function currentFocusElapsed(){const timer=state.focusTimer;if(!timer)return 0;return Math.min(timer.durationSeconds,(timer.elapsedSeconds||0)+(timer.running?Math.floor((Date.now()-timer.startedAt)/1000):0));}
function pauseFocusTimer(){
  if(!state.focusTimer)return;state.focusTimer.elapsedSeconds=currentFocusElapsed();state.focusTimer.running=false;state.focusDrafts[state.focusTimer.itemId]=state.focusTimer.elapsedSeconds;clearInterval(focusInterval);focusInterval=null;saveState();
}
function openFocusTimer(task){
  if(state.focusTimer?.itemId!==task.itemId){pauseFocusTimer();state.focusTimer={itemId:task.itemId,durationSeconds:durationFor(task)*60,elapsedSeconds:state.focusDrafts[task.itemId]||0,running:false,startedAt:null};}
  focusTask=task;document.querySelector('#focusSubject').textContent=`${task.category} · ${task.title}`;openSheet('#focusSheet');startFocusTicker();renderFocusTimer();
}
function startFocusTicker(){clearInterval(focusInterval);focusInterval=setInterval(()=>{renderFocusTimer();if(state.focusTimer?.running&&currentFocusElapsed()>=state.focusTimer.durationSeconds)finishAndRecordFocus(true);},1000);}
function renderFocusTimer(){
  const timer=state.focusTimer;if(!timer)return;const elapsed=currentFocusElapsed(),remaining=Math.max(0,timer.durationSeconds-elapsed),minutes=Math.floor(remaining/60),seconds=remaining%60;document.querySelector('#timerValue').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;document.querySelector('#timerStatus').textContent=timer.running?'正在专注':elapsed?'已暂停':'准备专注';document.querySelector('#timerRing').style.setProperty('--timer-progress',`${elapsed/Math.max(timer.durationSeconds,1)*360}deg`);document.querySelector('#toggleFocus').textContent=timer.running?'暂停':'开始专注';document.querySelector('#finishFocus').disabled=elapsed<1;
}
function toggleFocusTimer(){
  const timer=state.focusTimer;if(!timer)return;if(timer.running)pauseFocusTimer();else{timer.startedAt=Date.now();timer.running=true;saveState();startFocusTicker();}renderFocusTimer();renderToday();
}
function resetFocusTimer(){if(!state.focusTimer)return;state.focusTimer.elapsedSeconds=0;state.focusTimer.running=false;state.focusTimer.startedAt=null;state.focusDrafts[state.focusTimer.itemId]=0;clearInterval(focusInterval);focusInterval=null;saveState();renderFocusTimer();renderToday();}
function finishAndRecordFocus(auto=false){
  if(!state.focusTimer||!focusTask)return;const seconds=currentFocusElapsed();if(seconds<1)return;const timer=state.focusTimer;state.focusLogs.push({id:`focus-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,itemId:focusTask.itemId,date:today,seconds,category:focusTask.category,title:focusTask.title});delete state.focusDrafts[timer.itemId];state.focusTimer=null;clearInterval(focusInterval);focusInterval=null;saveState();closeSheets();renderToday();if(document.querySelector('#progressView').classList.contains('active'))renderProgress();
}

function scheduleDateForIndex(series,index){
  const completed=state.completed[`${series.id}:${index}`];if(completed?.plannedDate)return completed.plannedDate;
  for(let step=0;step<800;step++){const date=addDays(series.startDate,step);if(state.restDays[date])continue;if(scheduledIndex(series,date)===index)return date;}return null;
}
function renderPlan(){
  const math=seriesDefinitions().find(series=>series.id==='math'),endDate=scheduleDateForIndex(math,state.mathDays-1)||addDays(state.startDate,state.mathDays-1),{allocations}=mathPlan();document.querySelector('#planSummary').innerHTML=`<div class="summary-card"><strong>数学 ${state.mathDays} 天</strong><span>${formatDate(state.startDate)}开始</span></div><div class="summary-card"><strong>${formatDate(endDate)}</strong><span>当前预计完成日期</span></div>`;document.querySelector('#courseCount').textContent=`${course.length} 个文件夹`;
  const catalog=document.querySelector('#courseCatalog');catalog.innerHTML='';let cursor=0;
  allocations.forEach((folder,index)=>{const start=cursor,end=cursor+folder.days-1,startDate=scheduleDateForIndex(math,start),finishDate=scheduleDateForIndex(math,end),row=document.createElement('div');row.className='catalog-folder';const dates=startDate&&finishDate?(folder.days===1?formatDate(startDate):`${formatDate(startDate)} — ${formatDate(finishDate)}`):'随进度自动调整';row.innerHTML=`<span class="folder-number">${String(index+1).padStart(2,'0')}</span><div><strong>${folder.title}</strong><span>${dates}</span></div><span class="folder-count">${folder.days} 天</span>`;catalog.append(row);cursor+=folder.days;});renderCustomTaskList();
}
function renderCustomTaskList(){
  const list=document.querySelector('#customTaskList');list.innerHTML='';if(!state.customTasks.length){list.innerHTML='<div class="custom-empty">还没有自定义任务。添加后可设置分类、总天数、专注时长和拍照打卡。</div>';return;}
  state.customTasks.forEach(task=>{const row=document.createElement('div');row.className='custom-row';row.innerHTML=`<span class="custom-row-icon">${iconMarkup(task.icon)}</span><div><strong>${escapeText(task.title)}</strong><span>${escapeText(task.category)} · ${formatDate(task.startDate)}开始 · ${task.totalDays} 天 · 每天 ${task.duration} 分钟</span></div><button class="edit-task" aria-label="编辑 ${escapeText(task.title)}">›</button>`;row.querySelector('.edit-task').addEventListener('click',()=>openTaskSheet(task.id));list.append(row);});
}
function renderIconPicker(selected){selectedCustomIcon=subjectIconKeys.has(selected)?selected:'language';const picker=document.querySelector('#iconPicker');picker.innerHTML='';subjectIconOptions.forEach(([key,label])=>{const button=document.createElement('button');button.type='button';button.className='icon-choice'+(key===selectedCustomIcon?' selected':'');button.setAttribute('role','radio');button.setAttribute('aria-checked',key===selectedCustomIcon?'true':'false');button.setAttribute('aria-label',label);button.title=label;button.innerHTML=iconMarkup(key);button.addEventListener('click',()=>renderIconPicker(key));picker.append(button);});}
function openTaskSheet(id=null){
  customEditingId=id;const task=state.customTasks.find(item=>item.id===id);document.querySelector('#taskSheetTitle').textContent=task?'编辑任务':'添加任务';document.querySelector('#customTitle').value=task?.title||'';document.querySelector('#customCategory').value=task?.category||'';renderIconPicker(task?.icon||defaultIconForCategory(task?.category));document.querySelector('#customStartDate').value=task?.startDate||selectedDate;document.querySelector('#customTotalDays').value=task?.totalDays||1;document.querySelector('#customDuration').value=task?.duration||30;document.querySelector('#deleteTask').hidden=!task;document.querySelector('#taskError').hidden=true;openSheet('#taskSheet');setTimeout(()=>document.querySelector('#customTitle').focus(),80);
}

function periodRange(){
  if(progressPeriod==='day')return {start:progressDate,end:progressDate,label:formatDate(progressDate)};
  if(progressPeriod==='week'){const offset=(parseDate(progressDate).getDay()+6)%7,start=addDays(progressDate,-offset),end=addDays(start,6);return {start,end,label:`${formatDate(start)} — ${formatDate(end)}`};}
  const date=parseDate(progressDate),start=dateOnly(new Date(date.getFullYear(),date.getMonth(),1)),end=dateOnly(new Date(date.getFullYear(),date.getMonth()+1,0));return {start,end,label:`${date.getFullYear()}年${date.getMonth()+1}月`};
}
function renderProgress(){
  const range=periodRange(),logs=state.focusLogs.filter(log=>log.date>=range.start&&log.date<=range.end),completed=completedEntries().filter(([,entry])=>entry.completedDate>=range.start&&entry.completedDate<=range.end),byCategory={};logs.forEach(log=>{byCategory[log.category]=(byCategory[log.category]||0)+Number(log.seconds||0);});
  const groups=Object.entries(byCategory).sort((a,b)=>b[1]-a[1]),total=groups.reduce((sum,[,seconds])=>sum+seconds,0),days=new Set(logs.map(log=>log.date));document.querySelector('#progressDate').value=progressDate;document.querySelector('#focusRange').textContent=range.label;document.querySelector('#focusTotal').textContent=total<60?total:Math.round(total/60);document.querySelector('#focusPie span').textContent=total<60?'秒':'分钟';
  let angle=0;const stops=groups.map(([category,seconds],index)=>{const start=angle;angle+=seconds/Math.max(total,1)*100;return `${chartColors[index%chartColors.length]} ${start}% ${angle}%`;});document.querySelector('#focusPie').style.background=groups.length?`conic-gradient(${stops.join(',')})`:'conic-gradient(rgba(118,118,128,.12) 0 100%)';document.querySelector('#focusPie').setAttribute('aria-label',groups.length?groups.map(([category,seconds])=>`${category}${formatFocusSeconds(seconds)}`).join('，'):'暂无专注数据');
  const legend=document.querySelector('#focusLegend');legend.innerHTML='';groups.forEach(([category,seconds],index)=>{const percent=Math.round(seconds/total*100),button=document.createElement('button');button.className='legend-item';button.title=`${category}：${formatFocusSeconds(seconds)}，占 ${percent}%`;button.innerHTML=`<span class="legend-dot" style="background:${chartColors[index%chartColors.length]}"></span><strong>${escapeText(category)}</strong><span>${percent}%</span>`;const show=()=>document.querySelector('#pieDetail').textContent=`${category}：${formatFocusSeconds(seconds)} · ${percent}%`;button.addEventListener('mouseenter',show);button.addEventListener('focus',show);button.addEventListener('click',show);legend.append(button);});if(!groups.length)legend.innerHTML='<div class="custom-empty">暂无数据</div>';document.querySelector('#pieDetail').textContent=groups.length?'悬浮或点击分类，查看具体专注时间。':'完成一次番茄专注后，这里会按分类统计实际时长。';
  document.querySelector('#statsGrid').innerHTML=`<div class="stat-card"><strong>${formatFocusSeconds(total)}</strong><span>总专注时长</span></div><div class="stat-card"><strong>${completed.length}</strong><span>完成任务</span></div><div class="stat-card"><strong>${days.size}</strong><span>专注天数</span></div>`;
  const history=document.querySelector('#historyList');history.innerHTML='';const all=[...state.focusLogs].reverse();if(!all.length){history.innerHTML='<div class="empty-history">完成第一次番茄专注后，记录会出现在这里。</div>';return;}all.slice(0,20).forEach(log=>{const row=document.createElement('div');row.className='history-row';row.innerHTML=`<span class="history-dot">${icons.check}</span><div><strong>${escapeText(log.title)}</strong><span>${formatDate(log.date)} · ${escapeText(log.category)} · ${formatFocusSeconds(log.seconds)}</span></div>`;history.append(row);});
}

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(item=>{item.classList.toggle('active',item===tab);item.removeAttribute('aria-current');});tab.setAttribute('aria-current','page');document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id===tab.dataset.view));if(tab.dataset.view==='planView')renderPlan();if(tab.dataset.view==='progressView')renderProgress();window.scrollTo({top:0,behavior:'smooth'});}));
document.querySelector('#todayShortcut').addEventListener('click',()=>{selectedDate=today;document.querySelector('[data-view="todayView"]').click();renderToday();});
document.querySelector('#backToToday').addEventListener('click',()=>{selectedDate=today;renderToday();});
document.querySelector('#restToday').addEventListener('click',()=>{if(state.restDays[today])delete state.restDays[today];else state.restDays[today]=true;saveState();renderToday();});
document.querySelector('#openSettings').addEventListener('click',()=>{document.querySelector('#planStartDate').value=state.startDate;document.querySelector('#mathPlanDays').value=state.mathDays;document.querySelector('#mathDefault').value=state.defaults.math;document.querySelector('#englishDefault').value=state.defaults.english;document.querySelector('#installHint').hidden=true;openSheet('#settingsSheet');});
document.querySelector('#openAddTask').addEventListener('click',()=>openTaskSheet());document.querySelectorAll('[data-close-sheet]').forEach(button=>button.addEventListener('click',closeSheets));document.querySelector('#sheetBackdrop').addEventListener('click',closeSheets);
document.querySelector('#presetRow').addEventListener('click',event=>{if(event.target.tagName==='BUTTON')document.querySelector('#durationInput').value=event.target.textContent;});
document.querySelector('#saveDuration').addEventListener('click',()=>{state.durations[durationEditing.itemId]=Math.max(5,Math.min(480,Number(document.querySelector('#durationInput').value)||30));if(state.focusTimer?.itemId===durationEditing.itemId&&!state.focusTimer.running)state.focusTimer.durationSeconds=state.durations[durationEditing.itemId]*60;saveState();closeSheets();renderToday();});
document.querySelector('#saveSettings').addEventListener('click',()=>{state.startDate=document.querySelector('#planStartDate').value||today;state.mathDays=Math.max(course.length,Math.min(365,Number(document.querySelector('#mathPlanDays').value)||DEFAULT_MATH_DAYS));state.defaults.math=Math.max(5,Math.min(480,Number(document.querySelector('#mathDefault').value)||90));state.defaults.english=Math.max(5,Math.min(480,Number(document.querySelector('#englishDefault').value)||30));saveState();closeSheets();renderToday();renderPlan();});
document.querySelector('#saveTask').addEventListener('click',()=>{const title=document.querySelector('#customTitle').value.trim(),category=document.querySelector('#customCategory').value.trim()||'其他';if(!title){document.querySelector('#taskError').hidden=false;return;}const task={id:customEditingId||`${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,title,category,icon:selectedCustomIcon,startDate:document.querySelector('#customStartDate').value||selectedDate,totalDays:Math.max(1,Math.min(365,Number(document.querySelector('#customTotalDays').value)||1)),duration:Math.max(5,Math.min(480,Number(document.querySelector('#customDuration').value)||30))},index=state.customTasks.findIndex(item=>item.id===customEditingId);if(index>=0)state.customTasks[index]=task;else state.customTasks.push(task);saveState();closeSheets();renderPlan();renderToday();});
document.querySelector('#deleteTask').addEventListener('click',()=>{const task=state.customTasks.find(item=>item.id===customEditingId);if(!task||!window.confirm(`删除“${task.title}”？`))return;const marker=`custom-${task.id}`;state.customTasks=state.customTasks.filter(item=>item.id!==task.id);state.advanceEvents=state.advanceEvents.filter(event=>event.seriesId!==marker);['durations','proofs','completed'].forEach(group=>Object.keys(state[group]).filter(key=>key.startsWith(`${marker}:`)).forEach(key=>delete state[group][key]));saveState();closeSheets();renderPlan();renderToday();});
document.querySelector('#periodTabs').addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;progressPeriod=button.dataset.period;document.querySelectorAll('#periodTabs button').forEach(item=>item.classList.toggle('active',item===button));renderProgress();});
document.querySelector('#progressDate').addEventListener('change',event=>{progressDate=event.target.value||today;renderProgress();});
document.querySelector('#progressPrev').addEventListener('click',()=>{progressDate=progressPeriod==='month'?addMonths(progressDate,-1):addDays(progressDate,progressPeriod==='week'?-7:-1);renderProgress();});
document.querySelector('#progressNext').addEventListener('click',()=>{progressDate=progressPeriod==='month'?addMonths(progressDate,1):addDays(progressDate,progressPeriod==='week'?7:1);renderProgress();});
document.querySelector('#closeFocus').addEventListener('click',closeSheets);document.querySelector('#toggleFocus').addEventListener('click',toggleFocusTimer);document.querySelector('#resetFocus').addEventListener('click',resetFocusTimer);document.querySelector('#finishFocus').addEventListener('click',()=>finishAndRecordFocus(false));
document.querySelector('#installApp').addEventListener('click',async()=>{const hint=document.querySelector('#installHint');if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;closeSheets();return;}hint.textContent=/iphone|ipad|ipod/i.test(navigator.userAgent)?'在 Safari 中点击“分享”，然后选择“添加到主屏幕”。':'在浏览器菜单中选择“安装应用”或“添加到主屏幕”。';hint.hidden=false;});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSheets();});if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js');renderToday();
