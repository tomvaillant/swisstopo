<script>
    import { onMount } from 'svelte';
    import Map from '../components/Map.svelte';
    import Legend from '../components/Legend.svelte';
    import StoryButton from '../components/StoryButton.svelte';

    let mapComponent;
    let showMap = false;
    let mapLoaded = false;
    let loadingProgress = 0;
    let loadingStatus = 'Loading...';
    let minimumLoadTimeElapsed = false;

    function handleMapStatus(event) {
        const { detail } = event;
        if (detail.type === 'load') {
            mapLoaded = true;
            loadingProgress = 100;
            loadingStatus = 'Loaded!';
            updateLoader();
            // Only hide loader if minimum load time has elapsed
            if (minimumLoadTimeElapsed) {
                hideLoader();
            }
        } else if (detail.type === 'progress') {
            loadingProgress = detail.progress || loadingProgress;
            loadingStatus = detail.message || loadingStatus;
            updateLoader();
        }
    }

    function updateLoader() {
        const loaderText = document.getElementById('loader-text');
        const loaderProgress = document.getElementById('loader-progress-fill');
        if (loaderText) loaderText.textContent = loadingStatus;
        if (loaderProgress) loaderProgress.style.width = `${loadingProgress}%`;
    }

    function hideLoader() {
        const loaderContainer = document.getElementById('loader-container');
        if (loaderContainer) {
            loaderContainer.classList.add('fade-out');
            setTimeout(() => {
                loaderContainer.style.display = 'none';
            }, 500);
        }
    }

    onMount(() => {
        if (typeof window !== 'undefined') {
            if ('scrollRestoration' in window.history) {
                window.history.scrollRestoration = 'manual';
            }
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }

        const maxLoadingTime = 10000;
        const minLoadTime = 2000; // Minimum 2 second pre-load

        // Animate progress bar during initial load
        const progressInterval = setInterval(() => {
            if (loadingProgress < 90 && !mapLoaded) {
                loadingProgress += 10;
                updateLoader();
            }
        }, 200);

        // Start showing map after brief delay
        setTimeout(() => {
            showMap = true;
        }, 100);

        // Set minimum load time flag after 2 seconds
        const minLoadTimer = setTimeout(() => {
            minimumLoadTimeElapsed = true;
            clearInterval(progressInterval);
            // If map already loaded, hide loader now
            if (mapLoaded) {
                hideLoader();
            }
        }, minLoadTime);

        // Fallback timer for very slow loads
        const fallbackTimer = setTimeout(() => {
            const loaderContainer = document.getElementById('loader-container');
            if (loaderContainer && !loaderContainer.classList.contains('fade-out')) {
                loadingStatus = 'Loading is taking longer than expected...';
                loadingProgress = 90;
                updateLoader();
                setTimeout(hideLoader, 3000);
            }
        }, maxLoadingTime);

        return () => {
            clearTimeout(fallbackTimer);
            clearTimeout(minLoadTimer);
            clearInterval(progressInterval);
        };
    });
</script>

<main>
    {#if showMap}
        <Map bind:this={mapComponent} on:mapStatus={handleMapStatus} mode="interactive" />
    {/if}

    <StoryButton />
    <Legend {mapComponent} collapsed={false} />
</main>

<style>
    main {
        width: 100%;
        height: 100%;
    }
</style>
