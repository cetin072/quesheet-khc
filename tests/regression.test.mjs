import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
await import('../assets/app-core-v1.10.1.js');
const Core=globalThis.EventCueCore;

const sample=()=>({version:'1.8.0',events:[{id:'a',title:'첫 행사',steps:[]}],trash:[]});

test('행사 카드에 열기·진행·복제·삭제를 렌더링하고 더보기를 제거한다',()=>{
  const html=Core.renderEventCard({event:{id:'a',title:'행사',type:'기념식',status:'작성 중'},enabled:2,total:2,minutes:10,dateLabel:'날짜 미정',lastModified:'오늘',dday:{label:'날짜 미정',classification:'undated'}});
  for(const action of ['edit','run','duplicate','delete'])assert.match(html,new RegExp(`data-event-action="${action}"`));
  assert.match(html,/data-event-action="delete"/);
  assert.match(html,/🗑 삭제/);
  assert.doesNotMatch(html,/더보기|data-event-action="more"/);
  assert.match(html,/JSON 내보내기/);
  assert.match(html,/data-event-status/);
});

test('카드 복제 클릭은 등록된 직접 핸들러를 호출한다',()=>{
  let duplicated='';
  const listeners={};
  const root={addEventListener:(type,fn)=>listeners[type]=fn,removeEventListener(){},contains:()=>true};
  Core.bindEventCardActions(root,{duplicate:id=>duplicated=id});
  listeners.click({target:{closest:()=>({dataset:{eventAction:'duplicate',eventId:'a'}})},preventDefault(){}});
  assert.equal(duplicated,'a');
});

test('오늘·내일·어제·날짜 미정 D-Day를 로컬 날짜로 계산한다',()=>{
  const reference=new Date(2026,6,18,23,59,59);
  assert.equal(Core.calculateDday('2026-07-18',reference).label,'D-DAY');
  assert.equal(Core.calculateDday('2026-07-19',reference).label,'D-1');
  assert.equal(Core.calculateDday('2026-07-17',reference).label,'D+1');
  assert.equal(Core.calculateDday('',reference).label,'날짜 미정');
  assert.equal(Core.calculateDday('잘못된 날짜',reference).label,'날짜 미정');
});

test('D-Day 정렬은 예정·날짜 미정·지난 행사 순이며 과거는 최근 종료순이다',()=>{
  const reference=new Date(2026,6,18,12),events=[
    {id:'past5',date:'2026-07-13'},{id:'future3',date:'2026-07-21'},{id:'none',date:'',updatedAt:9},
    {id:'today',date:'2026-07-18',time:'11:00'},{id:'past1',date:'2026-07-17'},{id:'future1',date:'2026-07-19'}
  ];
  assert.deepEqual(Core.sortEvents(events,'dday',reference).map(event=>event.id),['today','future1','future3','none','past1','past5']);
});

test('동일 날짜 행사는 시작시간이 빠른 순서다',()=>{
  const reference=new Date(2026,6,18);
  const events=[{id:'late',date:'2026-07-20',time:'18:00'},{id:'early',date:'2026-07-20',time:'09:00'}];
  assert.deepEqual(Core.sortEvents(events,'dday',reference).map(event=>event.id),['early','late']);
});

test('검색과 날짜·상태 필터가 적용되고 초기 조건은 전체를 반환한다',()=>{
  const reference=new Date(2026,6,18),events=[{title:'개소식',type:'기업',date:'2026-07-18',status:'준비 완료'},{title:'돌잔치',type:'가족',date:'',status:'작성 중'}];
  assert.equal(Core.filterEvents(events,{}).length,2);
  assert.equal(Core.filterEvents(events,{query:'개소',dateFilter:'today',statusFilter:'준비 완료',referenceDate:reference}).length,1);
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
  const data={version:'1.10.0',events:[{id:'a',title:'A'},{id:'b',title:'B'}],trash:[]};
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
  await import('../assets/templates-v1.10.1.js');
  assert.equal(globalThis.EVENT_TEMPLATES.length,5);
  assert.deepEqual(globalThis.EVENT_TEMPLATES.map(template=>template.steps.length),[11,13,12,11,12]);
  assert.ok(globalThis.EVENT_TEMPLATES.every(template=>template.steps.every(step=>step.title&&step.script)));
});

