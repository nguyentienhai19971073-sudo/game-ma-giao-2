#!/usr/bin/env node
/**
 * MA GIÁO ONLINE – THIÊN HẠ ĐỆ NHẤT TÀ PHÁI
 * Desktop Control Panel & Local Launcher Server (macOS & Windows)
 * Inherited & upgraded from Chùa Online 2 (Tĩnh Tâm Online Launcher).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const LAUNCHER_PORT = Number(process.env.MA_GIAO_LAUNCHER_PORT || 3388);
const GAME_PORT = Number(process.env.PORT || 3000);
const GAME_ROOT = path.resolve(__dirname, '..', '..');
const INTERFACE_HTML = path.join(__dirname, 'interface.html');

let gameProcess = null;
let logs = [];

function pushLog(msg) {
  const line = `[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`;
  logs.push(line);
  if (logs.length > 250) logs.shift();
  console.log(line);
}

function startGameServer() {
  if (gameProcess) {
    pushLog('Server Ma Giáo Online đang chạy rồi.');
    return;
  }
  pushLog('Đang khởi động Server Ma Giáo Online tại cổng ' + GAME_PORT + '...');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  gameProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: GAME_ROOT,
    env: { ...process.env, PORT: String(GAME_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  gameProcess.stdout.on('data', data => pushLog(String(data).trim()));
  gameProcess.stderr.on('data', data => pushLog('[WARN] ' + String(data).trim()));
  gameProcess.on('exit', code => {
    pushLog('Server Ma Giáo Online đã dừng (code=' + code + ').');
    gameProcess = null;
  });
}

function stopGameServer() {
  if (!gameProcess) {
    pushLog('Server hiện không chạy.');
    return;
  }
  pushLog('Đang dừng Server Ma Giáo Online...');
  gameProcess.kill('SIGTERM');
  gameProcess = null;
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        running: Boolean(gameProcess),
        gamePort: GAME_PORT,
        studioUrl: `http://localhost:${GAME_PORT}/`,
        adminUrl: `http://localhost:${GAME_PORT}/admincp`,
        obsUrl: `http://localhost:${GAME_PORT}/?obs=1`,
        logs: logs.slice(-80),
      })
    );
    return;
  }

  if (req.url === '/api/start' && req.method === 'POST') {
    startGameServer();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === '/api/stop' && req.method === 'POST') {
    stopGameServer();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Serve Launcher UI HTML
  if (fs.existsSync(INTERFACE_HTML)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(INTERFACE_HTML, 'utf8'));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('MA GIÁO ONLINE LAUNCHER ĐANG CHẠY');
  }
});

server.listen(LAUNCHER_PORT, '127.0.0.1', () => {
  const launcherUrl = `http://127.0.0.1:${LAUNCHER_PORT}/`;
  pushLog(`Bảng điều khiển Launcher Ma Giáo Online: ${launcherUrl}`);
  startGameServer();
  if (!process.argv.includes('--no-open')) {
    setTimeout(() => openBrowser(launcherUrl), 1000);
  }
});
