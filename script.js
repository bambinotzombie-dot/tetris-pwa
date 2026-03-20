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
  
    // ======= BGM (Web Audio API) =======
    // HTML5 Audio の代わりに Web Audio API を使用。
    // audioCtx.suspend() / resume() はハードウェアレベルで即座に動作するため
    // スマホのバックグラウンド移行時でも確実に音が止まる。

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let bgmBuffer  = null;  // fetch→decodeAudioData で得た AudioBuffer
    let bgmSource  = null;  // 再生中の BufferSourceNode（使い捨て）
    let bgmStarted = false; // 初回再生が行われたか

    // BGM ファイルを事前フェッチしてデコード（バックグラウンドで実行）
    fetch('./bgm.wav')
      .then(res  => res.arrayBuffer())
      .then(buf  => audioCtx.decodeAudioData(buf))
      .then(decoded => { bgmBuffer = decoded; })
      .catch(() => { /* bgm.wav が存在しない場合でもゲームは続行 */ });

    /**
     * 新しい BufferSourceNode を生成して先頭から再生する。
     * BufferSourceNode は start() を一度呼ぶと使い捨てになるため、
     * 毎回 createBufferSource() でノードを再生成する。
     */
    function playBGM() {
      if (!bgmBuffer) return;
      // 既存ノードを安全に停止・切断
      if (bgmSource) {
        try { bgmSource.stop(); } catch (_) {}
        bgmSource.disconnect();
        bgmSource = null;
      }
      bgmSource        = audioCtx.createBufferSource();
      bgmSource.buffer = bgmBuffer;
      bgmSource.loop   = true;
      bgmSource.connect(audioCtx.destination);
      bgmSource.start(0);
    }

    /**
     * AudioContext を suspend してBGMをハードウェアレベルで即座に停止する。
     * HTML5 Audio.pause() と違い、Promise の競合による DOMException が発生しない。
     */
    function pauseBGM() {
      if (audioCtx.state === 'running') audioCtx.suspend();
    }

    /**
     * AudioContext を resume してBGMを再開する。
     * suspend した位置から継続再生されるため、ノードの再生成は不要。
     */
    function resumeBGM() {
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    /** ゲームオーバー: ソースを破棄してコンテキストも suspend */
    function bgmStop() {
      if (bgmSource) {
        try { bgmSource.stop(); } catch (_) {}
        bgmSource.disconnect();
        bgmSource = null;
      }
      if (audioCtx.state === 'running') audioCtx.suspend();
    }

    /** リスタート: 先頭から再生（起動済み・ポーズ解除済みのとき） */
    function bgmRestart() {
      if (!bgmStarted || isPaused) return;
      // suspend 中の場合は resume してから新ノードを再生
      audioCtx.resume().then(() => playBGM());
    }

    /**
     * 初回ユーザー操作: AudioContext を unlock して BGM を開始する。
     * ブラウザの自動再生ポリシーにより、AudioContext は最初のユーザー操作まで
     * 'suspended' 状態になっているため、resume() でアンロックしてから start() する。
     */
    function tryStartBgm() {
      // removeEventListener で確実に解除（2回目以降は絶対に発火させない）
      document.removeEventListener('touchstart', tryStartBgm);
      document.removeEventListener('mousedown',  tryStartBgm);
      if (bgmStarted || isPaused) return;
      bgmStarted = true;
      audioCtx.resume().then(() => playBGM());
    }

    // 最初のユーザー操作をトリガーに AudioContext をアンロック
    document.addEventListener('touchstart', tryStartBgm, { passive: true });
    document.addEventListener('mousedown',  tryStartBgm);
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
        bgmStop();           // ゲームオーバー: BGM を停止して先頭に戻す
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
          bgmStop();         // ゲームオーバー: BGM を停止して先頭に戻す
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
          bgmStop();         // ゲームオーバー: BGM を停止して先頭に戻す
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
      bgmRestart(); // リスタート時: 先頭から再生（未再生なら何もしない）
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
        e?.preventDefault?.();   // スクロール / ダブルタップ拡大を防止
        e?.stopPropagation?.();  // document の tryStartBgm へのバブリングを遮断
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
  
    // ポーズ／再開のロジックを関数に切り出す
    // bindTap・キーボード Pキー・visibilitychange の全てから安全に呼べる形に整理
    function doPause() {
      if (isGameOver) return;
      isPaused = !isPaused;

      if (isPaused) {
        // ── ポーズ ──
        showOverlay('PAUSED');
        pauseBGM(); // Promise チェーン経由で確実に停止（DOMException を防ぐ）
      } else {
        // ── 再開 ──
        hideOverlay();
        // audioCtx.resume() で suspend した位置から継続再生
        // （ノードの再生成は不要）
        if (bgmStarted) resumeBGM();
      }

      btnPause.textContent = isPaused ? '再開' : '一時停止';
    }

    // bindTap を使うことで touchstart で即反応・バブリング遮断・ズーム防止が一括適用される
    bindTap(btnPause,   () => doPause());
    bindTap(btnRestart, () => {
      btnPause.textContent = '一時停止';
      resetGame();
    });

    // ======= Page Visibility API: バックグラウンド / 画面オフ時のBGM制御 =======
    function handleBackground() {
      pauseBGM(); // 強制停止
      
      if (!isGameOver && !isPaused) {
        isPaused = true;
        showOverlay('PAUSED');
        btnPause.textContent = '再開';
      }
    }

    // 画面が隠れた時
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) handleBackground();
    });
    // Safariなどの別アプリ切り替え時の保険
    document.addEventListener('pagehide', handleBackground);

    // ======= 入力（キーボード） =======
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.key === 'p' || e.key === 'P') {
        doPause(); // btnPause.click() ではなく直接呼び出し（click イベントに依存しない）
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