import type { SubmitFunction } from '@sveltejs/kit';

/**
 * `use:enhance` pra forms dentro de dialog: fecha em sucesso, e em falha
 * entrega a mensagem pro chamador guardar em estado LOCAL do componente —
 * nunca no `form` compartilhado da página (`update()` só roda no sucesso).
 * Sem isso, `form?.message` fica "grudado" e reaparece fora do dialog
 * depois que ele é fechado manualmente (o `form` da página não é limpo por
 * SvelteKit até a próxima submissão).
 */
export function dialogFormSubmit(opts: {
	onSuccess: () => void;
	onError: (message: string) => void;
}): SubmitFunction {
	return () =>
		async ({ result, update }) => {
			if (result.type === 'success') {
				opts.onSuccess();
				await update();
				return;
			}
			if (result.type === 'failure') {
				const data = result.data;
				const message =
					data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
						? data.message
						: 'Erro inesperado.';
				opts.onError(message);
				return;
			}
			await update();
		};
}
