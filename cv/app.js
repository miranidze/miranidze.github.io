import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs";

const PDF_URL = "/assets/CV_svanidze_2026.pdf";

const book = document.getElementById("book");
const pageInfo = document.getElementById("page-info");

// Keep references so we can reposition link overlays on resize
const pageRecords = []; // { pageDiv, img, linkLayer, viewport }

async function renderPdf() {

    const pdf = await pdfjsLib.getDocument(PDF_URL).promise;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({
            scale: 2
        });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport
        }).promise;

        const pageDiv = document.createElement("div");
        pageDiv.className = "page";

        const img = document.createElement("img");
        img.src = canvas.toDataURL("image/jpeg", 0.95);

        pageDiv.appendChild(img);

        // ---- Link overlay layer ----
        const linkLayer = document.createElement("div");
        linkLayer.className = "link-layer";
        pageDiv.appendChild(linkLayer);

        book.appendChild(pageDiv);

        pageRecords.push({ pageDiv, img, linkLayer, viewport });

        // Fetch link annotations for this page and build clickable overlays
        const annotations = await page.getAnnotations({ intent: "display" });

        annotations
            .filter(a => a.subtype === "Link")
            .forEach(a => {
                const rect = pdfjsLib.Util.normalizeRect(
                    viewport.convertToViewportRectangle(a.rect)
                );

                const [x1, y1, x2, y2] = rect;

                const left = (x1 / viewport.width) * 100;
                const top = (y1 / viewport.height) * 100;
                const width = ((x2 - x1) / viewport.width) * 100;
                const height = ((y2 - y1) / viewport.height) * 100;

                let href = null;

                if (a.url) {
                    href = a.url;
                } else if (a.unsafeUrl) {
                    href = a.unsafeUrl;
                }

                if (!href) return; // skip internal/dest-only links we can't resolve

                const link = document.createElement("a");
                link.href = href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.className = "pdf-link";
                link.style.left = `${left}%`;
                link.style.top = `${top}%`;
                link.style.width = `${width}%`;
                link.style.height = `${height}%`;

                linkLayer.appendChild(link);
            });
    }

    // Keep every overlay aligned with its (object-fit: contain) image
    function positionAllLinkLayers() {
        pageRecords.forEach(({ pageDiv, linkLayer, viewport }) => {
            const containerW = pageDiv.clientWidth;
            const containerH = pageDiv.clientHeight;

            if (!containerW || !containerH) return;

            const imgAspect = viewport.width / viewport.height;
            const containerAspect = containerW / containerH;

            let renderedW, renderedH, offsetX, offsetY;

            if (imgAspect > containerAspect) {
                renderedW = containerW;
                renderedH = containerW / imgAspect;
                offsetX = 0;
                offsetY = (containerH - renderedH) / 2;
            } else {
                renderedH = containerH;
                renderedW = containerH * imgAspect;
                offsetY = 0;
                offsetX = (containerW - renderedW) / 2;
            }

            linkLayer.style.left = `${offsetX}px`;
            linkLayer.style.top = `${offsetY}px`;
            linkLayer.style.width = `${renderedW}px`;
            linkLayer.style.height = `${renderedH}px`;
        });
    }

    const pageFlip = new St.PageFlip(book, {
        width: 520,
        height: 735,

        size: "stretch",

        minWidth: 300,
        maxWidth: 900,

        minHeight: 420,
        maxHeight: 1200,

        showCover: true,

        mobileScrollSupport: false,

        // We handle mouse interaction ourselves (left-click drag = pan),
        // so stop page-flip from also treating clicks/drags as page turns.
        useMouseEvents: false
    });

    pageFlip.loadFromHTML(document.querySelectorAll(".page"));

    // Position overlays after layout settles, and whenever it changes
    requestAnimationFrame(positionAllLinkLayers);
    window.addEventListener("resize", positionAllLinkLayers);
    pageFlip.on("changeOrientation", positionAllLinkLayers);
    pageFlip.on("changeState", positionAllLinkLayers);

    function updatePageInfo() {

        pageInfo.textContent =
            `Page ${pageFlip.getCurrentPageIndex() + 1} / ${pdf.numPages}`;
    }

    updatePageInfo();

    pageFlip.on("flip", updatePageInfo);

    document.getElementById("prev").onclick = () => pageFlip.flipPrev();

    document.getElementById("next").onclick = () => pageFlip.flipNext();

    //--------------------------------------------------
    // Zoom + Pan
    //--------------------------------------------------

    let zoom = 1;
    let panX = 0;
    let panY = 0;

    const ZOOM_MIN = 0.6;
    const ZOOM_MAX = 2.5;

    function applyTransform() {

        book.style.transform =
            `translate(${panX}px, ${panY}px) scale(${zoom})`;

        book.style.transformOrigin = "center center";

        document.getElementById("zoom-info").textContent =
            `${Math.round(zoom * 100)}%`;
    }

    document.getElementById("zoom-in").onclick = () => {
        zoom = Math.min(zoom + 0.1, ZOOM_MAX);
        applyTransform();
    };

    document.getElementById("zoom-out").onclick = () => {
        zoom = Math.max(zoom - 0.1, ZOOM_MIN);
        applyTransform();
    };

    applyTransform();

    // --- Scroll wheel = zoom (instead of page scroll) ---
    const bookWrapper = document.querySelector("main");

    bookWrapper.addEventListener("wheel", (e) => {
        e.preventDefault();

        const delta = -e.deltaY * 0.0015;

        zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));

        applyTransform();
    }, { passive: false });

    // --- Left-click + drag = pan ---
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;

    book.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return; // only left mouse button
        if (e.target.closest(".pdf-link")) return; // let link clicks through untouched

        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        startPanX = panX;
        startPanY = panY;

        book.style.cursor = "grabbing";
        book.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
        if (!isPanning) return;

        panX = startPanX + (e.clientX - startX);
        panY = startPanY + (e.clientY - startY);

        applyTransform();
    });

    window.addEventListener("mouseup", () => {
        if (!isPanning) return;

        isPanning = false;
        book.style.cursor = "grab";
        book.style.userSelect = "";
    });

    book.style.cursor = "grab";

}

renderPdf().catch(console.error);