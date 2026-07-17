import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
await import('../assets/app-core-v1.9.0.js');
const Core=globalThis.EventCueCore;

const sample=()=>({version:'1.8.0',events:[{id:'a',title:'첫 행사',steps:[]}],trash:[]});

test('행사 카드에 삭제와 더보기 버튼을 렌더링한다',()=>{
  const html=Core.renderEventCard({event:{id:'a',title:'행사',type:'기념식',status:'작성 중'},enabled:2,total:2,minutes:10,dateLabel:'날짜 미정',lastModified:'오늘'});
  assert.match(html,/data-event-action="delete"/);
  assert.match(html,/🗑 삭제/);
  assert.match(html,/data-event-action="more"/);
});

test('더보기 클릭은 등록된 메뉴 핸들러를 호출한다',()=>{
  let opened='';
  const listeners={};
  const root={addEventListener:(type,fn)=>listeners[type]=fn,removeEventListener(){},contains:()=>true};
  Core.bindEventCardActions(root,{more:id=>opened=id});
  listeners.click({target:{closest:()=>({dataset:{eventAction:'more',eventId:'a'}})},preventDefault(){}});
  assert.equal(opened,'a');
});

test('삭제 요청은 확인 전 데이터를 변경하지 않는다',()=>{
  const data=sample();
  const html=Core.renderDeleteConfirmation(data.events[0]);
  assert.match(html,/행사를 삭제하시겠습니까/);
  assert.match(html,/id="cancelTrash"/);
  assert.match(html,/id="doTrash"/);
  assert.equal(data.events.length,1);
  assert.equal(data.trash.length,0);
});

test('확인한 행사만 휴지통으로 이동하고 복원된다',()=>{
  const data={version:'1.9.0',events:[{id:'a',title:'A'},{id:'b',title:'B'}],trash:[]};
  Core.moveEventToTrash(data,'a',100);
  assert.deepEqual(data.events.map(event=>event.id),['b']);
  assert.deepEqual(data.trash.map(event=>event.id),['a']);
  Core.restoreEventFromTrash(data,'a',200);
  assert.deepEqual(data.events.map(event=>event.id),['a','b']);
  assert.equal(data.trash.length,0);
});

test('기본양식은 깊은 복사된 새 행사로 생성된다',()=>{
  const template={key:'ceremony',title:'기념식',steps:[{title:'개식',script:'멘트'}]};
  let number=0;
  const event=Core.createEventFromTemplate(template,{id:()=>`id${++number}`,stepId:()=>`step${++number}`,now:10,date:'2026-07-18'});
  event.steps[0].script='수정';
  assert.equal(template.steps[0].script,'멘트');
  assert.equal(event.status,'작성 중');
});

test('다섯 가지 기본양식과 필수 순서가 유지된다',async()=>{
  globalThis.window=globalThis;
  await import('../assets/templates-v1.9.0.js');
  assert.equal(globalThis.EVENT_TEMPLATES.length,5);
  assert.deepEqual(globalThis.EVENT_TEMPLATES.map(template=>template.steps.length),[11,13,12,11,12]);
  assert.ok(globalThis.EVENT_TEMPLATES.every(template=>template.steps.every(step=>step.title&&step.script)));
});

test('기존 localStorage 데이터 구조를 삭제 없이 보완한다',()=>{
  const data={version:'1.8.0',events:[{id:'a',title:'기존 행사'}]};
  assert.equal(Core.normalizeData(data,'1.9.0',50),true);
  assert.equal(data.events[0].status,'작성 중');
  assert.deepEqual(data.events[0].steps,[]);
  assert.deepEqual(data.trash,[]);
});

test('진동 미지원 환경에서도 오류 없이 안내한다',()=>{
  const messages=[];
  const controller=Core.createVibrationController({navigatorObject:{},storage:{setItem(){}},isEnabled:()=>true,notify:message=>messages.push(message)});
  assert.equal(controller.test(),'unsupported');
  assert.match(messages[0],/지원하지 않습니다/);
});

test('진동 테스트는 지정 패턴과 반환값을 처리한다',()=>{
  let pattern;
  const controller=Core.createVibrationController({navigatorObject:{vibrate:value=>(pattern=value,true)},storage:{setItem(){}},isEnabled:()=>true,notify() {}});
  assert.equal(controller.test(),'sent');
  assert.deepEqual(pattern,[200,100,200]);
});

test('진행 화면에 진동 테스트 버튼과 호출 연결이 남아 있다',async()=>{
  const source=await readFile(new URL('../assets/app-v1.9.0.js',import.meta.url),'utf8');
  assert.match(source,/id="vibeTestBtn"/);
  assert.match(source,/\$\('#vibeTestBtn'\)\.onclick=testVibration/);
});

test('서비스워커는 최신 핵심 자산을 모두 캐시한다',async()=>{
  const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  for(const asset of ['app-v1.9.0.css','templates-v1.9.0.js','app-core-v1.9.0.js','app-v1.9.0.js'])assert.match(source,new RegExp(asset.replaceAll('.','\\.')));
});
