const ENDPOINT = "https://api.mymemory.translated.net/get";

export function preferredLanguage() {
  return navigator.language || "en-US";
}

export async function translateText(text, target = preferredLanguage()) {
  const url = `${ENDPOINT}?q=${encodeURIComponent(text)}&langpair=autodetect|${encodeURIComponent(target)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => null);

  if (!response.ok || !data) throw new Error("Translation request failed");
  if (data.quotaFinished || data.responseStatus !== 200) {
    throw new Error(data.responseDetails || "Translation unavailable");
  }

  const translated = data.responseData?.translatedText?.trim();
  if (!translated) throw new Error("Empty translation");

  return {
    text: translated,
    detectedLanguage: data.responseData?.detectedLanguage || "",
    sameLanguage:
      !!data.responseData?.detectedLanguage &&
      data.responseData.detectedLanguage.toLowerCase() ===
        String(target).split("-")[0].toLowerCase(),
  };
}
