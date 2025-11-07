<script>
    import { onMount } from 'svelte';
    import Map from './Map.svelte';

    let showMap = false;
    let mapLoaded = false;
    let loadingProgress = 0;
    let loadingStatus = 'Loading...';
    let currentPosition = 'position-0';
    let showExploreMessage = false;
    let showLegendPanel = false;
    let legendCollapsed = false;
    let minimumLoadTimeElapsed = false;
    let blockMapInteraction = true;
    let mapComponent;
    const ROUTE_COLOR = '#008566';
    const legendLayers = [
        {
            id: 'routes-johnny',
            label: "Johnny's Trip",
            description: "Johnny's sprint to all 26 cantons in one day.",
            color: ROUTE_COLOR,
            shape: 'line'
        },
        {
            id: 'lines',
            label: 'Railways',
            description: 'Core SBB railway lines that span the country.',
            color: '#F50A0A',
            shape: 'line'
        },
        {
            id: 'SBB',
            label: 'Major Stations',
            description: 'Key SBB hubs across the network.',
            color: '#F50A0A',
            shape: 'circle'
        }
    ];
    let layerVisibility = {
        'routes-johnny': true,
        lines: true,
        SBB: true
    };

    function handleMapStatus(event) {
        const { detail } = event;
        if (detail.type === 'load') {
            mapLoaded = true;
            loadingProgress = 100;
            loadingStatus = 'Loaded!';
            updateLoader();
            syncLayerVisibility();
            // Only hide loader if minimum load time has elapsed
            if (minimumLoadTimeElapsed) {
                hideLoader();
            }
        } else if (detail.type === 'progress') {
            loadingProgress = detail.progress || loadingProgress;
            loadingStatus = detail.message || loadingStatus;
            updateLoader();
        } else if (detail.type === 'positionChange') {
            currentPosition = detail.position;
        } else if (detail.type === 'exploreMode') {
            blockMapInteraction = false; // Remove blocking overlay
            fadeInNavigationControls(); // Fade in the map controls
            triggerExploreMode(); // Show the explore message
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

    function fadeInNavigationControls() {
        const controlElement = document.querySelector('.maplibregl-ctrl-top-right');
        if (controlElement) {
            controlElement.style.opacity = '0';
            controlElement.style.display = 'block';
            controlElement.style.transition = 'opacity 0.8s ease-in-out';
            setTimeout(() => {
                controlElement.style.opacity = '1';
            }, 50);
        }
    }

    function triggerExploreMode() {
        // Show the explore message
        showExploreMessage = true;
        showLegendPanel = true;
        legendCollapsed = false;

        // Hide the message after 2.5 seconds (fade animations included)
        setTimeout(() => {
            showExploreMessage = false;
        }, 2500);
    }

    function syncLayerVisibility() {
        if (!mapComponent || !mapComponent.setLayerVisibility) return;
        legendLayers.forEach(({ id }) => {
            mapComponent.setLayerVisibility(id, layerVisibility[id]);
        });
    }

    function handleLegendToggle(layerId, visible) {
        layerVisibility = {
            ...layerVisibility,
            [layerId]: visible
        };
        if (mapComponent && mapComponent.setLayerVisibility) {
            mapComponent.setLayerVisibility(layerId, visible);
        }
    }

    function toggleLegendCollapsed() {
        legendCollapsed = !legendCollapsed;
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
        <Map bind:this={mapComponent} on:mapStatus={handleMapStatus} />
    {/if}

    <!-- Blocking overlay - prevents map interaction during scrolly -->
    {#if blockMapInteraction}
        <div class="map-interaction-blocker"></div>
    {/if}

    <div class="scrollytelling">
        <section id="position-0" class="active">
            <div class="textbox">
                <strong>Geneva to Biel</strong>
                <div class="textbox-route-line"></div>
                <p class="highlight-text">
                    This green line traces Johnny's dash to set foot in all 26 Swiss cantons within a single day.
                </p>
                Our journey begins in Geneva, following the railway routes through the heart of Western Switzerland.
            </div>
        </section>

        <section id="position-1">
            <div class="textbox">
                <strong>Biel to Lucerne</strong>
                From Biel, the routes branch outward across the Swiss Plateau. The railway network expands as we approach Lucerne, connecting cities and towns across this central region.
            </div>
        </section>

        <section id="position-2">
            <div class="textbox">
                <strong>Around Lucerne</strong>
                The routes loop and converge around Lucerne, Switzerland's gateway to the Alps. This transportation hub links the northern lowlands with the dramatic mountain passes to the south.
            </div>
        </section>

        <section id="position-3">
            <div class="textbox">
                <strong>Through the Mountains</strong>
                Now the journey intensifies. The routes climb through the Alps toward Bellinzona, navigating steep valleys and crossing mountain passes. This is Swiss engineering at its finest — railways carved through some of Europe's most challenging terrain.
            </div>
        </section>

        <section id="position-4" style="margin-bottom: 150vh;">
            <div class="textbox">
                <strong>The Complete Network</strong>
                From this overview, you can see the full Swiss railway network — a masterpiece of engineering and planning. Every route tells a story of connection, linking communities across mountains, valleys, and lakes.
            </div>
        </section>
    </div>

    {#if showExploreMessage}
        <div class="explore-message">
            <div class="explore-message-content">
                Explore the map and data
            </div>
        </div>
    {/if}

    {#if showLegendPanel}
        <aside class="legend-panel {legendCollapsed ? 'legend-panel--collapsed' : ''}" aria-label="Layer legend">
            <div class="legend-panel-header">
                <span>Legend</span>
                <button
                    class="legend-toggle"
                    type="button"
                    on:click={toggleLegendCollapsed}
                    aria-pressed={!legendCollapsed}
                >
                    {legendCollapsed ? 'Show' : 'Hide'}
                </button>
            </div>
            <div class="legend-body" aria-hidden={legendCollapsed}>
                {#each legendLayers as layer}
                    <label class="legend-item">
                        <div class="legend-item-row">
                            <input
                                type="checkbox"
                                checked={layerVisibility[layer.id]}
                                on:change={(event) => handleLegendToggle(layer.id, event.target.checked)}
                            />
                            <span
                                class={`legend-swatch legend-swatch--${layer.shape || 'square'}`}
                                style={`background-color: ${layer.color}`}
                            ></span>
                            <span class="legend-label">{layer.label}</span>
                        </div>
                        <small>{layer.description}</small>
                    </label>
                {/each}
            </div>
        </aside>
    {/if}
</main>

<style>
    main {
        width: 100%;
        height: 100%;
    }

    .map-interaction-blocker {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        z-index: 100;
        pointer-events: all;
        /* Invisible - just blocks interactions */
    }

    .scrollytelling {
        display: grid;
        grid-template-columns: 40vw;
        justify-content: left;
        padding-left: 5vw;
        gap: 90vh;
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        padding-top: 70vh;
        box-sizing: border-box;
        z-index: 200;
        pointer-events: none;
    }

    .textbox {
        text-align: left;
        padding: 1.5rem;
        font-size: 1rem;
        font-weight: normal;
        color: #3a2a1a;
        background-color: rgba(245, 235, 220, 0.95);
        line-height: 150%;
        border-radius: 8px;
        max-width: 30vw;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(10px);
        pointer-events: auto;
        transform: translateZ(0);
        will-change: transform;
        border: 1px solid rgba(139, 69, 19, 0.2);
    }

    .textbox strong {
        display: block;
        color: #8b1a1a;
        font-weight: 700;
        font-size: 1.3rem;
        margin-bottom: 0.8rem;
        letter-spacing: 0.02em;
        text-transform: uppercase;
    }

    .textbox-route-line {
        width: 100%;
        height: 4px;
        background: linear-gradient(90deg, rgba(0, 133, 102, 0.2), #008566 60%, rgba(0, 133, 102, 0.9));
        border-radius: 999px;
        margin-bottom: 0.6rem;
    }

    .highlight-text {
        margin-top: 0;
        margin-bottom: 0.8rem;
        font-weight: 600;
        color: #5a1e1e;
    }

    .explore-message {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        pointer-events: none;
        animation: exploreMessageFadeIn 0.5s ease-out forwards;
    }

    .explore-message-content {
        background-color: rgba(245, 235, 220, 0.95);
        color: #3a2a1a;
        padding: 24px 40px;
        border-radius: 12px;
        font-size: 1.5rem;
        font-weight: 700;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        text-align: center;
        animation: exploreContentScale 0.5s ease-out forwards;
        border: 1px solid rgba(139, 69, 19, 0.2);
        letter-spacing: 0.02em;
    }

    @keyframes exploreMessageFadeIn {
        0% {
            opacity: 0;
        }
        100% {
            opacity: 1;
        }
    }

    @keyframes exploreContentScale {
        0% {
            transform: scale(0.95);
        }
        100% {
            transform: scale(1);
        }
    }

    .legend-panel {
        position: fixed;
        top: 15vh;
        right: 3vw;
        width: 280px;
        background-color: rgba(245, 235, 220, 0.95);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        padding: 1.25rem;
        z-index: 500;
        border: 1px solid rgba(139, 69, 19, 0.25);
        backdrop-filter: blur(10px);
    }

    .legend-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 700;
        color: #8b1a1a;
        margin-bottom: 0.75rem;
        font-size: 1.1rem;
    }

    .legend-body {
        overflow: hidden;
        transition: max-height 0.3s ease;
    }

    .legend-panel--collapsed .legend-body {
        max-height: 0;
        padding: 0;
        margin: 0;
    }

    .legend-panel:not(.legend-panel--collapsed) .legend-body {
        max-height: 1000px; /* large enough */
    }

    .legend-item {
        display: block;
        margin-bottom: 0.75rem;
        color: #3a2a1a;
        font-size: 0.95rem;
    }

    .legend-item:last-child {
        margin-bottom: 0;
    }

    .legend-item-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
    }

    .legend-swatch {
        border: 1px solid rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
    }

    .legend-swatch--square {
        width: 18px;
        height: 18px;
        border-radius: 4px;
    }

    .legend-swatch--circle {
        width: 16px;
        height: 16px;
        border-radius: 50%;
    }

    .legend-swatch--line {
        width: 28px;
        height: 6px;
        border-radius: 999px;
    }

    .legend-toggle {
        border: none;
        background: rgba(245, 235, 220, 0.9);
        color: #8b1a1a;
        border-radius: 999px;
        padding: 0.35rem 0.95rem;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer;
    }

    .legend-label {
        flex: 1;
    }

    .legend-item small {
        display: block;
        margin-left: 1.8rem;
        margin-top: 0.15rem;
        color: rgba(58, 42, 26, 0.8);
        line-height: 1.3;
    }

    @media (max-width: 768px) {
        .scrollytelling {
            grid-template-columns: 90vw;
            justify-content: center;
            padding-left: 0vw;
        }

        .textbox {
            font-size: 0.95rem;
            max-width: 90vw;
            padding: 1.2rem;
        }

        .textbox strong {
            font-size: 1.1rem;
            margin-bottom: 0.6rem;
        }

        .explore-message-content {
            font-size: 1.2rem;
            padding: 20px 30px;
        }

        .legend-panel {
            width: calc(100vw - 2rem);
            right: 1rem;
            top: auto;
            bottom: 2rem;
        }

        .legend-toggle {
            right: 1rem;
            top: 10vh;
        }
    }
</style>
