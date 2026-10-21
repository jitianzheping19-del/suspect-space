// Keep station IDs and world positions stable for assigned tasks and reconnects.
// Each Skeld station has one distinct interaction, independent of its title.
export const SKELD_TASK_INTERACTIONS = Object.freeze({
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
  numbers: { terminalIndex: 2, interaction: 'numbers' },
  cafeteria: { mode: 'cargo', name: '配膳台の重心を調整', instrument: 'CAFETERIA BALANCE PLATFORM' },
  engine: { terminalIndex: 3, interaction: 'calibrate' },
  'nav-chart': { mode: 'stars', name: '航路の星図を照合', instrument: 'NAVIGATION STAR CHART' },
  'shields-relay': { mode: 'waveform', name: 'シールド中継信号を復元', instrument: 'SHIELD SIGNAL RECONSTRUCTION' },
  'o2-filter-check': { mode: 'defrost', name: 'フィルターの霜を除去', instrument: 'OXYGEN FILTER DEFROST' },
  'right-weapons-calibrate': { mode: 'drone', name: '整備ドローンを着陸誘導', instrument: 'MAINTENANCE DRONE LANDING' },
  'right-nav-chart': { mode: 'clocks', name: '航法時計を同期', instrument: 'NAVIGATION CLOCK SYNCHRONIZATION' },
  'right-shields-power': { mode: 'battery', name: 'シールド蓄電池を交換', instrument: 'SHIELD BATTERY REPLACEMENT' },
});

export function configureSkeldTask(station) {
  const interaction = SKELD_TASK_INTERACTIONS[station.id];
  if (!interaction) throw new Error('Missing Skeld task interaction: ' + station.id);
  return { ...station, ...interaction, taskEngine: interaction.mode ? 'frost' : 'terminal' };
}
