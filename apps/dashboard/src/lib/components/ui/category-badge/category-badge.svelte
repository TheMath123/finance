<script lang="ts">
	import { pickContrastColor } from '@finance/shared';
	import TagIcon from 'phosphor-svelte/lib/TagIcon';
	import { cn } from '$lib/utils.js';

	// Mesmo truque de $lib/category-icon.ts: não há subpath exportado pro tipo
	// de props dos ícones Phosphor, então deriva do componente em si.
	type IconComponent = typeof TagIcon;

	/**
	 * Bolinha colorida com ícone dentro — mesmo padrão em toda a base
	 * (categorias, ComboSelect, mobile). A cor do ícone nunca é fixa:
	 * `pickContrastColor` (`@finance/shared`, baseado em `culori`) escolhe
	 * preto ou branco pelo contraste WCAG real contra a cor de fundo
	 * escolhida pelo usuário — um ícone branco fixo (o que existia antes)
	 * fica ilegível em cores claras (ex.: o próprio teal da marca falha WCAG
	 * contra branco: contraste 2.17, abaixo do mínimo de 3:1 pra ícones).
	 */
	let {
		color,
		icon: Icon,
		size = 36,
		iconSize,
		class: className
	}: {
		color: string;
		icon: IconComponent;
		size?: number;
		iconSize?: number;
		class?: string;
	} = $props();

	const iconColor = $derived(pickContrastColor(color));
	const resolvedIconSize = $derived(iconSize ?? Math.round(size * 0.55));
</script>

<span
	class={cn('flex shrink-0 items-center justify-center rounded-full', className)}
	style="background-color: {color}; height: {size}px; width: {size}px"
>
	<Icon size={resolvedIconSize} weight="fill" color={iconColor} />
</span>