test('기존 localStorage 데이터 구조를 삭제 없이 보완한다',()=>{
  const data={version:'1.8.0',events:[{id:'a',title:'기존 행사'}]};
  assert.equal(Core.normalizeData(data,'1.10.0',50),true);
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

test('진동 테스트는 진행 화면에서 제거되고 홈 옵션에 연결된다',async()=>{
  const source=await readFile(new URL('../assets/app-v1.10.1.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/id="vibeTestBtn"|\$\('#vibeTestBtn'\)/);
  assert.match(source,/id="optionVibrationTest"/);
  assert.match(source,/\$\('#optionVibrationTest'\)\.onclick=testVibration/);
});

test('진행 화면에는 목록·A+·종료만 있고 모호한 화면 버튼이 없다',async()=>{
  const source=await readFile(new URL('../assets/app-v1.10.1.js',import.meta.url),'utf8');
  assert.match(source,/id="runListBtn"/);
  assert.match(source,/id="fontRunBtn"/);
  assert.match(source,/id="exitRunBtn"/);
  assert.doesNotMatch(source,/id="vibeRunBtn"|id="wakeRunBtn"|>화면<|>테스트</);
  for(const id of ['runPrev','runDone','runNext'])assert.match(source,new RegExp(`id="${id}"`));
});

test('홈 화면에 진행 옵션 버튼과 저장 경로가 존재한다',async()=>{
  const source=await readFile(new URL('../assets/app-v1.10.1.js',import.meta.url),'utf8');
  assert.match(source,/id="optionsBtn"/);
  assert.match(source,/\$\('#optionsBtn'\)\.onclick=showOptionsModal/);
  assert.match(source,/function showOptionsModal\(\)/);
  assert.match(source,/id="modalClose"/);
  assert.match(source,/id="optionsDone"/);
  assert.match(source,/\$\('#modalClose'\)\.onclick=\$\('#optionsDone'\)\.onclick=closeModal/);
  assert.match(source,/cueVibration/);
  assert.match(source,/cueWakeLock/);
  assert.match(source,/cueFont/);
});

test('Wake Lock 미지원 환경은 오류 없이 안내한다',async()=>{
  const messages=[];
  const controller=Core.createWakeLockController({navigatorObject:{},notify:message=>messages.push(message)});
  assert.equal(await controller.request(true),false);
  assert.match(messages[0],/지원하지 않습니다/);
  await controller.release();
});

test('Wake Lock 지원 환경은 screen 요청과 해제를 수행한다',async()=>{
  let requested='',released=false;
  const lock={addEventListener(){},release:async()=>{released=true;}};
  const controller=Core.createWakeLockController({navigatorObject:{wakeLock:{request:async type=>(requested=type,lock)}},notify(){}});
  assert.equal(await controller.request(true),true);
  assert.equal(requested,'screen');
  assert.equal(controller.active(),true);
  await controller.release();
  assert.equal(released,true);
  assert.equal(controller.active(),false);
});

test('진행 진입 시 화면 유지 설정과 A+ 단계 설정을 반영한다',async()=>{
  const source=await readFile(new URL('../assets/app-v1.10.1.js',import.meta.url),'utf8');
  assert.match(source,/if\(state\.wakeEnabled\)void wake\.request\(true\)/);
  assert.match(source,/state\.fontIndex=\(state\.fontIndex\+1\)%fontLevels\.length/);
  assert.match(source,/localStorage\.setItem\('cueFont'/);
});

test('서비스워커는 최신 핵심 자산을 모두 캐시한다',async()=>{
  const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  for(const asset of ['app-v1.10.1.css','templates-v1.10.1.js','app-core-v1.10.1.js','app-v1.10.1.js'])assert.match(source,new RegExp(asset.replaceAll('.','\\.')));
});

test('첫 화면에는 검색 아이콘과 열고 닫는 패널 코드가 있고 더보기 메뉴가 없다',async()=>{
  const source=await readFile(new URL('../assets/app-v1.10.1.js',import.meta.url),'utf8');
  assert.match(source,/id="searchToggle"/);
  assert.match(source,/id="searchPanel"/);
  assert.match(source,/id="closeSearch"/);
  assert.match(source,/id="resetFilters"/);
  assert.doesNotMatch(source,/openEventMenu|data-more|menuMore/);
});

test('태장 개소식 최종 시나리오는 17개 순서와 확정 행사정보를 포함한다',async()=>{
  const source=await readFile(new URL('../assets/app-v1.10.1.js',import.meta.url),'utf8');
  const start=source.indexOf('const openingSteps=');
  const end=source.indexOf('const taejangOpeningNotes=',start);
  const openingBlock=source.slice(start,end);
  assert.equal((openingBlock.match(/"title":/g)||[]).length,17);
  for(const value of ['00. 내빈 착석 안내','01. 식전 음악행사','11. 현판 동시 제막','16. 모회사별 촬영 ④ 현대비앤지스틸㈜ 및 폐식'])assert.ok(openingBlock.includes(value));
  assert.match(source,/time:'15:00'/);
  assert.match(source,/창원 신화더플렉스시티 태장㈜ 사업장/);
  assert.match(source,/templateKey:'taejang-opening-20260812'/);
  assert.match(source,/templateRevision:3/);
});

test('기존 태장 개소식 초안만 최종 시나리오로 갱신하는 마이그레이션이 있다',async()=>{
  const source=await readFile(new URL('../assets/app-v1.10.1.js',import.meta.url),'utf8');
  assert.match(source,/const isLegacyTaejangOpening=/);
  assert.match(source,/e\.location==='태장 본점'/);
  assert.match(source,/s\.title==='현판식 또는 테이프 커팅'/);
  assert.match(source,/if\(isLegacyTaejangOpening\(e\)\)/);
});
