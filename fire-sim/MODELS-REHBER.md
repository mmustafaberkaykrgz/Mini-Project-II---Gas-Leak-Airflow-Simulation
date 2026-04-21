# 🎨 3D Model İndirme Rehberi

Bu rehber, yangın simülasyonundaki nesneleri gerçekçi 3D modellerle değiştirmek için kullanılacak modellerin nasıl indirileceğini açıklar.

---

## 📁 Model Dosya Yapısı

Tüm modelleri `assets/3D/` klasörüne **GLB formatında** kaydedin:

```
assets/
└── 3D/
    ├── FE8.glb              (mevcut - yangın söndürücü)
    ├── office_desk.glb      ← YENİ
    ├── computer_monitor.glb ← YENİ
    ├── keyboard.glb         ← YENİ
    ├── mouse.glb            ← YENİ
    ├── trash_can.glb        ← YENİ
    ├── fire_alarm.glb       ← YENİ
    ├── electrical_panel.glb ← YENİ
    ├── office_chair.glb     ← YENİ
    └── fire_cabinet.glb     ← YENİ
```

---

## 🌐 Ücretsiz Model Kaynakları

### 1. **Sketchfab** (En Önerilen)

- 🔗 https://sketchfab.com/search?type=models&features=downloadable&sort_by=-likeCount
- ✅ Ücretsiz GLB/GLTF indirme
- ✅ Yüksek kaliteli modeller
- ⚠️ Lisans kontrolü yapın (CC-BY önerilir)

**Arama Önerileri:**
| Model | Arama Terimi |
|-------|--------------|
| Ofis Masası | `office desk`, `work desk`, `computer desk` |
| Monitör | `computer monitor`, `LCD monitor`, `PC screen` |
| Klavye | `keyboard`, `computer keyboard` |
| Mouse | `computer mouse`, `gaming mouse` |
| Isıtıcı | `heater`, `electric heater` |
| Yangın Alarmı | `fire alarm`, `emergency button`, `alarm button` |
| Elektrik Panosu | `electrical panel`, `fuse box`, `breaker box` |
| Ofis Sandalyesi | `office chair`, `desk chair`, `swivel chair` |
| Yangın Dolabı | `fire cabinet`, `fire hose cabinet` |

### 2. **Poly Pizza** (Basit/Stylized)

- 🔗 https://poly.pizza/
- ✅ Ücretsiz, CC0 lisanslı
- ✅ Düşük polygon (performans için iyi)
- 📦 Doğrudan GLB indirme

### 3. **Quaternius** (Düşük Poly)

- 🔗 https://quaternius.com/
- ✅ Ücretsiz oyun asset'leri
- ✅ Optimize edilmiş modeller

### 4. **TurboSquid** (Profesyonel)

- 🔗 https://www.turbosquid.com/Search/3D-Models/free
- ✅ Ücretsiz bölümü var
- ⚠️ Format dönüşümü gerekebilir

### 5. **CGTrader**

- 🔗 https://www.cgtrader.com/free-3d-models
- ✅ Ücretsiz modeller
- ⚠️ Bazıları FBX/OBJ formatında

---

## 🔄 Format Dönüşümü

Eğer model GLB formatında değilse, **Blender** ile dönüştürün:

1. Blender'ı açın (https://www.blender.org/)
2. `File > Import > [FBX/OBJ/etc.]`
3. Modeli seçin ve import edin
4. `File > Export > glTF 2.0 (.glb/.gltf)`
5. Format: **GLB** seçin
6. `assets/3D/` klasörüne kaydedin

---

## ⚙️ Model Ayarları (main.js)

Her modelin pozisyon, ölçek ve rotasyonunu `REALISTIC_MODELS` objesinde ayarlayabilirsiniz:

```javascript
const REALISTIC_MODELS = {
  desk: {
    file: "office_desk.glb",
    position: { x: 0, y: 0, z: 0 }, // Pozisyon
    scale: { x: 1, y: 1, z: 1 }, // Ölçek
    rotation: { x: 0, y: 0, z: 0 }, // Rotasyon (radyan)
  },
  // ... diğer modeller
};
```

### Pozisyon Referansları:

- **Masa**: `(0, 0, 0)` - Odanın merkezinde
- **Monitör**: `(0, 0.78, -0.15)` - Masa üzerinde
- **Alarm**: `(-2, 1.5, -2.38)` - Sol arka duvarda
- **Isıtıcı**: `(0.35, 0, 0.15)` - Masa altında/yanında
- **Sandalye**: `(0, 0, 0.8)` - Masanın önünde

---

## 🧪 Test Etme

1. Modelleri `assets/3D/` klasörüne yerleştirin
2. Projeyi çalıştırın: `npx vite --host`
3. Konsolu kontrol edin:
   - ✅ `✓ Model yüklendi: desk` → Başarılı
   - ⚠️ `⚠ Model yüklenemedi: desk - Fallback kullanılacak` → Model bulunamadı

---

## 📋 Önerilen Model Listesi (Sketchfab)

İşte bazı ücretsiz model önerileri:

### Ofis Masası

- "Simple Office Desk" - https://sketchfab.com/3d-models/simple-office-desk

### Bilgisayar Monitörü

- "Computer Monitor" - https://sketchfab.com/3d-models/computer-monitor

### Ofis Sandalyesi

- "Office Chair" - https://sketchfab.com/3d-models/office-chair

### Yangın Alarmı

- "Fire Alarm Button" - https://sketchfab.com/3d-models/fire-alarm

> **Not:** URL'ler zamanla değişebilir. Yukarıdaki arama terimlerini kullanın.

---

## 🎯 Performans İpuçları

1. **Polygon Sayısı**: Düşük poly modeller tercih edin (< 10.000 üçgen)
2. **Texture Boyutu**: 1024x1024 veya daha küçük
3. **Dosya Boyutu**: Her model < 5MB olmalı
4. **Draco Sıkıştırma**: GLB dosyalarını sıkıştırın

---

## 🔥 Önemli Notlar

1. **Alarm Butonu**: Model'in bir mesh'i `alarmBox` adında olmalı (tıklama için)
2. **Isıtıcı**: Yangın kaynağı, pozisyon kritik
3. **Yangın Dolabı**: `WATER` adıyla etiketlenmeli

---

## 📞 Yardım

Sorun yaşarsanız:

1. Konsol hatalarını kontrol edin
2. Model dosya yollarını doğrulayın
3. GLB formatını kontrol edin

**Fallback Sistemi**: Model yüklenemezse, otomatik olarak basit geometri kullanılır. Proje her durumda çalışır!


