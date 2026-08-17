/**
 * Cria e empurra a tag de release que dispara o deploy (ver
 * .github/workflows/deploy-dashboard.yml, deploy-landing.yml,
 * deploy-backend.yml e release-mobile.yml — cada um só reage ao próprio
 * prefixo de tag). Uso:
 *
 *   bun run release:dashboard [patch|minor|major]  (default: patch)
 *   bun run release:landing [patch|minor|major]
 *   bun run release:api [patch|minor|major]
 *   bun run release:mobile [patch|minor|major]
 *
 * Não mexe em package.json — só lê a última tag existente do prefixo certo,
 * sobe o número e cria+empurra a tag anotada. Evita o erro manual de digitar
 * `git tag` errado (prefixo trocado, número duplicado, etc.).
 */

type Target = 'dashboard' | 'landing' | 'api' | 'mobile';
type Bump = 'patch' | 'minor' | 'major';

const TARGETS: Record<Target, { prefix: string; label: string }> = {
  dashboard: { prefix: 'dashboard-web-v', label: 'dashboard' },
  landing: { prefix: 'landingpage-v', label: 'landing' },
  api: { prefix: 'api-v', label: 'api' },
  // Não vai pra loja (Play Store) ainda — a tag só dispara o build do APK
  // (assinado com o keystore de debug do Expo) anexado à GitHub Release.
  mobile: { prefix: 'mobile-v', label: 'mobile' },
};

async function run(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = [
    await new Response(proc.stdout).text(),
    await new Response(proc.stderr).text(),
    await proc.exited,
  ];
  if (exitCode !== 0) {
    throw new Error(`"${cmd.join(' ')}" falhou: ${stderr.trim()}`);
  }
  return stdout.trim();
}

function parseSemver(tag: string, prefix: string): [number, number, number] {
  const raw = tag.slice(prefix.length);
  const match = raw.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Tag "${tag}" não bate com semver esperado`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bumpVersion(
  [major, minor, patch]: [number, number, number],
  bump: Bump
): [number, number, number] {
  if (bump === 'major') return [major + 1, 0, 0];
  if (bump === 'minor') return [major, minor + 1, 0];
  return [major, minor, patch + 1];
}

async function main() {
  const targetArg = process.argv[2] as Target | undefined;
  const bump = (process.argv[3] as Bump | undefined) ?? 'patch';

  if (!targetArg || !(targetArg in TARGETS)) {
    console.error(
      'Uso: bun run release:<dashboard|landing|api|mobile> [patch|minor|major]'
    );
    process.exit(1);
  }
  if (!['patch', 'minor', 'major'].includes(bump)) {
    console.error(`Bump inválido: "${bump}" (use patch, minor ou major)`);
    process.exit(1);
  }

  const { prefix, label } = TARGETS[targetArg];

  const status = await run(['git', 'status', '--porcelain']);
  if (status !== '') {
    console.error(
      'Working tree com mudanças não commitadas — commite ou stash antes de taggear (a tag aponta pro HEAD atual, não pro disco).'
    );
    process.exit(1);
  }

  const branch = await run(['git', 'rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'main') {
    console.error(
      `Você está em "${branch}", não em "main" — releases de produção só saem de main.`
    );
    process.exit(1);
  }

  const existingTags = (await run(['git', 'tag', '-l', `${prefix}*`]))
    .split('\n')
    .filter(Boolean)
    .sort();

  const current: [number, number, number] = existingTags.length
    ? existingTags
        .map((tag) => parseSemver(tag, prefix))
        .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
        .at(-1)!
    : [1, 0, -1]; // primeira release vira v1.0.0 (patch bump abaixo)

  const [nextMajor, nextMinor, nextPatch] = bumpVersion(current, bump);
  const nextTag = `${prefix}${nextMajor}.${nextMinor}.${nextPatch}`;

  console.log(`Criando release ${label}: ${nextTag} (bump: ${bump})`);
  await run(['git', 'tag', '-a', nextTag, '-m', `Release ${nextTag}`]);
  await run(['git', 'push', 'origin', nextTag]);

  console.log(
    `Tag ${nextTag} empurrada — o workflow de deploy do ${label} deve disparar agora no GitHub Actions.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
