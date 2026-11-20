# Fiyatlab

Bir ürün linki yapıştırırsın (Trendyol, Hepsiburada, Amazon.com.tr, n11...). Uygulama Claude ile:

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
3. Uygulamayı açınca **Ayarlar**'a Claude API anahtarını gir ve Kaydet'e bas.

Her `main` dalına yükleme yapıldığında GitHub Actions yeni bir APK derleyip Releases'e koyar.

## Otomatik güncelleme

Uygulama her açıldığında GitHub'daki en son sürümü kontrol eder. Daha yeni bir sürüm varsa ekranın üstünde **"Yeni sürüm var"** bildirimi çıkar. "Güncelle"ye basınca yeni APK iner; açıp "Güncelle" dersen mevcut uygulamanın üstüne kurulur ve ayarların (API anahtarın) kaybolmaz.

Android, Play Store dışındaki uygulamaların kendini sessizce güncellemesine izin vermez; bu yüzden kurulumu onaylamak için bir kere dokunman gerekir.

Tüm APK'lar depodaki `android/app/fiyatlab.keystore` anahtarıyla imzalanır, bu sayede her sürüm bir öncekinin üstüne kurulabilir. Bu anahtar kişisel kullanım içindir; uygulamayı Play Store'a koymak istersen gizli tutulan yeni bir anahtar oluşturmak gerekir.

## Claude API anahtarı

[console.anthropic.com](https://console.anthropic.com/settings/keys) adresinden hesap aç, anahtar oluştur ve hesaba biraz kredi yükle. Anahtar sadece telefonunda saklanır, başka bir yere gönderilmez (yalnızca Claude API'ye istek atarken kullanılır).

## Maliyet

Her analizde Claude web'de 10-20 arama ve sayfa okuması yapar. Claude Opus 5.5 ile bir analiz kabaca birkaç on sent ile 1 dolar arası tutabilir. Ayarlardan daha ucuz olan Claude Sonnet 5.5'i seçebilirsin.

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

- `src/analyze.js`: Claude API'yi web arama ve sayfa okuma araçlarıyla çağıran kısım
- `src/main.js`, `src/index.html`: arayüz
- `src/update.js`: yeni sürüm kontrolü
- `android/`: Capacitor ile oluşturulmuş Android projesi
- `.github/workflows/apk.yml`: APK'yı otomatik derleyen GitHub Actions

## Notlar

- Bazı siteler otomatik okumayı engelleyebilir; o durumda Claude ürünü adıyla arayıp başka kaynaklardan bilgi toplar.
- Fiyatlar ve stoklar hızla değişir; satın almadan önce linkleri kontrol et.
