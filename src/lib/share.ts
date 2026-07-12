const PANEL_BASE_URL = (process.env.NEXT_PUBLIC_PANEL_BASE_URL || "https://lupanel.vercel.app").replace(/\/+$/, "");

export const getPanelLink = (panelCode: string) => {
  const safeCode = panelCode.replace(/^\/+/, "");
  return `${PANEL_BASE_URL}/${safeCode}`;
};

export const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to a temporary textarea when clipboard permissions are restricted.
    }
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
};
