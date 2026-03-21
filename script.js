(() => {
  'use strict';

  // ======= PWA: Service Worker 登録 =======
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
  }

  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const elScore = document.getElementById('score');
  const elLines = document.getElementById('lines');
  const elLevel = document.getElementById('level');
  const overlay = document.getElementById('overlay');

  const btnUp = document.getElementById('btnUp');
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnDown = document.getElementById('btnDown');
  const btnRotate = document.getElementById('btnRotate');
  const btnPause = document.getElementById('btnPause');
  const btnRestart = document.getElementById('btnRestart');
  const btnMute = document.getElementById('btnMute'); // ミュートボタンを追加

  // ======= 盤面設定 =======
  const COLS = 10;
  const VISIBLE_ROWS = 20;
  const HIDDEN_ROWS = 2; // 生成直後の余白
  const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

  const CELL = Math.floor(canvas.width / COLS);
  const BOARD_W = COLS * CELL;
  const BOARD_H = VISIBLE_ROWS * CELL;
  const OFFSET_X = Math.floor((canvas.width - BOARD_W) / 2);
  const OFFSET_Y = Math.floor((canvas.height - BOARD_H) / 2);

  // ======= テトリミノ定義 =======
  const TETROMINO = {
    I: { color: '#5dd6ff', rot: [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]], [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]], [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]] },
    O: { color: '#ffd34d', rot: [[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]], [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]], [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]], [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]]] },
    T: { color: '#b46cff', rot: [[[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]], [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]], [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]] },
    J: { color: '#4d7dff', rot: [[[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]], [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]], [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]]] },
    L: { color: '#ff9b3d', rot: [[[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]], [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]], [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]]] },
    S: { color: '#43d67b', rot: [[[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]], [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]], [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]], [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]] },
    Z: { color: '#ff4d5d', rot: [[[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]], [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]], [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]], [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]]] }
  };
  const TYPES = /** @type {const} */ (['I', 'O', 'T', 'J', 'L', 'S', 'Z']);

  // ======= SRS キックテーブル =======
  const SRS_JLSTZ = {
    '0>1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    '1>0': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    '1>2': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
    '2>1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
    '2>3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
    '3>2': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    '3>0': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
    '0>3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]]
  };
  const SRS_I = {
    '0>1': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
    '1>0': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
    '1>2': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
    '2>1': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
    '2>3': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
    '3>2': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
    '3>0': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
    '0>3': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]]
  };
  function kickTests(type, fromR, toR) {
    if (type === 'O') return [[0, 0]];
    const key = `${fromR}>${toR}`;
    const table = type === 'I' ? SRS_I[key] : SRS_JLSTZ[key];
    return (table || [[0, 0]]).map(([dx, dy]) => [dx, -dy]);
  }

  // ======= BGM (Web Audio API) =======
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let bgmBuffer  = null;
  let bgmSource  = null;
  let bgmStarted = false; // ユーザー操作でアンロックされたか
  let isMuted    = false; // ミュート状態
  let pendingPlay = false; // 読み込み完了待ちフラグ

  // BGMファイルの読み込み
  fetch('./bgm.mp3')
    .then(res => res.arrayBuffer())
    .then(buf => audioCtx.decodeAudioData(buf))
    .then(decoded => {
      bgmBuffer = decoded;
      // 読み込み完了前に playBGM() が呼ばれていた場合は自動で再生開始
      if (pendingPlay && !isMuted && !isPaused && bgmStarted) {
        pendingPlay = false;
        playBGM();
      }
    })
    .catch(() => {});

  function playBGM() {
    if (isMuted) return;
    if (!bgmBuffer) {
      pendingPlay = true;
      return;
    }
    pendingPlay = false;

    // 古いノードを物理切断して新しく作り直す
    if (bgmSource) {
      try { bgmSource.stop(); } catch (_) {}
      bgmSource.disconnect();
      bgmSource = null;
    }
    bgmSource = audioCtx.createBufferSource();
    bgmSource.buffer = bgmBuffer;
    bgmSource.loop = true;
    bgmSource.connect(audioCtx.destination);
    bgmSource.start(0);
  }

  function pauseBGM() {
    pendingPlay = false; // 待ち状態もキャンセル
    if (bgmSource) {
      try { bgmSource.stop(); } catch (_) {}
      bgmSource.disconnect();
      bgmSource = null;
    }
    if (audioCtx.state === 'running') audioCtx.suspend();
  }

  function resumeBGM() {
    if (isMuted || isPaused) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => playBGM());
    } else {
      playBGM();
    }
  }

  function bgmStop() {
    pauseBGM();
  }

  function bgmRestart() {
    if (!bgmStarted || isPaused || isMuted) return;
    resumeBGM();
  }

  function tryStartBgm() {
    document.removeEventListener('touchstart', tryStartBgm);
    document.removeEventListener('mousedown',  tryStartBgm);
    if (bgmStarted) return;
    bgmStarted = true;

    audioCtx.resume().then(() => {
      if (!isPaused && !isMuted) playBGM();
    });
  }
  document.addEventListener('touchstart', tryStartBgm, { passive: true });
  document.addEventListener('mousedown',  tryStartBgm);

  function toggleMute() {
    isMuted = !isMuted;
    if (btnMute) btnMute.textContent = isMuted ? '🔇 OFF' : '🔊 ON';
    if (isMuted) {
      pauseBGM();
    } else {
      resumeBGM();
    }
  }

  // ======= ゲーム状態 =======
  /** @type {(string|null)[][]} */
  let board;
  let current;
  let nextQueue;
  let score = 0, lines = 0, level = 1;
  let isGameOver = false, isPaused = false;

  let isAnimating = false;
  let flashRows = [];
  let flashStart = 0;
  const FLASH_DURATION = 250;

  let lastTime = 0, dropCounter = 0;

  function newBoard() { return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null)); }
  function clonePiece(p) { return { type: p.type, x: p.x, y: p.y, r: p.r }; }

  function bag7() {
    const a = TYPES.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function refillQueue() {
    if (!nextQueue || nextQueue.length < 7) {
      nextQueue = (nextQueue || []).concat(bag7());
    }
  }

  function spawn() {
    refillQueue();
    const type = nextQueue.shift();
    const p = { type, r: 0, x: 3, y: 0 };
    if (type === 'I') p.x = 3;
    if (type === 'O') p.x = 4 - 1;

    if (collides(p)) {
      isGameOver = true;
      bgmStop();
      showOverlay('GAME OVER');
      return null;
    }
    return p;
  }

  function matrixFor(p) { return TETROMINO[p.type].rot[p.r]; }

  function collides(p) {
    const m = matrixFor(p);
    for (let ry = 0; ry < 4; ry++) {
      for (let rx = 0; rx < 4; rx++) {
        if (!m[ry][rx]) continue;
        const x = p.x + rx, y = p.y + ry;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }
    return false;
  }

  function merge(p) {
    const m = matrixFor(p);
    const color = TETROMINO[p.type].color;
    for (let ry = 0; ry < 4; ry++) {
      for (let rx = 0; rx < 4; rx++) {
        if (!m[ry][rx]) continue;
        const x = p.x + rx, y = p.y + ry;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y][x] = color;
      }
    }
  }

  function findFullRows() {
    const rows = [];
    for (let y = 0; y < ROWS; y++) if (board[y].every(Boolean)) rows.push(y);
    return rows;
  }

  function finishClearLines() {
    isAnimating = false;
    const rows = flashRows.slice().sort((a, b) => b - a);
    flashRows = [];

    for (const y of rows) {
      board.splice(y, 1);
      board.unshift(Array.from({ length: COLS }, () => null));
    }

    const cleared = rows.length;
    const table = [0, 100, 300, 500, 800];
    score += (table[cleared] || 0) * level;
    lines += cleared;
    level = 1 + Math.floor(lines / 10);
    updateHUD();

    for (let y = 0; y < HIDDEN_ROWS; y++) {
      if (board[y].some(Boolean)) {
        isGameOver = true;
        bgmStop();
        showOverlay('GAME OVER');
        return;
      }
    }
    current = spawn();
  }

  function lockAndNext() {
    merge(current);
    const full = findFullRows();
    if (full.length > 0) {
      current = null;
      isAnimating = true;
      flashRows  = full;
      flashStart = performance.now();
      setTimeout(finishClearLines, FLASH_DURATION);
      return;
    }
    for (let y = 0; y < HIDDEN_ROWS; y++) {
      if (board[y].some(Boolean)) {
        isGameOver = true;
        bgmStop();
        showOverlay('GAME OVER');
        return;
      }
    }
    current = spawn();
  }

  function softDrop() {
    if (!current || isGameOver || isPaused || isAnimating) return;
    const p = clonePiece(current);
    p.y += 1;
    if (!collides(p)) { current = p; return true; }
    lockAndNext();
    return false;
  }

  function hardDrop() {
    if (!current || isGameOver || isPaused || isAnimating) return;
    let p = clonePiece(current), dist = 0;
    while (true) {
      const q = clonePiece(p);
      q.y += 1;
      if (collides(q)) break;
      p = q;
      dist++;
    }
    current = p;
    score += dist * 2;
    updateHUD();
    lockAndNext();
  }

  function move(dx) {
    if (!current || isGameOver || isPaused || isAnimating) return;
    const p = clonePiece(current);
    p.x += dx;
    if (!collides(p)) current = p;
  }

  function rotate(dir) {
    if (!current || isGameOver || isPaused || isAnimating) return;
    const fromR = current.r, toR = (fromR + (dir > 0 ? 1 : 3)) % 4;
    const tests = kickTests(current.type, fromR, toR);
    for (const [dx, dy] of tests) {
      const p = clonePiece(current);
      p.r = toR; p.x += dx; p.y += dy;
      if (!collides(p)) { current = p; return; }
    }
  }

  function dropIntervalMs() {
    const base = 800;
    return Math.max(60, base * Math.pow(0.88, level - 1));
  }

  // ======= 描画 =======
  function drawCell(x, y, color) {
    const px = OFFSET_X + x * CELL, py = OFFSET_Y + (y - HIDDEN_ROWS) * CELL;
    if (y < HIDDEN_ROWS) return;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    ctx.strokeStyle = 'rgba(255,255,255,.10)';
    ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(OFFSET_X, OFFSET_Y);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, BOARD_H); ctx.stroke(); }
    for (let y = 0; y <= VISIBLE_ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(BOARD_W, y * CELL); ctx.stroke(); }
    ctx.restore();

    for (let y = HIDDEN_ROWS; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = board[y][x];
        if (c) drawCell(x, y, c);
      }
    }

    if (isAnimating && flashRows.length > 0) {
      const elapsed = performance.now() - flashStart;
      const bright = Math.floor(elapsed / 40) % 2 === 0;
      ctx.fillStyle = bright ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.25)';
      for (const ry of flashRows) {
        const visY = ry - HIDDEN_ROWS;
        if (visY >= 0) ctx.fillRect(OFFSET_X, OFFSET_Y + visY * CELL, BOARD_W, CELL);
      }
    }

    if (current) {
      const m = matrixFor(current), color = TETROMINO[current.type].color;
      for (let ry = 0; ry < 4; ry++) {
        for (let rx = 0; rx < 4; rx++) {
          if (m[ry][rx]) drawCell(current.x + rx, current.y + ry, color);
        }
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(OFFSET_X + 1, OFFSET_Y + 1, BOARD_W - 2, BOARD_H - 2);
  }

  function updateHUD() {
    elScore.textContent = String(score);
    elLines.textContent = String(lines);
    elLevel.textContent = String(level);
  }

  function showOverlay(text) { overlay.textContent = text; overlay.classList.remove('hidden'); }
  function hideOverlay() { overlay.classList.add('hidden'); overlay.textContent = ''; }

  // ======= ループ =======
  function update(time) {
    const dt = time - lastTime;
    lastTime = time;
    if (!isPaused && !isGameOver && !isAnimating) {
      dropCounter += dt;
      if (dropCounter >= dropIntervalMs()) { softDrop(); dropCounter = 0; }
    }
    drawBoard();
    requestAnimationFrame(update);
  }

  function resetGame() {
    board = newBoard(); nextQueue = [];
    score = 0; lines = 0; level = 1;
    isGameOver = false; isPaused = false; isAnimating = false;
    flashRows = []; dropCounter = 0;
    updateHUD(); hideOverlay();
    bgmRestart();
    current = spawn();
  }

  // ======= 入力 =======
  let lastTouchAt = 0;
  const markTouch = () => { lastTouchAt = Date.now(); };
  const ignoreMouseIfRecentTouch = () => (Date.now() - lastTouchAt) < 600;

  function bindTap(btn, fn) {
    const fire = (e) => { e?.preventDefault?.(); e?.stopPropagation?.(); fn(); };
    btn.addEventListener('touchstart', (e) => { markTouch(); fire(e); }, { passive: false });
    btn.addEventListener('mousedown', (e) => { if (!ignoreMouseIfRecentTouch()) fire(e); });
  }

  function bindRepeat(btn, fn, firstDelay = 180, interval = 65) {
    let t1 = null, t2 = null;
    const clear = (e) => { e?.preventDefault?.(); clearTimeout(t1); clearInterval(t2); t1 = null; t2 = null; };
    const start = (e) => { e?.preventDefault?.(); if (t1 || t2) return; fn(); t1 = setTimeout(() => { t2 = setInterval(fn, interval); }, firstDelay); };
    btn.addEventListener('touchstart', (e) => { markTouch(); start(e); }, { passive: false });
    btn.addEventListener('touchend', clear, { passive: false });
    btn.addEventListener('touchcancel', clear, { passive: false });
    btn.addEventListener('mousedown', (e) => { if (!ignoreMouseIfRecentTouch()) start(e); });
    btn.addEventListener('mouseup', (e) => { if (!ignoreMouseIfRecentTouch()) clear(e); });
    btn.addEventListener('mouseleave', (e) => { if (!ignoreMouseIfRecentTouch()) clear(e); });
  }

  bindRepeat(btnLeft, () => move(-1));
  bindRepeat(btnRight, () => move(1));
  bindRepeat(btnDown, () => softDrop(), 140, 60);
  bindTap(btnUp, () => hardDrop());
  bindTap(btnRotate, () => rotate(1));
  
  // ミュートボタンのイベント登録
  bindTap(btnMute, () => toggleMute());

  function doPause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
      showOverlay('PAUSED');
      pauseBGM();
    } else {
      hideOverlay();
      if (bgmStarted && !isMuted) resumeBGM();
    }
    btnPause.textContent = isPaused ? '再開' : '一時停止';
  }

  bindTap(btnPause, () => doPause());
  bindTap(btnRestart, () => { btnPause.textContent = '一時停止'; resetGame(); });

  // ======= Page Visibility API =======
  function handleBackground() {
    pauseBGM(); // ミュート状態に関係なく強制停止
    if (!isGameOver && !isPaused) {
      isPaused = true;
      showOverlay('PAUSED');
      btnPause.textContent = '再開';
    }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) handleBackground(); });
  document.addEventListener('pagehide', handleBackground);

  // ======= キーボード =======
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'p' || e.key === 'P') { doPause(); return; }
    if (e.key === 'm' || e.key === 'M') { toggleMute(); return; } // Mキーでミュート切り替え
    if (isGameOver || isPaused) return;
    if (e.key === 'ArrowLeft') move(-1);
    else if (e.key === 'ArrowRight') move(1);
    else if (e.key === 'ArrowUp') rotate(1);
    else if (e.key === ' ') hardDrop();
    else if (e.key === 'ArrowDown') softDrop();
  });

  // 初期化
  resetGame();
  requestAnimationFrame(update);
})();