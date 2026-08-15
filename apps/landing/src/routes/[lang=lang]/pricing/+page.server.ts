import { listPublicPlans } from '$lib/server/plans-api';

export async function load() {
	const result = await listPublicPlans();
	// Defesa em profundidade — o backend já filtra isActive/isPrivate em
	// GET /plans, mas repetir o filtro aqui não custa nada e evita
	// depender só do contrato remoto.
	const plans = result.ok ? result.value.filter((p) => p.isActive) : [];
	return { plans };
}
