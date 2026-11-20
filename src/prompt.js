// Tüm yapay zeka sağlayıcıları için ortak istem ve sonuç okuma.

export function buildPrompt(url, note) {
  return `Sen Türkiye'deki alışveriş sitelerini (Trendyol, Hepsiburada, Amazon.com.tr, n11, Akakçe, Cimri vb.) çok iyi bilen, tarafsız bir ürün danışmanısın.

Kullanıcı şu ürünü inceliyor: ${url}
${note ? `Kullanıcının notu / ihtiyacı: ${note}\n` : ""}
Görevin:
1. Önce ürün sayfasını oku. Sayfa açılmazsa ürün adını linkten çıkar ve web'de arayarak bul.
2. Ürünün özelliklerini, fiyatını ve satıcısını belirle.
3. Kullanıcı yorumlarını ve bağımsız incelemeleri ara (ör. "<ürün adı> yorum", "<ürün adı> şikayet", şikayetvar, forumlar, YouTube inceleme özetleri).
4. Aynı ürünün başka mağazalardaki fiyatlarını kontrol et (Akakçe / Cimri gibi fiyat karşılaştırma siteleri işe yarar).
5. Aynı fiyat aralığında veya biraz üstünde DAHA İYİ ya da DAHA UCUZ alternatifleri araştır; her alternatif için gerçek bir ürün sayfası linki bul.
Sadece gerçekten bulduğun bilgileri yaz; emin olmadığın fiyat veya puanları "bilinmiyor" diye belirt, uydurma.

Araştırma bittiğinde, SON mesajında yalnızca aşağıdaki yapıda TEK bir JSON nesnesi yaz (açıklama metni ekleme, tüm metinler Türkçe olsun):
{
  "urun": { "ad": string, "marka": string, "kategori": string, "magaza": string, "fiyat": string, "ozet": string },
  "puan": { "genel": number (0-10), "fiyat_performans": number (0-10), "kalite": number (0-10), "kullanici_memnuniyeti": number (0-10) },
  "fiyat_analizi": {
    "degerlendirme": "Ucuz" | "Normal" | "Pahalı" | "Bilinmiyor",
    "aciklama": string,
    "diger_saticilar": [ { "magaza": string, "fiyat": string, "url": string } ]
  },
  "ozellikler": [ { "ad": string, "deger": string } ],
  "artilar": [string],
  "eksiler": [string],
  "yorum_ozeti": { "genel_kanaat": string, "sik_ovgular": [string], "sik_sikayetler": [string], "puan_ortalamasi": string },
  "dikkat_edilecekler": [string],
  "alternatifler": [
    { "ad": string, "fiyat": string, "tip": "Daha iyi" | "Daha ucuz" | "Benzer" | "Üst segment", "neden": string, "url": string }
  ],
  "karar": { "tavsiye": "Al" | "Bekle" | "Alternatife bak" | "Alma", "aciklama": string },
  "kaynaklar": [ { "baslik": string, "url": string } ]
}
En az 3, en fazla 6 alternatif öner. Artılar ve eksiler 3-6 madde olsun.`;
}

export function parseJson(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

export function parseResult(text) {
  try {
    return parseJson(text);
  } catch {
    throw new Error("Sonuç okunamadı. Lütfen tekrar deneyin.");
  }
}
