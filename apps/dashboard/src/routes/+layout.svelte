<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';

	import './layout.css';

	let { children } = $props();
</script>

<!-- Favicon já é servido por /favicon.svg (static/) via <link> em app.html — sem duplicar aqui. -->
<ModeWatcher />
{@render children()}
