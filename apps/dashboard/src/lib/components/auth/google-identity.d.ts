/** Tipagem mínima do script global do Google Identity Services (GIS) — carregado
 * em runtime por google-sign-in-button.svelte, sem pacote npm. */
export interface GoogleCredentialResponse {
	credential: string;
}

export interface GoogleAccountsId {
	initialize: (config: {
		client_id: string;
		callback: (response: GoogleCredentialResponse) => void;
	}) => void;
	renderButton: (
		parent: HTMLElement,
		options: { theme: string; size: string; width: number; text: string; locale: string }
	) => void;
}

declare global {
	interface Window {
		google?: { accounts: { id: GoogleAccountsId } };
	}
}
