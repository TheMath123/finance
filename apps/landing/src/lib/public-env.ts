import { PUBLIC_APP_URL as RAW_PUBLIC_APP_URL } from '$env/static/public';

/**
 * `PUBLIC_APP_URL` validada — se a env pública existir mas vier vazia (ex:
 * `vars.PUBLIC_APP_URL` não configurado no repositório do GitHub, então
 * `${{ vars.PUBLIC_APP_URL }}` vira string vazia no workflow, não undefined),
 * os botões "Entrar"/"Criar conta" viravam link relativo pro próprio site
 * institucional (`href="/login"` em vez de `href="https://dash.../login"`) —
 * quebrado silenciosamente, só percebido a olho em produção. Preferível
 * falhar alto (erro 500 na primeira request) a servir um link errado sem
 * avisar ninguém.
 */
export const PUBLIC_APP_URL: string = (() => {
	if (!RAW_PUBLIC_APP_URL) {
		throw new Error(
			'PUBLIC_APP_URL está vazia — configure a repository variable no GitHub ' +
				'(Settings → Secrets and variables → Actions → Variables) com a URL ' +
				'pública do dashboard (ver tasks/in-progress/ci-cd-deploy.md).'
		);
	}
	return RAW_PUBLIC_APP_URL;
})();
