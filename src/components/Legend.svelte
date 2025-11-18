<script>
    import { layerVisibility, legendLayers } from '../lib/stores.js';

    export let mapComponent = null;
    export let collapsed = false;

    let isCollapsed = collapsed;

    function handleLegendToggle(layerId, visible) {
        layerVisibility.update(state => ({
            ...state,
            [layerId]: visible
        }));
        if (mapComponent && mapComponent.setLayerVisibility) {
            mapComponent.setLayerVisibility(layerId, visible);
        }
    }

    function toggleCollapsed() {
        isCollapsed = !isCollapsed;
    }

    // Sync layer visibility when map component is ready
    export function syncWithMap() {
        if (!mapComponent || !mapComponent.setLayerVisibility) return;
        const currentVisibility = $layerVisibility;
        legendLayers.forEach(({ id }) => {
            mapComponent.setLayerVisibility(id, currentVisibility[id]);
        });
    }

    // Reactive statement to sync when mapComponent changes
    $: if (mapComponent && mapComponent.setLayerVisibility) {
        syncWithMap();
    }
</script>

<aside class="legend-panel {isCollapsed ? 'legend-panel--collapsed' : ''}" aria-label="Layer legend">
    <div class="legend-panel-header">
        <span>Legend</span>
        <button
            class="legend-toggle"
            type="button"
            on:click={toggleCollapsed}
            aria-pressed={!isCollapsed}
        >
            {isCollapsed ? 'Show' : 'Hide'}
        </button>
    </div>
    <div class="legend-body" aria-hidden={isCollapsed}>
        {#each legendLayers as layer}
            <label class="legend-item">
                <div class="legend-item-row">
                    <input
                        type="checkbox"
                        checked={$layerVisibility[layer.id]}
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

<style>
    .legend-panel {
        position: fixed;
        top: 15vh;
        right: 3vw;
        width: 300px;
        background: linear-gradient(135deg,
            rgba(248, 244, 236, 0.85) 0%,
            rgba(255, 253, 250, 0.82) 100%);
        border-radius: 8px;
        box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.08),
            0 12px 32px rgba(20, 58, 82, 0.15),
            0 0 0 1px rgba(20, 58, 82, 0.06);
        padding: 1.5rem;
        z-index: 500;
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        font-family: var(--font-body);
    }

    .legend-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 800;
        color: var(--sbb-red);
        margin-bottom: 1rem;
        font-size: 1.15rem;
        font-family: var(--font-display);
        text-transform: uppercase;
        letter-spacing: 0.02em;
    }

    .legend-body {
        overflow: hidden;
        transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .legend-panel--collapsed .legend-body {
        max-height: 0;
        padding: 0;
        margin: 0;
    }

    .legend-panel:not(.legend-panel--collapsed) .legend-body {
        max-height: 1000px;
    }

    .legend-item {
        display: block;
        margin-bottom: 1rem;
        color: var(--swiss-navy);
        font-size: 0.95rem;
    }

    .legend-item:last-child {
        margin-bottom: 0;
    }

    .legend-item-row {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        font-weight: 600;
    }

    .legend-swatch {
        border: 1.5px solid rgba(20, 58, 82, 0.15);
        flex-shrink: 0;
    }

    .legend-swatch--square {
        width: 20px;
        height: 20px;
        border-radius: 3px;
    }

    .legend-swatch--circle {
        width: 18px;
        height: 18px;
        border-radius: 50%;
    }

    .legend-swatch--line {
        width: 32px;
        height: 6px;
        border-radius: 3px;
    }

    .legend-toggle {
        border: none;
        background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.5) 0%,
            rgba(235, 0, 0, 0.1) 100%);
        color: var(--sbb-red);
        border-radius: 20px;
        padding: 0.45rem 1rem;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: var(--font-body);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 2px 8px rgba(235, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }

    .legend-toggle:hover {
        background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.7) 0%,
            rgba(235, 0, 0, 0.15) 100%);
        box-shadow: 0 3px 10px rgba(235, 0, 0, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    .legend-label {
        flex: 1;
        font-weight: 600;
    }

    .legend-item small {
        display: block;
        margin-left: 2rem;
        margin-top: 0.25rem;
        color: rgba(20, 58, 82, 0.7);
        line-height: 1.4;
        font-size: 0.88rem;
    }

    @media (max-width: 768px) {
        .legend-panel {
            width: calc(100vw - 2rem);
            right: 1rem;
            top: auto;
            bottom: 2rem;
        }
    }
</style>
