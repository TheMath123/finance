import { isCloudflaredRunning, isTunnelReachable, readState } from './lib';

async function main() {
  const state = readState();
  if (!state) {
    console.log('Nenhum túnel registrado (rode "bun run tunnel:open").');
    process.exit(1);
  }

  const alive = await isCloudflaredRunning();
  const reachable = alive ? await isTunnelReachable(state.url) : false;

  console.log(`URL: ${state.url}`);
  console.log(`Webhook do Stripe: ${state.url}/webhooks/stripe`);
  console.log(`cloudflared.exe: ${alive ? 'rodando' : 'não encontrado'}`);
  console.log(`Aberto em: ${state.startedAt}`);
  console.log(
    reachable
      ? 'Reachability: OK — /health respondeu 200.'
      : 'Reachability: FALHOU — túnel não está roteando pro backend local.'
  );

  process.exit(alive && reachable ? 0 : 1);
}

main();
