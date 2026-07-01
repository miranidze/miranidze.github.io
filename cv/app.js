import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs";

const PDF_URL = "/assets/CV_svanidze_2026.pdf";

const book = document.getElementById("book");
const pageInfo = document.getElementById("page-info");

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

        book.appendChild(pageDiv);
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

        mobileScrollSupport: false
    });

    pageFlip.loadFromHTML(document.querySelectorAll(".page"));

    function updatePageInfo() {

        pageInfo.textContent =
            `Page ${pageFlip.getCurrentPageIndex() + 1} / ${pdf.numPages}`;
    }

    updatePageInfo();

    pageFlip.on("flip", updatePageInfo);

    document.getElementById("prev").onclick = () => pageFlip.flipPrev();

    document.getElementById("next").onclick = () => pageFlip.flipNext();

    //--------------------------------------------------
    // Zoom
    //--------------------------------------------------

    let zoom = 1;

    function applyZoom() {

        book.style.transform = `scale(${zoom})`;

        book.style.transformOrigin = "center center";

        document.getElementById("zoom-info").textContent =
            `${Math.round(zoom * 100)}%`;
    }

    document.getElementById("zoom-in").onclick = () => {

        zoom = Math.min(zoom + 0.1, 2);

        applyZoom();
    };

    document.getElementById("zoom-out").onclick = () => {

        zoom = Math.max(zoom - 0.1, 0.6);

        applyZoom();
    };

    applyZoom();

}

renderPdf().catch(console.error);