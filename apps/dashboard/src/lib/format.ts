/** Data ISO → dd/mm/aaaa (fuso do usuário não importa pra datas de convite/atividade). */
export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}
