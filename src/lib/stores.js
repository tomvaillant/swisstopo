import { writable } from 'svelte/store';

// Shared layer visibility state across pages
export const layerVisibility = writable({
    'routes-johnny': true,
    'lines': true,
    'SBB': true
});

// Legend configuration (immutable)
export const ROUTE_COLOR = '#008566';

export const legendLayers = [
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
