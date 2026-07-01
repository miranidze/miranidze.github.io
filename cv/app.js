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
}

renderPdf().catch((error) => {
  console.error(error);
  pageInfo.textContent = "Could not load PDF.";
});