<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { chapters } from '../lib/routes.js';
    import { hotspots } from '../lib/hotspots.js';

    // Props
    export let mode = 'storytelling'; // 'interactive' or 'storytelling'

    const dispatch = createEventDispatcher();
    let map;
    const ROUTE_LAYER_ID = 'routes-johnny';
    const ROUTE_COLOR = '#008566';
    const EXPLORE_LAYER_IDS = ['lines', 'SBB'];
    const MAX_ROUTE_INCREMENT = Math.max(
        1,
        ...Object.values(chapters).map((chapter) => chapter.maxRouteIncrement ?? 0)
    );
    let currentChapter = mode === 'interactive' ? 'position-4' : 'position-0';
    let lastScrollStep = null;
    let scrollDebounceTimer = null;
    let navigationControl = null;
    let lastTextboxObserver = null;
    let currentMaxIncrement = mode === 'interactive' ? 100 : 0;
    let routeLayerReady = false;
    let routeAnimationFrame = null;
    let canUseLineGradient = false;
    const pendingLayerVisibility = new Map();
    const hotspotMarkers = [];

    export function setLayerVisibility(layerId, visible) {
        pendingLayerVisibility.set(layerId, visible);
        applyLayerVisibility(layerId, visible);
    }

    async function initializeMap() {
        window.maptilersdk.config.apiKey = 'L1pxMIEc78RDmw6G2tIP';

        // Get initial position based on mode
        const initialChapter = mode === 'interactive' ? chapters['position-4'] : chapters['position-0'];

        const isMobileDevice = window.innerWidth <= 768;
        const overviewChapter = chapters['position-4'];
        const overviewMobileZoom = overviewChapter?.zoom ?? 7;
        const overviewDesktopZoom = overviewChapter?.zoomDesktop ?? overviewMobileZoom;
        const minZoom = isMobileDevice ? overviewMobileZoom : overviewDesktopZoom;
        const initialZoom = isMobileDevice
            ? initialChapter.zoom
            : initialChapter.zoomDesktop ?? initialChapter.zoom;

        map = new window.maptilersdk.Map({
            container: 'map',
            style: '019a5809-86bc-788c-86bb-aed00df4c85d',
            center: initialChapter.center,
            zoom: initialZoom,
            bearing: initialChapter.bearing,
            pitch: initialChapter.pitch,
            minZoom,
            maxPitch: 85,
            pitchWithRotate: true, // Enable right-click pitch control (desktop)
            touchPitch: true, // Enable two-finger pitch control (mobile)
            navigationControl: false, // Disable automatic navigation control
            geolocateControl: false // Disable automatic geolocate control
        });

        await map.onReadyAsync();

        // Add navigation controls to top-left
        navigationControl = new window.maptilersdk.NavigationControl({
            visualizePitch: true
        });
        map.addControl(navigationControl, 'top-left');

        // Load and add routes GeoJSON
        await ensureRouteLayer();
        evaluateLineGradientSupport();
        applyRouteStyling();

        // Set initial route filter based on mode
        const initialMaxIncrement = mode === 'interactive' ? 100 : 0;
        applyRouteFilter(initialMaxIncrement);

        flushPendingLayerVisibility();

        dispatch('mapStatus', { type: 'load' });

        // Only setup scrollytelling for storytelling mode
        if (mode === 'storytelling') {
            setupScrollytelling();

            // Trigger initial route display after loader finishes
            if (initialChapter.maxRouteIncrement !== undefined) {
                const initialRouteDelay = initialChapter.initialRouteDelay ?? 3000;
                setTimeout(() => {
                    updateRoutesDisplay(initialChapter.maxRouteIncrement, {
                        duration: initialChapter.routeAnimationDuration
                    });
                }, initialRouteDelay);
            }
        } else if (mode === 'interactive') {
            // Add hotspots only in interactive mode
            setupHotspotsLayer();
        }
    }

    function setupHotspotsLayer() {
        if (map.getSource('hotspots-geojson')) {
            return; // Already setup
        }

        // Create GeoJSON object in memory from the imported hotspots
        const hotspotsGeoJSON = {
            type: 'FeatureCollection',
            features: hotspots.map(hotspot => ({
                type: 'Feature',
                id: hotspot.id, // Ensure each feature has a unique ID
                geometry: {
                    type: 'Point',
                    coordinates: hotspot.coordinates
                },
                properties: {
                    id: hotspot.id,
                    title: hotspot.title
                }
            }))
        };

        map.addSource('hotspots-geojson', {
            type: 'geojson',
            data: hotspotsGeoJSON,
            promoteId: 'id' // Promote the feature's 'id' property for feature state
        });

        // Add outer glow layer for depth
        map.addLayer({
            id: 'hotspots-glow',
            type: 'circle',
            source: 'hotspots-geojson',
            paint: {
                'circle-radius': [
                    'case',
                    ['boolean', ['feature-state', 'click'], false],
                    24,
                    ['boolean', ['feature-state', 'hover'], false],
                    22,
                    18
                ],
                'circle-color': 'rgba(0, 133, 102, 0)',
                'circle-blur': 1,
                'circle-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'click'], false],
                    0.5,
                    ['boolean', ['feature-state', 'hover'], false],
                    0.4,
                    0.25
                ],
                'circle-stroke-color': ROUTE_COLOR,
                'circle-stroke-width': [
                    'case',
                    ['boolean', ['feature-state', 'click'], false],
                    3,
                    ['boolean', ['feature-state', 'hover'], false],
                    2.5,
                    1.5
                ],
                'circle-stroke-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    0.6,
                    0.35
                ],
                'circle-pitch-alignment': 'map',
                'circle-radius-transition': { duration: 300, delay: 0 },
                'circle-opacity-transition': { duration: 300, delay: 0 },
                'circle-stroke-width-transition': { duration: 300, delay: 0 }
            }
        });

        // Main marker layer
        map.addLayer({
            id: 'hotspots-layer',
            type: 'circle',
            source: 'hotspots-geojson',
            paint: {
                'circle-radius': [
                    'case',
                    ['boolean', ['feature-state', 'click'], false],
                    13,
                    ['boolean', ['feature-state', 'hover'], false],
                    12,
                    10
                ],
                'circle-color': '#EB0000',
                'circle-stroke-color': '#FDFDFB', // Swiss snow white border
                'circle-stroke-width': [
                    'case',
                    ['boolean', ['feature-state', 'click'], false],
                    3.5,
                    ['boolean', ['feature-state', 'hover'], false],
                    3,
                    2.5
                ],
                'circle-opacity': 1,
                'circle-stroke-opacity': 1,
                'circle-pitch-alignment': 'map',
                'circle-radius-transition': { duration: 300, delay: 0 },
                'circle-stroke-width-transition': { duration: 300, delay: 0 }
            }
        });

        // Inner dot for railway precision detail
        map.addLayer({
            id: 'hotspots-center',
            type: 'circle',
            source: 'hotspots-geojson',
            paint: {
                'circle-radius': [
                    'case',
                    ['boolean', ['feature-state', 'click'], false],
                    4,
                    ['boolean', ['feature-state', 'hover'], false],
                    3.5,
                    3
                ],
                'circle-color': '#FDFDFB',
                'circle-opacity': 0.9,
                'circle-pitch-alignment': 'map',
                'circle-radius-transition': { duration: 300, delay: 0 }
            }
        });

        let hoveredHotspotId = null;

        // Unified hover handler for all hotspot layers
        const handleHotspotHover = (e) => {
            if (e.features.length > 0) {
                map.getCanvas().style.cursor = 'pointer';
                if (hoveredHotspotId !== null) {
                    map.setFeatureState(
                        { source: 'hotspots-geojson', id: hoveredHotspotId },
                        { hover: false }
                    );
                }
                hoveredHotspotId = e.features[0].id;
                map.setFeatureState(
                    { source: 'hotspots-geojson', id: hoveredHotspotId },
                    { hover: true }
                );
            }
        };

        const handleHotspotLeave = () => {
            map.getCanvas().style.cursor = '';
            if (hoveredHotspotId !== null) {
                map.setFeatureState(
                    { source: 'hotspots-geojson', id: hoveredHotspotId },
                    { hover: false }
                );
            }
            hoveredHotspotId = null;
        };

        // Apply hover handlers to all layers
        ['hotspots-glow', 'hotspots-layer', 'hotspots-center'].forEach(layerId => {
            map.on('mousemove', layerId, handleHotspotHover);
            map.on('mouseleave', layerId, handleHotspotLeave);
        });

        map.on('click', 'hotspots-layer', (e) => {
            const feature = e.features[0];
            const coordinates = feature.geometry.coordinates.slice();
            const hotspotData = hotspots.find(h => h.id === feature.properties.id);
            
            if (!hotspotData) return;

            // Click animation
            map.setFeatureState(
                { source: 'hotspots-geojson', id: feature.id },
                { click: true }
            );
            setTimeout(() => {
                map.setFeatureState(
                    { source: 'hotspots-geojson', id: feature.id },
                    { click: false }
                );
            }, 300);

            const popupContent = `
                <div class="hotspot-popup">
                    <img src="${hotspotData.image}" alt="${hotspotData.title}" class="hotspot-image" />
                    <h3 class="hotspot-title">${hotspotData.title}</h3>
                    <p class="hotspot-description">${hotspotData.description}</p>
                </div>
            `;

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            const isMobile = window.innerWidth <= 768;
            const popup = new window.maptilersdk.Popup({
                maxWidth: '320px',
                className: isMobile ? 'hotspot-popup-container hotspot-popup-mobile' : 'hotspot-popup-container',
            })
                .setLngLat(coordinates)
                .setHTML(popupContent)
                .addTo(map);

            // Add backdrop blur for mobile
            if (isMobile) {
                const backdropDiv = document.createElement('div');
                backdropDiv.className = 'hotspot-popup-backdrop';
                map.getCanvasContainer().appendChild(backdropDiv);

                // Remove backdrop when popup closes
                popup.on('close', () => {
                    backdropDiv.remove();
                });
            }
        });
    }

    async function ensureRouteLayer() {
        if (map.getLayer(ROUTE_LAYER_ID)) {
            routeLayerReady = true;
            return;
        }

        await new Promise((resolve) => {
            const onStyleData = () => {
                if (map.getLayer(ROUTE_LAYER_ID)) {
                    map.off('styledata', onStyleData);
                    routeLayerReady = true;
                    resolve();
                }
            };

            map.on('styledata', onStyleData);
        });
    }

    function evaluateLineGradientSupport() {
        if (!map) {
            return;
        }
        const source = map.getSource(ROUTE_LAYER_ID);
        // line-progress only works for GeoJSON sources with lineMetrics enabled
        if (source && source.type === 'geojson' && source.workerOptions?.lineMetrics) {
            canUseLineGradient = true;
        } else {
            canUseLineGradient = false;
            if (routeLayerReady && map.getLayer(ROUTE_LAYER_ID)) {
                try {
                    map.setPaintProperty(ROUTE_LAYER_ID, 'line-gradient', null);
                } catch (error) {
                    console.warn('Unable to reset line gradient:', error);
                }
            }
        }
    }

    function createIncrementFilter(maxIncrement) {
        const layerValue = ['coalesce', ['to-string', ['get', 'layer']], '0'];
        const dashIndex = ['index-of', '-', layerValue];
        const prefixLength = [
            'case',
            ['>=', dashIndex, 0],
            dashIndex,
            ['length', layerValue]
        ];
        const numericPrefix = ['to-number', ['slice', layerValue, 0, prefixLength]];

        return [
            'all',
            ['<=', numericPrefix, maxIncrement]
        ];
    }

    function applyRouteFilter(maxIncrement) {
        if (!routeLayerReady || !map.getLayer(ROUTE_LAYER_ID)) {
            return;
        }

        map.setFilter(ROUTE_LAYER_ID, createIncrementFilter(maxIncrement));
        applyRouteStyling();
        const normalizedProgress = Math.min(1, Math.max(0, maxIncrement) / MAX_ROUTE_INCREMENT);
        applyLineGradient(normalizedProgress);
    }

    function updateRoutesDisplay(targetIncrement, options = {}) {
        console.log('updateRoutesDisplay called with targetIncrement:', targetIncrement);

        if (!routeLayerReady || !map.getLayer(ROUTE_LAYER_ID)) {
            console.warn('routes-johnny layer not ready');
            return;
        }

        const startIncrement = currentMaxIncrement;
        const incrementDiff = targetIncrement - startIncrement;
        const overrideDuration = options.duration;

        console.log('Animation from', startIncrement, 'to', targetIncrement);

        if (incrementDiff <= 0) {
            currentMaxIncrement = targetIncrement;
            applyRouteFilter(targetIncrement);
            return;
        }

        if (routeAnimationFrame) {
            cancelAnimationFrame(routeAnimationFrame);
            routeAnimationFrame = null;
        }

        const isFirstSegment = startIncrement === 0;
        const baseDuration = overrideDuration ?? (isFirstSegment ? 6000 : 2800);
        const firstSegmentMultiplier = isFirstSegment ? 1.35 : 1;
        const animationDuration = baseDuration * firstSegmentMultiplier;
        const startTime = performance.now();

        function animate(timestamp) {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);

            const easedProgress = progress * progress * (3 - 2 * progress); // smoothstep
            currentMaxIncrement = startIncrement + (incrementDiff * easedProgress);

            applyRouteFilter(currentMaxIncrement);

            if (progress < 1) {
                routeAnimationFrame = requestAnimationFrame(animate);
            } else {
                currentMaxIncrement = targetIncrement;
                applyRouteFilter(currentMaxIncrement);
                routeAnimationFrame = null;
                console.log('Animation complete, showing up to increment:', targetIncrement);
            }
        }

        routeAnimationFrame = requestAnimationFrame(animate);
    }

    function applyLineGradient(progress) {
        if (!canUseLineGradient || !routeLayerReady || !map.getLayer(ROUTE_LAYER_ID)) {
            return;
        }

        const clampedProgress = Math.max(0.001, Math.min(1, progress));

        try {
            map.setPaintProperty(ROUTE_LAYER_ID, 'line-gradient', [
                'interpolate',
                ['linear'],
                ['line-progress'],
                0,
                'rgba(0, 133, 102, 0)',
                clampedProgress,
                ROUTE_COLOR
            ]);
        } catch (error) {
            console.warn('Unable to apply line gradient animation:', error);
            canUseLineGradient = false;
        }
    }

    function applyRouteStyling() {
        if (!routeLayerReady || !map.getLayer(ROUTE_LAYER_ID)) {
            return;
        }
        try {
            map.setPaintProperty(ROUTE_LAYER_ID, 'line-color', ROUTE_COLOR);
        } catch (error) {
            console.warn('Unable to set route color:', error);
        }
    }

    function applyLayerVisibility(layerId, visible) {
        if (!map || !map.getLayer(layerId)) {
            return;
        }
        const visibility = visible ? 'visible' : 'none';
        map.setLayoutProperty(layerId, 'visibility', visibility);
    }

    function flushPendingLayerVisibility() {
        pendingLayerVisibility.forEach((visible, layerId) => {
            applyLayerVisibility(layerId, visible);
        });
    }

    function setLayerOpacity(layerId, opacity) {
        if (!map || !map.getLayer(layerId)) {
            return;
        }

        const layer = map.getLayer(layerId);
        const paintPropsByType = {
            line: ['line-opacity'],
            fill: ['fill-opacity'],
            circle: ['circle-opacity'],
            symbol: ['icon-opacity', 'text-opacity']
        };

        const props = paintPropsByType[layer.type] || [];
        props.forEach((prop) => {
            if (map.getPaintProperty(layerId, prop) !== undefined) {
                map.setPaintProperty(layerId, prop, opacity);
            }
        });
    }

    function enableExploreMode() {
        // Simply dispatch the explore mode event
        // The overlay removal and control fade-in will be handled by App.svelte
        dispatch('mapStatus', { type: 'exploreMode' });
        setLayerOpacity('lines', 0.75); // Railways at 75%
        setLayerOpacity('SBB', 0.8); // Stations at 80%
    }

    function setupLastTextboxObserver() {
        const lastTextbox = document.querySelector('#position-4 .textbox');

        if (!lastTextbox) return;

        // Create IntersectionObserver to watch when the textbox exits viewport
        lastTextboxObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // When textbox is completely out of view (intersectionRatio = 0)
                    // and was previously visible (left the viewport going upward)
                    if (entry.intersectionRatio === 0 && !entry.isIntersecting) {
                        // Check if we scrolled past it (textbox is above viewport)
                        const rect = entry.boundingClientRect;
                        if (rect.bottom < 0) {
                            enableExploreMode();
                        }
                    }
                });
            },
            {
                threshold: [0, 0.1, 1.0], // Track when completely invisible (0) and fully visible (1)
                rootMargin: '0px'
            }
        );

        lastTextboxObserver.observe(lastTextbox);
    }

    function setupScrollytelling() {
        const scroller = window.scrollama();

        scroller
            .setup({
                step: '.scrollytelling section',
                offset: 0.7,
                debug: false,
                once: false // Allow steps to trigger again when scrolling back
            })
            .onStepEnter((response) => {
                if (scrollDebounceTimer) {
                    clearTimeout(scrollDebounceTimer);
                }

                scrollDebounceTimer = setTimeout(() => {
                    const chapter = chapters[response.element.id];
                    if (chapter && map && response.element.id !== lastScrollStep) {
                        lastScrollStep = response.element.id;
                        currentChapter = response.element.id;

                        dispatch('mapStatus', {
                            type: 'positionChange',
                            position: response.element.id
                        });

                        const isMobile = window.innerWidth <= 768;
                        const zoomLevel = isMobile ? chapter.zoom : chapter.zoomDesktop;

                        map.flyTo({
                            center: chapter.center,
                            zoom: zoomLevel,
                            bearing: chapter.bearing,
                            pitch: chapter.pitch || 0,
                            duration: chapter.duration,
                            easing: (t) => t * (2 - t)
                        });

                        // Update route display based on chapter's maxRouteIncrement
                        if (chapter.maxRouteIncrement !== undefined) {
                            updateRoutesDisplay(chapter.maxRouteIncrement, {
                                duration: chapter.routeAnimationDuration
                            });
                        }

                        document.querySelectorAll('.scrollytelling section').forEach((section) => {
                            section.classList.remove('active');
                        });
                        response.element.classList.add('active');
                    }
                }, 100);
            });

        window.addEventListener('resize', scroller.resize);
    }

    onMount(() => {
        initializeMap();
    });

    onDestroy(() => {
        if (routeAnimationFrame) {
            cancelAnimationFrame(routeAnimationFrame);
        }
        if (scrollDebounceTimer) {
            clearTimeout(scrollDebounceTimer);
        }
        // Clean up hotspot markers
        hotspotMarkers.forEach(marker => marker.remove());
    });
</script>

<div id="map" class={mode === 'interactive' ? 'interactive-mode' : 'storytelling-mode'}></div>

<style>
    #map {
        position: fixed;
        top: 0;
        bottom: 0;
        width: 100%;
        height: 100vh;
    }

    /* In storytelling mode, hide controls initially */
    :global(.storytelling-mode .maplibregl-ctrl-top-left) {
        display: none;
    }

    /* In interactive mode, show controls immediately */
    :global(.interactive-mode .maplibregl-ctrl-top-left) {
        display: block;
        opacity: 1;
    }
</style>
