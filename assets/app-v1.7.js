(()=>{
  'use strict';
  const STORAGE_KEY='eventCueStudio.v1';
  const APP_VERSION='1.7.0';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const nl=s=>esc(s).replace(/\n/g,'<br>');
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const clone=o=>JSON.parse(JSON.stringify(o));
  const today=()=>new Date().toISOString().slice(0,10);
  let wakeLock=null,runTimer=null,runSeconds=0,touchStart=null;
  let state={data:null,view:'home',eventId:null,stepId:null,runIndex:0,runActiveSteps:[],fontIndex:1,vibration:true};
  const fontLevels=[.9,1,1.13,1.28];
  const templates=Array.isArray(window.EVENT_TEMPLATES)?window.EVENT_TEMPLATES:[];

  const birthdaySteps=[
    {title:'행사 시작 전 안내',duration:'시작 3분 전',script:'잠시 후 이서의 첫돌 기념행사를 시작하겠습니다.\n\n아직 참여하지 않으신 분은 번호표 한 세트, 두 장을 받아주세요. 이서가 잡을 것으로 예상되는 물건 하나를 선택해 번호표 한 장을 떼어 해당 컵에 넣어주시고, 나머지 한 장은 당첨 확인을 위해 잘 보관해 주세요.',cue:'마이크, 돌잡이 용품 7종, 용품별 컵, 두 장 한 세트 번호표, 경품, 촬영 준비를 확인한다. 번호표는 1인 1세트만 배부한다.',contingency:''},
    {title:'여는 인사',duration:'약 1분',script:'안녕하세요. 오늘 이서의 첫 번째 생일에 함께해 주셔서 진심으로 감사합니다.\n\n저는 오늘 사회를 맡은 이서 엄마, 이경진입니다. 조금 서툴더라도 따뜻하게 함께해 주시면 감사하겠습니다.\n\n그럼 지금부터 이서의 첫돌 기념행사를 시작하겠습니다. 큰 박수 부탁드립니다!',cue:'이서와 가족이 잘 보이는 위치인지 확인하고 박수를 유도한다.',contingency:''},
    {title:'오늘의 주인공 소개',duration:'약 1분',script:'오늘의 주인공, 지난 1년 동안 우리 가족에게 큰 행복을 선물해 준 사랑스러운 이서입니다!\n\n제가 하나, 둘, 셋 하면 “이서야, 생일 축하해!”라고 함께 외쳐주세요.\n\n하나, 둘, 셋! “이서야, 생일 축하해!”',cue:'박수를 유도하고 이서가 하객을 바라보도록 한다.',contingency:''},
    {title:'엄마의 짧은 인사',duration:'약 1분',script:'이서가 태어난 지 벌써 1년이 되었습니다. 처음에는 안는 것조차 조심스러울 만큼 작았는데, 어느새 표정도 많고 자기 생각도 분명한 아이로 자랐습니다.\n\n건강하게 자라준 이서에게 고맙고, 늘 사랑과 관심을 보내주신 가족과 여러분께도 진심으로 감사드립니다.',cue:'너무 길어지지 않도록 천천히 한 번만 읽는다.',contingency:''},
    {title:'돌잡이 추첨 방법 안내',duration:'약 1분',script:'오늘 돌잡이는 두 장이 한 세트인 번호표를 이용해 진행합니다. 한 장은 예상하는 돌잡이 용품의 컵에 넣고, 같은 번호의 나머지 한 장은 당첨 확인을 위해 보관해 주세요.\n\n이서가 선택한 물건의 컵에서 먼저 번호표 한 장을 뽑아 돌잡이상 한 분을 선정하겠습니다.\n\n이어서 같은 물건을 정확히 맞혔지만 첫 추첨에서 당첨되지 않은 분들 가운데 쪽집게상 한 분을 뽑겠습니다.\n\n마지막으로 돌잡이상과 쪽집게상 당첨자를 제외하고, 아직 상품을 받지 못한 모든 참가자의 번호표를 한데 모아 아차상 한 분을 뽑겠습니다.\n\n단, 이서가 선택한 물건의 컵에 번호표가 한 장뿐이면 쪽집게상 후보가 없으므로 쪽집게상은 생략하고 아차상을 두 분 뽑겠습니다.',cue:'번호표 한 세트가 같은 번호 두 장인지 확인하고, 투표하지 않은 분에게 마지막 참여 기회를 안내한다.',contingency:''},
    {title:'돌잡이 물건 설명 ①',duration:'약 1분',script:'명주실은 건강과 장수를 뜻합니다. 오래도록 건강하고 행복하게 자라라는 의미입니다.\n\n엽전은 재물과 풍요를 상징합니다. 경제적으로 복되고 넉넉한 삶을 살라는 뜻입니다.\n\n마이크는 뛰어난 말솜씨와 표현력을 뜻합니다. 방송, 예술, 소통 분야에서 재능을 펼치라는 의미입니다.\n\n붓은 학문과 지혜, 예술적 재능을 상징합니다. 자신의 생각을 멋지게 표현하는 사람이 되라는 뜻입니다.',cue:'물건을 하나씩 가리키며 설명한다.',contingency:''},
    {title:'돌잡이 물건 설명 ②',duration:'약 1분',script:'마우스는 컴퓨터와 정보기술 분야의 재능을 상징합니다. 디지털 시대를 이끄는 인재가 되라는 의미입니다.\n\n청진기는 의료인과 따뜻한 돌봄을 상징합니다. 사람의 생명과 건강을 살피는 사람이 되라는 뜻입니다.\n\n마패는 명예와 리더십을 상징합니다. 사람을 바르게 이끌고 존경받는 인물로 성장하라는 뜻입니다.',cue:'설명이 끝나면 투표 마감을 예고한다.',contingency:''},
    {title:'투표 마감',duration:'약 1분',script:'아직 참여하지 않으신 분은 지금 번호표 한 세트, 두 장을 받아주세요.\n\n명주실, 엽전, 마이크, 붓, 마우스, 청진기, 마패 가운데 이서가 잡을 것으로 예상되는 물건 하나를 골라 번호표 한 장을 떼어 해당 컵에 넣어주시고, 나머지 한 장은 당첨 확인을 위해 잘 보관해 주세요.\n\n모두 참여하셨나요? 지금부터 돌잡이 투표를 마감하겠습니다.',cue:'7개의 투표 컵을 돌상 주변의 정해진 위치로 옮기고 각 컵의 번호표가 섞이지 않도록 확인한다.',contingency:''},
    {title:'돌잡이 진행',duration:'약 3~5분',script:'자, 이제 이서의 선택만 남았습니다.\n\n제가 “이서야”라고 하면 다 같이 “잡아라!”라고 외쳐주세요.\n\n이서야! “잡아라!”\n\n잡았습니다! 이서가 선택한 것은 바로 〔물건〕입니다. 좋은 의미처럼 건강하고 멋지게 자라기를 바라겠습니다!',cue:'기준은 이서가 처음 손에 들어 올린 물건이다.',contingency:'오래 고민하면: “첫 번째 중요한 선택이라 신중하게 고민하고 있습니다. 조금만 더 기다려 보겠습니다.”\n\n두 개를 거의 동시에 잡으면: 먼저 잡은 물건이 분명하지 않은 경우 두 물건만 놓고 한 번 더 선택한다.\n\n울거나 긴장하면: 잠시 진정한 뒤 한 번만 더 도전한다.'},
    {title:'돌잡이상 추첨',duration:'약 2분',script:'이서의 선택은 〔물건〕입니다!\n\n먼저 〔물건〕을 정확히 예상하신 분들 가운데 돌잡이상 한 분을 뽑겠습니다.\n\n〔물건〕 컵의 번호표를 충분히 섞은 뒤 한 장을 뽑겠습니다.\n\n당첨 번호는 바로 〔번호〕번입니다!\n\n〔번호〕번을 가진 분은 보관하신 번호표를 확인하시고 앞으로 나와주세요. 축하드립니다!',cue:'돌잡이상 당첨 번호표는 별도로 보관하고 이후 쪽집게상과 아차상 추첨에 다시 넣지 않는다.',contingency:'선택한 물건의 컵이 비어 있으면 정답자가 없음을 안내한다. 전체 번호표에서 돌잡이상 한 분을 뽑고, 쪽집게상은 생략한 뒤 상품을 받지 못한 사람들 가운데 아차상 두 분을 뽑는다.'},
    {title:'쪽집게상·아차상 추첨',duration:'약 3분',script:'이제 이서가 선택한 물건을 정확히 맞혔지만 돌잡이상 추첨에서 아쉽게 당첨되지 않은 분들을 위한 쪽집게상입니다.\n\n〔물건〕 컵에 남아 있는 번호표를 다시 충분히 섞어 한 장을 뽑겠습니다.\n\n쪽집게상 당첨 번호는 〔번호〕번입니다! 축하드립니다.\n\n이어서 아직 상품을 받지 못한 모든 분을 대상으로 아차상 한 분을 뽑겠습니다. 돌잡이상과 쪽집게상 당첨 번호표를 제외한 나머지 번호표를 모두 한데 모아 충분히 섞겠습니다.\n\n아차상 당첨 번호는 〔번호〕번입니다! 축하드립니다!',cue:'정상 진행: 쪽집게상 당첨 번호표를 제외한 뒤, 상품을 받지 못한 모든 참가자의 번호표를 한데 모아 아차상 한 명을 추첨한다.\n\n선택한 물건의 컵에 번호표가 한 장뿐인 경우: 그 한 명에게 돌잡이상을 수여하고 쪽집게상은 생략한다. 이후 상품을 받지 못한 모든 참가자의 번호표를 모아 아차상 두 명을 중복 없이 추첨한다.',contingency:'선택한 물건의 컵에 번호표가 한 장뿐이면: “〔물건〕을 예상하신 분이 한 분뿐이라 쪽집게상 후보가 없습니다. 따라서 쪽집게상은 생략하고, 아직 상품을 받지 못한 모든 분 가운데 아차상 두 분을 뽑겠습니다.”\n\n아차상 두 명을 뽑을 때는 첫 번째 당첨 번호표를 다시 넣지 않는다.\n\n당첨자가 확인되지 않으면 번호를 다시 확인한 뒤 새 번호를 뽑는다.'},
    {title:'장거리상',duration:'약 2분',script:'다음은 오늘 가장 먼 곳에서 출발해 이서를 축하하러 오신 분께 드리는 장거리상입니다.\n\n창원 밖에서 오신 분은 손 들어주세요. 어디에서 출발해 오셨나요?\n\n오늘 가장 먼 〔출발 지역〕에서 오신 〔성함〕님께 드리겠습니다. 먼 길 와주셔서 정말 감사합니다!',cue:'당일 실제 출발지를 기준으로 한다. 같은 지역에서 함께 출발한 가족이나 일행은 한 팀으로 보고 대표 한 분에게 전달한다.',contingency:'거리가 비슷하면 출발지를 다시 확인하고, 판단이 어려우면 가위바위보로 정한다.'},
    {title:'최연소상',duration:'약 2분',script:'마지막은 오늘의 주인공 이서를 제외하고 가장 어린 손님께 드리는 최연소상입니다.\n\n돌이 지나지 않은 아기가 있으면 부모님께서 손 들어주세요. 생후 몇 개월인가요?\n\n오늘 가장 어린 손님은 생후 〔개월 수〕개월 된 〔이름〕입니다. 축하합니다!',cue:'여러 명이면 생년월일이 가장 늦은 아이를 선정한다.',contingency:'영유아가 없으면 참석자 중 가장 어린 손님에게 드리는 방식으로 변경한다.'},
    {title:'축복 박수',duration:'약 1분',script:'오늘 이서가 무엇을 잡았는지도 즐거운 추억이지만, 저희의 가장 큰 바람은 이서가 건강하고 행복하게 자라는 것입니다.\n\n이서의 앞날을 축복하는 마음으로 큰 박수 부탁드립니다!',cue:'박수 후 바로 마무리 인사로 이어간다.',contingency:''},
    {title:'감사 인사 및 마무리',duration:'약 1분',script:'끝으로 이서 아빠 김형철과 저 엄마 이경진을 대신해 감사 인사드리겠습니다.\n\n오늘 함께해 주신 모든 분께 진심으로 감사드립니다. 보내주신 사랑을 기억하며 이서를 건강하고 밝게 잘 키우겠습니다.\n\n이상으로 이서의 첫돌 기념행사를 마치겠습니다. 편하게 식사하시고 기념사진도 꼭 남겨주세요. 감사합니다!',cue:'공식행사 종료 후 사진 촬영과 식사를 안내한다.',contingency:''}
  ];

  const openingSteps=[
    {title:'행사 시작 전 안내',duration:'시작 10분 전',script:'잠시 후 농업회사법인 태장 주식회사 개소식을 시작하겠습니다. 참석하신 내빈과 임직원 여러분께서는 안내에 따라 자리에 착석해 주시기 바랍니다.',cue:'마이크, 좌석, 참석자 명단, 현판 또는 테이프 커팅 물품, 기념촬영 위치를 최종 확인한다.',contingency:'주요 내빈 도착이 늦어질 경우 담당자와 시작 시각을 협의한다.'},
    {title:'개회 선언',duration:'약 1분',script:'바쁘신 가운데 농업회사법인 태장 주식회사 개소식에 참석해 주신 여러분께 진심으로 감사드립니다.\n\n지금부터 태장 주식회사 개소식을 시작하겠습니다.',cue:'사회자 소개가 필요하면 첫 문장 뒤에 이름과 소속을 덧붙인다.',contingency:''},
    {title:'국민의례',duration:'약 3분',script:'먼저 국민의례가 있겠습니다. 모두 자리에서 일어나 정면의 국기를 향해 주시기 바랍니다.\n\n국기에 대하여 경례. 바로.\n\n이하 의식은 행사 여건에 따라 생략하겠습니다. 모두 자리에 앉아주시기 바랍니다.',cue:'국민의례를 진행하지 않으면 이 순서를 사용 안 함으로 설정한다. 음원과 국기 위치를 사전에 확인한다.',contingency:'음향 문제가 있으면 묵념 없이 국기에 대한 경례만 간략히 진행한다.',enabled:false},
    {title:'내빈 소개',duration:'약 4분',script:'오늘 태장의 새로운 출발을 축하하기 위해 귀한 걸음을 해주신 내빈 여러분을 소개하겠습니다.\n\n〔소속·직책〕 〔성함〕님 참석하셨습니다.\n\n소개받으신 분께서는 자리에서 가볍게 인사해 주시면 감사하겠습니다.',cue:'행사 직전 확정된 참석자 명단 순서대로 소개한다. 참석하지 않은 사람은 읽지 않는다.',contingency:'내빈이 많으면 주요 내빈만 개별 소개하고 나머지는 “그 밖의 내빈 여러분”으로 묶어 소개한다.'},
    {title:'태장 소개',duration:'약 2분',script:'태장 주식회사는 농업을 기반으로 장애인에게 안정적인 일자리를 제공하고, 기업과 지역사회가 함께 성장하는 가치를 실현하기 위해 설립되었습니다.\n\n자회사형 장애인 표준사업장이자 경상남도 동행일자리 1호 기업으로서, 오늘 새로운 사업장에서 힘찬 출발을 하게 되었습니다.',cue:'회사소개 영상이나 발표가 있으면 이 멘트를 짧게 줄이고 발표자에게 마이크를 넘긴다.',contingency:''},
    {title:'대표이사 인사',duration:'약 5분',script:'이어서 태장 주식회사 이영희 대표이사님의 인사말씀이 있겠습니다. 큰 박수로 맞아주시기 바랍니다.\n\n〔인사말 종료 후〕 감사드립니다.',cue:'대표이사 동선과 마이크 전달 담당자를 확인한다.',contingency:'대표이사가 직접 사회를 보는 경우 다른 임원이 소개하도록 수정한다.'},
    {title:'내빈 축사',duration:'각 3~5분',script:'다음은 〔소속·직책〕 〔성함〕님의 축사가 있겠습니다. 큰 박수로 맞아주시기 바랍니다.\n\n〔축사 종료 후〕 귀한 말씀 감사합니다.',cue:'축사 순서와 참석 여부를 행사 직전에 다시 확인한다.',contingency:'축사자가 불참하면 해당 순서를 즉시 건너뛴다.'},
    {title:'현판식 또는 테이프 커팅',duration:'약 5분',script:'이어서 태장의 새로운 출발을 기념하는 〔현판 제막식·테이프 커팅식〕을 진행하겠습니다.\n\n참여하실 내빈께서는 안내에 따라 지정된 위치로 이동해 주시기 바랍니다.\n\n제가 하나, 둘, 셋을 외치면 함께 진행해 주십시오. 하나, 둘, 셋!\n\n태장의 새로운 출발을 축하하며 큰 박수 부탁드립니다!',cue:'참여자 명단, 서는 순서, 장갑·가위·현판 끈, 사진 촬영 위치를 사전에 정한다.',contingency:'공간이 좁거나 일정이 지연되면 대표 내빈만 참여하도록 축소한다.'},
    {title:'기념촬영',duration:'약 5분',script:'이어서 기념촬영을 진행하겠습니다. 먼저 주요 내빈과 임직원께서는 안내에 따라 촬영 위치로 이동해 주시기 바랍니다.\n\n촬영 후에는 참석자 전체 기념사진을 진행하겠습니다.',cue:'사진 순서를 주요 내빈 → 모회사 관계자 → 임직원 → 전체 참석자 순으로 미리 확정한다.',contingency:'시간이 부족하면 전체 사진 한 장으로 통합한다.'},
    {title:'폐회 및 안내',duration:'약 1분',script:'이상으로 농업회사법인 태장 주식회사 개소식의 공식행사를 모두 마치겠습니다.\n\n오늘 귀한 걸음으로 태장의 새로운 시작을 함께해 주신 모든 분께 다시 한번 감사드립니다.\n\n이후 〔사업장 관람·다과·오찬〕이 준비되어 있으니 안내에 따라 함께해 주시기 바랍니다. 감사합니다.',cue:'주차, 식사, 시설 관람 또는 답례품 안내를 실제 운영계획에 맞게 수정한다.',contingency:''}
  ];

  const withIds=arr=>arr.map((s,i)=>({id:uid(),enabled:s.enabled!==false,completed:false,...s}));
  const seedData=()=>({version:APP_VERSION,events:[
    {id:uid(),templateKey:'iseo-first-birthday',templateRevision:2,type:'돌잔치',title:'이서 첫 돌잔치',date:'2026-07-18',time:'17:00',location:'',host:'엄마 이경진',notes:'성장 영상과 케이크·축하 노래는 생략. 돌잡이 용품 7종과 돌잡이상·쪽집게상·아차상 추첨을 진행. 공식행사 약 18~22분.',steps:withIds(birthdaySteps),createdAt:Date.now(),updatedAt:Date.now()},
    {id:uid(),type:'개소식',title:'농업회사법인 태장 주식회사 개소식',date:'2026-08-12',time:'',location:'태장 본점',host:'',notes:'초안입니다. 행사 시간, 사회자, 내빈, 축사자, 현판식·테이프 커팅 여부를 확정한 뒤 수정하세요.',steps:withIds(openingSteps),createdAt:Date.now(),updatedAt:Date.now()}
  ]});
  const save=()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.data));};
  const isLegacyIseoBirthday=e=>e&&e.title==='이서 첫 돌잔치'&&e.date==='2026-07-18'&&Array.isArray(e.steps)&&(
    e.templateKey==='iseo-first-birthday'||
    e.steps.some(s=>s.title==='아차상 2명 추첨')||
    e.steps.some(s=>String(s.script||'').includes('계산기는 수리 능력'))||
    e.steps.some(s=>String(s.script||'').includes('번호표를 한 장 받아'))
  );
  const migrateData=data=>{
    if(!data||!Array.isArray(data.events))throw new Error('invalid');
    let changed=false;
    data.events=data.events.map(e=>{
      if(isLegacyIseoBirthday(e)&&e.templateRevision!==2){
        changed=true;
        return {...e,templateKey:'iseo-first-birthday',templateRevision:2,notes:'성장 영상과 케이크·축하 노래는 생략. 돌잡이 용품 7종과 돌잡이상·쪽집게상·아차상 추첨을 진행. 공식행사 약 18~22분.',steps:withIds(birthdaySteps),updatedAt:Date.now()};
      }
      return e;
    });
    if(data.version!==APP_VERSION){data.version=APP_VERSION;changed=true;}
    return changed;
  };
  const load=()=>{try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){state.data=JSON.parse(raw);}else{state.data=seedData();save();}if(migrateData(state.data))save();}catch(e){state.data=seedData();save();}};
  const eventById=id=>state.data.events.find(e=>e.id===id);
  const stepById=(event,id)=>event.steps.find(s=>s.id===id);
  const activeSteps=event=>event.steps.filter(s=>s.enabled!==false);
  const dateText=v=>{if(!v)return '날짜 미정';const d=new Date(v+'T00:00:00');return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;};
  const timeText=v=>v?` ${v}`:'';
  const toast=msg=>{const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),1800);};
  const vibrate=pattern=>{if(state.vibration&&navigator.vibrate)navigator.vibrate(pattern);};
  const openModal=html=>{$('#modalBody').innerHTML=html;$('#modal').classList.add('open');};
  const closeModal=()=>$('#modal').classList.remove('open');
  const shell=(title,sub,body,actions='')=>`<div class="app"><header class="topbar"><div class="brand">${esc(title)}${sub?`<small>${esc(sub)}</small>`:''}</div><div class="top-actions">${actions}</div></header><main class="content">${body}</main></div>`;
  const setView=(view,eventId=null)=>{stopRunTimer();releaseWake();state.view=view;state.eventId=eventId;window.scrollTo(0,0);render();};

  function renderHome(){
    const cards=state.data.events.map(e=>{const enabled=activeSteps(e).length;const total=e.steps.length;return `<article class="event-card"><span class="tag">${esc(e.type||'행사')}</span><h3>${esc(e.title)}</h3><div class="meta">${esc(dateText(e.date)+timeText(e.time))}${e.location?`<br>${esc(e.location)}`:''}</div><div class="stats">진행 순서 ${enabled}개${enabled!==total?` · 숨김 ${total-enabled}개`:''}</div><div class="card-actions"><button class="btn small soft" data-action="edit" data-id="${e.id}">편집</button><button class="btn small primary" data-action="run" data-id="${e.id}">진행</button></div></article>`}).join('');
    const body=`<section class="hero"><h1>여러 행사에 계속 쓰는<br>모바일 큐시트</h1><p>행사 대본을 만들고, 한 장씩 넘기며 진행하고, 파일로 백업하세요.</p><div class="hero-actions"><button class="btn" id="newEventBtn">＋ 새 행사</button><button class="btn ghost" id="importBtn">백업 불러오기</button></div></section><div class="section-head"><h2>내 행사</h2><span>${state.data.events.length}개 저장됨</span></div>${cards?`<div class="grid">${cards}</div>`:`<div class="empty">저장된 행사가 없습니다.</div>`}<div class="section-head"><h2>데이터 관리</h2></div><div class="panel"><div class="split-actions"><button class="btn small" id="exportAllBtn">전체 백업 저장</button><button class="btn small" id="installHelpBtn">홈 화면 설치 안내</button><button class="btn small danger" id="resetAppBtn">예시 데이터로 초기화</button></div><p class="notice" style="margin-top:12px">행사 내용은 현재 휴대전화 브라우저에 저장됩니다. 중요한 수정 후에는 반드시 백업 파일을 저장해 두세요.</p></div><input class="hidden" type="file" id="importFile" accept="application/json,.json">`;
    $('#root').innerHTML=shell('행사 큐시트',`버전 ${APP_VERSION}`,body,'');
    $('#newEventBtn').onclick=showNewEventModal;$('#importBtn').onclick=()=>$('#importFile').click();$('#importFile').onchange=importBackup;$('#exportAllBtn').onclick=exportAll;$('#installHelpBtn').onclick=showInstallHelp;
    $('#resetAppBtn').onclick=()=>{if(confirm('현재 저장된 모든 행사와 수정 내용이 사라집니다. 예시 데이터로 초기화할까요?')){state.data=seedData();save();render();toast('초기화했습니다.');}};
    document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>setView(b.dataset.action==='run'?'run':'editor',b.dataset.id));
  }

  function showNewEventModal(){
    let selected='blank';
    const options=[{key:'blank',label:'빈 큐시트로 시작',description:'순서를 직접 추가하는 새 행사를 만듭니다.',estimatedDuration:'직접 설정',steps:[]},...templates];
    const draw=()=>{
      const current=options.find(t=>t.key===selected)||options[0];
      const preview=current.steps.length
        ? `<ol class="template-preview-list">${current.steps.map(s=>`<li><b>${esc(s.title)}</b><span>${esc(s.duration||'시간 미정')}</span></li>`).join('')}</ol>`
        : '<p class="notice">빈 행사입니다. 생성 후 필요한 순서를 직접 추가해 주세요.</p>';
      openModal(`<div class="modal-head"><h2>새 행사 만들기</h2><button class="modal-close" id="modalClose">×</button></div><p class="notice">시작 방법을 선택한 뒤 아래 버튼을 누르세요. 기본 양식은 새 행사로 복사되므로 원본 양식은 바뀌지 않습니다.</p><div class="template-grid">${options.map(t=>`<button class="template-card ${selected===t.key?'selected':''}" data-template="${esc(t.key)}"><b>${esc(t.label)}</b><span>${esc(t.description)}</span><small>예상 ${esc(t.estimatedDuration||'시간 미정')} · ${t.steps.length}개 순서</small></button>`).join('')}</div><section class="template-preview"><h3>${esc(current.label)} 미리보기</h3><p>예상 행사시간 ${esc(current.estimatedDuration||'시간 미정')} · ${current.steps.length}개 순서</p>${preview}</section><div class="split-actions" style="margin-top:10px"><button class="template-card" id="copyEventBtn"><b>기존 행사 복제</b><span>저장된 행사를 새 행사로 복사합니다.</span></button></div><div class="modal-actions"><button class="btn" id="cancelCreate">취소</button><button class="btn primary" id="createTemplateBtn">이 양식으로 새 행사 만들기</button></div>`);
      $('#modalClose').onclick=$('#cancelCreate').onclick=closeModal;
      $('#copyEventBtn').onclick=showCopyPicker;
      $('#createTemplateBtn').onclick=()=>createFromTemplate(selected);
      document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{selected=b.dataset.template;draw();});
    };
    draw();
  }
  function createFromTemplate(key){
    const template=templates.find(t=>t.key===key);
    const event={id:uid(),templateKey:template?.key||'blank',templateRevision:template?.revision||1,type:template?.type||'일반 행사',title:template?.title||'새 행사',date:today(),time:'',location:'',host:'',notes:'',steps:withIds(clone(template?.steps||[])),createdAt:Date.now(),updatedAt:Date.now()};
    state.data.events.unshift(event);save();closeModal();setView('editor',event.id);
  }
  function showCopyPicker(){
    openModal(`<div class="modal-head"><h2>복제할 행사 선택</h2><button class="modal-close" id="modalClose">×</button></div>${state.data.events.map(e=>`<button class="run-list-item" data-copy="${e.id}"><span class="run-list-num">복제</span><span><b>${esc(e.title)}</b><span>${esc(dateText(e.date))}</span></span></button>`).join('')}`);$('#modalClose').onclick=closeModal;document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>duplicateEvent(b.dataset.copy,true));
  }

  function renderEditor(){
    const e=eventById(state.eventId);if(!e){setView('home');return;}
    const rows=e.steps.map((s,i)=>`<div class="step-row ${s.enabled===false?'off':''}"><span class="step-num">${i+1}</span><div class="step-main"><b>${esc(s.title||'제목 없음')}</b><span>${esc(s.duration||'시간 미정')}${s.owner?` · 담당 ${esc(s.owner)}`:''} · ${s.enabled===false?'사용 안 함':'사용'}</span></div><div class="step-tools"><button title="위로" data-up="${s.id}" ${i===0?'disabled':''}>↑</button><button title="아래로" data-down="${s.id}" ${i===e.steps.length-1?'disabled':''}>↓</button><button class="edit" data-edit="${s.id}">편집</button></div></div>`).join('');
    const body=`<div class="editor-actions"><button class="btn primary" id="runEventBtn">▶ 진행 모드</button><button class="btn soft" id="scriptBtn">전체 대본</button><button class="btn" id="duplicateBtn">복제</button><button class="btn" id="exportEventBtn">이 행사 백업</button></div><section class="panel"><h2>행사 정보</h2><div class="form-grid"><div class="field full"><label>행사명</label><input id="eventTitle" value="${esc(e.title)}"></div><div class="field"><label>행사 유형</label><input id="eventType" value="${esc(e.type||'')}"></div><div class="field"><label>사회자</label><input id="eventHost" value="${esc(e.host||'')}"></div><div class="field"><label>날짜</label><input type="date" id="eventDate" value="${esc(e.date||'')}"></div><div class="field"><label>시작 시간</label><input type="time" id="eventTime" value="${esc(e.time||'')}"></div><div class="field full"><label>장소</label><input id="eventLocation" value="${esc(e.location||'')}"></div><div class="field full"><label>행사 메모</label><textarea id="eventNotes">${esc(e.notes||'')}</textarea></div></div></section><div class="section-head"><h2>진행 순서</h2><button class="btn small primary" id="addStepBtn">＋ 순서 추가</button></div>${rows?`<div class="step-list">${rows}</div>`:`<div class="empty">진행 순서가 없습니다. 순서를 추가해 주세요.</div>`}<section class="panel danger-zone" style="margin-top:22px"><h3>행사 삭제</h3><p class="notice">삭제 전 백업을 권장합니다.</p><button class="btn small danger" id="deleteEventBtn">이 행사 삭제</button></section>`;
    $('#root').innerHTML=shell(e.title,'행사 편집',body,`<button class="iconbtn" id="homeBtn" aria-label="행사 목록">⌂</button>`);
    $('#homeBtn').onclick=()=>setView('home');$('#runEventBtn').onclick=()=>setView('run',e.id);$('#scriptBtn').onclick=()=>setView('script',e.id);$('#duplicateBtn').onclick=()=>duplicateEvent(e.id,false);$('#exportEventBtn').onclick=()=>exportEvent(e);$('#addStepBtn').onclick=()=>editStep(e,null);
    const fields={eventTitle:'title',eventType:'type',eventHost:'host',eventDate:'date',eventTime:'time',eventLocation:'location',eventNotes:'notes'};Object.entries(fields).forEach(([id,key])=>{$('#'+id).oninput=ev=>{e[key]=ev.target.value;e.updatedAt=Date.now();save();if(key==='title')$('.brand').childNodes[0].nodeValue=e.title;};});
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editStep(e,b.dataset.edit));document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>moveStep(e,b.dataset.up,-1));document.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>moveStep(e,b.dataset.down,1));
    $('#deleteEventBtn').onclick=()=>{if(confirm(`“${e.title}” 행사를 삭제할까요?`)){state.data.events=state.data.events.filter(x=>x.id!==e.id);save();setView('home');}};
  }

  function editStep(event,stepId){
    const existing=stepId?stepById(event,stepId):null;const s=existing||{id:uid(),title:'새 순서',duration:'약 1분',script:'',owner:'',materials:'',avCue:'',cue:'',contingency:'',enabled:true,completed:false};
    openModal(`<div class="modal-head"><h2>${existing?'순서 편집':'순서 추가'}</h2><button class="modal-close" id="modalClose">×</button></div><div class="form-grid"><div class="field full"><label>순서 제목</label><input id="stepTitle" value="${esc(s.title)}"></div><div class="field"><label>시작 시각 또는 소요시간</label><input id="stepDuration" value="${esc(s.duration||'')}"></div><div class="field"><label>담당자</label><input id="stepOwner" value="${esc(s.owner||'')}"></div><div class="field full"><label>준비물</label><textarea id="stepMaterials">${esc(s.materials||'')}</textarea></div><div class="field"><label>사용 여부</label><select id="stepEnabled"><option value="yes" ${s.enabled!==false?'selected':''}>사용</option><option value="no" ${s.enabled===false?'selected':''}>사용 안 함</option></select></div><div class="field full"><label>사회자 멘트</label><textarea id="stepScript" style="min-height:180px">${esc(s.script||'')}</textarea></div><div class="field full"><label>음향·영상·조명 큐</label><textarea id="stepAvCue">${esc(s.avCue||'')}</textarea></div><div class="field full"><label>진행 메모</label><textarea id="stepCue">${esc(s.cue||'')}</textarea></div><div class="field full"><label>돌발상황·대체 멘트</label><textarea id="stepCont">${esc(s.contingency||'')}</textarea></div></div><div class="modal-actions">${existing?'<button class="btn danger" id="removeStep">삭제</button>':''}<button class="btn" id="cancelStep">취소</button><button class="btn primary" id="saveStep">저장</button></div>`);
    $('#modalClose').onclick=$('#cancelStep').onclick=closeModal;$('#saveStep').onclick=()=>{s.title=$('#stepTitle').value.trim()||'제목 없음';s.duration=$('#stepDuration').value.trim();s.owner=$('#stepOwner').value.trim();s.materials=$('#stepMaterials').value;s.script=$('#stepScript').value;s.avCue=$('#stepAvCue').value;s.cue=$('#stepCue').value;s.contingency=$('#stepCont').value;s.enabled=$('#stepEnabled').value==='yes';if(!existing)event.steps.push(s);event.updatedAt=Date.now();save();closeModal();renderEditor();toast('저장했습니다.');};
    if(existing)$('#removeStep').onclick=()=>{if(confirm('이 순서를 삭제할까요?')){event.steps=event.steps.filter(x=>x.id!==s.id);save();closeModal();renderEditor();}};
  }
  function moveStep(event,id,delta){const i=event.steps.findIndex(s=>s.id===id),j=i+delta;if(i<0||j<0||j>=event.steps.length)return;[event.steps[i],event.steps[j]]=[event.steps[j],event.steps[i]];event.updatedAt=Date.now();save();renderEditor();}
  function duplicateEvent(id,fromModal){const src=eventById(id);const e=clone(src);e.id=uid();e.title=src.title+' 복사본';e.date=today();e.steps=e.steps.map(s=>({...s,id:uid(),completed:false}));e.createdAt=e.updatedAt=Date.now();state.data.events.unshift(e);save();if(fromModal)closeModal();setView('editor',e.id);toast('행사를 복제했습니다.');}

  function renderScript(){
    const e=eventById(state.eventId);if(!e){setView('home');return;}const steps=activeSteps(e);const body=`<div class="editor-actions no-print"><button class="btn" id="backEditor">← 편집으로</button><button class="btn primary" id="printScript">인쇄·PDF 저장</button><button class="btn" id="runFromScript">진행 모드</button></div><article class="script-sheet"><header class="script-title"><h1>${esc(e.title)}</h1><p>${esc(dateText(e.date)+timeText(e.time))}${e.location?' · '+esc(e.location):''}${e.host?' · 사회 '+esc(e.host):''}</p></header>${steps.map((s,i)=>`<section class="script-step"><div class="duration">${i+1}. ${esc(s.duration||'')}</div><h2>${esc(s.title)}</h2><div class="script-text">${nl(s.script||'')}</div>${s.owner?`<div class="script-cue"><b>담당</b><br>${nl(s.owner)}</div>`:''}${s.materials?`<div class="script-cue"><b>준비물</b><br>${nl(s.materials)}</div>`:''}${s.avCue?`<div class="script-cue"><b>음향·영상·조명 큐</b><br>${nl(s.avCue)}</div>`:''}${s.cue?`<div class="script-cue"><b>진행 메모</b><br>${nl(s.cue)}</div>`:''}${s.contingency?`<div class="script-cont"><b>돌발상황·대체 멘트</b><br>${nl(s.contingency)}</div>`:''}</section>`).join('')}</article>`;
    $('#root').innerHTML=shell(e.title,'전체 대본',body,`<button class="iconbtn" id="homeBtn">⌂</button>`);$('#homeBtn').onclick=()=>setView('home');$('#backEditor').onclick=()=>setView('editor',e.id);$('#runFromScript').onclick=()=>setView('run',e.id);$('#printScript').onclick=()=>window.print();
  }

  function renderRun(){
    const e=eventById(state.eventId);if(!e){setView('home');return;}state.runActiveSteps=activeSteps(e);if(!state.runActiveSteps.length){alert('사용 중인 진행 순서가 없습니다.');setView('editor',e.id);return;}const saved=parseInt(localStorage.getItem('cueRunIndex.'+e.id)||'0',10);state.runIndex=Math.max(0,Math.min(saved,state.runActiveSteps.length-1));state.vibration=localStorage.getItem('cueVibration')!=='off';state.fontIndex=parseInt(localStorage.getItem('cueFont')||'1',10);state.fontIndex=Math.max(0,Math.min(fontLevels.length-1,state.fontIndex));
    $('#root').innerHTML=`<div class="run"><header class="run-top"><div class="run-row"><div class="run-title"><b>${esc(e.title)}</b><span id="elapsed">00:00 · ${esc(e.host||'사회자 미정')}</span></div><div class="run-actions"><button class="iconbtn" id="runListBtn">목록</button><button class="iconbtn" id="fontRunBtn">A＋</button><button class="iconbtn ${state.vibration?'active':''}" id="vibeRunBtn">진동</button><button class="iconbtn" id="wakeRunBtn">화면</button><button class="iconbtn" id="exitRunBtn">종료</button></div></div><div class="progress"><i id="runProgress"></i></div></header><main class="run-stage" id="runStage"><div class="run-track" id="runTrack">${state.runActiveSteps.map((s,i)=>`<section class="run-slide"><article class="run-card"><div class="run-meta"><span class="run-num">${String(i+1).padStart(2,'0')}</span><span class="run-duration">${esc(s.duration||'')}</span></div><h1>${esc(s.title)}</h1><div class="run-script">${nl(s.script||'')}</div>${s.owner?`<div class="run-cue"><b>담당</b><br>${nl(s.owner)}</div>`:''}${s.materials?`<div class="run-cue"><b>준비물</b><br>${nl(s.materials)}</div>`:''}${s.avCue?`<div class="run-cue"><b>음향·영상·조명 큐</b><br>${nl(s.avCue)}</div>`:''}${s.cue?`<div class="run-cue"><b>진행 메모</b><br>${nl(s.cue)}</div>`:''}${s.contingency?`<div class="run-cont"><b>돌발상황·대체 멘트</b><br>${nl(s.contingency)}</div>`:''}</article></section>`).join('')}</div></main><footer class="run-foot"><div class="run-counter" id="runCounter"></div><div class="run-nav"><button id="runPrev">◀ 이전</button><button id="runDone">완료 표시</button><button class="next" id="runNext">다음 ▶</button></div></footer></div><div class="run-list" id="runList"><section class="run-list-sheet"><div class="modal-head"><h2>전체 진행 순서</h2><button class="modal-close" id="closeRunList">×</button></div><div id="runListItems"></div></section></div>`;
    document.documentElement.style.setProperty('--run-fs',fontLevels[state.fontIndex]);$('#runListItems').innerHTML=state.runActiveSteps.map((s,i)=>`<button class="run-list-item" data-run-index="${i}"><span class="run-list-num">${i+1}</span><span><b>${esc(s.title)}</b><span>${esc(s.duration||'')}${s.completed?' · 완료':''}</span></span></button>`).join('');
    $('#exitRunBtn').onclick=()=>setView('editor',e.id);$('#runPrev').onclick=()=>goRun(state.runIndex-1,'prev');$('#runNext').onclick=()=>goRun(state.runIndex+1,'next');$('#runDone').onclick=()=>{const s=state.runActiveSteps[state.runIndex];s.completed=!s.completed;save();updateRunUI();vibrate(s.completed?70:[30,45,30]);};$('#runListBtn').onclick=()=>$('#runList').classList.add('open');$('#closeRunList').onclick=()=>$('#runList').classList.remove('open');$('#runList').onclick=ev=>{if(ev.target.id==='runList')ev.currentTarget.classList.remove('open');};document.querySelectorAll('[data-run-index]').forEach(b=>b.onclick=()=>{goRun(+b.dataset.runIndex,'jump');$('#runList').classList.remove('open');});
    $('#vibeRunBtn').onclick=()=>{state.vibration=!state.vibration;localStorage.setItem('cueVibration',state.vibration?'on':'off');updateRunUI();if(state.vibration)vibrate(70);};$('#fontRunBtn').onclick=()=>{state.fontIndex=(state.fontIndex+1)%fontLevels.length;localStorage.setItem('cueFont',state.fontIndex);document.documentElement.style.setProperty('--run-fs',fontLevels[state.fontIndex]);$('#fontRunBtn').textContent=state.fontIndex===fontLevels.length-1?'A−':'A＋';};$('#wakeRunBtn').onclick=toggleWake;
    const stage=$('#runStage');stage.addEventListener('touchstart',ev=>{const t=ev.touches[0];touchStart={x:t.clientX,y:t.clientY};},{passive:true});stage.addEventListener('touchend',ev=>{if(!touchStart)return;const t=ev.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)goRun(state.runIndex+(dx<0?1:-1),dx<0?'next':'prev');},{passive:true});
    document.onkeydown=runKeyHandler;startRunTimer();goRun(state.runIndex,'init');
  }
  function goRun(target,direction){const old=state.runIndex,n=Math.max(0,Math.min(state.runActiveSteps.length-1,target));if(n===old&&direction!=='init'){vibrate([110,65,110]);toast(n===0?'첫 순서입니다.':'마지막 순서입니다.');return;}state.runIndex=n;localStorage.setItem('cueRunIndex.'+state.eventId,n);$('#runTrack').style.transform=`translateX(-${n*100}%)`;document.querySelectorAll('.run-slide')[n].scrollTop=0;if(direction==='prev'||n<old)vibrate([35,45,35]);else if(direction!=='init')vibrate(55);updateRunUI();}
  function updateRunUI(){const n=state.runIndex,total=state.runActiveSteps.length,s=state.runActiveSteps[n];$('#runProgress').style.width=`${total===1?100:n/(total-1)*100}%`;$('#runCounter').textContent=`${n+1} / ${total} · ${s.title}`;$('#runPrev').disabled=n===0;$('#runNext').disabled=n===total-1;$('#runDone').textContent=s.completed?'✓ 완료됨':'완료 표시';$('#runDone').classList.toggle('next',s.completed);$('#vibeRunBtn').classList.toggle('active',state.vibration);$('#vibeRunBtn').textContent=state.vibration?'진동ON':'진동OFF';$('#fontRunBtn').textContent=state.fontIndex===fontLevels.length-1?'A−':'A＋';document.querySelectorAll('.run-list-item').forEach((el,i)=>{el.classList.toggle('active',i===n);const sp=el.querySelector('span span');if(sp)sp.textContent=(state.runActiveSteps[i].duration||'')+(state.runActiveSteps[i].completed?' · 완료':'');});}
  function runKeyHandler(ev){if(state.view!=='run')return;if(ev.key==='ArrowRight'||ev.key==='PageDown')goRun(state.runIndex+1,'next');if(ev.key==='ArrowLeft'||ev.key==='PageUp')goRun(state.runIndex-1,'prev');}
  function startRunTimer(){runSeconds=0;updateElapsed();runTimer=setInterval(()=>{runSeconds++;updateElapsed();},1000);}
  function stopRunTimer(){if(runTimer){clearInterval(runTimer);runTimer=null;}document.onkeydown=null;}
  function updateElapsed(){const el=$('#elapsed');if(!el)return;const m=Math.floor(runSeconds/60),s=runSeconds%60;const e=eventById(state.eventId);el.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} · ${e?.host||'사회자 미정'}`;}
  async function toggleWake(){const b=$('#wakeRunBtn');try{if(wakeLock){await wakeLock.release();wakeLock=null;b.classList.remove('active');b.textContent='화면';return;}if(!('wakeLock'in navigator))throw new Error();wakeLock=await navigator.wakeLock.request('screen');b.classList.add('active');b.textContent='화면ON';wakeLock.addEventListener('release',()=>{if($('#wakeRunBtn')){$('#wakeRunBtn').classList.remove('active');$('#wakeRunBtn').textContent='화면';}});}catch(e){alert('이 브라우저에서는 화면 꺼짐 방지를 켤 수 없습니다. 휴대전화의 화면 자동 꺼짐 시간을 길게 설정해 주세요.');}}
  async function releaseWake(){try{if(wakeLock)await wakeLock.release();}catch(e){}wakeLock=null;}

  function exportAll(){downloadJson(`행사큐시트_전체백업_${today()}.json`,state.data);}
  function exportEvent(e){downloadJson(`${safeFilename(e.title)}_${e.date||today()}.json`,{version:APP_VERSION,events:[e]});}
  function downloadJson(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('백업 파일을 저장했습니다.');}
  function safeFilename(s){return String(s).replace(/[\\/:*?"<>|]/g,'_').slice(0,60)||'행사';}
  async function importBackup(ev){const f=ev.target.files?.[0];if(!f)return;try{const obj=JSON.parse(await f.text());if(!Array.isArray(obj.events))throw new Error();const incoming=obj.events.map(e=>({...e,id:state.data.events.some(x=>x.id===e.id)?uid():e.id,steps:(e.steps||[]).map(s=>({...s,id:uid()})),updatedAt:Date.now()}));state.data.events=[...incoming,...state.data.events];save();render();toast(`${incoming.length}개 행사를 불러왔습니다.`);}catch(e){alert('올바른 큐시트 백업 파일이 아닙니다.');}ev.target.value='';}
  function showInstallHelp(){openModal(`<div class="modal-head"><h2>휴대전화에 설치하기</h2><button class="modal-close" id="modalClose">×</button></div><div class="script-text" style="font-size:15px"><b>인터넷 주소로 열었을 때</b><br>Chrome 메뉴의 “앱 설치” 또는 “홈 화면에 추가”를 누르세요. 설치 후 한 번 실행하면 오프라인에서도 사용할 수 있습니다.<br><br><b>HTML 파일로 직접 열었을 때</b><br>행사 편집과 진행은 가능하지만 앱 설치, 화면 꺼짐 방지 등 일부 기능이 제한될 수 있습니다.<br><br><b>행사 전 점검</b><br>비행기 모드에서 실행, 진동, 글자 크기, 화면 자동 꺼짐 설정을 반드시 확인하세요.</div><div class="modal-actions"><button class="btn primary" id="modalOkay">확인</button></div>`);$('#modalClose').onclick=$('#modalOkay').onclick=closeModal;}

  function render(){if(state.view==='home')renderHome();else if(state.view==='editor')renderEditor();else if(state.view==='script')renderScript();else if(state.view==='run')renderRun();}
  $('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
  window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&state.view==='run'&&$('#wakeRunBtn')?.classList.contains('active')&&'wakeLock'in navigator){try{wakeLock=await navigator.wakeLock.request('screen');}catch(e){}}});
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      await reg.update();
      let reloading=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(reloading)return;reloading=true;location.reload();
      });
    }catch(e){}
  });
  load();render();
})();
