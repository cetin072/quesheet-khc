((root,factory)=>{
  const api=factory();
  root.EventCueCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';

  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));

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

  const renderEventCard=({event,enabled,total,minutes,dateLabel,lastModified})=>`
    <article class="event-card" data-event-card="${escapeHtml(event.id)}">
      <div class="card-top"><span class="tag">${escapeHtml(event.type||'행사')}</span><span class="status-tag">${escapeHtml(event.status||'작성 중')}</span></div>
      <h3>${escapeHtml(event.title)}</h3>
      <div class="meta">${escapeHtml(dateLabel)}</div>
      <div class="stats">순서 ${enabled}개${enabled!==total?` · 숨김 ${total-enabled}개`:''}${minutes?` · 약 ${minutes}분`:''}<br>마지막 수정 ${escapeHtml(lastModified)}</div>
      <div class="card-actions">
        <button type="button" class="btn small soft" data-event-action="edit" data-event-id="${escapeHtml(event.id)}">열기</button>
        <button type="button" class="btn small primary" data-event-action="run" data-event-id="${escapeHtml(event.id)}">진행</button>
        <button type="button" class="btn small danger" data-event-action="delete" data-event-id="${escapeHtml(event.id)}" aria-label="${escapeHtml(event.title)} 삭제">🗑 삭제</button>
        <button type="button" class="btn small more" data-event-action="more" data-event-id="${escapeHtml(event.id)}" aria-label="${escapeHtml(event.title)} 더보기">더보기</button>
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
    rootElement.addEventListener('click',listener);
    return ()=>rootElement.removeEventListener('click',listener);
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

  return {escapeHtml,normalizeData,renderEventCard,bindEventCardActions,renderDeleteConfirmation,moveEventToTrash,restoreEventFromTrash,createEventFromTemplate,createVibrationController};
});
