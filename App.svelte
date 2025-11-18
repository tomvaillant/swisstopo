<script>
    import { onMount } from 'svelte';
    import Router from 'svelte-spa-router';
    import Home from './src/pages/Home.svelte';
    import Story from './src/pages/Story.svelte';

    const routes = {
        '/': Home,
        '/story': Story,
        '*': Home // Fallback to home for any unmatched routes
    };

    onMount(() => {
        // Disable scroll restoration for hash-based routing
        if (typeof window !== 'undefined') {
            if ('scrollRestoration' in window.history) {
                window.history.scrollRestoration = 'manual';
            }
        }
    });
</script>

<Router {routes} />

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        overflow-x: hidden;
    }
</style>
