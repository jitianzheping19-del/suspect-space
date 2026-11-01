// Keep station IDs and world positions stable for assigned tasks and reconnects.
// Each Skeld station has one distinct interaction, independent of its title.
export const SKELD_TASK_INTERACTIONS = Object.freeze({
  'caf-garbage': {taskEngine:'skeld',mode:'garbage',name:'ごみを排出'},
  'weapons-asteroids': {taskEngine:'skeld',mode:'asteroids',name:'小惑星を破壊'},
  'shields-prime': {taskEngine:'skeld',mode:'prime-shields',name:'シールドを起動'},
  'med-inspect': {taskEngine:'skeld',mode:'inspect-sample',name:'試料を検査'},
  'nav-steering': {taskEngine:'skeld',mode:'steering',name:'操縦を安定'},
  'reactor-memory': {taskEngine:'skeld',mode:'reactor-memory',name:'リアクターの起動手順を記憶'},
  power: { terminalIndex: 0, interaction: 'wires' },
  convert: { mode: 'overcurrent', name: '過電流の回線を遮断', instrument: 'NAVIGATION POWER ISOLATION' },
  air: { mode: 'tubing', name: '酸素ラインを接続', instrument: 'OXYGEN LINE ASSEMBLY' },
  card: { terminalIndex: 5, interaction: 'card' },
  med: { terminalIndex: 4, interaction: 'scan', name: '身体をスキャン' },
  reactor: { mode: 'circuit', name: 'リアクター回路を復旧', instrument: 'REACTOR CIRCUIT ROUTING' },
  weapons: { mode: 'triangulate', name: '照準アンテナを調整', instrument: 'WEAPON TARGET TRIANGULATION' },
  shields: { mode: 'fins', name: 'シールド放熱板を展開', instrument: 'SHIELD RADIATOR DEPLOYMENT' },
  storage: { terminalIndex: 6, interaction: 'fuel' },
  security: { mode: 'radar', name: '船体レーダーを走査', instrument: 'HULL RADAR SCAN' },
  upload: { terminalIndex: 1, interaction: 'upload' },
  numbers: { taskEngine:'skeld', mode:'manifolds', name:'マニホールドを解除' },
  cafeteria: { mode: 'cargo', name: '配膳台の重心を調整', instrument: 'CAFETERIA BALANCE PLATFORM' },
  engine: { terminalIndex: 3, interaction: 'calibrate' },
  'nav-chart': { taskEngine:'skeld', mode:'chart-course', name:'航路を設定' },
  'shields-relay': { mode: 'waveform', name: 'シールド中継信号を復元', instrument: 'SHIELD SIGNAL RECONSTRUCTION' },
  'o2-filter-check': { mode: 'defrost', name: 'フィルターの霜を除去', instrument: 'OXYGEN FILTER DEFROST' },
  'right-weapons-calibrate': { mode: 'drone', name: '整備ドローンを着陸誘導', instrument: 'MAINTENANCE DRONE LANDING' },
  'right-nav-chart': { mode: 'clocks', name: '航法時計を同期', instrument: 'NAVIGATION CLOCK SYNCHRONIZATION' },
  'right-shields-power': { mode: 'battery', name: 'シールド蓄電池を交換', instrument: 'SHIELD BATTERY REPLACEMENT' },
});

export function configureSkeldTask(station) {
  const interaction = SKELD_TASK_INTERACTIONS[station.id];
  if (!interaction) throw new Error('Missing Skeld task interaction: ' + station.id);
  // Replace legacy kind hints too. Leaving upload/wires on a different game
  // lets older ID/name-based dispatchers and equipment pick the wrong task.
  return { ...station, ...interaction, kind: interaction.mode || interaction.interaction,
    taskEngine: interaction.taskEngine || (interaction.mode ? 'frost' : 'terminal') };
}

export function configureSkeldTasks(stations) {
  const tasks=stations.map(configureSkeldTask),ids=new Set(),mechanisms=new Set();
  for(const task of tasks){
    const key=task.taskEngine==='terminal'?'terminal:'+task.terminalIndex:task.taskEngine+':'+task.mode;
    if(ids.has(task.id)||mechanisms.has(key))throw new Error('Duplicate Skeld task: '+task.id+' ('+key+')');
    ids.add(task.id);mechanisms.add(key);
  }
  return tasks;
}
