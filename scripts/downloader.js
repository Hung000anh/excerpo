// scripts/downloader.js

/**
 * Converts a Blob to a Data URL (base64)
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Builds a docx buffer from chapter data.
 * Assumes 'docx' is available (injected or imported).
 */
export async function buildDocxBuffer(chapter, docxLib) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docxLib;

  const paragraphs = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(chapter.chapter_title || "Chapter")]
    }),
    new Paragraph({ children: [new TextRun("")] }),
    ...(chapter.content || "").split("\n\n").map(text =>
      new Paragraph({
        children: [new TextRun({ text: text.trim(), size: 24 })],
        spacing: { after: 200 }
      })
    )
  ];

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }]
  });

  const blob = await Packer.toBlob(doc);
  return blob.arrayBuffer();
}

/**
 * Saves a file using chrome.downloads
 */
export async function saveFile(filename, blob) {
  // Service Worker alternative to URL.createObjectURL
  const reader = new FileReader();
  const dataUrl = await new Promise((resolve) => {
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  await chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: false
  });
}
