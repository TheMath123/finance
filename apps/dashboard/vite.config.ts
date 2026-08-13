import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	// Substituição em tempo de build (nunca lido em runtime) — única fonte de
	// verdade é o `version` deste package.json, exibido no rodapé da sidebar.
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	ssr: {
		noExternal: [
			// exporta TypeScript puro (exports -> src/index.ts) — sem isso o runtime SSR
			// tentaria importar .ts direto do node_modules sem transformar.
			'@finance/shared',
			// import * as PhosphorIcons from 'phosphor-svelte' (lib/category-icon.ts) importa o
			// índice inteiro do pacote, que reexporta ~1500 arquivos .svelte — como bare specifier,
			// o Vite trata o pacote como externo em dev e tenta um import() nativo do Node, que não
			// entende .svelte (ERR_UNKNOWN_FILE_EXTENSION). Imports diretos por ícone
			// (phosphor-svelte/lib/XIcon) não têm esse problema, só o import do pacote inteiro.
			'phosphor-svelte'
		]
	}
});
