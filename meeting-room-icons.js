// Room semantics stay separate from map geometry and player testimony.
const definitions={
 cafeteria:['テーブル','#70d7bc'],engine:['エンジン','#efae72'],reactor:['リアクター','#b79bff'],security:['監視カメラ','#80c6e8'],medical:['救急設備','#ef8f9e'],electrical:['配電盤','#f3d477'],storage:['保管箱','#b6cf89'],admin:['管理端末','#a6b6ff'],communications:['通信アンテナ','#78d9e5'],weapons:['砲台','#eca38a'],oxygen:['酸素タンク','#8bd5a8'],navigation:['航路計器','#8abff3'],shields:['シールド','#eedb91'],meeting:['会議テーブル','#75c8df'],lift:['昇降機','#d4b18a'],passage:['通路の案内板','#96b6c9'],vault:['金庫','#e7c276'],records:['本棚','#bf9ee2'],lounge:['ソファ','#df9cbb'],toilets:['トイレ','#bfdae5'],cargo:['貨物箱','#c8a97c'],showers:['シャワー','#83d5e2'],ventilation:['換気ファン','#a9d3bf'],dormitory:['ベッド','#b4afe7'],darkroom:['カメラ','#d39ba7'],cockpit:['操縦席','#91b6e8'],armory:['装備ラック','#c6b99d'],kitchen:['フライパン','#e5c389'],viewing:['望遠鏡','#a6c9ec'],portraits:['肖像画','#dab178'],dome:['中央ドーム','#a7dae9'],hangar:['宇宙船','#b6c7e6'],habitat:['居住棟','#c0d99d'],laboratory:['フラスコ','#9cdbc4'],specimen:['検体チューブ','#c2afe6'],power:['電源装置','#e8d28c'],drill:['掘削機','#eab77f'],deep:['調査用の結晶','#9fc8f0']
};
const roomKinds={
 caf:'cafeteria',upper:'engine',lower:'engine',reactor:'reactor',security:'security',med:'medical',electrical:'electrical',storage:'storage',admin:'admin',comms:'communications',weapons:'weapons',o2:'oxygen',nav:'navigation',shields:'shields',
 meeting:'meeting',gap:'lift',brig:'passage',vault:'vault',records:'records',lounge:'lounge',toilets:'toilets',cargo:'cargo',showers:'showers',ventilation:'ventilation',mainhall:'passage',dormitory:'dormitory',darkroom:'darkroom','hall-n3':'passage','hall-n4':'passage','mainhall-south':'passage','hall-s2':'passage',engine:'engine',communications:'communications',cockpit:'cockpit',armory:'armory',kitchen:'kitchen',viewing:'viewing',portraits:'portraits',medical:'medical',
 dome:'dome',hangar:'hangar',observatory:'viewing',habitat:'habitat',laboratory:'laboratory',specimen:'specimen',power:'power',drill:'drill',deep:'deep'
};
export const ROOM_ICON_CATALOG=Object.freeze(Object.entries(definitions).map(([kind,[label,color]])=>Object.freeze({kind,label,color})));
const specs=new Map(ROOM_ICON_CATALOG.map(spec=>[spec.kind,spec]));
let urls=new Map(),loading=null;
export function roomIcon(room){const kind=roomKinds[room.id]||'passage';return {...specs.get(kind),url:urls.get(kind)||''};}
export function loadRoomIcons(){
 if(!loading)loading=import('./meeting-room-icon-models.js').then(({renderRoomIcons})=>{urls=renderRoomIcons(ROOM_ICON_CATALOG);return urls;}).catch(error=>{loading=null;throw error;});
 return loading;
}
