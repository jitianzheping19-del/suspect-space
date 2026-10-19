import { createFrostTaskRun } from './frost-task-rules.js';
const randomTarget = () => 20 + Math.floor(Math.random() * 61);
export const sabotageNames = { oxygen: '酸素供給停止', reactor: '冷却炉異常', lights: '停電', comms: '通信障害' };

// The standalone preview never writes completion or sabotage to RTDB. The
// multiplayer game uses the same normal mechanisms with host validation.
export function createFrostTaskState(tasks, onChange = () => {}, clock = () => Date.now()) {
  const completed = new Set();
  let sabotage = null;
  let serial = 0;
  let session = null;
  let normalRun = null;

  function activate(type) {
    normalRun?.release(); normalRun = null;
    session = null;
    sabotage = sabotageNames[type] ? {
      id: ++serial, type, panels: new Set(),
      code: String(Math.floor(Math.random() * 1000000)).padStart(6, '0'),
      endsAt: ['oxygen', 'reactor'].includes(type) ? clock() + 90000 : 0,
      failed: false,
    } : null;
    onChange();
  }

  function available(task) {
    return !task.sabotage || (!!sabotage && sabotage.type === task.sabotage
      && !sabotage.failed && !sabotage.panels.has(task.id));
  }

  function status(task) {
    if (!task.sabotage) return completed.has(task.id) ? 'complete' : 'task';
    if (sabotage?.type !== task.sabotage) return 'standby';
    return sabotage.panels.has(task.id) ? 'complete' : 'emergency';
  }

  function finish(run) {
    if (run.finished) return;
    run.finished = true;
    run.accepting = false;
    run.feedback = run.task.sabotage ? 'この端末を復旧しました' : 'タスク完了';
    if (run.task.sabotage) {
      if (sabotage !== run.incident) return;
      sabotage.panels.add(run.task.id);
      if (tasks.filter((task) => task.sabotage === sabotage.type).every((task) => sabotage.panels.has(task.id))) sabotage = null;
    } else completed.add(run.task.id);
    onChange();
  }

  function open(id) {
    const task = tasks.find((task) => task.id === id);
    if (!task || !available(task)) return null;
    normalRun?.release(); normalRun = null;
    if (!task.sabotage) {
      normalRun = createFrostTaskRun(task, () => { completed.add(task.id); onChange(); });
      session = normalRun.state;
      return session;
    }
    session = {
      task, incident: sabotage, mode: task.mode, machineLabel: task.instrument, accepting: true, finished: false,
      selected: new Set(), done: 0, total: 1, target: randomTarget(),
      value: 0, input: '', startedAt: null, feedback: '', error: false,
    };
    return session;
  }

  function state() {
    if (normalRun) return normalRun.state;
    const run = session;
    if (!run) return null;
    const incident = run.incident;
    const circuits = tasks.filter((task) => task.sabotage === 'lights').map((task) => ({
      id: task.id, name: task.roomName, on: !!incident?.panels.has(task.id),
    }));
    let done = run.done, total = run.total;
    if (run.mode === 'emergency-oxygen') { done = run.input.length; total = 6; }
    if (run.mode === 'emergency-lights') { done = circuits.filter((c) => c.on).length; total = circuits.length; }
    if (run.mode === 'emergency-comms') done = Math.abs(run.value - run.target) <= 3 ? 1 : 0;
    const scanning = run.mode === 'emergency-reactor' && run.startedAt !== null;
    return {
      ...run, done, total, circuits, code: incident?.code || '',
      pending: run.finished || scanning,
      ownActive: scanning,
      scanAge: scanning ? Math.max(0, clock() - run.startedAt) : 0,
      partnerActive: !!incident && [...incident.panels].some((id) => id !== run.task.id),
      localOn: !!incident?.panels.has(run.task.id),
    };
  }

  function action(index) {
    if (normalRun) return false;
    const run = session;
    if (!run?.accepting || !Number.isInteger(index)) return false;
    run.error = false;
    const wrong = () => { run.error = true; run.feedback = '操作を確認してください'; return false; };
    if (run.mode === 'emergency-oxygen') {
      if (index >= 0 && index <= 9 && run.input.length < 6) run.input += index;
      else if (index === 10) run.input = '';
      else if (index === 11) run.input = run.input.slice(0, -1);
      else if (index === 12) {
        if (run.input !== run.incident.code) return wrong();
        finish(run);
      }
    } else if (run.mode === 'emergency-reactor') {
      if (index !== 0) return false;
      run.startedAt = clock();
      run.accepting = false;
    } else if (run.mode === 'emergency-lights' || run.mode === 'emergency-comms') {
      if (index !== 0 || (run.mode === 'emergency-comms' && Math.abs(run.value - run.target) > 3)) return wrong();
      finish(run);
    } else return false;
    if (!run.error && !run.finished) run.feedback = '';
    return true;
  }

  function tick() {
    const run = session;
    if (sabotage?.endsAt && clock() >= sabotage.endsAt && !sabotage.failed) {
      sabotage.failed = true;
      if (run?.task.sabotage) { run.accepting = false; run.feedback = '復旧時間が終了しました'; }
      onChange();
    }
    if (normalRun || !run || run.finished || run.startedAt === null || run.incident?.failed) return;
    if (run.mode === 'emergency-reactor' && clock() - run.startedAt >= 1000) {
      run.done = 1;
      finish(run);
    }
  }

  return {
    completed, activate, available, status, open, state, action, tick,
    close() { normalRun?.release(); normalRun = null; session = null; },
    setValue(value) { if (session?.accepting && Number.isFinite(value)) session.value = Math.max(0, Math.min(100, Math.round(value))); },
    get sabotage() { return sabotage; },
    get session() { return session; },
    get run() { return normalRun; },
  };
}
