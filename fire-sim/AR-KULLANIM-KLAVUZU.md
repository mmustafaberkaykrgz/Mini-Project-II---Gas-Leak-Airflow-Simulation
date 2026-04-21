# 📱 3D Yangın Söndürme Eğitimi - Kullanım Kılavuzu

## 🎯 Ne Yaptık?

Artık **gerçek ortamınızda** AR deneyimi yaşayabilirsiniz! Telefonunuzun kamerasını açın, bulunduğu ortamda yangını ve objeleri görün!

---

## 📂 Hazırlanan Dosyalar

### 1. **`ar-viewer.html`** - Model Viewer (Google AR)
- ✅ En kolay kurulum
- ✅ iOS Safari ve Android Chrome desteği
- ✅ 3D modelleri AR'da görüntüleme
- ⚠️ Basit ama etkili

### 2. **`ar-simple.html`** - A-Frame + AR.js
- ✅ WebXR tabanlı
- ✅ Gerçek zamanlı zemin algılama
- ✅ Dokunarak objeleri yerleştirme
- ⚠️ Modern tarayıcı gerektirir

---

## 🚀 Nasıl Kullanılır?

### **Adım 1: Dosyaları Sunucuya Yükleyin**

AR için **HTTPS** gereklidir. İki seçenek:

#### A) Local Server (Test için):
```bash
# Mevcut Vite sunucusunu kullanın
npx vite --host
```

Ardından telefonunuzdan erişin:
- `https://[BİLGİSAYARINIZIN-IP-ADRESİ]:5173/ar-viewer.html`
- veya
- `https://[BİLGİSAYARINIZIN-IP-ADRESİ]:5173/ar-simple.html`

#### B) Online Hosting (Gerçek kullanım):
Dosyaları şu platformlardan birine yükleyin:
- **Netlify** (ücretsiz): https://netlify.com
- **Vercel** (ücretsiz): https://vercel.com
- **GitHub Pages** (ücretsiz): https://pages.github.com

---

### **Adım 2: Telefondan Erişim**

1. **iOS**: Safari tarayıcısını kullanın (iOS 12+)
2. **Android**: Chrome tarayıcısını kullanın (Android 8+)
3. Adresi tarayıcıya yazın
4. **Kamera izni verin** ✓

---

### **Adım 3: AR Deneyimini Başlatın**

1. 📷 "AR Deneyimini Başlat" butonuna basın
2. 📱 Telefonunuzu **zemine veya masaya** tutun
3. 👆 Ekrana **dokunarak** yangını yerleştirin
4. 🎮 Butonlarla etkileşime geçin:
   - 🚨 **ALARM BAS** (Hızlı basın!)
   - 🧯 **ABC/CO2/SU** (Doğru söndürücüyü seçin)

---

## 📋 Senaryo Özeti

1. ⏱️ **0-5 saniye**: Alarm basın → +30 puan
2. 🧯 **5-10 saniye**: Doğru söndürücü seçin → +40 puan
3. 🔥 **10-20 saniye**: Yangını söndürün → Başlangıç aşaması
4. ⚠️ **20-40 saniye**: Gelişmiş aşama → Riskli!
5. ❌ **40+ saniye**: Yangın kontrolden çıktı → Oyun bitti

### Puanlama:
- ✅ **ABC Toz** = +40 puan (Doğru!)
- ✅ **CO2** = +35 puan (Doğru!)
- ❌ **SU** = -50 puan (Yanlış! Elektrik çarpma riski!)

---

## 🛠️ Teknik Detaylar

### Gereksinimler:
- **iOS**: Safari 12+ (ARKit desteği)
- **Android**: Chrome 79+ (ARCore desteği)
- **Bağlantı**: HTTPS zorunlu
- **İzinler**: Kamera erişimi

### Desteklenen Cihazlar:
- ✅ iPhone 6s ve üzeri
- ✅ iPad (5. nesil ve üzeri)
- ✅ Google Pixel 2 ve üzeri
- ✅ Samsung Galaxy S8 ve üzeri
- ✅ ARCore destekli Android cihazlar

---

## 🎨 Hangi Versiyonu Kullanmalıyım?

### `ar-viewer.html` Kullanın Eğer:
- ✓ Hızlı test yapmak istiyorsanız
- ✓ iOS Safari'de çalışması garanti olsun
- ✓ Basit bir demo yeterli

### `ar-simple.html` Kullanın Eğer:
- ✓ Daha gelişmiş AR deneyimi istiyorsanız
- ✓ Zemin/yüzey algılama önemli
- ✓ WebXR desteği olan cihazlar kullanıyorsanız

---

## 🔧 Sorun Giderme

### "AR desteklenmiyor" Hatası:
- ✅ HTTPS bağlantısı kullanın
- ✅ Modern tarayıcı kullanın (Safari/Chrome)
- ✅ Kamera iznini verin
- ✅ Cihazınızda ARKit/ARCore olduğundan emin olun

### "Kamera açılmıyor":
- ✅ Tarayıcıya kamera izni verin
- ✅ Başka uygulama kamera kullanmıyor olsun
- ✅ Sayfayı yeniden yükleyin

### "Objeler görünmüyor":
- ✅ Zemin/masayı düz tutun
- ✅ İyi ışıklandırılmış ortam seçin
- ✅ Telefonu yavaşça hareket ettirin

---

## 📱 Demo Video Çekimi İçin:

1. Ekran kaydı başlatın
2. AR uygulamasını açın
3. Zemine/masaya tutun
4. Yangını yerleştirin
5. Senaryoyu tamamlayın
6. Sonuç ekranını gösterin

---

## 🎓 Eğitim İçeriği

Bu AR simülasyonu şunları öğretir:
- ⚡ Elektrik yangınları için doğru ekipman seçimi
- ⏱️ Hızlı karar verme önemi
- 🚨 Alarm aktivasyonu
- 🔥 Yangın aşamalarını tanıma
- 🧯 ABC, CO2, Su söndürücülerinin farkları

---

## 📞 Destek

Sorun yaşarsanız:
1. Tarayıcı konsolunu kontrol edin (F12)
2. HTTPS kullandığınızdan emin olun
3. Kamera izninin verildiğini kontrol edin

---

## 🚀 İyi Eğitimler!

**Önemli**: AR deneyimi için gerçek bir yangın söndürme eğitimi yerine geçmez. Sadece eğitim amaçlıdır.




