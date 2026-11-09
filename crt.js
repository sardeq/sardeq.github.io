(() => {
    const PIXEL_SIZE = 2;
    const TILE_SIZE = 256;
    const TILE_COUNT = 4;
    const FRAME_MS = 1000 / 24;
    const SWITCH_MS = 320;
    const TUNE_IN_MS = 280;
    const CHANNEL_KEY = "crt-channel";
    const TAPE_KEY = "crt-tape-start";

    const root = document.documentElement;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const storage = {
        get(key) {
            try {
                return sessionStorage.getItem(key);
            } catch {
                return null;
            }
        },
        set(key, value) {
            try {
                sessionStorage.setItem(key, value);
            } catch {}
        },
        remove(key) {
            try {
                sessionStorage.removeItem(key);
            } catch {}
        },
    };

    const cameFromChannelSwitch = storage.get(CHANNEL_KEY) === "1";
    storage.remove(CHANNEL_KEY);

    if (!reducedMotion) {
        root.classList.add(cameFromChannelSwitch ? "is-tuning" : "is-powering-on");
    }

    function createNoiseTile() {
        const tile = document.createElement("canvas");
        tile.width = tile.height = TILE_SIZE;
        const ctx = tile.getContext("2d");
        const image = ctx.createImageData(TILE_SIZE, TILE_SIZE);
        const { data } = image;

        for (let y = 0; y < TILE_SIZE; y++) {
            const band = Math.random() < 0.06 ? 70 : 0;
            for (let x = 0; x < TILE_SIZE; x++) {
                const i = (y * TILE_SIZE + x) * 4;
                const value = Math.min(255, Math.random() * 255 + band);
                data[i] = value * 0.8;
                data[i + 1] = value * 0.88;
                data[i + 2] = value;
                data[i + 3] = 255;
            }
        }

        ctx.putImageData(image, 0, 0);
        return tile;
    }

    function startStatic(canvas) {
        const ctx = canvas.getContext("2d");
        const patterns = Array.from({ length: TILE_COUNT }, () =>
            ctx.createPattern(createNoiseTile(), "repeat"),
        );
        let lastFrame = 0;

        const resize = () => {
            canvas.width = Math.ceil(innerWidth / PIXEL_SIZE);
            canvas.height = Math.ceil(innerHeight / PIXEL_SIZE);
            drawFrame();
        };

        const drawFrame = () => {
            const offsetX = Math.random() * TILE_SIZE;
            const offsetY = Math.random() * TILE_SIZE;
            ctx.setTransform(1, 0, 0, 1, offsetX, offsetY);
            ctx.fillStyle = patterns[Math.floor(Math.random() * TILE_COUNT)];
            ctx.fillRect(-offsetX, -offsetY, canvas.width, canvas.height);
        };

        const loop = (time) => {
            if (time - lastFrame >= FRAME_MS) {
                lastFrame = time;
                drawFrame();
            }
            requestAnimationFrame(loop);
        };

        resize();
        addEventListener("resize", resize);
        if (!reducedMotion) requestAnimationFrame(loop);
    }

    function buildOverlay() {
        const overlay = document.createElement("div");
        overlay.className = "crt";
        overlay.setAttribute("aria-hidden", "true");

        const canvas = document.createElement("canvas");
        canvas.className = "crt-static";

        overlay.append(
            canvas,
            ...["crt-scanlines", "crt-roll", "crt-frame"].map((name) => {
                const layer = document.createElement("div");
                layer.className = name;
                return layer;
            }),
        );

        document.body.append(overlay);
        startStatic(canvas);
    }

    function startTapeCounter() {
        const counter = document.querySelector("[data-tape-counter]");
        if (!counter) return;

        const start = Number(storage.get(TAPE_KEY)) || Date.now();
        storage.set(TAPE_KEY, String(start));

        const render = () => {
            const total = Math.floor((Date.now() - start) / 1000);
            const hours = Math.floor(total / 3600);
            const minutes = String(Math.floor(total / 60) % 60).padStart(2, "0");
            const seconds = String(total % 60).padStart(2, "0");
            counter.textContent = `SP ${hours}:${minutes}:${seconds}`;
        };

        render();
        setInterval(render, 1000);
    }

    function isChannelLink(link, event) {
        return (
            link &&
            event.button === 0 &&
            !event.defaultPrevented &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            !link.target &&
            !link.hasAttribute("download") &&
            !link.hash &&
            link.protocol === location.protocol &&
            link.origin === location.origin
        );
    }

    function handleChannelSwitch(event) {
        const link = event.target.closest("a[href]");
        if (reducedMotion || !isChannelLink(link, event)) return;

        event.preventDefault();
        storage.set(CHANNEL_KEY, "1");
        root.classList.add("is-tuning");
        setTimeout(() => location.assign(link.href), SWITCH_MS);
    }

    document.addEventListener("DOMContentLoaded", () => {
        buildOverlay();
        startTapeCounter();
        document.addEventListener("click", handleChannelSwitch);
        setTimeout(() => root.classList.remove("is-tuning"), TUNE_IN_MS);
    });

    addEventListener("pageshow", (event) => {
        if (event.persisted) root.classList.remove("is-tuning");
    });
})();
