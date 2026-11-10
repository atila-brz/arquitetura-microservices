const { spawn } = require('child_process');
const path = require('path');

const servicos = [
  { nome: 'localizacao', dir: 'services/localizacao' },
  { nome: 'meteorologia', dir: 'services/meteorologia' },
  { nome: 'historico', dir: 'services/historico' },
  { nome: 'gateway', dir: 'gateway' },
];

const processos = servicos.map(({ nome, dir }) => {
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, dir),
    stdio: 'inherit',
    env: process.env,
  });
  proc.on('exit', (codigo) => {
    if (codigo) console.error(`[${nome}] encerrou com código ${codigo}`);
  });
  return proc;
});

const encerrar = () => {
  processos.forEach((p) => p.kill());
  process.exit(0);
};
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
