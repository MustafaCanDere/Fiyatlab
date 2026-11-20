# Fiyatlab

Bir ürün linki yapıştırırsın (Trendyol, Hepsiburada, Amazon.com.tr, n11...). Uygulama seçtiğin yapay zeka ile (Claude, ChatGPT veya Gemini):

- ürün sayfasını okur, özellikleri ve fiyatı çıkarır,
- kullanıcı yorumlarını, şikayetleri ve incelemeleri web'de arar,
- başka mağazalardaki fiyatları karşılaştırır,
- puan verir (genel, fiyat/performans, kalite, memnuniyet), artı ve eksileri listeler,
- daha iyi ya da daha ucuz **alternatif ürünleri linkleriyle** önerir,
- sonunda "Al / Bekle / Alternatife bak / Alma" şeklinde net bir karar verir.

İsteğe bağlı not alanına bütçeni veya ne için kullanacağını yazarsan öneriler ona göre şekillenir.

## Android'e yükleme

1. Bu deponun **Releases** bölümünden en son `fiyatlab.apk` dosyasını telefonuna indir.
2. Dosyayı aç. Telefon "bilinmeyen kaynaklar" uyarısı verirse bu kaynağa izin ver.
3. Uygulamayı açınca **Ayarlar**'dan yapay zekayı seç, API anahtarını gir ve Kaydet'e bas.

Her `main` dalına yükleme yapıldığında GitHub Actions yeni bir APK derleyip Releases'e koyar.

## Otomatik güncelleme

Uygulama her açıldığında GitHub'daki en son sürümü kontrol eder. Daha yeni bir sürüm varsa ekranın üstünde **"Yeni sürüm var"** bildirimi çıkar. "Güncelle"ye basınca yeni APK iner; açıp "Güncelle" dersen mevcut uygulamanın üstüne kurulur ve ayarların (API anahtarın) kaybolmaz.

Android, Play Store dışındaki uygulamaların kendini sessizce güncellemesine izin vermez; bu yüzden kurulumu onaylamak için bir kere dokunman gerekir.

Tüm APK'lar depodaki `android/app/fiyatlab.keystore` anahtarıyla imzalanır, bu sayede her sürüm bir öncekinin üstüne kurulabilir. Bu anahtar kişisel kullanım içindir; uygulamayı Play Store'a koymak istersen gizli tutulan yeni bir anahtar oluşturmak gerekir.

## Yapay zeka ve API anahtarı

Ayarlardan üç sağlayıcıdan birini seçebilirsin. Her birinin anahtarı ayrı saklanır, aralarında istediğin zaman geçebilirsin.

| Sağlayıcı | Anahtarı nereden alırsın | Varsayılan model |
|---|---|---|
| Claude (Anthropic) | [console.anthropic.com](https://console.anthropic.com/settings/keys) | `claude-opus-5-5` (daha ucuzu: `claude-sonnet-5-5`) |
| ChatGPT (OpenAI) | [platform.openai.com](https://platform.openai.com/api-keys) | `gpt-6.2-astra` |
| Gemini (Google) | [aistudio.google.com](https://aistudio.google.com/apikey) | `gemini-3.5-flash` |

Model alanına listede olmayan başka bir model adı da yazabilirsin. Anahtarlar sadece telefonunda saklanır ve yalnızca seçtiğin sağlayıcıya istek atarken kullanılır.

Farklar: Claude ilerlemeyi adım adım gösterir (hangi aramayı yaptığını görürsün). OpenAI ve Gemini sonucu araştırma bitince toplu verir. Gemini'nin ücretsiz kotası olduğu için denemek için en ucuz seçenek odur.

## Maliyet

Her analizde yapay zeka web'de 10-20 arama ve sayfa okuması yapar. Claude Opus 5.5 ile bir analiz kabaca birkaç on sent ile 1 dolar arası tutabilir; daha ucuz modeller (Claude Sonnet 5.5, Gemini Flash) çok daha az tutar.

## Bilgisayarda çalıştırma

Node.js 18+ gerekir.

```bash
npm install
npm run serve      # http://localhost:3000
```

## APK'yı kendin derlemek

Android Studio (veya Android SDK) ve Java 21 gerekir.

```bash
npm install
npm run apk        # çıktı: android/app/build/outputs/apk/debug/app-debug.apk
```

## Dosyalar

- `src/analyze.js`: sağlayıcı seçimi
- `src/providers/`: Claude, OpenAI ve Gemini ile web araştırması yapan kısımlar
- `src/prompt.js`: ortak talimat ve sonuç okuma
- `src/main.js`, `src/index.html`: arayüz
- `src/update.js`: yeni sürüm kontrolü
- `android/`: Capacitor ile oluşturulmuş Android projesi
- `.github/workflows/apk.yml`: APK'yı otomatik derleyen GitHub Actions

## Notlar

- Bazı siteler otomatik okumayı engelleyebilir; o durumda yapay zeka ürünü adıyla arayıp başka kaynaklardan bilgi toplar.
- Fiyatlar ve stoklar hızla değişir; satın almadan önce linkleri kontrol et.
