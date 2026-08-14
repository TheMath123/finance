import type { GoogleCredentialResponse } from './components/auth/google-identity';

/**
 * Carrega o script do Google Identity Services (GIS) e renderiza o botão
 * num container — compartilhado por `google-sign-in-button.svelte` (login)
 * e `google-link-button.svelte` (vínculo pelo perfil, M5-07); a única
 * diferença entre os dois é o que acontece no `onCredential`. Tipagem do
 * `window.google` fica em `./components/auth/google-identity.d.ts`.
 *
 * Devolve uma função de cleanup (remove o `<script>`) pro `onMount` chamar.
 */
export function renderGoogleButton(
	container: HTMLElement,
	clientId: string,
	onCredential: (response: GoogleCredentialResponse) => void,
	text: 'continue_with' | 'signin_with' = 'continue_with'
): () => void {
	const script = document.createElement('script');
	script.src = 'https://accounts.google.com/gsi/client';
	script.async = true;
	script.onload = () => {
		if (!window.google) return;
		window.google.accounts.id.initialize({
			client_id: clientId,
			callback: onCredential
		});
		window.google.accounts.id.renderButton(container, {
			theme: 'outline',
			size: 'large',
			width: 320,
			text,
			locale: 'pt-BR'
		});
	};
	document.head.appendChild(script);

	return () => {
		script.remove();
	};
}
