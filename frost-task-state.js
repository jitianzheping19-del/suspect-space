const randomTarget = () => 20 + Math.floor(Math.random() * 61);
const normalTotals = { filter: 6, shields: 6, sample: 3, engine: 3, convert: 1, upload: 100, sort: 6 };
export const sabotageNames = { oxygen: '酸素供給停止', reactor: '冷却炉異常', lights: '停電', comms: '通信障害' };

// Local preview state. The geometry and task IDs can later be passed to the
// multiplayer game; this preview never writes completion or sabotage to RTDB.
export function createFrostTaskState(tasks, onChange = () => {}, clock = () => Date.now()) {
  const completed = new Set();
  let sabotage = null;
  let serial = 0;
  let session = null;

  function activate(type) {
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
    session = {
      task, incident: sabotage, mode: task.mode, accepting: true, finished: false,
      selected: new Set(), done: 0, total: normalTotals[task.mode] || 1,
      target: task.mode === 'sample' ? Math.floor(Math.random() * 4) : randomTarget(),
      value: 0, input: '', startedAt: null, feedback: '', error: false,
    };
    return session;
  }

  function state() {
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
    } else if (run.mode === 'filter' || run.mode === 'shields') {
      if (index < 0 || index >= 6 || run.selected.has(index)) return false;
      run.selected.add(index);
      run.done = run.selected.size;
    } else if (run.mode === 'sample') {
      if (index !== run.target) return wrong();
      run.done++;
      if (run.done < run.total) run.target = (run.target + 1 + Math.floor(Math.random() * 3)) % 4;
    } else if (run.mode === 'sort') {
      if (index !== run.done % 2) return wrong();
      run.done++;
    } else if (run.mode === 'engine') {
      if (index !== 0 || Math.abs(run.value - run.target) > 5) return wrong();
      run.done++;
      if (run.done < run.total) run.target = run.value < 50 ? 65 + Math.floor(Math.random() * 16) : 20 + Math.floor(Math.random() * 16);
    } else if (run.mode === 'convert') {
      if (index !== 0 || run.value < 95) return wrong();
      run.done = 1;
    } else if (run.mode === 'upload') {
      if (index !== 0) return false;
      run.startedAt = clock();
      run.accepting = false;
    }
    if (!run.task.sabotage && run.done >= run.total) finish(run);
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
    if (!run || run.finished || run.startedAt === null || run.incident?.failed) return;
    if (run.mode === 'upload') {
      run.done = Math.min(100, (clock() - run.startedAt) / 50);
      if (run.done >= 100) finish(run);
    } else if (run.mode === 'emergency-reactor' && clock() - run.startedAt >= 1000) {
      run.done = 1;
      finish(run);
    }
  }

  return {
    completed, activate, available, status, open, state, action, tick,
    close() { session = null; },
    setValue(value) { if (session?.accepting && Number.isFinite(value)) session.value = Math.max(0, Math.min(100, Math.round(value))); },
    get sabotage() { return sabotage; },
    get session() { return session; },
  };
}
