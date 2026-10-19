import * as THREE from 'three';
import { createFrostTaskState, sabotageNames } from './frost-task-state.js';
import { createFrostTaskStations } from './frost-task-stations.js';
import { createFrostTaskMachine } from './frost-task-machine.js';
import { taskInstructions } from './frost-task-rules.js';

const hints = {
  'emergency-oxygen': '表示された6桁のコードを入力して送信',
  'emergency-lights': 'この部屋のブレーカーを上げる',
  'emergency-reactor': '手形に触れて安全認証',
  'emergency-comms': 'ダイヤルで波形を重ねて接続',
};

export function createFrostTasks(data, { onDirty, onModal }) {
  const $ = (id) => document.getElementById(id);
  const modal = $('taskModal');
  let view;
  const manager = createFrostTaskState(data.tasks, () => {
    view?.refresh();
    updateBanner();
    onDirty();
  });
  view = createFrostTaskStations(data.tasks, manager);
  let machine = null;
  let generation = 0;
  let closeAt = 0;
  let lastBanner = '';
  let isOpen = false;

  function close() {
    generation++;
    closeAt = 0;
    machine?.dispose();
    machine = null;
    manager.close();
    $('taskStage').replaceChildren();
    if (modal.open) modal.close();
    if (isOpen) onModal(false);
    isOpen = false;
  }

  async function open(id) {
    close();
    const run = manager.open(id);
    if (!run) return false;
    const token = ++generation;
    $('taskTitle').textContent = run.task.name;
    $('taskRoom').textContent = run.task.roomName;
    $('taskHint').textContent = taskInstructions[run.mode] || hints[run.mode];
    $('taskFeedback').textContent = '';
    $('taskProgressFill').style.width = '0%';
    $('taskStage').textContent = '端末を起動中…';
    modal.showModal();
    isOpen = true;
    onModal(true);
    try {
      if (!run.task.sabotage) {
        machine = createFrostTaskMachine($('taskStage'), manager.run, {
          onClose: close,
          onUnavailable() { close(); $('location').textContent = '端末を開き直してください'; },
        });
        machine.canvas.focus({ preventScroll: true });
        return true;
      }
      const { createInteractiveTaskMachine } = await import(/* @vite-ignore */ `${import.meta.env.BASE_URL}task-machines.js?v=rotary-2`);
      if (token !== generation) return false;
      machine = createInteractiveTaskMachine(THREE, $('taskStage'), () => manager.state(),
        (index) => { manager.action(index); refreshModal(); },
        (value) => manager.setValue(value),
        () => { close(); $('location').textContent = '端末を開き直してください'; });
      machine.canvas.focus({ preventScroll: true });
      return true;
    } catch (error) {
      if (token !== generation) return false;
      console.error(error);
      $('taskStage').textContent = '端末を読み込めませんでした。閉じて開き直してください。';
      return false;
    }
  }

  function updateBanner() {
    const incident = manager.sabotage;
    $('sabotageType').value = incident?.type || '';
    $('sabotageStatus').hidden = !incident;
    if (!incident) { lastBanner = ''; return; }
    const total = data.tasks.filter((task) => task.sabotage === incident.type).length;
    const seconds = incident.endsAt ? Math.max(0, Math.ceil((incident.endsAt - Date.now()) / 1000)) : 0;
    const text = `${sabotageNames[incident.type]}　${incident.panels.size}/${total}`
      + (incident.failed ? '　復旧時間終了' : seconds ? `　${seconds}秒` : '');
    if (text !== lastBanner) {
      $('sabotageStatus').textContent = text;
      lastBanner = text;
    }
  }

  function refreshModal() {
    const run = manager.state();
    if (!run || !isOpen) return;
    $('taskFeedback').textContent = run.feedback;
    $('taskFeedback').dataset.error = String(run.error);
    const progress = !run.task.sabotage ? run.progress : run.done / run.total;
    $('taskProgressFill').style.width = `${Math.min(100, Math.round(progress * 100))}%`;
    if (run.finished && !closeAt) closeAt = Date.now() + (run.mode === 'emergency-reactor' ? 1100 : 800);
  }

  $('taskClose').addEventListener('click', close);
  modal.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  $('sabotageType').addEventListener('change', (event) => { close(); manager.activate(event.target.value); });

  return {
    root: view.root, manager, open, close,
    get isOpen() { return isOpen; },
    get machine() { return machine; },
    activate(type) { close(); manager.activate(type); },
    nearest(position) {
      let nearest = null, distance = 2.5;
      for (const task of data.tasks) {
        if (!manager.available(task)) continue;
        const dx = position.x - task.position[0], dz = position.z + task.position[1];
        const along = dx * task.facing[0] - dz * task.facing[1];
        const d = Math.hypot(dx, dz);
        if (along > 0 && d < distance) { nearest = task; distance = d; }
      }
      return nearest;
    },
    pick(raycaster) {
      const hit = view.pick(raycaster);
      return hit && manager.available(hit.task) ? hit : null;
    },
    tick() {
      manager.tick();
      updateBanner();
      if (isOpen) refreshModal();
      if (closeAt && Date.now() >= closeAt) close();
    },
    dispose() { close(); view.dispose(); },
  };
}
