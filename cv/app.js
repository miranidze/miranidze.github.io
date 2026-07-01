import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs";

const PDF_URL = "/assets/CV_svanidze_2026.pdf";

const viewer = document.getElementById("viewer");
const zoomWrapper = document.getElementById("zoom-wrapper");
const book = document.getElementById("book");
const pageInfo = document.getElementById("page-info");
const zoomInfo = document.getElementById("zoom-info");

let zoom = 1;
let panX = 0;
let panY = 0;

let isRightDragging = false;
let dragStartX = 0;
let dragStartY = 0;

function applyTransform() {
  zoomWrapper.style.transform =
    `translate(${panX}px, ${panY}px) scale(${zoom})`;

  zoomInfo.textContent = `${Math.round(zoom * 100)}%`;
}

function resetPanIfNeeded() {
  if (zoom <= 1) {
    zoom = 1;
    panX = 0;
    panY = 0;
  }
}

async function renderPdf() {
  const pdf = await pdfjsLib.getDocument(PDF_URL).promise;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    const pageDiv = document.createElement("div");
    pageDiv.className = "page";

    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/jpeg", 0.95);
    img.alt = `CV page ${pageNumber}`;

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

  document.getElementById("zoom-in").onclick = () => {
    zoom = Math.min(zoom + 0.1, 2.5);
    applyTransform();
  };

  document.getElementById("zoom-out").onclick = () => {
    zoom = Math.max(zoom - 0.1, 1);
    resetPanIfNeeded();
    applyTransform();
  };

  viewer.addEventListener("wheel", (event) => {
    event.preventDefault();

    if (event.deltaY < 0) {
      zoom = Math.min(zoom + 0.08, 2.5);
    } else {
      zoom = Math.max(zoom - 0.08, 1);
    }

    resetPanIfNeeded();
    applyTransform();
  }, { passive: false });

  viewer.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  viewer.addEventListener("mousedown", (event) => {
    if (event.button === 2 && zoom > 1) {
      isRightDragging = true;
      dragStartX = event.clientX - panX;
      dragStartY = event.clientY - panY;
      viewer.style.cursor = "grabbing";
    }
  });

  window.addEventListener("mousemove", (event) => {
    if (!isRightDragging) return;

    panX = event.clientX - dragStartX;
    panY = event.clientY - dragStartY;

    applyTransform();
  });

  window.addEventListener("mouseup", () => {
    isRightDragging = false;
    viewer.style.cursor = "default";
  });

  applyTransform();
}

renderPdf().catch((error) => {
  console.error(error);
  pageInfo.textContent = "Could not load PDF.";
});