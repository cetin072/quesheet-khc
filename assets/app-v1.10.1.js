(()=>{
  'use strict';
  const STORAGE_KEY='eventCueStudio.v1';
  const APP_VERSION='1.10.2';
  const Core=globalThis.EventCueCore;
  if(!Core)throw new Error('EventCueCore가 먼저 로드되어야 합니다.');
  const $=s=>document.querySelector(s);
  const esc=Core.escapeHtml;
  const nl=s=>esc(s).replace(/\n/g,'<br>');
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const clone=o=>JSON.parse(JSON.stringify(o));
  const today=()=>Core.getLocalDateKey(new Date());
  let runTimer=null,runSeconds=0,touchStart=null;
  let state={data:null,view:'home',eventId:null,stepId:null,runIndex:0,runActiveSteps:[],fontIndex:1,vibration:true,wakeEnabled:false,lastSaved:null,saveError:false,searchOpen:false,query:'',filter:'all',statusFilter:'all',sort:'dday'};
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

  const openingStepsLegacy=[
    {
      "title": "00. 내빈 착석 안내",
      "duration": "15분 · 14:45~15:00",
      "script": "안녕하십니까. 오늘 개소식 진행을 맡은 사회자 ○○○입니다.\n잠시 후 오후 3시부터 농업회사법인 태장 주식회사 개소식이 시작됩니다.\n참석해 주신 내빈 여러분께서는 앞쪽 좌석부터 착석해 주시기 바랍니다.\n\n행사 시작 3분 전입니다. 원활한 진행을 위해 휴대전화는 무음으로 전환해 주시기 바랍니다.\n행사 중 사진 촬영은 자유롭게 하셔도 좋습니다.",
      "owner": "사회자, 안내요원",
      "materials": "",
      "avCue": "",
      "cue": "2~3분 간격으로 반복 안내. 내빈 착석 유도\n14:57경\n대표이사·주요 내빈 착석 여부 확인\n장애인 음악단 대기 상태, 마이크·영상 송출 최종 점검",
      "contingency": ""
    },
    {
      "title": "01. 식전 음악행사",
      "duration": "10분 · 15:00~15:10",
      "script": "기다려 주셔서 감사합니다.\n본 행사에 앞서, 오늘 이 자리를 축하해 주실 특별한 무대를 준비했습니다.\n장애인 음악단 ○○○의 축하 연주입니다. 큰 박수로 맞이해 주시기 바랍니다.\n\n아름다운 연주였습니다. 이어서 두 번째 곡 들려드리겠습니다.\n\n장애인 음악단 ○○○이었습니다. 다시 한번 큰 박수 부탁드립니다.\n오늘 태장의 시작을 가장 잘 표현해 준 무대가 아니었나 생각합니다.",
      "owner": "사회자, 장애인 음악단, 음향 담당자",
      "materials": "",
      "avCue": "",
      "cue": "연주 1곡 종료 후\n연주 2곡 종료 후\n음악단 퇴장 동선 확보, 무대 정리 30초 이내",
      "contingency": ""
    },
    {
      "title": "02. 제1부 개식",
      "duration": "2분 · 15:10~15:12",
      "script": "지금부터 농업회사법인 태장 주식회사 개소식을 시작하겠습니다.\n태장은 「장애인고용촉진 및 직업재활법」에 따른 자회사형 장애인 표준사업장으로,\n지난 7월 한국장애인고용공단으로부터 인증을 받았습니다.\n또한 경상남도로부터 경남형 장애인 동행일자리 제1호 기업으로 지정되었습니다.\n오늘 이 자리는 단순히 회사 하나가 문을 여는 자리가 아닙니다.\n장애인 근로자에게 안정적인 일자리를 만들고, 네 개 모회사와 지역사회가 함께\n그 일자리를 지켜 나가겠다는 약속을 확인하는 자리입니다.\n바쁘신 중에도 함께해 주신 내빈 여러분께 깊이 감사드립니다.",
      "owner": "사회자",
      "materials": "",
      "avCue": "",
      "cue": "",
      "contingency": ""
    },
    {
      "title": "03. 국민의례",
      "duration": "5분 · 15:12~15:17",
      "script": "먼저 국민의례가 있겠습니다.\n모두 자리에서 일어나 정면에 있는 국기를 향해 주시기 바랍니다.\n\n국기에 대하여 경례.\n\n바로.\n\n다음은 애국가 제창이 있겠습니다. 애국가는 1절만 부르겠습니다.\n\n이상으로 국민의례를 마치겠습니다. 모두 자리에 앉아 주시기 바랍니다.",
      "owner": "사회자, 음원 담당자",
      "materials": "",
      "avCue": "",
      "cue": "전원 기립 확인 후\n국기에 대한 맹세문 방송 → 종료 후\n반주 시작 → 제창 종료 후\n거동이 불편한 참석자는 착석 상태로 예를 갖추어도 무방함을 사전 안내\n맹세문·애국가 음원 재생 담당자와 큐 사인 사전 약속",
      "contingency": ""
    },
    {
      "title": "04. 태장 회사소개 | 김형철 전무이사",
      "duration": "5분 · 15:17~15:22",
      "script": "이어서 태장의 회사소개가 있겠습니다.\n태장이 왜 만들어졌고, 지금 어떤 사람들이 어떤 일을 하고 있으며,\n앞으로 어디로 가려 하는지 직접 설명드리겠습니다.\n발표에 태장 김형철 전무이사님을 모시겠습니다. 박수로 맞아 주십시오.\n\n감사합니다. 김형철 전무이사였습니다.",
      "owner": "김형철 전무이사, 사회자, 영상 담당자",
      "materials": "",
      "avCue": "",
      "cue": "발표 종료 후\nPPT 첫 슬라이드 송출 대기 상태 확인\n무선 마이크·포인터 사전 전달",
      "contingency": ""
    },
    {
      "title": "05. 대표이사 인사말 | 이영희 대표이사",
      "duration": "4분 · 15:22~15:26",
      "script": "다음은 대표이사 인사말 순서입니다.\n태장의 문을 열기까지 가장 앞에서 이끌어 오신 분입니다.\n농업회사법인 태장 주식회사 이영희 대표이사님의 인사말이 있겠습니다.\n큰 박수로 맞아 주시기 바랍니다.\n\n이영희 대표이사님의 인사말이었습니다. 감사합니다.",
      "owner": "이영희 대표이사, 사회자",
      "materials": "",
      "avCue": "",
      "cue": "인사말 종료 후",
      "contingency": ""
    },
    {
      "title": "06. 영상 축사",
      "duration": "5분 · 15:26~15:31",
      "script": "오늘 뜻깊은 자리에 함께하고 싶으셨지만 일정상 참석이 어려우신 분들께서\n영상으로 축하 인사를 보내 주셨습니다. 영상으로 만나 보시겠습니다.\n\n귀한 축하 말씀 보내 주신 ○○○님, ○○○님께 이 자리를 빌려 감사드립니다.",
      "owner": "사회자, 영상·음향 담당자",
      "materials": "",
      "avCue": "",
      "cue": "영상 송출 → 종료 후\n영상 파일 순서·자막·음량 사전 테스트 필수\n송출 사고 대비 멘트 — 『잠시 준비 관계로 순서를 바꾸어, 참석 내빈 소개를 먼저 진행하겠습니다.』",
      "contingency": ""
    },
    {
      "title": "07. 참석 내빈 소개 및 인사말",
      "duration": "8분 · 15:31~15:39",
      "script": "다음은 오늘 함께해 주신 내빈을 소개해 드리겠습니다.\n호명해 드리면 자리에서 일어나 인사해 주시기 바랍니다.\n박수는 소개가 모두 끝난 후에 함께 보내 주시면 감사하겠습니다.\n\n경상남도 ○○○ 도지사님.\n\n창원시 ○○○ 시장님.\n\n경상남도교육청 ○○○ 교육감님.\n\n경남경영자총협회 ○○○ 회장님.\n\n한국장애인고용공단 ○○○ ○○님.\n\n범한메카텍 주식회사 ○○○ ○○님.\n\n주식회사 삼현 ○○○ ○○님.\n\n주식회사 청우비제이 ○○○ ○○님.\n\n현대비앤지스틸 주식회사 ○○○ ○○님.\n\n그 밖에도 오늘 많은 분들이 함께해 주셨습니다.\n일일이 소개해 드리지 못한 점 양해 부탁드리며, 참석해 주신 모든 분들께\n큰 박수 부탁드립니다.\n\n이어서 주요 내빈의 인사말을 듣겠습니다.\n\n먼저 ○○○ ○○님의 인사말이 있겠습니다.\n\n다음으로 ○○○ ○○님을 모시겠습니다.\n\n귀한 말씀 주신 내빈 여러분께 다시 한번 감사드립니다.",
      "owner": "사회자, 주요 내빈, 의전 담당자",
      "materials": "",
      "avCue": "",
      "cue": "호명 — 의전 순서에 따라\n내빈 1\n종료 후 → 『감사합니다.』\n내빈 2 ~ 4 동일 반복\n전체 종료 후\n모회사는 가나다순 고정 — 범한메카텍, 삼현, 청우비제이, 현대비앤지스틸\n인사말은 최대 4명, 1인 2분 이내 — 사전에 대상자·순서 확정 및 개별 통지\n시간 초과 시 개입 멘트 — 『감사합니다. 좋은 말씀 더 듣고 싶습니다만, 다음 순서가 있어 이쯤에서 정리하겠습니다.』\n미착석·지각 내빈 발생 시 소개 순서 뒤로 조정, 인사말은 생략 가능",
      "contingency": ""
    },
    {
      "title": "08. 직원 대표 인사",
      "duration": "2분 · 15:39~15:41",
      "script": "다음은 오늘 이 자리의 주인공이라 할 수 있는 순서입니다.\n태장에서 매일 일하고 있는 근로자를 대표해 ○○○ 님이 인사 말씀을 전해 주시겠습니다.\n따뜻한 박수로 맞아 주시기 바랍니다.\n\n감사합니다. ○○○ 님이었습니다.\n오늘 이 회사가 무엇을 위해 만들어졌는지, 가장 분명하게 보여 주는 순간이었습니다.",
      "owner": "직원 대표, 사회자, 지원 담당자",
      "materials": "",
      "avCue": "",
      "cue": "인사 종료 후\n대본 사전 전달 및 리허설 권장. 긴장 시 사회자가 옆에서 마이크 보조\n발화가 어려울 경우 사회자가 미리 받은 인사말을 대독하는 방식으로 전환",
      "contingency": ""
    },
    {
      "title": "09. 제1부 단체사진",
      "duration": "3분 · 15:41~15:44",
      "script": "이어서 기념촬영이 있겠습니다.\n대표이사님과 내빈 여러분, 그리고 태장 임직원 모두 앞쪽으로 나와 주시기 바랍니다.\n\n앞줄은 앉으시고, 뒷줄은 서 주시기 바랍니다.\n가운데 자리는 내빈 여러분께서 서 주시면 감사하겠습니다.\n\n모두 정면 카메라 봐 주시기 바랍니다.\n하나, 둘, 셋! 감사합니다. 한 장 더 찍겠습니다. 하나, 둘, 셋!",
      "owner": "사회자, 촬영팀, 진행요원",
      "materials": "",
      "avCue": "",
      "cue": "정렬 유도 — 앞줄 중앙에 주요 내빈, 양옆으로 확장\n정렬 완료 후\n사전 배치도 준비, 진행요원 2명이 좌우에서 정렬 유도\n휠체어·거동 불편 참석자 동선을 앞줄 가장자리로 미리 확보",
      "contingency": ""
    },
    {
      "title": "10. 제2부 안내 및 이동",
      "duration": "2분 · 15:44~15:46",
      "script": "이제 제2부, 현판 제막식을 진행하겠습니다.\n제막에 함께해 주실 분들을 호명해 드리겠습니다. 호명되신 분은 현판 앞으로 이동해 주시기 바랍니다.\n\n경상남도 ○○○ 도지사님.\n\n창원시 ○○○ 시장님.\n\n경상남도교육청 ○○○ 교육감님.\n\n경남경영자총협회 ○○○ 회장님.\n\n한국장애인고용공단 ○○○ ○○님.\n\n범한메카텍, 삼현, 청우비제이, 현대비앤지스틸 네 개 모회사 관계자분들.\n\n태장 이영희 대표이사님.\n\n나머지 참석자분들께서는 현판 정면이 잘 보이는 위치에 자리해 주시기 바랍니다.\n촬영에 방해되지 않도록 진행요원의 안내를 따라 주시면 감사하겠습니다.",
      "owner": "사회자, 의전 담당자, 이동 진행요원",
      "materials": "",
      "avCue": "",
      "cue": "호명\n제막 줄 위치 사전 표시, 담당자별 손잡을 지점 지정\n실내 → 현판 위치 이동 동선에 진행요원 배치",
      "contingency": ""
    },
    {
      "title": "11. 현판 동시 제막",
      "duration": "4분 · 15:46~15:50",
      "script": "오늘 제막하는 현판은 모두 여섯 가지입니다.\n첫째, 경상남도가 지정한 경남형 장애인 동행일자리 제1호 지정패입니다.\n둘째, 한국장애인고용공단이 인증한 장애인 표준사업장 인증패입니다.\n그리고 태장과 함께하는 네 개 모회사, 범한메카텍 주식회사, 주식회사 삼현,\n주식회사 청우비제이, 현대비앤지스틸 주식회사의 현판입니다.\n여섯 개 현판을 동시에 제막하겠습니다.\n제막에 참여하실 분들께서는 앞에 있는 줄을 잡아 주시기 바랍니다.\n\n준비되셨습니까? 그럼 다 함께 세어 보겠습니다.\n하나, 둘, 셋!\n\n농업회사법인 태장 주식회사, 그리고 경남형 장애인 동행일자리 제1호 기업의\n공식적인 시작입니다. 큰 박수 부탁드립니다.",
      "owner": "사회자, 제막 참여자, 촬영팀",
      "materials": "",
      "avCue": "",
      "cue": "전원 파지 확인 후\n제막\n제막포 고정 상태 사전 점검 — 바람·걸림 여부\n제막 직후 3~5초 정지 요청 — 촬영 확보",
      "contingency": ""
    },
    {
      "title": "12. 유관기관 합동 촬영",
      "duration": "2분 · 15:50~15:52",
      "script": "이어서 합동 기념촬영을 진행하겠습니다.\n경상남도 관계자, 한국장애인고용공단 및 표준사업장 관계자,\n그리고 태장 관계자께서는 현판 앞으로 모여 주시기 바랍니다.\n\n가운데 지정패와 인증패가 가려지지 않도록 조금씩 벌려 서 주시기 바랍니다.\n정면 봐 주십시오. 하나, 둘, 셋! 한 장 더 갑니다. 하나, 둘, 셋! 감사합니다.",
      "owner": "사회자, 촬영팀, 유관기관·태장 관계자",
      "materials": "",
      "avCue": "",
      "cue": "정렬 후",
      "contingency": ""
    },
    {
      "title": "13. 모회사별 촬영 ① 범한메카텍㈜",
      "duration": "2분 · 15:52~15:54",
      "script": "이제 모회사별 기념촬영을 진행하겠습니다.\n회사별 현판 앞에서 회사명 현수막을 펼쳐 촬영하겠으며,\n순서는 가나다순으로 진행하겠습니다.\n먼저 범한메카텍 주식회사입니다.\n범한메카텍 관계자분들과 태장 관계자께서는 범한메카텍 현판 앞으로 이동해 주시기 바랍니다.\n\n현수막 양쪽 끝 잘 잡아 주시고, 글씨가 접히지 않게 펴 주시기 바랍니다.\n정면 봐 주십시오. 하나, 둘, 셋! 감사합니다.",
      "owner": "사회자, 촬영팀, 범한메카텍·태장 관계자",
      "materials": "",
      "avCue": "",
      "cue": "현수막 전개 확인 후",
      "contingency": ""
    },
    {
      "title": "14. 모회사별 촬영 ② 주식회사 삼현",
      "duration": "2분 · 15:54~15:56",
      "script": "다음은 주식회사 삼현입니다.\n삼현 관계자분들과 태장 관계자께서는 삼현 현판 앞으로 이동해 주시기 바랍니다.\n\n정면 봐 주십시오. 하나, 둘, 셋! 감사합니다.",
      "owner": "사회자, 촬영팀, 삼현·태장 관계자",
      "materials": "",
      "avCue": "",
      "cue": "현수막 전개 확인 후",
      "contingency": ""
    },
    {
      "title": "15. 모회사별 촬영 ③ 주식회사 청우비제이",
      "duration": "2분 · 15:56~15:58",
      "script": "다음은 주식회사 청우비제이입니다.\n청우비제이 관계자분들과 태장 관계자께서는 청우비제이 현판 앞으로 이동해 주시기 바랍니다.\n\n정면 봐 주십시오. 하나, 둘, 셋! 감사합니다.",
      "owner": "사회자, 촬영팀, 청우비제이·태장 관계자",
      "materials": "",
      "avCue": "",
      "cue": "현수막 전개 확인 후",
      "contingency": ""
    },
    {
      "title": "16. 모회사별 촬영 ④ 현대비앤지스틸㈜ 및 폐식",
      "duration": "2분 · 15:58~16:00",
      "script": "마지막으로 현대비앤지스틸 주식회사입니다.\n현대비앤지스틸 관계자분들과 태장 관계자께서는 현판 앞으로 이동해 주시기 바랍니다.\n\n정면 봐 주십시오. 하나, 둘, 셋! 감사합니다.\n\n이상으로 모든 순서를 마쳤습니다.\n오늘 태장은 문을 열었지만, 진짜 시작은 내일부터입니다.\n이곳에서 매일 일하게 될 근로자들이 오래 일할 수 있도록,\n함께해 주시는 모든 분들의 변함없는 관심과 응원을 부탁드립니다.\n바쁘신 중에도 끝까지 자리를 지켜 주신 내빈 여러분께 깊이 감사드립니다.\n촬영을 마치신 후에는 사업장을 자유롭게 둘러보시고,\n준비된 다과도 함께 나누어 주시기 바랍니다.\n이상으로 농업회사법인 태장 주식회사 개소식을 모두 마치겠습니다.\n안녕히 가십시오. 감사합니다.",
      "owner": "사회자, 촬영팀, 현대비앤지스틸·태장 관계자",
      "materials": "",
      "avCue": "",
      "cue": "현수막 전개 확인 후\n전체 촬영 종료 후 — 중앙으로 이동",
      "contingency": ""
    }
  ];

  const openingSteps=[
    {title:'00. 식전 음악행사',duration:'10분 · 15:00~15:10',script:'내빈 여러분, 반갑습니다. 잠시 후 경상남도와 한국장애인고용공단, 경남경영자총연합회가 함께 추진한 민·관협력 장애인표준사업장 경남형 장애인동행일자리 1호점 개소식을 시작할 예정입니다.\n본행사에 앞서 뜻깊은 출발을 축하하기 위한 장애인 음악단의 축하연주 두 곡을 함께 감상하시겠습니다. 여러분의 따뜻한 박수로 맞아주시기 바랍니다.\n\n멋진 연주를 들려주신 음악단 여러분께 다시 한번 큰 박수 부탁드립니다. 감사합니다.\n잠시 후 본행사를 시작하겠습니다.',owner:'사회자, 장애인 음악단, 음향 담당자',materials:'',avCue:'',cue:'장애인 음악단 축하연주 2곡',contingency:''},
    {title:'01. 제1부 개회',duration:'2분 · 15:10~15:12',script:'지금부터 민·관협력 장애인표준사업장 경남형 장애인동행일자리 1호점인 농업회사법인 태장 주식회사의 개소식을 시작하겠습니다.\n바쁘신 일정에도 불구하고 새로운 출발을 축하하기 위해 귀한 걸음 해주신 내빈 여러분과 관계자 여러분께 진심으로 감사드립니다.\n그럼 먼저 국민의례가 있겠습니다.',owner:'사회자',materials:'',avCue:'',cue:'',contingency:''},
    {title:'02. 국민의례',duration:'2분 · 15:12~15:14',script:'모두 자리에서 일어나 전면의 국기를 향해 주시기 바랍니다.\n\n국기에 대하여 경례. 바로.\n\n이어서 애국가를 제창하겠습니다. 애국가는 1절만 제창하겠습니다.\n\n모두 자리에 앉아주시기 바랍니다.',owner:'사회자, 음원 담당자',materials:'국기, 국민의례·애국가 음원',avCue:'',cue:'국기에 대한 경례 진행\n애국가 1절 제창(상황에 따라 생략)',contingency:''},
    {title:'03. 내빈 소개',duration:'6분 · 15:14~15:20',script:'다음은 오늘 뜻깊은 자리를 함께해 주신 주요 내빈을 소개해 드리겠습니다. 호명되시는 분께서는 자리에서 가볍게 일어나 인사해 주시면 감사하겠습니다.\n\n경상남도의회 문화복지위원회 김순택 위원장님\n경상남도의회 경제환경위원회 박진현 위원님\n경상남도 복지여성국 김영선 국장님\n창원시 복지여성보건국 윤성주 국장님\n한국장애인고용공단 경남동부지사 김창곤 지사장님\n경남지체장애인연합회 박성호 회장님\n경남 벤처기업협회 김대권 회장님\n\n그리고 태장의 모기업을 대표하여 참석해 주신 분들을 소개해 드리겠습니다.\n범한메카텍 주식회사에서 김홍남 팀장님, 이준혁 팀장님, 김동민 파트리더님 참석하셨습니다.\n주식회사 삼현에서 이창준 부장님, 양용석 과장님 참석하셨습니다.\n주식회사 청우비제이에서 박영석 이사님 참석하셨습니다.\n현대비앤지스틸 주식회사에서 양국 실장님, 강의송 사원님 참석하셨습니다.\n참석해 주신 모든 분께 감사의 박수 부탁드립니다.',owner:'사회자, 의전 담당자',materials:'최종 내빈 명단',avCue:'',cue:'주요 기관 내빈 소개 후 그 외 내빈 호명\n모회사 참석자 소개',contingency:''},
    {title:'04. 회사소개 PT(경과보고)',duration:'5분 · 15:20~15:25',script:'다음은 경남형 동행일자리 1호점인 농업회사법인 태장 주식회사의 설립 경과와 현재의 고용 현황, 사업 내용과 앞으로의 비전을 소개하는 시간을 갖겠습니다.\n회사소개는 김형철 전무이사께서 진행해 주시겠습니다. 큰 박수로 맞아주시기 바랍니다.\n\n감사합니다. 태장 앞날의 번창에 큰 응원 부탁드립니다.',owner:'김형철 전무이사, 사회자, 영상 담당자',materials:'회사소개 PT, 무선 마이크, 포인터',avCue:'',cue:'김형철 전무이사 회사소개 PT · 약 5분',contingency:''},
    {title:'05. 대표이사 환영인사',duration:'3분 · 15:25~15:28',script:'다음은 농업회사법인 태장 주식회사 이영희 대표이사님의 환영사가 있겠습니다. 앞으로 모시겠습니다.\n\n감사합니다. 뜻깊은 말씀을 전해주신 이영희 대표이사님께 큰 박수 부탁드립니다.',owner:'이영희 대표이사, 사회자',materials:'무선 마이크',avCue:'',cue:'이영희 대표이사 환영사 · 약 3분',contingency:''},
    {title:'06. 영상 축사',duration:'4분 · 15:28~15:32',script:'다음은 경남형 동행일자리 1호점 개소를 축하하기 위해 보내주신 영상 축사를 만나보겠습니다.\n먼저 경상남도지사님의 축하 말씀을 영상으로 만나보겠습니다.\n\n감사합니다. 이어서 창원시장님의 축하 말씀을 영상으로 만나보겠습니다.\n\n뜻깊은 축하 말씀을 보내주신 두 분께 감사드립니다.',owner:'사회자, 영상·음향 담당자',materials:'경상남도지사·창원시장 영상 파일',avCue:'',cue:'경상남도지사 영상 축사 상영\n창원시장 영상 축사 상영',contingency:''},
    {title:'07. 참석 내빈 축사·인사말 및 축전 소개',duration:'6분 · 15:32~15:38',script:'이어서 오늘 직접 자리를 함께해 주신 주요 내빈의 축하 말씀을 듣겠습니다.\n먼저 김순택 경상남도의회 문화복지위원장님의 축사를 듣겠습니다. 큰 박수로 모시겠습니다.\n\n감사합니다. 이어서 한국장애인고용공단 경남동부지사 김창곤 지사장님의 축사를 듣겠습니다. 큰 박수 부탁드립니다.\n\n귀한 축하 말씀을 전해주신 내빈 여러분께 다시 한번 감사의 박수 부탁드립니다.\n이어서 박성호 경남지체장애인연합회 회장님의 축사를 듣겠습니다. 큰 박수 부탁드립니다.\n\n감사합니다.\n\n다음은 오늘 이 자리에 참석하지 못한 김종양 국회의원님의 축사를 보좌관님께서 대독해 주시겠습니다.\n\n감사합니다.\n\n이어서 오늘 개소식을 축하하며 보내주신 축전을 소개해 드리겠습니다.\n\n축전을 보내주신 모든 분께 감사드립니다.',owner:'사회자, 축사 내빈, 대독 보좌관',materials:'축사·축전 원문, 무선 마이크',avCue:'',cue:'김순택 경상남도의회 문화복지위원장 축사\n김창곤 한국장애인고용공단 경남동부지사장 축사\n박성호 경남지체장애인연합회 회장 축사\n김종양 국회의원 축사 대독 · 보좌관\n최형두 국회의원 축전, 이상연 경남경영자총연합회 회장 축전 등',contingency:''},
    {title:'08. 직원 대표 인사',duration:'2분 · 15:38~15:40',script:'다음은 태장에서 함께 근무하고 있는 직원들을 대표하여 장애인 근로자 대표 한 분의 인사 말씀을 듣겠습니다.\n큰 박수로 맞아주시기 바랍니다.\n\n감사합니다. 태장이 직원 모두가 함께 일하고 성장하는 좋은 일터가 될 수 있도록 많은 응원 부탁드립니다.',owner:'장애인 근로자 대표, 사회자, 지원 담당자',materials:'무선 마이크',avCue:'',cue:'장애인 근로자 대표 1인 인사말',contingency:''},
    {title:'09. 제1부 단체사진',duration:'3분 · 15:40~15:43',script:'이것으로 제1부 기념식 순서를 마무리하면서 대표이사와 주요 내빈, 직원 여러분의 전체 기념사진을 촬영하겠습니다.\n촬영 대상자께서는 진행요원의 안내에 따라 지정된 위치로 이동해 주시기 바랍니다.',owner:'사회자, 촬영팀, 진행요원',materials:'카메라, 앞줄 의자',avCue:'',cue:'전체 기념촬영 · 2~3회',contingency:''},
    {title:'10. 제2부 현판 동시 제막 및 사진촬영',duration:'7분 · 15:43~15:50',script:'이어서 제2부 현판 제막식을 진행하겠습니다.\n제막식에 참여하시는 내빈과 관계자 여러분께서는 진행요원의 안내에 따라 제막 위치로 이동해 주시기 바랍니다.\n제막식과 기념촬영을 모두 마친 뒤에는 사업장을 자유롭게 관람해 주시고, 준비된 다과도 함께 이용해 주시면 감사하겠습니다.\n지금부터 태장의 새로운 출발을 기념하는 현판 제막을 진행하겠습니다.\n오늘은 경남형 장애인 동행일자리 제1호점 현판, 장애인 표준사업장 인증패, 그리고 범한메카텍㈜, 삼현㈜, 청우비제이㈜, 현대비앤지스틸㈜의 공동출자기업 현판을 함께 제막하겠습니다.\n\n제막에 함께해 주실 분들을 호명해 드리겠습니다. 호명되신 분은 현판 앞으로 이동해 주시기 바랍니다.\n경상남도의회 문화복지위원회 김순택 위원장님\n경상남도의회 경제환경위원회 박진현 위원님\n경상남도 복지여성국 김영선 국장님\n창원시 복지여성보건국 윤성주 국장님\n한국장애인고용공단 경남동부지사 김창곤 지사장님\n경남지체장애인연합회 박성호 회장님\n경남 벤처기업협회 김대권 회장님\n\n범한메카텍 주식회사 김홍남 팀장님\n주식회사 삼현의 이창준 부장님\n주식회사 청우비제이의 박영석 이사님\n현대비앤지스틸 주식회사의 양국 실장님\n\n나머지 참석자분들께서는 현판 정면이 잘 보이는 위치에 자리해 주시기 바랍니다. 촬영에 방해되지 않도록 진행요원의 안내를 따라 주시면 감사하겠습니다.\n\n제막에 참여하시는 분께서는 제막끈을 잡아주시기 바랍니다.\n제가 하나, 둘, 셋을 외치면 함께 당겨주시기 바랍니다. 하나, 둘, 셋!\n\n축하드립니다. 큰 박수 부탁드립니다.\n이어서 제막을 기념하는 공식 사진 촬영을 진행하겠습니다.\n주요 내빈과 경상남도, 장애인고용공단 및 표준사업장 관계자, 태장 관계자께서는 현판 앞에 자리해 주시기 바랍니다.',owner:'사회자, 제막 참여자, 의전 담당자, 촬영팀',materials:'제막끈, 현판 제막천, 장갑, 카메라',avCue:'',cue:'주요 기관 내빈 호명 후 그 외 내빈 호명\n현판 동시 제막\n유관기관 합동 기념촬영',contingency:''},
    {title:'11. 모회사별 촬영 ① 범한메카텍㈜',duration:'15:50~16:00 중 순차 진행',script:'다음으로 모기업별 촬영을 진행하겠습니다.\n먼저 범한메카텍㈜ 기념촬영을 진행하겠습니다. 김홍남 팀장님, 이준혁 팀장님, 김동민 파트리더님과 태장 관계자께서는 범한메카텍 현판 앞으로 자리해 주시기 바랍니다.\n회사명 현수막을 펼쳐주시고 정면을 바라봐 주시기 바랍니다.',owner:'사회자, 촬영팀, 범한메카텍·태장 관계자',materials:'범한메카텍 회사명 현수막',avCue:'',cue:'범한메카텍㈜ 단체촬영',contingency:''},
    {title:'12. 모회사별 촬영 ② 삼현㈜',duration:'15:50~16:00 중 순차 진행',script:'다음은 삼현㈜ 기념촬영입니다. 이창준 부장님, 양용석 과장님과 태장 관계자께서는 삼현 현판 앞으로 자리해 주시기 바랍니다.\n회사명 현수막을 펼쳐주시고 정면을 바라봐 주시기 바랍니다.',owner:'사회자, 촬영팀, 삼현·태장 관계자',materials:'삼현 회사명 현수막',avCue:'',cue:'삼현㈜ 단체촬영',contingency:''},
    {title:'13. 모회사별 촬영 ③ 청우비제이㈜',duration:'15:50~16:00 중 순차 진행',script:'다음은 청우비제이㈜ 기념촬영입니다. 박영석 이사님과 태장 관계자께서는 청우비제이 현판 앞으로 자리해 주시기 바랍니다.\n회사명 현수막을 펼쳐주시고 정면을 바라봐 주시기 바랍니다.',owner:'사회자, 촬영팀, 청우비제이·태장 관계자',materials:'청우비제이 회사명 현수막',avCue:'',cue:'청우비제이㈜ 단체촬영',contingency:''},
    {title:'14. 모회사별 촬영 ④ 현대비앤지스틸㈜',duration:'15:50~16:00 중 순차 진행',script:'마지막으로 현대비앤지스틸㈜ 기념촬영입니다. 양국 실장님, 강의송 사원님과 태장 관계자께서는 현대비앤지스틸 현판 앞으로 자리해 주시기 바랍니다.\n회사명 현수막을 펼쳐주시고 정면을 바라봐 주시기 바랍니다.',owner:'사회자, 촬영팀, 현대비앤지스틸·태장 관계자',materials:'현대비앤지스틸 회사명 현수막',avCue:'',cue:'현대비앤지스틸㈜ 단체촬영',contingency:''},
    {title:'15. 폐식',duration:'16:00',script:'이상으로 경남형 장애인동행일자리 1호점 개소식의 모든 공식 일정을 마치겠습니다.\n바쁘신 가운데 경남형 동행일자리 1호점인 농업회사법인 태장 주식회사의 새로운 출발을 함께 축하해 주신 내빈 여러분과 관계자 여러분께 진심으로 감사드립니다.\n태장이 장애인 근로자와 함께 성장하며 지역사회에 꼭 필요한 일터로 자리 잡을 수 있도록 앞으로도 많은 관심과 응원 부탁드립니다.\n참석해 주신 모든 분께 다시 한번 감사드립니다. 이상으로 행사를 모두 마치겠습니다. 감사합니다.',owner:'사회자',materials:'',avCue:'',cue:'모회사별 촬영 완료 후 폐식',contingency:''}
  ];

  const taejangOpeningNotes="최종본 기준: 태장㈜ 개소식 시나리오 2026-08-11\n일시: 2026년 8월 12일(수) 15:00~16:00\n구성: 식전 음악행사 → 제1부 기념식 → 제2부 현판 제막식 및 기념촬영\n\n행사 직전 최종 입력사항\n1. 주요 기관·유관기관 전체 내빈 소개 명단 및 의전 순서\n2. 김종양 국회의원 축사 대독 보좌관 성명·직책\n3. 한국장애인고용공단 경남동부지사장 정확한 성명·직책\n4. 최형두 국회의원 외 축전 2인의 성명·직책 및 축전 원문\n5. 직원 대표 인사자 성명\n6. 사진촬영 위치 및 각 모회사 현수막 준비 담당자";

  const withIds=arr=>arr.map((s,i)=>({id:uid(),enabled:s.enabled!==false,completed:false,...s}));
  const seedData=()=>({version:APP_VERSION,events:[
    {id:uid(),templateKey:'iseo-first-birthday',templateRevision:2,type:'돌잔치',title:'이서 첫 돌잔치',date:'2026-07-18',time:'17:00',location:'',host:'엄마 이경진',notes:'성장 영상과 케이크·축하 노래는 생략. 돌잡이 용품 7종과 돌잡이상·쪽집게상·아차상 추첨을 진행. 공식행사 약 18~22분.',steps:withIds(birthdaySteps),createdAt:Date.now(),updatedAt:Date.now()},
    {id:uid(),templateKey:'taejang-opening-20260812',templateRevision:4,type:'개소식',status:'준비 완료',title:'농업회사법인 태장 주식회사 개소식',date:'2026-08-12',time:'15:00',location:'창원 신화더플렉스시티 태장㈜ 사업장',host:'○○○',notes:taejangOpeningNotes,steps:withIds(openingSteps),createdAt:Date.now(),updatedAt:Date.now()}
  ],trash:[]});
  const save=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.data));state.lastSaved=Date.now();state.saveError=false;updateSaveState();return true;}catch(e){state.saveError=true;updateSaveState();return false;}};
  const isLegacyIseoBirthday=e=>e&&e.title==='이서 첫 돌잔치'&&e.date==='2026-07-18'&&Array.isArray(e.steps)&&(
    e.templateKey==='iseo-first-birthday'||
    e.steps.some(s=>s.title==='아차상 2명 추첨')||
    e.steps.some(s=>String(s.script||'').includes('계산기는 수리 능력'))||
    e.steps.some(s=>String(s.script||'').includes('번호표를 한 장 받아'))
  );
  const isLegacyTaejangOpening=e=>e&&e.title==='농업회사법인 태장 주식회사 개소식'&&e.date==='2026-08-12'&&Array.isArray(e.steps)&&(
    (e.templateKey==='taejang-opening-20260812'&&e.templateRevision!==4)||
    (!e.templateKey&&e.location==='태장 본점'&&e.steps.some(s=>s.title==='현판식 또는 테이프 커팅'))
  );
  const migrateData=data=>{
    let changed=Core.normalizeData(data,APP_VERSION);
    data.events=data.events.map(e=>{
      if(isLegacyIseoBirthday(e)&&e.templateRevision!==2){
        changed=true;
        return {...e,templateKey:'iseo-first-birthday',templateRevision:2,notes:'성장 영상과 케이크·축하 노래는 생략. 돌잡이 용품 7종과 돌잡이상·쪽집게상·아차상 추첨을 진행. 공식행사 약 18~22분.',steps:withIds(birthdaySteps),updatedAt:Date.now()};
      }
      if(isLegacyTaejangOpening(e)){
        changed=true;
        return {...e,templateKey:'taejang-opening-20260812',templateRevision:4,type:'개소식',status:'준비 완료',title:'농업회사법인 태장 주식회사 개소식',date:'2026-08-12',time:'15:00',location:'창원 신화더플렉스시티 태장㈜ 사업장',host:e.host||'○○○',notes:taejangOpeningNotes,steps:withIds(openingSteps),updatedAt:Date.now()};
      }
      return e;
    });
    return changed;
  };
  const load=()=>{try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){state.data=JSON.parse(raw);}else{state.data=seedData();save();}if(migrateData(state.data))save();}catch(e){state.data=seedData();save();}};
  const eventById=id=>state.data.events.find(e=>e.id===id);
  const trashById=id=>state.data.trash.find(e=>e.id===id);
  const stepById=(event,id)=>event.steps.find(s=>s.id===id);
  const activeSteps=event=>event.steps.filter(s=>s.enabled!==false);
  const dateText=v=>{const parsed=Core.parseDateKey(v);return parsed?`${parsed.year}년 ${parsed.month}월 ${parsed.day}일`:'날짜 미정';};
  const timeText=v=>v?` ${v}`:'';
  const toast=(msg,action)=>{const el=$('#toast');el.innerHTML=`<span>${esc(msg)}</span>${action?` <button id="toastAction">${esc(action.label)}</button>`:''}`;el.classList.add('show');if(action)$('#toastAction').onclick=()=>{action.run();el.classList.remove('show');};clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),action?6000:1800);};
  const saveText=()=>state.saveError?'저장 실패 — 내용을 복사하거나 JSON 백업을 해 주세요.':state.lastSaved?`저장됨 · 마지막 저장 ${new Date(state.lastSaved).toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'})}`:'저장됨';
  const updateSaveState=()=>{const el=$('#saveState');if(el)el.textContent=saveText();};
  const vibration=Core.createVibrationController({navigatorObject:navigator,storage:localStorage,isEnabled:()=>state.vibration,notify:message=>toast(message)});
  const wake=Core.createWakeLockController({navigatorObject:navigator,notify:message=>toast(message)});
  const vibrate=pattern=>vibration.send(pattern);
  const testVibration=()=>vibration.test();
  const loadRunPreferences=()=>{state.vibration=localStorage.getItem('cueVibration')!=='off';state.wakeEnabled=localStorage.getItem('cueWakeLock')==='on';state.fontIndex=Math.max(0,Math.min(fontLevels.length-1,parseInt(localStorage.getItem('cueFont')||'1',10)));};
  const openModal=html=>{$('#modalBody').innerHTML=html;$('#modal').classList.add('open');};
  const closeModal=()=>$('#modal').classList.remove('open');
  const shell=(title,sub,body,actions='')=>`<div class="app"><header class="topbar"><div class="brand">${esc(title)}${sub?`<small>${esc(sub)}</small>`:''}</div><div class="top-actions">${actions}</div></header><main class="content">${body}</main></div>`;
  const setView=(view,eventId=null)=>{stopRunTimer();releaseWake();state.view=view;state.eventId=eventId;window.scrollTo(0,0);render();};

  function renderHome(){
    const reference=new Date(),filter=state.filter||'all',status=state.statusFilter||'all',order=state.sort||'dday';
    const filtered=Core.filterEvents(state.data.events,{query:state.query,dateFilter:filter,statusFilter:status,referenceDate:reference});
    const events=Core.sortEvents(filtered,order,reference);
    const nearest=Core.sortEvents(state.data.events.filter(event=>['today','upcoming'].includes(Core.classifyEventDate(event,reference))),'dday',reference)[0];
    const cards=events.map(e=>{const enabled=activeSteps(e).length,total=e.steps.length,mins=e.steps.map(s=>Number(String(s.duration||'').match(/\d+/)?.[0]||0)).reduce((a,b)=>a+b,0),dday=Core.calculateDday(e.date,reference);return Core.renderEventCard({event:e,enabled,total,minutes:mins,dateLabel:dateText(e.date)+timeText(e.time),lastModified:new Date(e.updatedAt||Date.now()).toLocaleDateString('ko-KR'),dday,highlight:e.id===nearest?.id&&dday.days<=3});}).join('');
    const empty=state.data.events.length===0?`<div class="empty"><b>아직 만든 행사가 없습니다.</b><br>기본양식을 선택하거나 빈 큐시트로 새 행사를 만들어 보세요.<br><br><button class="btn primary" id="emptyNewBtn">새 행사 만들기</button> <button class="btn" id="emptyImportBtn">백업 파일 불러오기</button></div>`:`<div class="empty">검색·필터 조건에 맞는 행사가 없습니다.</div>`;
    const activeCount=(state.query?1:0)+(filter!=='all'?1:0)+(status!=='all'?1:0)+(order!=='dday'?1:0);
    const searchPanel=state.searchOpen?`<div class="filter-scrim" id="filterScrim"></div><section class="filter-panel" id="searchPanel" aria-label="검색과 필터"><div class="filter-head"><h2>검색·필터·정렬</h2><button type="button" class="modal-close" id="closeSearch" aria-label="검색 패널 닫기">×</button></div><label class="field"><span>행사 검색</span><input id="eventSearch" placeholder="행사명·종류·날짜" value="${esc(state.query||'')}"></label><div class="control-row"><label class="field"><span>날짜 구분</span><select id="eventFilter"><option value="all">전체</option><option value="upcoming">예정</option><option value="today">오늘</option><option value="past">지난 행사</option><option value="undated">날짜 미정</option></select></label><label class="field"><span>상태</span><select id="statusFilter"><option value="all">전체</option>${['작성 중','준비 완료','진행 완료','보관'].map(x=>`<option ${status===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="field"><span>정렬</span><select id="eventSort"><option value="dday">D-Day 가까운 순</option><option value="updated">최근 수정순</option><option value="dateAsc">행사일 빠른순</option><option value="dateDesc">행사일 늦은순</option><option value="title">제목 가나다순</option></select></label></div><button type="button" class="btn small" id="resetFilters">초기화</button></section>`:'';
    const body=`<section class="home-heading"><div><h1>내 큐시트</h1><p>${state.data.events.length}개 행사${activeCount?` · 필터 ${activeCount}개 적용`:''}</p></div><div class="home-actions"><button type="button" class="iconbtn" id="optionsBtn" aria-label="진행 옵션 열기">⚙</button><button type="button" class="iconbtn filter-button ${activeCount?'has-filter':''}" id="searchToggle" aria-label="검색·필터 열기">⌕${activeCount?`<i>${activeCount}</i>`:''}</button><button type="button" class="btn primary" id="newEventBtn">＋ 새 행사</button></div></section>${searchPanel}${cards?`<div class="grid event-grid">${cards}</div>`:empty}<section class="home-management"><button class="btn small" id="importBtn">백업 불러오기</button><button class="btn small" id="exportAllBtn">전체 백업</button><button class="btn small" id="trashBtn">휴지통 ${state.data.trash.length}</button><button class="btn small" id="installHelpBtn">설치 안내</button></section><input class="hidden" type="file" id="importFile" accept="application/json,.json">`;
    $('#root').innerHTML=shell('행사 큐시트',`버전 ${APP_VERSION}`,body,'');
    if(state.searchOpen){$('#eventFilter').value=filter;$('#eventSort').value=order;$('#eventSearch').oninput=e=>{state.query=e.target.value;renderHome();$('#eventSearch')?.focus();};$('#eventFilter').onchange=e=>{state.filter=e.target.value;renderHome();};$('#statusFilter').onchange=e=>{state.statusFilter=e.target.value;renderHome();};$('#eventSort').onchange=e=>{state.sort=e.target.value;renderHome();};$('#closeSearch').onclick=$('#filterScrim').onclick=()=>{state.searchOpen=false;renderHome();};$('#resetFilters').onclick=()=>{state.query='';state.filter='all';state.statusFilter='all';state.sort='dday';renderHome();};}
    $('#searchToggle').onclick=()=>{state.searchOpen=!state.searchOpen;renderHome();if(state.searchOpen)$('#eventSearch')?.focus();};
    $('#optionsBtn').onclick=showOptionsModal;
    $('#newEventBtn').onclick=showNewEventModal;$('#importBtn').onclick=()=>$('#importFile').click();$('#emptyNewBtn')?.addEventListener('click',showNewEventModal);$('#emptyImportBtn')?.addEventListener('click',()=>$('#importFile').click());$('#importFile').onchange=importBackup;$('#exportAllBtn').onclick=exportAll;$('#installHelpBtn').onclick=showInstallHelp;$('#trashBtn').onclick=renderTrash;
    const resetButton=$('#resetAppBtn');if(resetButton)resetButton.onclick=()=>{if(confirm('현재 저장된 모든 행사와 수정 내용이 사라집니다. 예시 데이터로 초기화할까요?')){state.data=seedData();save();render();toast('초기화했습니다.');}};
  }

  function showOptionsModal(){
    loadRunPreferences();
    const wakeSupported=wake.supported();
    openModal(`<div class="modal-head"><h2>진행 옵션</h2><button type="button" class="modal-close" id="modalClose" aria-label="진행 옵션 닫기">×</button></div><div class="settings-list"><label class="field"><span>진동 사용</span><select id="optionVibration"><option value="on" ${state.vibration?'selected':''}>켜기</option><option value="off" ${!state.vibration?'selected':''}>끄기</option></select></label><button type="button" class="btn" id="optionVibrationTest">진동 테스트</button><label class="field"><span>화면 꺼짐 방지</span><select id="optionWake" ${wakeSupported?'':'disabled'}><option value="off" ${!state.wakeEnabled?'selected':''}>끄기</option><option value="on" ${state.wakeEnabled?'selected':''}>켜기</option></select></label>${wakeSupported?'':'<p class="setting-help">이 기기 또는 브라우저에서는 화면 꺼짐 방지를 지원하지 않습니다.</p>'}<label class="field"><span>기본 글자 크기</span><select id="optionFont">${['작게','기본','크게','매우 크게'].map((label,index)=>`<option value="${index}" ${state.fontIndex===index?'selected':''}>${label}</option>`).join('')}</select></label></div><div class="modal-actions"><button type="button" class="btn primary" id="optionsDone">완료</button></div>`);
    $('#modalClose').onclick=$('#optionsDone').onclick=closeModal;
    $('#optionVibration').onchange=event=>{state.vibration=event.target.value==='on';vibration.setEnabled(state.vibration);toast(`진동을 ${state.vibration?'켰습니다.':'껐습니다.'}`);};
    $('#optionVibrationTest').onclick=testVibration;
    $('#optionWake').onchange=event=>{state.wakeEnabled=event.target.value==='on';localStorage.setItem('cueWakeLock',state.wakeEnabled?'on':'off');toast(`화면 꺼짐 방지를 ${state.wakeEnabled?'켰습니다.':'껐습니다.'}`);};
    $('#optionFont').onchange=event=>{state.fontIndex=Number(event.target.value);localStorage.setItem('cueFont',String(state.fontIndex));toast('기본 글자 크기를 저장했습니다.');};
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
  function requestDeleteEvent(id){confirmTrash(id);}
  function confirmTrash(id){
    const e=eventById(id);if(!e)return;openModal(Core.renderDeleteConfirmation(e));$('#modalClose').onclick=$('#cancelTrash').onclick=closeModal;$('#doTrash').onclick=()=>moveToTrash(id);$('#cancelTrash').focus();
  }
  function moveToTrash(id){
    const moved=Core.moveEventToTrash(state.data,id);if(!moved)return;save();closeModal();setView('home');toast('행사를 휴지통으로 이동했습니다.',{label:'실행 취소',run:()=>restoreFromTrash(id)});
  }
  function restoreFromTrash(id){const restored=Core.restoreEventFromTrash(state.data,id);if(!restored)return;save();render();toast('행사를 복원했습니다.');}
  function renderTrash(){
    const rows=state.data.trash.map(e=>`<article class="event-card"><span class="tag">휴지통 · ${esc(e.type||'행사')}</span><h3>${esc(e.title)}</h3><div class="meta">삭제일 ${new Date(e.deletedAt||Date.now()).toLocaleDateString('ko-KR')}</div><div class="card-actions"><button class="btn small soft" data-restore="${e.id}">복원</button><button class="btn small danger" data-permanent="${e.id}">영구 삭제</button></div></article>`).join('');
    const body=`<div class="editor-actions"><button class="btn" id="backHome">← 내 행사</button>${state.data.trash.length?'<button class="btn danger" id="emptyTrash">휴지통 비우기</button>':''}</div><div class="section-head"><h2>휴지통</h2><span>${state.data.trash.length}개</span></div>${rows?`<div class="grid">${rows}</div>`:'<div class="empty">휴지통이 비어 있습니다.</div>'}`;
    $('#root').innerHTML=shell('행사 큐시트','휴지통',body,'');$('#backHome').onclick=()=>setView('home');document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>restoreFromTrash(b.dataset.restore));document.querySelectorAll('[data-permanent]').forEach(b=>b.onclick=()=>confirmPermanent(b.dataset.permanent));$('#emptyTrash')?.addEventListener('click',confirmEmptyTrash);
  }
  function confirmPermanent(id){const e=trashById(id);if(!e)return;openModal(`<div class="modal-head"><h2>영구 삭제</h2><button class="modal-close" id="modalClose" aria-label="닫기">×</button></div><p><b>이 작업은 되돌릴 수 없습니다.</b><br>정말로 “${esc(e.title)}”을 영구 삭제하시겠습니까?</p><div class="modal-actions"><button class="btn" id="cancelPermanent">취소</button><button class="btn danger" id="doPermanent">영구 삭제</button></div>`);$('#modalClose').onclick=$('#cancelPermanent').onclick=closeModal;$('#doPermanent').onclick=()=>{state.data.trash=state.data.trash.filter(x=>x.id!==id);save();closeModal();renderTrash();toast('행사를 영구 삭제했습니다.');};}
  function confirmEmptyTrash(){openModal(`<div class="modal-head"><h2>휴지통 비우기</h2><button class="modal-close" id="modalClose" aria-label="닫기">×</button></div><p><b>이 작업은 되돌릴 수 없습니다.</b><br>휴지통의 모든 행사를 영구 삭제하시겠습니까?</p><div class="modal-actions"><button class="btn" id="cancelEmpty">취소</button><button class="btn danger" id="doEmpty">전체 비우기</button></div>`);$('#modalClose').onclick=$('#cancelEmpty').onclick=closeModal;$('#doEmpty').onclick=()=>{state.data.trash=[];save();closeModal();renderTrash();toast('휴지통을 비웠습니다.');};}
  function createFromTemplate(key){
    const template=templates.find(t=>t.key===key);
    const event=Core.createEventFromTemplate(template,{id:uid,stepId:uid,date:today()});
    state.data.events.unshift(event);save();closeModal();setView('editor',event.id);
  }
  function showCopyPicker(){
    openModal(`<div class="modal-head"><h2>복제할 행사 선택</h2><button class="modal-close" id="modalClose">×</button></div>${state.data.events.map(e=>`<button class="run-list-item" data-copy="${e.id}"><span class="run-list-num">복제</span><span><b>${esc(e.title)}</b><span>${esc(dateText(e.date))}</span></span></button>`).join('')}`);$('#modalClose').onclick=closeModal;document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>duplicateEvent(b.dataset.copy,true));
  }

  function renderEditor(){
    const e=eventById(state.eventId);if(!e){setView('home');return;}
    const rows=e.steps.map((s,i)=>`<div class="step-row ${s.enabled===false?'off':''}"><span class="step-num">${i+1}</span><div class="step-main"><b>${esc(s.title||'제목 없음')}</b><span>${esc(s.duration||'시간 미정')}${s.owner?` · 담당 ${esc(s.owner)}`:''} · ${s.enabled===false?'사용 안 함':'사용'}</span></div><div class="step-tools"><button title="위로" data-up="${s.id}" ${i===0?'disabled':''}>↑</button><button title="아래로" data-down="${s.id}" ${i===e.steps.length-1?'disabled':''}>↓</button><button class="edit" data-edit="${s.id}">편집</button></div></div>`).join('');
    const body=`<div class="editor-actions"><button class="btn primary" id="runEventBtn">▶ 진행 모드</button><button class="btn soft" id="scriptBtn">전체 대본</button><button class="btn" id="duplicateBtn">복제</button><button class="btn" id="exportEventBtn">이 행사 백업</button><span class="save-state" id="saveState">${esc(saveText())}</span></div><section class="panel"><h2>행사 정보</h2><div class="form-grid"><div class="field full"><label>행사명</label><input id="eventTitle" value="${esc(e.title)}"></div><div class="field"><label>행사 유형</label><input id="eventType" value="${esc(e.type||'')}"></div><div class="field"><label>행사 상태</label><select id="eventStatus">${['작성 중','준비 완료','진행 완료','보관'].map(s=>`<option ${e.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="field"><label>사회자</label><input id="eventHost" value="${esc(e.host||'')}"></div><div class="field"><label>날짜</label><input type="date" id="eventDate" value="${esc(e.date||'')}"></div><div class="field"><label>시작 시간</label><input type="time" id="eventTime" value="${esc(e.time||'')}"></div><div class="field full"><label>장소</label><input id="eventLocation" value="${esc(e.location||'')}"></div><div class="field full"><label>행사 메모</label><textarea id="eventNotes">${esc(e.notes||'')}</textarea></div></div></section><div class="section-head"><h2>진행 순서</h2><button class="btn small primary" id="addStepBtn">＋ 순서 추가</button></div>${rows?`<div class="step-list">${rows}</div>`:`<div class="empty">진행 순서가 없습니다. 순서를 추가해 주세요.</div>`}<section class="panel danger-zone" style="margin-top:22px"><h3>행사 삭제</h3><p class="notice">삭제한 행사는 휴지통으로 이동하며 복구할 수 있습니다.</p><button class="btn small danger" id="deleteEventBtn">휴지통으로 이동</button></section>`;
    $('#root').innerHTML=shell(e.title,'행사 편집',body,`<button class="iconbtn" id="homeBtn" aria-label="행사 목록">⌂</button>`);
    $('#homeBtn').onclick=()=>setView('home');$('#runEventBtn').onclick=()=>setView('run',e.id);$('#scriptBtn').onclick=()=>setView('script',e.id);$('#duplicateBtn').onclick=()=>duplicateEvent(e.id,false);$('#exportEventBtn').onclick=()=>exportEvent(e);$('#addStepBtn').onclick=()=>editStep(e,null);
    const fields={eventTitle:'title',eventType:'type',eventStatus:'status',eventHost:'host',eventDate:'date',eventTime:'time',eventLocation:'location',eventNotes:'notes'};Object.entries(fields).forEach(([id,key])=>{$('#'+id).oninput=$('#'+id).onchange=ev=>{e[key]=ev.target.value;e.updatedAt=Date.now();save();if(key==='title')$('.brand').childNodes[0].nodeValue=e.title;};});
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editStep(e,b.dataset.edit));document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>moveStep(e,b.dataset.up,-1));document.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>moveStep(e,b.dataset.down,1));
    $('#deleteEventBtn').onclick=()=>confirmTrash(e.id);
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
    const e=eventById(state.eventId);if(!e){setView('home');return;}state.runActiveSteps=activeSteps(e);if(!state.runActiveSteps.length){alert('사용 중인 진행 순서가 없습니다.');setView('editor',e.id);return;}const saved=parseInt(localStorage.getItem('cueRunIndex.'+e.id)||'0',10);state.runIndex=Math.max(0,Math.min(saved,state.runActiveSteps.length-1));loadRunPreferences();
    $('#root').innerHTML=`<div class="run"><header class="run-top"><div class="run-row"><div class="run-title"><b>${esc(e.title)}</b><span id="elapsed">00:00 · ${esc(e.host||'사회자 미정')}</span></div><div class="run-actions"><button class="iconbtn" id="runListBtn">목록</button><button class="iconbtn" id="fontRunBtn">A＋</button><button class="iconbtn" id="exitRunBtn">종료</button></div></div><div class="progress"><i id="runProgress"></i></div></header><main class="run-stage" id="runStage"><div class="run-track" id="runTrack">${state.runActiveSteps.map((s,i)=>`<section class="run-slide"><article class="run-card"><div class="run-meta"><span class="run-num">${String(i+1).padStart(2,'0')}</span><span class="run-duration">${esc(s.duration||'')}</span></div><h1>${esc(s.title)}</h1><div class="run-script">${nl(s.script||'')}</div>${s.owner?`<div class="run-cue"><b>담당</b><br>${nl(s.owner)}</div>`:''}${s.materials?`<div class="run-cue"><b>준비물</b><br>${nl(s.materials)}</div>`:''}${s.avCue?`<div class="run-cue"><b>음향·영상·조명 큐</b><br>${nl(s.avCue)}</div>`:''}${s.cue?`<div class="run-cue"><b>진행 메모</b><br>${nl(s.cue)}</div>`:''}${s.contingency?`<div class="run-cont"><b>돌발상황·대체 멘트</b><br>${nl(s.contingency)}</div>`:''}</article></section>`).join('')}</div></main><footer class="run-foot"><div class="run-counter" id="runCounter"></div><div class="run-nav"><button id="runPrev">◀ 이전</button><button id="runDone">완료 표시</button><button class="next" id="runNext">다음 ▶</button></div></footer></div><div class="run-list" id="runList"><section class="run-list-sheet"><div class="modal-head"><h2>전체 진행 순서</h2><button class="modal-close" id="closeRunList">×</button></div><div id="runListItems"></div></section></div>`;
    document.documentElement.style.setProperty('--run-fs',fontLevels[state.fontIndex]);$('#runListItems').innerHTML=state.runActiveSteps.map((s,i)=>`<button class="run-list-item" data-run-index="${i}"><span class="run-list-num">${i+1}</span><span><b>${esc(s.title)}</b><span>${esc(s.duration||'')}${s.completed?' · 완료':''}</span></span></button>`).join('');
    $('#exitRunBtn').onclick=()=>setView('editor',e.id);$('#runPrev').onclick=()=>goRun(state.runIndex-1,'prev');$('#runNext').onclick=()=>goRun(state.runIndex+1,'next');$('#runDone').onclick=()=>{const s=state.runActiveSteps[state.runIndex];s.completed=!s.completed;save();updateRunUI();vibrate(s.completed?70:[30,45,30]);};$('#runListBtn').onclick=()=>$('#runList').classList.add('open');$('#closeRunList').onclick=()=>$('#runList').classList.remove('open');$('#runList').onclick=ev=>{if(ev.target.id==='runList')ev.currentTarget.classList.remove('open');};document.querySelectorAll('[data-run-index]').forEach(b=>b.onclick=()=>{goRun(+b.dataset.runIndex,'jump');$('#runList').classList.remove('open');});
    $('#fontRunBtn').onclick=()=>{state.fontIndex=(state.fontIndex+1)%fontLevels.length;localStorage.setItem('cueFont',String(state.fontIndex));document.documentElement.style.setProperty('--run-fs',fontLevels[state.fontIndex]);$('#fontRunBtn').textContent=state.fontIndex===fontLevels.length-1?'A−':'A＋';};
    const stage=$('#runStage');stage.addEventListener('touchstart',ev=>{const t=ev.touches[0];touchStart={x:t.clientX,y:t.clientY};},{passive:true});stage.addEventListener('touchend',ev=>{if(!touchStart)return;const t=ev.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)goRun(state.runIndex+(dx<0?1:-1),dx<0?'next':'prev');},{passive:true});
    document.onkeydown=runKeyHandler;startRunTimer();goRun(state.runIndex,'init');if(state.wakeEnabled)void wake.request(true);
  }
  function goRun(target,direction){const old=state.runIndex,n=Math.max(0,Math.min(state.runActiveSteps.length-1,target));if(n===old&&direction!=='init'){vibrate([110,65,110]);toast(n===0?'첫 순서입니다.':'마지막 순서입니다.');return;}state.runIndex=n;localStorage.setItem('cueRunIndex.'+state.eventId,n);$('#runTrack').style.transform=`translateX(-${n*100}%)`;document.querySelectorAll('.run-slide')[n].scrollTop=0;if(direction==='prev'||n<old)vibrate([35,45,35]);else if(direction!=='init')vibrate(55);updateRunUI();}
  function updateRunUI(){const n=state.runIndex,total=state.runActiveSteps.length,s=state.runActiveSteps[n];$('#runProgress').style.width=`${total===1?100:n/(total-1)*100}%`;$('#runCounter').textContent=`${n+1} / ${total} · ${s.title}`;$('#runPrev').disabled=n===0;$('#runNext').disabled=n===total-1;$('#runDone').textContent=s.completed?'✓ 완료됨':'완료 표시';$('#runDone').classList.toggle('next',s.completed);$('#fontRunBtn').textContent=state.fontIndex===fontLevels.length-1?'A−':'A＋';document.querySelectorAll('.run-list-item').forEach((el,i)=>{el.classList.toggle('active',i===n);const sp=el.querySelector('span span');if(sp)sp.textContent=(state.runActiveSteps[i].duration||'')+(state.runActiveSteps[i].completed?' · 완료':'');});}
  function runKeyHandler(ev){if(state.view!=='run')return;if(ev.key==='ArrowRight'||ev.key==='PageDown')goRun(state.runIndex+1,'next');if(ev.key==='ArrowLeft'||ev.key==='PageUp')goRun(state.runIndex-1,'prev');}
  function startRunTimer(){runSeconds=0;updateElapsed();runTimer=setInterval(()=>{runSeconds++;updateElapsed();},1000);}
  function stopRunTimer(){if(runTimer){clearInterval(runTimer);runTimer=null;}document.onkeydown=null;}
  function updateElapsed(){const el=$('#elapsed');if(!el)return;const m=Math.floor(runSeconds/60),s=runSeconds%60;const e=eventById(state.eventId);el.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} · ${e?.host||'사회자 미정'}`;}
  async function releaseWake(){await wake.release();}

  function exportAll(){downloadJson(`행사큐시트_전체백업_${today()}.json`,state.data);}
  function exportEvent(e){downloadJson(`${safeFilename(e.title)}_${e.date||today()}.json`,{version:APP_VERSION,events:[e]});}
  function downloadJson(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('백업 파일을 저장했습니다.');}
  function safeFilename(s){return String(s).replace(/[\\/:*?"<>|]/g,'_').slice(0,60)||'행사';}
  async function importBackup(ev){const f=ev.target.files?.[0];if(!f)return;try{const obj=JSON.parse(await f.text());if(!Array.isArray(obj.events))throw new Error();showImportPreview(obj.events);}catch(e){alert('올바른 큐시트 백업 파일이 아닙니다. JSON 형식과 행사 목록을 확인해 주세요.');}ev.target.value='';}
  function showImportPreview(events){const collisions=events.filter(e=>state.data.events.some(x=>x.id===e.id)).length;openModal(`<div class="modal-head"><h2>백업 불러오기</h2><button class="modal-close" id="modalClose" aria-label="닫기">×</button></div><p>${events.length}개 행사를 불러옵니다.${collisions?` 기존 ID와 같은 행사 ${collisions}개가 있습니다.`:''}</p><div class="import-preview">${events.slice(0,10).map(e=>`<div><b>${esc(e.title||'제목 없음')}</b><span>${esc(dateText(e.date))}</span></div>`).join('')}${events.length>10?'<p>…외 행사가 더 있습니다.</p>':''}</div>${collisions?'<label class="field"><span>같은 ID 처리 방식</span><select id="collisionMode"><option value="copy">복사본으로 추가</option><option value="overwrite">기존 행사 덮어쓰기</option></select></label>':''}<div class="modal-actions"><button class="btn" id="cancelImport">취소</button><button class="btn primary" id="doImport">불러오기</button></div>`);$('#modalClose').onclick=$('#cancelImport').onclick=closeModal;$('#doImport').onclick=()=>{const mode=$('#collisionMode')?.value||'copy';const safety=clone(state.data.events);const incoming=events.map(raw=>{const e=clone(raw);const i=state.data.events.findIndex(x=>x.id===e.id);e.steps=(e.steps||[]).map(s=>({...s,id:uid()}));e.status=e.status||'작성 중';e.updatedAt=Date.now();if(i>=0&&mode==='overwrite'){state.data.events.splice(i,1,e);return null;}if(i>=0)e.id=uid();return e;}).filter(Boolean);state.data.events=[...incoming,...state.data.events];try{save();localStorage.setItem(`${STORAGE_KEY}.safety.${Date.now()}`,JSON.stringify({version:APP_VERSION,events:safety}));}catch(e){}closeModal();render();toast(`${events.length}개 행사를 불러왔습니다.`);};}
  function showInstallHelp(){openModal(`<div class="modal-head"><h2>휴대전화에 설치하기</h2><button class="modal-close" id="modalClose">×</button></div><div class="script-text" style="font-size:15px"><b>인터넷 주소로 열었을 때</b><br>Chrome 메뉴의 “앱 설치” 또는 “홈 화면에 추가”를 누르세요. 설치 후 한 번 실행하면 오프라인에서도 사용할 수 있습니다.<br><br><b>HTML 파일로 직접 열었을 때</b><br>행사 편집과 진행은 가능하지만 앱 설치, 화면 꺼짐 방지 등 일부 기능이 제한될 수 있습니다.<br><br><b>행사 전 점검</b><br>비행기 모드에서 실행, 진동, 글자 크기, 화면 자동 꺼짐 설정을 반드시 확인하세요.</div><div class="modal-actions"><button class="btn primary" id="modalOkay">확인</button></div>`);$('#modalClose').onclick=$('#modalOkay').onclick=closeModal;}

  function render(){if(state.view==='home')renderHome();else if(state.view==='editor')renderEditor();else if(state.view==='script')renderScript();else if(state.view==='run')renderRun();}
  $('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
  window.addEventListener('beforeunload',ev=>{save();if(state.saveError){ev.preventDefault();ev.returnValue='';}});document.addEventListener('visibilitychange',async()=>{if(state.view!=='run')return;if(document.visibilityState==='hidden')await wake.release();else if(state.wakeEnabled)await wake.request(true);});
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
  Core.bindEventCardActions($('#root'),{
    edit:id=>setView('editor',id),run:id=>setView('run',id),delete:requestDeleteEvent,
    duplicate:id=>duplicateEvent(id,false),export:id=>{const event=eventById(id);if(event)exportEvent(event);},
    status:(id,value)=>{const event=eventById(id);if(!event)return;event.status=value;event.updatedAt=Date.now();save();renderHome();toast('행사 상태를 변경했습니다.');}
  });
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if($('#modal').classList.contains('open')){closeModal();return;}if(state.view==='home'&&state.searchOpen){state.searchOpen=false;renderHome();}});
  loadRunPreferences();load();render();
})();
