import {
  clearState,
  isCloudflaredRunning,
  killCloudflared,
  readState,
} from './lib';

async function main() {
  const state = readState();
  if (!state && !(await isCloudflaredRunning())) {
    console.log('Nenhum túnel registrado — nada pra fechar.');
    return;
  }

  const alive = await isCloudflaredRunning();
  if (alive) {
    await killCloudflared();
    console.log(`Túnel encerrado (era ${state?.url ?? 'desconhecido'}).`);
  } else {
    console.log('cloudflared já não estava rodando.');
  }

  clearState();
}

main();
