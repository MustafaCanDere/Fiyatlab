// Yeni sürüm kontrolü: GitHub'daki en son Release'e bakar, daha yeni bir APK varsa
// ekranın üstünde "Güncelle" bildirimi gösterir.
const REPO = "MustafaCanDere/Fiyatlab";
// build.mjs derleme sırasında bu değeri GitHub Actions'taki derleme numarasıyla değiştirir.
const CURRENT_BUILD = Number(__APP_BUILD__) || 0;

export const currentVersion = CURRENT_BUILD ? `v1.0.${CURRENT_BUILD}` : "geliştirme sürümü";

function buildNumberOf(tag) {
  const m = /^v?\d+\.\d+\.(\d+)$/.exec(String(tag || "").trim());
  return m ? Number(m[1]) : 0;
}

/** @returns {Promise<null | {version: string, apkUrl: string, pageUrl: string, notes: string}>} */
export async function checkForUpdate() {
  if (!CURRENT_BUILD) return null; // bilgisayarda geliştirirken kontrol etme
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { accept: "application/vnd.github+json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rel = await res.json();
    if (buildNumberOf(rel.tag_name) <= CURRENT_BUILD) return null;
    const apk = (rel.assets || []).find((a) => /\.apk$/i.test(a.name));
    return {
      version: rel.tag_name,
      apkUrl: apk?.browser_download_url || rel.html_url,
      pageUrl: rel.html_url,
      notes: rel.body || "",
    };
  } catch {
    return null; // internet yoksa sessizce geç
  }
}
