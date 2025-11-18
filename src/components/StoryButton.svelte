<script>
    import { link } from 'svelte-spa-router';
</script>

<a href="#/story" use:link class="story-button">
    <span class="story-button-text">Johnny's Trip</span>
    <svg class="story-button-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
</a>

<style>
    .story-button {
        position: fixed;
        top: 2rem;
        right: 3vw;
        z-index: 600;
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.9rem 1.75rem;
        background: linear-gradient(135deg,
            rgba(235, 0, 0, 0.95) 0%,
            rgba(198, 0, 24, 0.95) 100%);
        color: white;
        text-decoration: none;
        font-weight: 800;
        font-size: 1rem;
        font-family: var(--font-display);
        border-radius: 50px;
        box-shadow:
            0 4px 12px rgba(235, 0, 0, 0.25),
            0 8px 24px rgba(235, 0, 0, 0.2);
        backdrop-filter: blur(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .story-button:hover {
        background: linear-gradient(135deg,
            rgba(255, 20, 20, 1) 0%,
            rgba(220, 0, 30, 1) 100%);
        box-shadow:
            0 6px 16px rgba(235, 0, 0, 0.35),
            0 12px 32px rgba(235, 0, 0, 0.3);
        transform: translateY(-3px);
    }

    .story-button:active {
        transform: translateY(-1px);
        box-shadow:
            0 3px 8px rgba(235, 0, 0, 0.3),
            0 6px 16px rgba(235, 0, 0, 0.25);
    }

    .story-button-text {
        line-height: 1;
    }

    .story-button-arrow {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        stroke-width: 2.5px;
    }

    .story-button:hover .story-button-arrow {
        transform: translateX(4px);
    }

    @media (max-width: 768px) {
        .story-button {
            top: 1rem;
            right: 1rem;
            padding: 0.75rem 1.4rem;
            font-size: 0.9rem;
            gap: 0.5rem;
        }

        .story-button-arrow {
            width: 16px;
            height: 16px;
        }
    }
</style>
