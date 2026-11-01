// Browser errors cannot identify which Android setting or overlay denied access.
// Keep the reported error separate from the steps the player can try.
export function describeVoiceFailure(error, {stage = 'マイクの取得', android = false, standalone = false} = {}) {
  const name = String(error?.name || 'Error');
  const microphoneStage = stage === 'マイクの取得';
  const permissionDenied = microphoneStage && ['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(name);
  let message, settings = false, pending = false, autoRetry = false;
  const permissionHelp = android
    ? 'サイトのマイク許可と、Androidの「設定」→「アプリ」→利用中のブラウザ（またはホーム画面のアプリ）→「権限」→「マイク」を確認してください。'
    : 'ブラウザのサイト設定と、端末の設定でマイクを許可してから、もう一度押してください。';
  const blockedButtonHelp = android
    ? '「許可」を押せない場合は、他のアプリの小窓や重ね表示を閉じ、端末の管理制限も確認してください。'
    : '許可の確認画面が別のウィンドウに隠れていないか確認してください。';
  if (permissionDenied) {
    message = 'マイクの使用がブラウザまたは端末で拒否されました。拒否した設定まではゲームから判別できません。\n' + permissionHelp + '\n' + blockedButtonHelp;
    settings = true;
  } else if (microphoneStage && ['NotFoundError', 'DevicesNotFoundError'].includes(name)) {
    message = '使用できるマイクが見つかりません。内蔵マイクやヘッドセットの接続を確認してください。';
  } else if (microphoneStage && ['NotReadableError', 'TrackStartError', 'AbortError'].includes(name)) {
    message = 'マイクを開始できませんでした。通話・録音中のアプリを閉じ、端末のマイクアクセスを確認してから、もう一度押してください。';
  } else if (microphoneStage && ['OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(name)) {
    message = 'このマイクでは音声の設定を利用できませんでした。別のマイクを選ぶか、ブラウザを更新してください。';
  } else if (name === 'InsecureContextError') {
    message = '安全な接続ではないため、マイクを使えません。https:// で始まるゲームのURLを開いてください。';
  } else if (name === 'MediaDevicesUnavailableError') {
    message = 'この画面ではブラウザのマイク機能を利用できません。最新版のChromeやSafariでゲームのURLを直接開いてください。';
  } else if (name === 'MicrophonePending' || name === 'MicrophoneTimeoutError') {
    pending = name === 'MicrophonePending';
    message = (pending ? 'マイクの許可がまだ完了していません。' : '30秒以内にマイクの応答がありませんでした。拒否されたかどうかは確認できていません。') +
      '\nブラウザ・端末の許可画面を確認してください。\n' + blockedButtonHelp +
      (standalone ? '\nホーム画面から開いている場合は、追加したブラウザでゲームのURLを直接開いて確認できます。' : '');
    settings = true;
  } else {
    message = stage === 'マイクの取得' ? 'マイクの準備に失敗しました。もう一度押してください。' : '通話に接続できませんでした（' + stage + '）。通信状態を確認して、もう一度押してください。';
    autoRetry = stage !== 'マイクの取得';
  }
  const detail = [
    '処理: ' + stage,
    'エラー: ' + name,
    error?.code ? 'コード: ' + String(error.code).slice(0, 100) : '',
    error?.constraint ? '音声設定: ' + String(error.constraint).slice(0, 100) : '',
    error?.message ? '詳細: ' + String(error.message).slice(0, 600) : '',
    '端末: ' + (android ? 'Android' : 'Android以外'),
    '起動: ' + (standalone ? 'ホーム画面' : 'ブラウザ'),
  ].filter(Boolean).join('\n');
  return {message, detail, settings, pending, autoRetry, permissionDenied};
}

// getUserMedia can stay pending when a permission prompt cannot be answered.
// A late permission grant must not leave a timed-out microphone recording.
export function waitForVoiceMicrophone(request, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(Object.assign(new Error('マイクの許可または取得が時間内に完了しませんでした。'), {name: 'MicrophoneTimeoutError'}));
    }, timeoutMs);
    Promise.resolve(request).then(stream => {
      clearTimeout(timer);
      if (expired) {
        for (const track of stream.getTracks()) track.stop();
      } else resolve(stream);
    }, error => {
      clearTimeout(timer);
      if (!expired) reject(error);
    });
  });
}
