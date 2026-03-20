import html2canvas from "html2canvas";

export async function takeScreenshot() {

  try {

    const canvas = await html2canvas(document.body);

    return canvas.toDataURL("image/png");

  } catch (err) {

    return null;

  }

}