(() => {
    'use strict';
  
    // ======= PWA: Service Worker 登録 =======
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(() => {
          // 登録失敗時もゲーム自体は動かす
        });
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
  
    // ======= テトリミノ定義（標準色） =======
    // すべて 4x4 行列で定義（SRSのI/Oも扱いやすい）
    const TETROMINO = {
      I: {
        color: '#5dd6ff', // 水色
        rot: [
          [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 1, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
          ],
        ],
      },
      O: {
        color: '#ffd34d', // 黄色
        rot: [
          [
            [0, 1, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      T: {
        color: '#b46cff', // 紫
        rot: [
          [
            [0, 1, 0, 0],
            [1, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [1, 1, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 0, 0],
            [1, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      J: {
        color: '#4d7dff', // 青
        rot: [
          [
            [1, 0, 0, 0],
            [1, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 1, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [1, 1, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [1, 1, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      L: {
        color: '#ff9b3d', // オレンジ
        rot: [
          [
            [0, 0, 1, 0],
            [1, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [1, 1, 1, 0],
            [1, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [1, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      S: {
        color: '#43d67b', // 緑
        rot: [
          [
            [0, 1, 1, 0],
            [1, 1, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [1, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [1, 0, 0, 0],
            [1, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
      Z: {
        color: '#ff4d5d', // 赤
        rot: [
          [
            [1, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 1, 0],
            [0, 1, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 0, 0, 0],
            [1, 1, 0, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
          ],
          [
            [0, 1, 0, 0],
            [1, 1, 0, 0],
            [1, 0, 0, 0],
            [0, 0, 0, 0],
          ],
        ],
      },
    };
  
    const TYPES = /** @type {const} */ (['I', 'O', 'T', 'J', 'L', 'S', 'Z']);
  
    // ======= SRS キックテーブル =======
    // SRSは y 上方向が + だが、この実装は下方向が + なので dy は符号反転する
    const SRS_JLSTZ = {
      '0>1': [
        [0, 0],
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2],
      ],
      '1>0': [
        [0, 0],
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2],
      ],
      '1>2': [
        [0, 0],
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2],
      ],
      '2>1': [
        [0, 0],
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2],
      ],
      '2>3': [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2],
      ],
      '3>2': [
        [0, 0],
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2],
      ],
      '3>0': [
        [0, 0],
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2],
      ],
      '0>3': [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2],
      ],
    };
  
    const SRS_I = {
      '0>1': [
        [0, 0],
        [-2, 0],
        [1, 0],
        [-2, -1],
        [1, 2],
      ],
      '1>0': [
        [0, 0],
        [2, 0],
        [-1, 0],
        [2, 1],
        [-1, -2],
      ],
      '1>2': [
        [0, 0],
        [-1, 0],
        [2, 0],
        [-1, 2],
        [2, -1],
      ],
      '2>1': [
        [0, 0],
        [1, 0],
        [-2, 0],
        [1, -2],
        [-2, 1],
      ],
      '2>3': [
        [0, 0],
        [2, 0],
        [-1, 0],
        [2, 1],
        [-1, -2],
      ],
      '3>2': [
        [0, 0],
        [-2, 0],
        [1, 0],
        [-2, -1],
        [1, 2],
      ],
      '3>0': [
        [0, 0],
        [1, 0],
        [-2, 0],
        [1, -2],
        [-2, 1],
      ],
      '0>3': [
        [0, 0],
        [-1, 0],
        [2, 0],
        [-1, 2],
        [2, -1],
      ],
    };
  
    function kickTests(type, fromR, toR) {
      if (type === 'O') return [[0, 0]];
      const key = `${fromR}>${toR}`;
      const table = type === 'I' ? SRS_I[key] : SRS_JLSTZ[key];
      // dy符号反転（SRS:上+、この実装:下+）
      return (table || [[0, 0]]).map(([dx, dy]) => [dx, -dy]);
    }
  
    // ======= BGM =======
    const bgm = document.getElementById('bgm');
    let bgmStarted = false;
    function tryStartBgm() {
      if (bgmStarted) return;
      bgmStarted = true;
      bgm.volume = 0.45;
      bgm.play().catch(() => { bgmStarted = false; }); // 失敗してもゲームは継続
    }
    // ブラウザの自動再生ブロック回避: 最初のユーザー操作をトリガーにする
    document.addEventListener('touchstart', tryStartBgm, { once: true, passive: true });
    document.addEventListener('mousedown',  tryStartBgm, { once: true });

    // ======= ゲーム状態 =======
    /** @type {(string|null)[][]} */
    let board;
    let current;
    let nextQueue;
  
    let score = 0;
    let lines = 0;
    let level = 1;
  
    let isGameOver = false;
    let isPaused = false;

    // ライン消去アニメーション
    let isAnimating = false;   // アニメーション中は入力・落下を停止
    let flashRows  = [];       // 点滅させる行インデックス
    let flashStart = 0;        // アニメーション開始時刻（performance.now）
    const FLASH_DURATION = 250; // ms

    // タイマー
    let lastTime = 0;
    let dropCounter = 0;
  
    function newBoard() {
      return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
    }
  
    function clonePiece(p) {
      return { type: p.type, x: p.x, y: p.y, r: p.r };
    }
  
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
      const p = { type, r: 0, x: 3, y: 0 }; // SRS想定のだいたい中央
  
      // I と O は見た目が左寄り/上寄りになりがちなので軽く調整
      if (type === 'I') p.x = 3;
      if (type === 'O') p.x = 4 - 1;
  
      if (collides(p)) {
        isGameOver = true;
        showOverlay('GAME OVER');
        return null;
      }
      return p;
    }
  
    function matrixFor(p) {
      return TETROMINO[p.type].rot[p.r];
    }
  
    function collides(p) {
      const m = matrixFor(p);
      for (let ry = 0; ry < 4; ry++) {
        for (let rx = 0; rx < 4; rx++) {
          if (!m[ry][rx]) continue;
          const x = p.x + rx;
          const y = p.y + ry;
          if (x < 0 || x >= COLS) return true;
          if (y >= ROWS) return true;
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
          const x = p.x + rx;
          const y = p.y + ry;
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
            board[y][x] = color;
          }
        }
      }
    }
  
    /** 揃っている行インデックスを返す（盤面は変更しない） */
    function findFullRows() {
      const rows = [];
      for (let y = 0; y < ROWS; y++) {
        if (board[y].every(Boolean)) rows.push(y);
      }
      return rows;
    }

    /** アニメーション後に呼ばれる: 実際に行を消してスポーン */
    function finishClearLines() {
      isAnimating = false;
      const rows = flashRows.slice().sort((a, b) => b - a); // 下から消す
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

      // ゲームオーバー判定
      for (let y = 0; y < HIDDEN_ROWS; y++) {
        if (board[y].some(Boolean)) {
          isGameOver = true;
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
        // アニメーション中は操作・落下を止める
        current = null; // 描画からも消す
        isAnimating = true;
        flashRows  = full;
        flashStart = performance.now();
        setTimeout(finishClearLines, FLASH_DURATION);
        return;
      }

      // ライン消去なし → 即ゲームオーバー判定＆スポーン
      for (let y = 0; y < HIDDEN_ROWS; y++) {
        if (board[y].some(Boolean)) {
          isGameOver = true;
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
      if (!collides(p)) {
        current = p;
        return true;
      }
      lockAndNext();
      return false;
    }
  
    function hardDrop() {
      if (!current || isGameOver || isPaused || isAnimating) return;
      let p = clonePiece(current);
      let dist = 0;
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
      const fromR = current.r;
      const toR = (fromR + (dir > 0 ? 1 : 3)) % 4;
      const tests = kickTests(current.type, fromR, toR);
  
      for (const [dx, dy] of tests) {
        const p = clonePiece(current);
        p.r = toR;
        p.x += dx;
        p.y += dy;
        if (!collides(p)) {
          current = p;
          return;
        }
      }
    }
  
    function dropIntervalMs() {
      // レベルが上がるほど速く（下限を設定）
      const base = 800;
      const ms = base * Math.pow(0.88, level - 1);
      return Math.max(60, ms);
    }
  
    // ======= 描画 =======
    function drawCell(x, y, color) {
      const px = OFFSET_X + x * CELL;
      const py = OFFSET_Y + (y - HIDDEN_ROWS) * CELL;
      if (y < HIDDEN_ROWS) return; // 隠し行は描画しない
  
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  
      // 軽いハイライト
      ctx.strokeStyle = 'rgba(255,255,255,.10)';
      ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
    }
  
    function drawBoard() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // 背景グリッド（視認性用）
      ctx.save();
      ctx.translate(OFFSET_X, OFFSET_Y);
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, 0);
        ctx.lineTo(x * CELL, BOARD_H);
        ctx.stroke();
      }
      for (let y = 0; y <= VISIBLE_ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL);
        ctx.lineTo(BOARD_W, y * CELL);
        ctx.stroke();
      }
      ctx.restore();
  
      // 固定ブロック
      for (let y = HIDDEN_ROWS; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const c = board[y][x];
          if (c) drawCell(x, y, c);
        }
      }
  
      // ライン消去フラッシュアニメーション
      if (isAnimating && flashRows.length > 0) {
        const elapsed = performance.now() - flashStart;
        // 40ms 間隔で明滅（0.25秒で約6回点滅）
        const bright = Math.floor(elapsed / 40) % 2 === 0;
        ctx.fillStyle = bright ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.25)';
        for (const ry of flashRows) {
          const visY = ry - HIDDEN_ROWS;
          if (visY < 0) continue;
          ctx.fillRect(OFFSET_X, OFFSET_Y + visY * CELL, BOARD_W, CELL);
        }
      }

      // 操作中ピース
      if (current) {
        const m = matrixFor(current);
        const color = TETROMINO[current.type].color;
        for (let ry = 0; ry < 4; ry++) {
          for (let rx = 0; rx < 4; rx++) {
            if (!m[ry][rx]) continue;
            drawCell(current.x + rx, current.y + ry, color);
          }
        }
      }
  
      // 枠
      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(OFFSET_X + 1, OFFSET_Y + 1, BOARD_W - 2, BOARD_H - 2);
    }
  
    function updateHUD() {
      elScore.textContent = String(score);
      elLines.textContent = String(lines);
      elLevel.textContent = String(level);
    }
  
    function showOverlay(text) {
      overlay.textContent = text;
      overlay.classList.remove('hidden');
    }
    function hideOverlay() {
      overlay.classList.add('hidden');
      overlay.textContent = '';
    }
  
    // ======= ループ =======
    function update(time) {
      const dt = time - lastTime;
      lastTime = time;
  
      if (!isPaused && !isGameOver && !isAnimating) {
        dropCounter += dt;
        if (dropCounter >= dropIntervalMs()) {
          softDrop();
          dropCounter = 0;
        }
      }
  
      drawBoard();
      requestAnimationFrame(update);
    }
  
    function resetGame() {
      board = newBoard();
      nextQueue = [];
      score = 0;
      lines = 0;
      level = 1;
      isGameOver = false;
      isPaused = false;
      isAnimating = false;
      flashRows  = [];
      dropCounter = 0;
      updateHUD();
      hideOverlay();
      current = spawn();
    }
  
    // ======= 入力（スマホ） =======
    // 極めてシンプルに、touchstart/touchend（+ mouseフォールバック）を個別に登録する。
    // 重要: スクロール/ズームを止めるため、リスナー内で必ず preventDefault() する。

    let lastTouchAt = 0;
    const markTouch = () => { lastTouchAt = Date.now(); };
    const ignoreMouseIfRecentTouch = () => (Date.now() - lastTouchAt) < 600;
  
    function bindTap(btn, fn) {
      const fire = (e) => {
        // 画面スクロールや拡大を防止（要件: 必ず呼ぶ）
        e?.preventDefault?.();
        fn();
      };
      btn.addEventListener('touchstart', (e) => { markTouch(); fire(e); }, { passive: false });
      btn.addEventListener('mousedown', (e) => {
        if (ignoreMouseIfRecentTouch()) return;
        fire(e);
      });
    }
  
    function bindRepeat(btn, fn, firstDelay = 180, interval = 65) {
      let t1 = null;
      let t2 = null;
  
      const clear = (e) => {
        e?.preventDefault?.();
        clearTimeout(t1);
        clearInterval(t2);
        t1 = null;
        t2 = null;
      };
  
      const start = (e) => {
        e?.preventDefault?.();
        if (t1 || t2) return; // 既に押されている場合の連続発火を防止
        fn();
        t1 = setTimeout(() => {
          t2 = setInterval(fn, interval);
        }, firstDelay);
      };
  
      btn.addEventListener('touchstart', (e) => { markTouch(); start(e); }, { passive: false });
      btn.addEventListener('touchend', clear, { passive: false });
      btn.addEventListener('touchcancel', clear, { passive: false });
  
      btn.addEventListener('mousedown', (e) => {
        if (ignoreMouseIfRecentTouch()) return;
        start(e);
      });
      btn.addEventListener('mouseup', (e) => {
        if (ignoreMouseIfRecentTouch()) return;
        clear(e);
      });
      btn.addEventListener('mouseleave', (e) => {
        if (ignoreMouseIfRecentTouch()) return;
        clear(e);
      });
    }
  
    // 割り当て:
    // - 左: 左移動（リピート）
    // - 右: 右移動（リピート）
    // - 下: ソフトドロップ（リピート）
    // - 上: ハードドロップ（単発）
    // - 右手: 回転（単発）
    bindRepeat(btnLeft, () => move(-1));
    bindRepeat(btnRight, () => move(1));
    bindRepeat(btnDown, () => softDrop(), 140, 60);
    bindTap(btnUp, () => hardDrop());
    bindTap(btnRotate, () => rotate(1));
  
    btnPause.addEventListener('click', () => {
      if (isGameOver) return;
      isPaused = !isPaused;
      if (isPaused) showOverlay('PAUSED');
      else hideOverlay();
      btnPause.textContent = isPaused ? '再開' : '一時停止';
    });
  
    btnRestart.addEventListener('click', () => {
      btnPause.textContent = '一時停止';
      resetGame();
    });
  
    // ======= 入力（キーボード） =======
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.key === 'p' || e.key === 'P') {
        btnPause.click();
        return;
      }
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