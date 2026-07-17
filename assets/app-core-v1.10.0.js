((root,factory)=>{
  const api=factory();
  root.EventCueCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';

  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));

  const parseDateKey=value=>{
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
    if(!match)return null;
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    const date=new Date(year,month-1,day);
    return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day
      ? {key:`${match[1]}-${match[2]}-${match[3]}`,year,month,day}:null;
  };

  const getLocalDateKey=(value=new Date())=>{
    if(typeof value==='string')return parseDateKey(value)?.key||null;
    const year=value.getFullYear(),month=String(value.getMonth()+1).padStart(2,'0'),day=String(value.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  };

  const calculateDday=(eventDate,referenceDate=new Date())=>{
    const event=parseDateKey(eventDate),reference=parseDateKey(getLocalDateKey(referenceDate));
    if(!event||!reference)return {days:null,label:'날짜 미정',classification:'undated'};
    const days=Math.round((Date.UTC(event.year,event.month-1,event.day)-Date.UTC(reference.year,reference.month-1,reference.day))/86400000);
    return {days,label:days===0?'D-DAY':days>0?`D-${days}`:`D+${Math.abs(days)}`,classification:days<0?'past':days===0?'today':'upcoming'};
  };

  const classifyEventDate=(event,referenceDate=new Date())=>calculateDday(event?.date,referenceDate).classification;

  const compareEventsByDday=(a,b,referenceDate=new Date())=>{
    const da=calculateDday(a.date,referenceDate),db=calculateDday(b.date,referenceDate);
    const rank=value=>value.classification==='today'||value.classification==='upcoming'?0:value.classification==='undated'?1:2;
    const rankDiff=rank(da)-rank(db);if(rankDiff)return rankDiff;
    if(rank(da)===0){const dayDiff=(da.days??0)-(db.days??0);if(dayDiff)return dayDiff;}
    if(rank(da)===2){const dayDiff=(db.days??0)-(da.days??0);if(dayDiff)return dayDiff;}
    if(rank(da)===1)return Number(b.updatedAt||0)-Number(a.updatedAt||0);
    const timeDiff=String(a.time||'99:99').localeCompare(String(b.time||'99:99'));if(timeDiff)return timeDiff;
    return Number(b.updatedAt||0)-Number(a.updatedAt||0);
  };

  const sortEvents=(events,order='dday',referenceDate=new Date())=>[...events].sort((a,b)=>{
    if(order==='updated')return Number(b.updatedAt||0)-Number(a.updatedAt||0);
    if(order==='dateAsc')return String(parseDateKey(a.date)?.key||'9999-99-99').localeCompare(String(parseDateKey(b.date)?.key||'9999-99-99'))||String(a.time||'99:99').localeCompare(String(b.time||'99:99'));
    if(order==='dateDesc')return String(parseDateKey(b.date)?.key||'').localeCompare(String(parseDateKey(a.date)?.key||''))||String(a.time||'99:99').localeCompare(String(b.time||'99:99'));
    if(order==='title')return String(a.title||'').localeCompare(String(b.title||''),'ko');
    return compareEventsByDday(a,b,referenceDate);
  });

  const filterEvents=(events,{query='',dateFilter='all',statusFilter='all',referenceDate=new Date()}={})=>{
    const needle=String(query).trim().toLowerCase();
    return events.filter(event=>{
      const classification=classifyEventDate(event,referenceDate);
      const queryMatch=!needle||[event.title,event.type,event.templateKey,event.date].join(' ').toLowerCase().includes(needle);
      const dateMatch=dateFilter==='all'||dateFilter===classification||(dateFilter==='upcoming'&&(classification==='today'||classification==='upcoming'));
      return queryMatch&&dateMatch&&(statusFilter==='all'||event.status===statusFilter);
    });
  };

  const normalizeData=(data,version,now=Date.now())=>{
    if(!data||!Array.isArray(data.events))throw new Error('invalid data');
    let changed=false;
    if(!Array.isArray(data.trash)){data.trash=[];changed=true;}
    data.events=data.events.map(event=>{
      const next={...event};
      if(!Array.isArray(next.steps)){next.steps=[];changed=true;}
      if(!next.status){next.status='작성 중';changed=true;}
      return next;
    });
    data.trash=data.trash.map(event=>{
      const next={status:'작성 중',...event};
      if(!Array.isArray(next.steps)){next.steps=[];changed=true;}
      if(!next.deletedAt){next.deletedAt=now;changed=true;}
      return next;
    });
    if(data.version!==version){data.version=version;changed=true;}
    return changed;
  };

  const renderEventCard=({event,enabled,total,minutes,dateLabel,lastModified,dday,highlight=false})=>`
    <article class="event-card ${dday.classification==='past'?'past-event':''} ${highlight?'nearest-event':''}" data-event-card="${escapeHtml(event.id)}">
      ${highlight?`<div class="nearest-label">${dday.classification==='today'?'오늘 행사':'곧 진행할 행사'}</div>`:''}
      <div class="card-top"><span class="tag">${escapeHtml(event.type||'행사')}</span><span class="dday-badge ${escapeHtml(dday.classification)}">${escapeHtml(dday.label)}</span></div>
      <div class="card-title-row"><h3>${escapeHtml(event.title)}</h3><span class="status-tag">${escapeHtml(event.status||'작성 중')}</span></div>
      <div class="meta">${escapeHtml(dateLabel)}</div>
      <div class="stats">${escapeHtml(event.type||'행사')} · 순서 ${enabled}개${enabled!==total?` · 숨김 ${total-enabled}개`:''}${minutes?` · 약 ${minutes}분`:''}<br>마지막 수정 ${escapeHtml(lastModified)}</div>
      <div class="card-actions">
        <button type="button" class="btn small soft" data-event-action="edit" data-event-id="${escapeHtml(event.id)}">열기</button>
        <button type="button" class="btn small primary" data-event-action="run" data-event-id="${escapeHtml(event.id)}">진행</button>
        <button type="button" class="btn small" data-event-action="duplicate" data-event-id="${escapeHtml(event.id)}">복제</button>
        <button type="button" class="btn small danger" data-event-action="delete" data-event-id="${escapeHtml(event.id)}" aria-label="${escapeHtml(event.title)} 삭제">🗑 삭제</button>
      </div>
      <div class="card-manage">
        <label><span>상태</span><select data-event-status="${escapeHtml(event.id)}" aria-label="${escapeHtml(event.title)} 상태 변경">${['작성 중','준비 완료','진행 완료','보관'].map(status=>`<option ${event.status===status?'selected':''}>${status}</option>`).join('')}</select></label>
        <button type="button" class="text-action" data-event-action="export" data-event-id="${escapeHtml(event.id)}">JSON 내보내기</button>
      </div>
    </article>`;

  const bindEventCardActions=(rootElement,handlers)=>{
    const listener=event=>{
      const button=event.target.closest?.('[data-event-action]');
      if(!button||!rootElement.contains(button))return;
      event.preventDefault();
      const handler=handlers[button.dataset.eventAction];
      if(handler)handler(button.dataset.eventId,button);
    };
    const changeListener=event=>{
      const select=event.target.closest?.('[data-event-status]');
      if(!select||!rootElement.contains(select))return;
      handlers.status?.(select.dataset.eventStatus,select.value,select);
    };
    rootElement.addEventListener('click',listener);
    rootElement.addEventListener('change',changeListener);
    return ()=>{rootElement.removeEventListener('click',listener);rootElement.removeEventListener('change',changeListener);};
  };

  const renderDeleteConfirmation=event=>`<div class="modal-head"><h2>행사를 삭제하시겠습니까?</h2><button type="button" class="modal-close" id="modalClose" aria-label="닫기">×</button></div><p>“${escapeHtml(event.title)}”을 삭제하려고 합니다.<br>삭제한 행사는 휴지통으로 이동합니다.</p><div class="modal-actions"><button type="button" class="btn" id="cancelTrash" autofocus>취소</button><button type="button" class="btn danger" id="doTrash">삭제</button></div>`;

  const moveEventToTrash=(data,id,now=Date.now())=>{
    const index=data.events.findIndex(event=>event.id===id);
    if(index<0)return null;
    const [event]=data.events.splice(index,1);
    const deleted={...event,deletedAt:now};
    data.trash.unshift(deleted);
    return deleted;
  };

  const restoreEventFromTrash=(data,id,now=Date.now())=>{
    const index=data.trash.findIndex(event=>event.id===id);
    if(index<0)return null;
    const [event]=data.trash.splice(index,1);
    const restored={...event,updatedAt:now};
    delete restored.deletedAt;
    data.events.unshift(restored);
    return restored;
  };

  const createEventFromTemplate=(template,{id,stepId,now=Date.now(),date=''})=>({
    id:id(),templateKey:template?.key||'blank',templateRevision:template?.revision||1,
    type:template?.type||'일반 행사',status:'작성 중',title:template?.title||'새 행사',
    date,time:'',location:'',host:'',notes:'',
    steps:JSON.parse(JSON.stringify(template?.steps||[])).map(step=>({...step,id:stepId(),enabled:step.enabled!==false,completed:false})),
    createdAt:now,updatedAt:now
  });

  const createVibrationController=({navigatorObject,storage,isEnabled,notify})=>({
    supported:()=>typeof navigatorObject?.vibrate==='function',
    setEnabled:value=>storage.setItem('cueVibration',value?'on':'off'),
    send(pattern){
      if(!isEnabled()||typeof navigatorObject?.vibrate!=='function')return false;
      try{return navigatorObject.vibrate(pattern)!==false;}catch(_){return false;}
    },
    test(){
      if(typeof navigatorObject?.vibrate!=='function'){
        notify('이 기기 또는 브라우저에서는 웹 진동을 지원하지 않습니다.');
        return 'unsupported';
      }
      if(!isEnabled()){
        notify('진동 설정이 꺼져 있습니다. 먼저 진동을 켜 주세요.');
        return 'disabled';
      }
      try{
        const sent=navigatorObject.vibrate([200,100,200]);
        notify(sent===false?'진동을 실행하지 못했습니다. 무음 모드, 방해금지 모드와 진동 설정을 확인해 주세요.':'진동 신호를 보냈습니다. 휴대전화의 진동 설정을 확인해 주세요.');
        return sent===false?'failed':'sent';
      }catch(_){
        notify('진동을 실행하지 못했습니다. 무음 모드, 방해금지 모드와 진동 설정을 확인해 주세요.');
        return 'failed';
      }
    }
  });

  return {escapeHtml,parseDateKey,getLocalDateKey,calculateDday,classifyEventDate,compareEventsByDday,sortEvents,filterEvents,normalizeData,renderEventCard,bindEventCardActions,renderDeleteConfirmation,moveEventToTrash,restoreEventFromTrash,createEventFromTemplate,createVibrationController};
});
