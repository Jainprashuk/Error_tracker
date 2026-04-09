import html2canvas from "html2canvas";

export async function takeScreenshot() {
  try {
    const canvas = await html2canvas(document.body, {
      scale: window.innerWidth > 1280 ? 1280 / window.innerWidth : 1, // 💡 Scale down if too big
      logging: false,
      useCORS: true
    });

    // 💡 Export as JPEG (60% quality) instead of PNG
    return canvas.toDataURL("image/jpeg", 0.6);

  } catch (err) {
    return null;
  }
}