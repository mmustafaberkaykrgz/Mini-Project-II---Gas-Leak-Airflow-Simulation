// Three JS Modules
import * as THREE from "three";

import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { AnimationMixer } from "three";

// Post Processing
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// Debugging Tools
import Stats from "three/examples/jsm/libs/stats.module.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

// Particle System File
import { getParticleSystem } from "./getParticleSystem.js";

let camera, scene, renderer, composer, controls, model;
let modelCircle, baseCircle;
let gui, guiCam;
let room; // Oda objesi
let isLocked = false; // Pointer lock durumu
let currentInteractable = null; // Şu an bakılan etkileşimli obje
let interactionHintDiv; // E tuşu ipucu elementi
window.isDoorOpen = false; // Kapı durumu
window.doorGroup = null; // Kapı objesi referansı

// Hava Akışı Mantığı Değişkenleri
window.isFanOn = false;
window.isWindowOpen = false;
window.fanBlades = null;
window.windowGroup = null;

let handsGroup; // Procedural hands group

let mixerSmoke;
let modelSmoke, modelWood;
const clock = new THREE.Clock();
let deltaTime;

// Ses Sistemi Değişkenleri
let audioContext;
let alarmAudio = null;

// Göz hizası sabit yüksekliği (metre cinsinden)
const EYE_HEIGHT = 1.6;

// ==================== FPS HAREKET KONTROLLERİ (WASD) ====================
// Klavye ile birinci şahıs (kişi POV) hareketi için değişkenler
const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

// Hareket hızı (metre/saniye)
const moveSpeed = 2.5;

function onKeyDown(event) {
  switch (event.code) {
    case "KeyW":
      moveState.forward = true;
      break;
    case "KeyS":
      moveState.backward = true;
      break;
    case "KeyA":
      moveState.left = true;
      break;
    case "KeyD":
      moveState.right = true;
      break;
    case "KeyE":
      if (event.repeat) return;
      if (currentInteractable) {
        handleInteraction(currentInteractable);
      }
      break;
  }
}

// Etkileşim işleyicisi
function handleInteraction(object) {
  if (object.name === "Door") {
    toggleDoor();
  } else if (object.name === "Fan") {
    toggleFan();
  } else if (object.name === "Window") {
    toggleWindow();
  } else if (object.name === "alarmBox") {
    if (typeof window.activateAlarm === "function") {
      window.activateAlarm();
    }
  }
}

function toggleFan() {
  window.isFanOn = !window.isFanOn;
  
  if (window.isFanOn) {
    showMessage("💨 Fan Started. Airflow enabled.", 1500);
  } else {
    showMessage("🛑 Fan Stopped.", 1500);
  }
  decisionLog.push({
    time: Date.now() - startTime,
    action: "toggle_fan",
    description: window.isFanOn ? "Ventilation fan started." : "Ventilation fan stopped.",
  });

  updateAirflow();
}

function toggleWindow() {
  if (!window.windowGroup) return;

  window.isWindowOpen = !window.isWindowOpen;

  if (window.isWindowOpen) {
    window.windowGroup.rotation.y = -Math.PI / 4; // 45 degrees open
    showMessage("🪟 Window Opened.", 1500);
  } else {
    window.windowGroup.rotation.y = 0;
    showMessage("🪟 Window Closed.", 1500);
  }
  decisionLog.push({
    time: Date.now() - startTime,
    action: "toggle_window",
    description: window.isWindowOpen ? "Window opened." : "Window closed.",
  });

  updateAirflow();
}

// Hava akışı (rüzgar) mantığını güncelleyen metod
function updateAirflow() {
  // Basit fizik:
  // Fan kapıya doğru üflesin (z > 0 yönüne).
  // Eğer fan açıksa ve (kapı veya pencere açıksa) gaz temizlenebilir.
  let windX = 0;
  let windY = 0;
  let windZ = 0;

  if (window.isFanOn) {
    // Fan odayı havalandırıyor (arka duvardan öne doğru rüzgar verir)
    windZ = 1.0; 
  }

  // Havalandırma koşulu
  if (window.isFanOn && (window.isDoorOpen || window.isWindowOpen)) {
    // Increase wind power to push gas out rapidly
    windZ = 2.5; 
    console.log("Airflow Created!");
  } else if (window.isFanOn && !window.isDoorOpen && !window.isWindowOpen) {
    // Fan açık ama gidecek yer yok, sadece içeride dolanır (hafif itme)
    windZ = 0.3;
  }

  // Particle engine wind_velocity set
  if (gasEffect && typeof gasEffect.windVelocity !== 'undefined') {
    gasEffect.windVelocity.set(windX, windY, windZ);
  }
}

function toggleDoor() {
  if (!window.doorGroup) return;

  window.isDoorOpen = !window.isDoorOpen;

  if (window.isDoorOpen) {
    window.doorGroup.rotation.y = -Math.PI / 2;
    showMessage("🚪 Door Opened", 1000);
  } else {
    window.doorGroup.rotation.y = 0;
    showMessage("🚪 Door Closed", 1000);
  }
  
  decisionLog.push({
    time: Date.now() - startTime,
    action: "toggle_door",
    description: window.isDoorOpen ? "Door opened." : "Door closed.",
  });
  
  updateAirflow();
}

window.activateAlarm = function() {
  if (scenarioEnded) return;

  showMessage("🚨 EMERGENCY ALARM ACTIVATED! Reporting to security.", 3000);
  
  if (alarmAudio) {
    alarmAudio.play().catch(e => console.warn("Audio play failed:", e));
  }
  
  decisionLog.push({
    time: Date.now() - startTime,
    action: "alarm_activated",
    description: "Emergency alarm button was pressed.",
  });
};

function onKeyUp(event) {
  switch (event.code) {
    case "KeyW":
      moveState.forward = false;
      break;
    case "KeyS":
      moveState.backward = false;
      break;
    case "KeyA":
      moveState.left = false;
      break;
    case "KeyD":
      moveState.right = false;
      break;
  }
}

// Oda içi sınır için yardımcı fonksiyon (GÜNCELLENDİ: Kapı ve Dışarı Çıkış)
function clampInsideRoom(position) {
  const roomHalfSize = 2.4; // Yan ve arka duvarlar
  const wallZ = 2.5; // Ön duvar (Kapı duvarı)
  const outsideLimitZ = 6.0; // Dışarıda gidilebilecek son nokta
  const doorHalfWidth = 0.5; // Kapı genişliğinin yarısı (1m kapı)

  // X Sınırları (Oda genişliği - Dışarıda da aynı genişlikte koridor varsayalım)
  if (position.x > roomHalfSize) position.x = roomHalfSize;
  if (position.x < -roomHalfSize) position.x = -roomHalfSize;

  // Z Sınırları (Arka duvar ve Dış sınır)
  if (position.z < -roomHalfSize) position.z = -roomHalfSize;
  if (position.z > outsideLimitZ) position.z = outsideLimitZ;

  // Ön Duvar Kontrolü (Z = 2.5 civarı)
  // Eğer duvara yaklaşıyorsa
  if (position.z > 2.2 && position.z < 2.8) {
    const inDoorway = Math.abs(position.x) < doorHalfWidth;

    if (!inDoorway) {
      // Kapı hizasında değiliz - Duvar var
      if (position.z < wallZ) position.z = 2.2; // İçeride kal
      else position.z = 2.8; // Dışarıda kal
    } else {
      // Kapı hizasındayız
      if (!window.isDoorOpen) {
        // Kapı kapalı - Geçiş yok
        if (position.z < wallZ) position.z = 2.2;
        else position.z = 2.8;
      }
      // Kapı açıksa geçebiliriz
    }
  }
}

function updateFirstPersonMovement(delta) {
  // Sadece kilitliyse (senaryo başladığında kilitleniyor) harekete izin ver
  if (!controls.isLocked) return;

  // Hiçbir tuşa basılmıyorsa çık
  if (
    !moveState.forward &&
    !moveState.backward &&
    !moveState.left &&
    !moveState.right
  ) {
    return;
  }

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  // Y eksenini sıfırla ki sadece yatay düzlemde hareket etsin
  direction.y = 0;
  direction.normalize();

  // Sağ/sol yön vektörü (strafe) - dünya yukarı ekseni ile çarpım
  const strafe = new THREE.Vector3();
  strafe.crossVectors(direction, camera.up).normalize();

  const velocity = new THREE.Vector3();

  if (moveState.forward) {
    velocity.add(direction);
  }
  if (moveState.backward) {
    velocity.sub(direction);
  }
  if (moveState.left) {
    velocity.sub(strafe);
  }
  if (moveState.right) {
    velocity.add(strafe);
  }

  if (velocity.lengthSq() === 0) return;

  velocity.normalize().multiplyScalar(moveSpeed * delta);

  // Kamera ve hedef (controls.target) birlikte taşınmalı ki FPS hissi bozulmasın
  camera.position.add(velocity);

  // Kamerayı oda içinde tut
  clampInsideRoom(camera.position);

  // Yüksekliği sabitle (göz hizası sabit kalsın)
  camera.position.y = EYE_HEIGHT;
}

// Ses sistemı
// Ses sistemi (Global değişkenler alarmAudio olarak konsolide edildi)

// Performans ayarları
const statsEnable = false; // FPS için istatistik panelini kapat
const guiEnable = false;
const toneMapping = THREE.ACESFilmicToneMapping;
const antialiasing = false;
const AmbientOcclusion = false;
// Masa/bilgisayar bölgesinde kasmayı azaltmak için gölge ve env yansımasını kapat
const SHADOWS_ENABLED = false;
const ENV_REFLECTION_ENABLED = false;

const loader = new GLTFLoader().setPath("/assets/3D/");
const texLoader = new THREE.TextureLoader().setPath("/assets/textures/");
const hdriLoader = new RGBELoader().setPath("/assets/hdri/");

const fileBase = "circle.glb";

// ==================== GERÇEKÇİ 3D MODEL YAPILANDIRMASI ====================
// Bu modelleri assets/3D/ klasörüne indirin
// Önerilen kaynaklar: Sketchfab, Poly Pizza, CGTrader (ücretsiz bölüm)
const REALISTIC_MODELS = {
  // Ofis Masası - basit ahşap masa
  desk: {
    file: "office_desk.glb",
    position: { x: 0, y: 0, z: -1.5 },
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  // Bilgisayar Monitörü
  monitor: {
    file: "computer_monitor.glb",
    position: { x: 0, y: 0.9, z: -2 },
    scale: { x: 0.3, y: 0.3, z: 0.3 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  // Klavye
  keyboard: {
    file: "mouse_and_keyboard.glb",
    position: { x: -0.2, y: 1.1, z: -1.45 },
    scale: { x: 0.07, y: 0.07, z: 0.07 },
    rotation: { x: 0, y: 0, z: 0 },
  },

  // Isıtıcı (Heater)
  heater: {
    file: "simple_heater.glb",
    position: { x: 0.7, y: 0.20, z: -1.5 },
    scale: { x: 0.05, y: 0.05, z: 0.05 },
    rotation: { x: 0, y: -Math.PI / 2, z: 0 },
  },
  // Acil Durum Alarm Butonu - GİRİŞE YAKIN (sol duvar, ön taraf)
  alarmButton: {
    file: "fire_alarm.glb", // Dosya ismi aynı kalabilir ancak işlevi "Acil Durum" olarak değişti
    position: { x: -2.4, y: 1.4, z: 1.8 }, 
    scale: { x: 0.9, y: 0.9, z: 0.9 },
    rotation: { x: 0, y: 0, z: 0 }, 
  },
  // Elektrik Panosu - Arka köşe (sağ duvar, arka taraf)
  electricalPanel: {
    file: "electrical_panel.glb",
    position: { x: 2.4, y: 1.2, z: -1.8 }, // Sağ duvar, arka köşe
    scale: { x: 0.9, y: 0.9, z: 0.9 },
    rotation: { x: 0, y: -Math.PI / 2, z: 0 }, // Sola baksın (odanın içine)
  },
  // Ofis Sandalyesi
  chair: {
    file: "office_chair.glb",
    position: { x: 0, y: 0, z: -1 },
    scale: { x: 0.8, y: 0.8, z: 0.8 },
    rotation: { x: 0, y: Math.PI, z: 0 },
  },
  // Misafir Sandalyesi 1 (Sağ Duvar - Orta)
  guestChair1: {
    file: "chair.glb",
    position: { x: 2.1, y: 0, z: -0.2 },
    scale: { x: 0.8, y: 0.8, z: 0.8 },
    rotation: { x: 0, y: -Math.PI / 2, z: 0 }, // Sola bakıyor
  },
  // Misafir Sandalyesi 2 (Sağ Duvar - Arka Taraf)
  guestChair2: {
    file: "chair.glb",
    position: { x: 2.1, y: 0, z: -0.8 },
    scale: { x: 0.8, y: 0.8, z: 0.8 },
    rotation: { x: 0, y: -Math.PI / 2, z: 0 }, // Sola bakıyor
  },
  // Saksı Bitkisi (Sol Arka Köşe)
  plant: {
    file: "majesty_palm_plant.glb",
    position: { x: -2.0, y: 0, z: -2.0 }, // Sol arka köşe - duvardan uzaklaştırıldı
    scale: { x: 1.2, y: 1.2, z: 1.2 }, // Daha sade bir boyut
    rotation: { x: 0, y: 0, z: 0 },
  },
  // Acil Durum Panosu / Diğer Modeller eklenebilir
};

// Yüklenen modelleri saklayacak obje
const loadedModels = {};
let modelsLoaded = false;

// Model yükleme fonksiyonu - Promise tabanlı
function loadModel(modelKey) {
  return new Promise((resolve, reject) => {
    const config = REALISTIC_MODELS[modelKey];
    if (!config) {
      reject(new Error(`Model config not found: ${modelKey}`));
      return;
    }

    loader.load(
      config.file,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(
          config.position.x,
          config.position.y,
          config.position.z
        );
        model.scale.set(config.scale.x, config.scale.y, config.scale.z);
        model.rotation.set(
          config.rotation.x,
          config.rotation.y,
          config.rotation.z
        );

        // Gölge ayarları
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        loadedModels[modelKey] = model;
        console.log(`✓ Model yüklendi: ${modelKey}`);
        resolve(model);
      },
      (progress) => {
        // Yükleme ilerleme
      },
      (error) => {
        console.warn(
          `⚠ Model yüklenemedi: ${modelKey} - Fallback kullanılacak`
        );
        resolve(null); // Hata durumunda null döndür, reject yapma
      }
    );
  });
}

// Tüm modelleri yükle
async function loadAllRealisticModels() {
  console.log("📦 Gerçekçi modeller yükleniyor...");

  const modelKeys = Object.keys(REALISTIC_MODELS);
  const loadPromises = modelKeys.map((key) => loadModel(key));

  await Promise.all(loadPromises);

  modelsLoaded = true;
  console.log("✅ Model yükleme tamamlandı!");

  return loadedModels;
}

let gasEffect;

let gasActive = false;
let gasIntensity = 1.0; 
let peakGasIntensity = 0.0; // Puanlama için en yüksek seviyeyi tutar
let gasStage = "none"; // 'none', 'leaking', 'cleared'

// Zamanlama ve puanlama
let timerStarted = false;
let startTime = 0;
let userScore = 0;
let decisionLog = [];

// Senaryo bitti mi?
let scenarioEnded = false;

// Parçacık yoğunluğu
const gasRateValue = 40; 
let gasRate = 0;

const cubeGeometry = new THREE.BoxGeometry();
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

// Gas Particles - Sızıntı kaynağı (eski heater pozisyonu)
const gasSpawn = new THREE.Mesh(cubeGeometry, cubeMaterial);
gasSpawn.position.set(0.7, 0.25, -1.5); 
gasSpawn.scale.set(0.1, 0.1, 0.1);

const gasVelocity = new THREE.Vector3(0, 0.2, 0); // Yavaşça yukarı yayılır

let crosshair;

// -------------------- GUI --------------------

const guiObject = {
  gasBoolean: true, 
  pauseBoolean: false,
  value1: 1,
  value2: 1,
  value3: 1.55, 
  value4: 0.05,
  color: { r: 0.01, g: 0.01, b: 0.01 },
};

addGUI();

initApp();

async function initApp() {
  await init();
  createProceduralHands();
  animate();
}

async function init() {
  // ------------------- Scene Setup -----------------------

  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.set(0, 1.6, 2.0); // Oda içinde, kapının biraz önünde başla

  // Ses sistemini başlat
  initAudio();
  
  // Tarayıcı ses kilidini açmak için ilk etkileşimi dinle
  const unlockAudio = () => {
    if (alarmAudio) {
      // Çal-dur yapay etkileşimi ile ses kanalını aktifleştir
      // Not: muted play/pause bazı tarayıcılarda daha başarılıdır
      alarmAudio.muted = true;
      alarmAudio.play().then(() => {
        alarmAudio.pause();
        alarmAudio.muted = false;
        alarmAudio.currentTime = 0;
        console.log("🔊 Audio unlocked by user gesture");
      }).catch(e => {
        console.log("Audio unlock pending... Waiting for interaction.");
      });
      
      // Kilidi sadece bir kez açmaya çalış
      document.removeEventListener("mousedown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    }
  };
  document.addEventListener("mousedown", unlockAudio);
  document.addEventListener("keydown", unlockAudio);

  scene = new THREE.Scene();

  // -------------------- Particles --------------------

  // Yangın efekti kaldırıldı
  gasEffect = getParticleSystem({
    camera,
    emitter: gasSpawn,
    parent: scene,
    rate: gasRate,
    texture: "./assets/img/smoke.png", // Duman dokusunu kullanıp yeşile boyayacağız
    radius: 0.5, // Daha geniş alana yayılır
    maxLife: 6.0, // Daha uzun süre havada asılı kalır
    maxSize: 6.0, // Bulutlar daha büyük
    maxVelocity: gasVelocity,
    colorA: new THREE.Color(0x33ff55), // Açık yeşil / zehirli gaz rengi
    colorB: new THREE.Color(0xaaff00), // Sarımsı yeşil
    alphaMax: 0.7,
  });

  // -------------------- Oda Oluştur --------------------

  await createRoom();

  // -------------------- Import Assets --------------------

  // Yangın söndürücü yükleme bloğu kaldırıldı.

  // Circle - KALDIRILDI (zemindeki siyah alan istenmiyor)
  // loader.load(fileBase, async function (gltf) {
  //   modelCircle = gltf.scene;
  //   modelCircle.traverse((child) => {
  //     if (child.isMesh) {
  //       child.castShadow = false;
  //       child.receiveShadow = true;
  //       child.material.renderOrder = 0;
  //       child.material.depthWrite = true;
  //       child.material.transparent = false;
  //       child.material.color = new THREE.Color(
  //         guiObject.color.r,
  //         guiObject.color.g,
  //         guiObject.color.b
  //       );
  //       baseCircle = child;
  //     }
  //   });
  //   await renderer.compileAsync(modelCircle, camera, scene);
  //   scene.add(modelCircle);
  // });

  hdriLoader.load("Env.hdr", function (texture) {
    if (!ENV_REFLECTION_ENABLED) return;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
  });
  if (!ENV_REFLECTION_ENABLED) scene.environment = null;

  // Oda için basit bir arka plan rengi
  scene.background = new THREE.Color(0x87ceeb); // Açık mavi gökyüzü rengi
  scene.fog = new THREE.Fog(0x87ceeb, 8, 20); // Hava perspektifi için sis

  // ------------------- Render Starts --------------------------------

  renderer = new THREE.WebGLRenderer({ antialias: antialiasing });
  // Yüksek DPI ekranlarda FPS'i korumak için piksel oranını sınırla
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = toneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);

  // ---------------------------- Mouse İnteraction --------------------------------

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onMouseClick(event) {
    // Mouse click artık sadece pointer lock için kullanılıyor
    // Etkileşimler 'E' tuşu ile yapılıyor
  }

  // Tıklama ile kilitleme mantığı - Sadece UI interaksiyonu yoksa ve oyun başladıysa
  // Sadece senaryo başladıysa (timerStarted true ise) kilitle
  document.addEventListener("click", function (event) {
    // Kontrol ekranı açıksa kilitleme yapma
    const controlsIntro = document.getElementById("controls-intro");
    if (controlsIntro && controlsIntro.style.display !== "none") {
      return;
    }

    // Senaryo başlamadıysa kilitleme yapma
    if (!timerStarted) return;

    // Eğer bir UI elementine tıklanmadıysa ve kontroller kilitli değilse kilitle
    if (!controls.isLocked && event.target.tagName !== "BUTTON") {
      controls.lock();
    }
  });

  // ---------------------------- controls --------------------------------

  controls = new PointerLockControls(camera, document.body);

  controls.addEventListener('lock', function () {
    isLocked = true;
    // İsteğe bağlı: UI elementlerini gizle veya "Oyun Aktif" mesajı göster
  });

  controls.addEventListener('unlock', function () {
    isLocked = false;
    // İsteğe bağlı: Duraklatma menüsü göster
  });

  // OrbitControls ayarları kaldırıldı

  // FPS hareketi için klavye dinleyicileri
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // ---------------------------- scene --------------------------------

  window.addEventListener("resize", onWindowResize);

  // Aydınlatma Sistemi (gölge/env kapalıyken ortamı aydınlatmak için güçlendirildi)

  // Normal ofis aydınlatması (elektrik varken)
  window.mainLights = new THREE.Group();

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
  ambientLight.name = "mainAmbient";
  window.mainLights.add(ambientLight);

  // Gökyüzü/zemin dolgu ışığı (env map yokken eşyaları aydınlatır)
  const hemiLight = new THREE.HemisphereLight(0xe8f4fc, 0x8b7355, 0.55);
  hemiLight.name = "mainHemisphere";
  window.mainLights.add(hemiLight);

  const ceilingLight1 = new THREE.PointLight(0xffffee, 2.2, 10);
  ceilingLight1.position.set(-1, 2.8, -1);
  ceilingLight1.castShadow = true;
  window.mainLights.add(ceilingLight1);

  const ceilingLight2 = new THREE.PointLight(0xffffee, 2.2, 10);
  ceilingLight2.position.set(1, 2.8, 1);
  ceilingLight2.castShadow = true;
  window.mainLights.add(ceilingLight2);

  const fillDir = new THREE.DirectionalLight(0xffffff, 0.85);
  fillDir.position.set(2, 4, 2);
  fillDir.name = "mainFillDir";
  window.mainLights.add(fillDir);

  scene.add(window.mainLights);

  // Acil Durum Aydınlatması (sadece elektrik kesilince)
  window.emergencyLights = new THREE.Group();

  const emergencyAmbient = new THREE.AmbientLight(0xff4444, 0.25);
  emergencyAmbient.name = "emergencyAmbient";
  window.emergencyLights.add(emergencyAmbient);

  const emergencyFill = new THREE.AmbientLight(0xffffff, 0.6);
  emergencyFill.name = "emergencyFill";
  window.emergencyLights.add(emergencyFill);

  // Acil durum lambaları (kırmızı)
  const emergencyPositions = [
    [-2, 2.9, -2],
    [2, 2.9, -2],
    [-2, 2.9, 2],
    [2, 2.9, 2],
  ];

  emergencyPositions.forEach((pos, index) => {
    const emergencyLight = new THREE.PointLight(0xff0000, 1.1, 6);
    emergencyLight.position.set(pos[0], pos[1], pos[2]);
    emergencyLight.name = `emergency${index}`;
    window.emergencyLights.add(emergencyLight);

    // Görsel lamba kutusu
    const lampGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.15);
    const lampMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });
    const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
    lamp.position.copy(emergencyLight.position);
    room.add(lamp);
  });

  window.emergencyLights.visible = false; // Başlangıçta kapalı
  scene.add(window.emergencyLights);

  // --------------------------------- post --------------------------------

  // Gölge haritaları (masa/bilgisayar bölgesinde performansı düşürüyor)
  renderer.shadowMap.enabled = SHADOWS_ENABLED;
  if (SHADOWS_ENABLED) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Set up post-processing
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); // ensure pixel ratio is always 1 for performance reasons

  // Create and add render pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Create and add bloom pass
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.05,
    0.7,
    0.4
  );
  composer.addPass(bloomPass);

  if (AmbientOcclusion) {
    const ssaoPass = new SSAOPass(scene, camera);
    ssaoPass.kernelRadius = 0.01; // Adjust for effect strength
    ssaoPass.minDistance = 0.0001; // Minimum distance for AO
    ssaoPass.maxDistance = 0.1; // Maximum distance for AO
    composer.addPass(ssaoPass);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  composer.setSize(window.innerWidth, window.innerHeight); // Update composer size

  render();
}

function playFeAnimations() {
  FEAnimations.forEach((clip3) => {
    console.log("clip3: ", clip3);
    clip3.loop = false;
    mixerFE.clipAction(clip3).play();
  });
}

function stopFeAnimations() {
  FEAnimations.forEach((clip3) => {
    console.log("clip3: ", clip3);
    clip3.loop = false;
    mixerFE.clipAction(clip3).stop();
  });
}

// ----------------- Oda Fonksiyonu ------------------------

async function createRoom() {
  room = new THREE.Group();

  const roomSize = 5;
  const wallHeight = 3;
  const wallThickness = 0.1;

  // Malzemeler
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f5f0,
    roughness: 0.9,
    metalness: 0.05,
  });

  // Gerçekçi ahşap zemin dokusu için malzeme
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b6914,
    roughness: 0.8,
    metalness: 0.05,
  });

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    roughness: 0.95,
    metalness: 0.02,
  });

  // Zemin
  const floorGeometry = new THREE.BoxGeometry(
    roomSize,
    wallThickness,
    roomSize
  );
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.y = -wallThickness / 2;
  floor.receiveShadow = true;
  room.add(floor);

  // Tavan
  const ceilingGeometry = new THREE.BoxGeometry(
    roomSize,
    wallThickness,
    roomSize
  );
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.position.y = wallHeight;
  ceiling.receiveShadow = true;
  room.add(ceiling);

  // Arka duvar
  const backWallGeometry = new THREE.BoxGeometry(
    roomSize,
    wallHeight,
    wallThickness
  );
  const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
  backWall.position.set(0, wallHeight / 2, -roomSize / 2);
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  room.add(backWall);

  // Sol duvar
  const leftWallGeometry = new THREE.BoxGeometry(
    wallThickness,
    wallHeight,
    roomSize
  );
  const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
  leftWall.position.set(-roomSize / 2, wallHeight / 2, 0);
  leftWall.receiveShadow = true;
  leftWall.castShadow = true;
  room.add(leftWall);

  // Sağ duvar
  const rightWallGeometry = new THREE.BoxGeometry(
    wallThickness,
    wallHeight,
    roomSize
  );
  const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
  rightWall.position.set(roomSize / 2, wallHeight / 2, 0);
  rightWall.receiveShadow = true;
  rightWall.castShadow = true;
  room.add(rightWall);

  // Ön Duvar (Kapılı)
  // Kapı boşluğu: x= -0.5 ile 0.5 arası (1m genişlik), Yükseklik 2.2m

  // Sol Parça (İçeriden bakınca sağ, x > 0.5)
  const frontRightGeo = new THREE.BoxGeometry(2.0, wallHeight, wallThickness);
  const frontRight = new THREE.Mesh(frontRightGeo, wallMaterial);
  frontRight.position.set(1.5, wallHeight / 2, roomSize / 2); // (0.5 + 2.5)/2 = 1.5
  frontRight.castShadow = true;
  frontRight.receiveShadow = true;
  room.add(frontRight);

  // Sağ Parça (İçeriden bakınca sol, x < -0.5)
  const frontLeftGeo = new THREE.BoxGeometry(2.0, wallHeight, wallThickness);
  const frontLeft = new THREE.Mesh(frontLeftGeo, wallMaterial);
  frontLeft.position.set(-1.5, wallHeight / 2, roomSize / 2);
  frontLeft.castShadow = true;
  frontLeft.receiveShadow = true;
  room.add(frontLeft);

  // Üst Parça (Kapı üstü)
  const doorHeight = 2.2;
  const frontTopGeo = new THREE.BoxGeometry(1.0, wallHeight - doorHeight, wallThickness);
  const frontTop = new THREE.Mesh(frontTopGeo, wallMaterial);
  frontTop.position.set(0, doorHeight + (wallHeight - doorHeight) / 2, roomSize / 2);
  frontTop.castShadow = true;
  frontTop.receiveShadow = true;
  room.add(frontTop);

  // KAPI
  const doorWidth = 1.0;
  const doorThick = 0.05;
  const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorThick);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.6 }); // Ahşap kapı
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);

  // Pivot noktası için grup (Menteşe solda olsun)
  const doorGroup = new THREE.Group();
  doorGroup.position.set(-0.5, doorHeight / 2, roomSize / 2); // Menteşe noktası

  // Mesh'i gruba göre konumlandır (Grup merkezinden sağa doğru uzayacak)
  doorMesh.position.set(doorWidth / 2, 0, 0);

  doorMesh.name = "Door"; // Raycaster için isim
  doorGroup.add(doorMesh);

  // Kapı kolu
  const handleGeo = new THREE.SphereGeometry(0.05);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(doorWidth - 0.1, 0, 0.05); // Kapının ucunda (Dış)
  handle.name = "Door";
  doorGroup.add(handle);

  // İç Kapı Kolu
  const handleInside = new THREE.Mesh(handleGeo, handleMat);
  handleInside.position.set(doorWidth - 0.1, 0, -0.05); // Kapının ucunda (İç)
  handleInside.name = "Door";
  doorGroup.add(handleInside);

  doorGroup.name = "DoorGroup";
  room.add(doorGroup);
  window.doorGroup = doorGroup;

  // Acil çıkış tabelası (GLB): Kapının tam üstünde, odanın içinde (duvara sabit)
  loader.load(
    "exit_box.glb",
    (gltf) => {
      const exitSign = gltf.scene;

      exitSign.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Konum: kapı boşluğunun tam üstü, ön duvarın iç yüzeyi
      // Kapı üstüne daha yakın ve biraz daha büyük
      exitSign.position.set(
        0,
        doorHeight + 0.15,
        roomSize / 2 - wallThickness / 2 - 0.01
      );

      // Ölçek: biraz daha büyük
      exitSign.scale.set(0.65, 0.65, 0.65);

      // Duvara paralel olsun (90°)
      exitSign.rotation.y = Math.PI / 2;

      room.add(exitSign);
    },
    undefined,
    (error) => {
      console.warn("⚠ exit_box.glb yüklenemedi:", error);
    }
  );

  // Dış Zemin (Balkon/Koridor)
  const outFloorGeo = new THREE.BoxGeometry(roomSize, wallThickness, 4.0);
  const outFloorMat = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Beton zemin
  const outFloor = new THREE.Mesh(outFloorGeo, outFloorMat);
  outFloor.position.set(0, -wallThickness / 2, 4.5); // 2.5 + 2.0 = 4.5
  outFloor.receiveShadow = true;
  room.add(outFloor);

  // Acil Çıkış Takip Yolu (Gelişmiş - L Şekli, Kusursuz Köşe)
  const exitPathGroup = new THREE.Group();
  room.add(exitPathGroup);

  // Materyaller
  const pathMat = new THREE.MeshBasicMaterial({ color: 0x009900, side: THREE.DoubleSide }); // Yeşil Yol
  const borderMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide }); // Sarı Şeritler
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide }); // Sarı Oklar

  const pathY = 0.02; // Zemin üstü

  // Koordinat Limitleri:
  // Z Başlangıç: 2.5 (Kapı)
  // Z Dönüş Merkezi: 5.0 (Koridor Ortası)
  // X Bitiş: -2.2 (Sola gidiş, zemin sınırı -2.5 olduğu için güvenli pay bırakıldı)

  // 1. DİKEY BÖLÜM (Kapıdan İleri) - YEŞİL
  // Z: 2.5 -> 5.4 (Dönüşün dış kenarına kadar)
  const vGreenGeo = new THREE.PlaneGeometry(0.8, 2.9);
  const vGreen = new THREE.Mesh(vGreenGeo, pathMat);
  vGreen.rotation.x = -Math.PI / 2;
  vGreen.position.set(0, pathY, 2.5 + 1.45); // Orta nokta: 3.95
  exitPathGroup.add(vGreen);

  // 2. YATAY BÖLÜM (Sola Dönüş) - YEŞİL
  // X: -0.4 (Dikey parçanın iç kenarı) -> -2.2
  const hGreenGeo = new THREE.PlaneGeometry(1.8, 0.8);
  const hGreen = new THREE.Mesh(hGreenGeo, pathMat);
  hGreen.rotation.x = -Math.PI / 2;
  hGreen.position.set(-1.3, pathY, 5.0); // Z=5.0 merkezli
  exitPathGroup.add(hGreen);

  // 3. DIŞ KENAR (Sağ -> Üst Sarı Şerit)
  // Dikey Sağ Border: Z 2.5 -> 5.45
  const borderRightGeo = new THREE.PlaneGeometry(0.1, 2.95);
  const borderRight = new THREE.Mesh(borderRightGeo, borderMat);
  borderRight.rotation.x = -Math.PI / 2;
  borderRight.position.set(0.45, pathY, 2.5 + 1.475);
  exitPathGroup.add(borderRight);

  // Yatay Üst Border: X 0.45 -> -2.2
  const borderTopGeo = new THREE.PlaneGeometry(2.65, 0.1);
  const borderTop = new THREE.Mesh(borderTopGeo, borderMat);
  borderTop.rotation.x = -Math.PI / 2;
  borderTop.position.set(-0.875, pathY, 5.45);
  exitPathGroup.add(borderTop);

  // 4. İÇ KENAR (Sol -> Alt Sarı Şerit)
  // Dikey Sol Border: Z 2.5 -> 4.55 (İç köşe hizası)
  const borderLeftGeo = new THREE.PlaneGeometry(0.1, 2.05);
  const borderLeft = new THREE.Mesh(borderLeftGeo, borderMat);
  borderLeft.rotation.x = -Math.PI / 2;
  borderLeft.position.set(-0.45, pathY, 2.5 + 1.025);
  exitPathGroup.add(borderLeft);

  // Yatay Alt Border: X -0.45 -> -2.2
  const borderBottomGeo = new THREE.PlaneGeometry(1.75, 0.1);
  const borderBottom = new THREE.Mesh(borderBottomGeo, borderMat);
  borderBottom.rotation.x = -Math.PI / 2;
  borderBottom.position.set(-1.325, pathY, 4.55);
  exitPathGroup.add(borderBottom);

  // KÖŞE KAPATMA (Sarı Kareler - Z-fighting önlemek için gerekirse)
  // Şu anki geometri overlap ile doğal kapanıyor.

  // --- OKLAR ---
  const arrowGeo = new THREE.CircleGeometry(0.3, 3); // Üçgen Ok

  // Ok 1: İleri
  const arrow1 = new THREE.Mesh(arrowGeo, arrowMat);
  arrow1.rotation.x = -Math.PI / 2;
  arrow1.rotation.z = -Math.PI / 2; // +Z yönü
  arrow1.position.set(0, pathY + 0.01, 3.5);
  exitPathGroup.add(arrow1);

  // Ok 2: Sola
  const arrow2 = new THREE.Mesh(arrowGeo, arrowMat);
  arrow2.rotation.x = -Math.PI / 2;
  arrow2.rotation.z = Math.PI; // -X yönü (Sol)
  arrow2.position.set(-1.5, pathY + 0.01, 5.0);
  exitPathGroup.add(arrow2);

  // ==================== GERÇEKÇİ MODELLER ====================
  // Önce modelleri yüklemeyi dene, başarısız olursa fallback kullan

  await loadAllRealisticModels();

  // -------------------- OFİS MASASI --------------------
  if (loadedModels.desk) {
    room.add(loadedModels.desk);
    console.log("✓ Gerçekçi masa modeli eklendi");
  } else {
    // Fallback: Basit geometri masa
    createFallbackDesk();
  }

  // -------------------- ALARM BUTONU --------------------
  if (loadedModels.alarmButton) {
    const alarmModel = loadedModels.alarmButton;
    alarmModel.name = "alarmBox";
    alarmModel.traverse((child) => {
      if (child.isMesh) {
        child.name = "alarmBox";
      }
    });
    room.add(alarmModel);
    console.log("✓ Gerçekçi alarm butonu eklendi");
  } else {
    // Fallback: Basit alarm butonu
    createFallbackAlarmButton();
  }

  // -------------------- ISITICI (HEATER) --------------------
  let heater;
  if (loadedModels.heater) {
    heater = loadedModels.heater;
    heater.name = "heater";
    heater.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.metalness = 0.25;
        child.material.roughness = 0.55;
      }
    });
    room.add(heater);
    console.log("✓ Gerçekçi ısıtıcı eklendi");
  } else {
    // Fallback: Basit çöp kovası (Isıtıcı yerine)
    heater = createFallbackTrashCan();
    heater.name = "heater";
  }

  // Elektrik kablosu kaldırıldı - yangın kaynağı artık görsel olarak gösterilmiyor
  // Yangın efekti ısıtıcı/masa üzerinden başlayacak

  // -------------------- BİLGİSAYAR DONANIMI --------------------
  let monitor, screen, keyboard, computerMouse;

  if (loadedModels.monitor) {
    monitor = loadedModels.monitor;
    monitor.name = "monitor";
    room.add(monitor);
    console.log("✓ Gerçekçi monitör eklendi");
  } else {
    // Fallback: Basit monitör
    const monitorData = createFallbackMonitor();
    monitor = monitorData.monitor;
    screen = monitorData.screen;
  }

  if (loadedModels.keyboard) {
    keyboard = loadedModels.keyboard;
    keyboard.name = "keyboard";
    room.add(keyboard);
    console.log("✓ Gerçekçi klavye eklendi");
  } else if (!loadedModels.monitor) {
    // Fallback zaten oluşturuldu
  }

  if (loadedModels.mouse) {
    computerMouse = loadedModels.mouse;
    room.add(computerMouse);
    console.log("✓ Gerçekçi mouse eklendi");
  }

  // -------------------- OFİS SANDALYESİ --------------------
  if (loadedModels.chair) {
    room.add(loadedModels.chair);
    console.log("✓ Gerçekçi ofis sandalyesi eklendi");
  } else {
    // Fallback: Basit sandalye
    createFallbackChair();
  }

  // -------------------- MİSAFİR SANDALYELERİ --------------------
  if (loadedModels.guestChair1) {
    room.add(loadedModels.guestChair1);
    console.log("✓ Misafir sandalyesi 1 eklendi");
  }

  if (loadedModels.guestChair2) {
    room.add(loadedModels.guestChair2);
    console.log("✓ Misafir sandalyesi 2 eklendi");
  }

  // -------------------- BİTKİ --------------------
  if (loadedModels.plant) {
    room.add(loadedModels.plant);
    console.log("✓ Bitki eklendi");
  }

  // Bilgisayar referansını sakla (yangın yayılması için)
  window.computerEquipment = {
    monitor: monitor || loadedModels.monitor,
    screen: screen,
    keyboard: keyboard || loadedModels.keyboard,
    mouse: computerMouse || loadedModels.mouse,
  };

  // Havalandırma Fanı eklendi
  createVentilationFan();

  // Pencere eklendi
  createWindowMesh(roomSize, wallHeight, wallThickness);

  // Sızıntı kaynağı (Isıtıcı altındaki tüp/bağlantı noktası varsayalım)
  window.leakSource = heater;

  scene.add(room);
}

// ==================== FALLBACK FONKSİYONLARI ====================
// Model yüklenemezse kullanılacak basit geometriler

function createFallbackDesk() {
  // Masa üstü
  const deskGeometry = new THREE.BoxGeometry(1.5, 0.05, 0.8);
  const deskMaterial = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.7,
    metalness: 0.1,
  });
  const desk = new THREE.Mesh(deskGeometry, deskMaterial);
  desk.position.set(0, 0.75, 0);
  desk.castShadow = true;
  desk.receiveShadow = true;
  room.add(desk);

  // Masa Bacakları
  const legGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.72, 12);
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.4,
    metalness: 0.6,
  });

  const positions = [
    [-0.68, 0.36, -0.35],
    [0.68, 0.36, -0.35],
    [-0.68, 0.36, 0.35],
    [0.68, 0.36, 0.35],
  ];

  positions.forEach((pos) => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(pos[0], pos[1], pos[2]);
    leg.castShadow = true;
    room.add(leg);
  });

  console.log("⚠ Fallback masa kullanıldı");
}

// Procedural Hands (Three.js Primitives)
function createProceduralHands() {
  handsGroup = new THREE.Group();

  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0ac69, // Skin tone
    roughness: 0.6,
    metalness: 0.05
  });

  const createHand = (isRight) => {
    const handGroup = new THREE.Group();
    const side = isRight ? 1 : -1;

    // Arm (Forearm)
    const armGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.5, 12);
    const arm = new THREE.Mesh(armGeo, skinMaterial);
    arm.rotation.x = Math.PI / 2 - 0.2;
    arm.position.set(0.25 * side, -0.35, -0.15);
    handGroup.add(arm);

    // Palm
    const palmGeo = new THREE.BoxGeometry(0.1, 0.03, 0.12);
    const palm = new THREE.Mesh(palmGeo, skinMaterial);
    palm.position.set(0.25 * side, -0.28, -0.42);
    palm.rotation.x = -0.1;
    handGroup.add(palm);

    // Fingers
    const fingerGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8);
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(fingerGeo, skinMaterial);
      finger.rotation.x = Math.PI / 2;
      finger.position.set(
        (0.25 * side) + (i * 0.025 - 0.0375) * side,
        -0.27,
        -0.49
      );
      handGroup.add(finger);
    }

    // Thumb
    const thumb = new THREE.Mesh(fingerGeo, skinMaterial);
    thumb.rotation.x = Math.PI / 2;
    thumb.rotation.y = side * 0.5;
    thumb.position.set(
      (0.25 * side) - (0.06 * side),
      -0.28,
      -0.44
    );
    handGroup.add(thumb);

    return handGroup;
  };

  handsGroup.add(createHand(false)); // Left
  handsGroup.add(createHand(true));  // Right

  camera.add(handsGroup);
}

function createFallbackAlarmButton() {
  // GİRİŞE YAKIN - Sol duvar (x=-2.4, z=1.8)
  const alarmX = -2.4;
  const alarmY = 1.4;
  const alarmZ = 1.8;

  // Alarm arka kutusu
  const alarmBackGeometry = new THREE.BoxGeometry(0.08, 0.35, 0.35); // Döndürüldü
  const alarmBackMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.2,
  });
  const alarmBack = new THREE.Mesh(alarmBackGeometry, alarmBackMaterial);
  alarmBack.position.set(alarmX, alarmY, alarmZ);
  alarmBack.castShadow = true;
  room.add(alarmBack);

  // Alarm butonu (kırmızı - basılabilir)
  const alarmButtonGeometry = new THREE.CylinderGeometry(0.1, 0.11, 0.06, 32);
  const alarmButtonMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.8,
  });
  const alarmButton = new THREE.Mesh(alarmButtonGeometry, alarmButtonMaterial);
  alarmButton.position.set(alarmX + 0.07, alarmY, alarmZ); // Duvardan dışarı
  alarmButton.rotation.z = Math.PI / 2; // Yatay - sağa baksın
  alarmButton.name = "alarmBox";
  alarmButton.castShadow = true;
  room.add(alarmButton);

  // Alarm kutu çerçevesi (kırmızı çizgi)
  const frameGeometry = new THREE.BoxGeometry(0.02, 0.37, 0.37); // Döndürüldü
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc0000,
    roughness: 0.4,
    metalness: 0.6,
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.set(alarmX + 0.02, alarmY, alarmZ);
  room.add(frame);

  // "ALARM" yazısı plakası
  const textGeometry = new THREE.BoxGeometry(0.02, 0.06, 0.3); // Döndürüldü
  const textMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0x440000,
    emissiveIntensity: 0.4,
  });
  const textPlate = new THREE.Mesh(textGeometry, textMaterial);
  textPlate.position.set(alarmX + 0.02, alarmY + 0.22, alarmZ);
  room.add(textPlate);

  console.log("⚠ Fallback alarm butonu kullanıldı");
}

function createFallbackTrashCan() {
  // Isıtıcı (Masa altında) - Yangın kaynağı, orijinal gri metal görünüm
  const trashCanGeometry = new THREE.CylinderGeometry(0.16, 0.19, 0.38, 20);
  const trashCanMaterial = new THREE.MeshStandardMaterial({
    color: 0x6e6e6e,
    roughness: 0.55,
    metalness: 0.35,
  });
  const trashCan = new THREE.Mesh(trashCanGeometry, trashCanMaterial);
  trashCan.position.set(0.35, 0.19, 0.15);
  trashCan.castShadow = true;
  trashCan.receiveShadow = true;
  trashCan.name = "trashcan";
  room.add(trashCan);

  // Isıtıcı kovası kenar bandı
  const rimGeometry = new THREE.TorusGeometry(0.17, 0.015, 8, 24);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x505050,
    roughness: 0.4,
    metalness: 0.6,
  });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.position.set(0.35, 0.38, 0.15);
  rim.rotation.x = Math.PI / 2;
  room.add(rim);

  // Gaz sızıntı kaynağı (Isıtıcı altı)
  gasSpawn.position.set(0.7, 0.25, -1.5); 
  // smokeSpawn kaldırıldı

  console.log("⚠ Fallback çöp kovası kullanıldı");
  return trashCan;
}

function createFallbackMonitor() {
  // Monitör
  const monitorGeometry = new THREE.BoxGeometry(0.55, 0.38, 0.04);
  const monitorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.2,
    metalness: 0.7,
  });
  const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial);
  monitor.position.set(0, 0.98, -0.18);
  monitor.rotation.x = -0.08;
  monitor.castShadow = true;
  monitor.receiveShadow = true;
  monitor.name = "monitor";
  room.add(monitor);

  // Monitör ekranı (mavi - açık)
  const screenGeometry = new THREE.BoxGeometry(0.5, 0.32, 0.01);
  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a8cff,
    emissive: 0x0055aa,
    emissiveIntensity: 0.6,
    roughness: 0.05,
    metalness: 0.1,
  });
  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, 0.98, -0.155);
  screen.rotation.x = -0.08;
  room.add(screen);

  // Monitör standı - boyun
  const neckGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.06);
  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.4,
    metalness: 0.6,
  });
  const neck = new THREE.Mesh(neckGeometry, standMaterial);
  neck.position.set(0, 0.855, -0.18);
  room.add(neck);

  // Monitör standı - taban
  const baseGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.02, 24);
  const base = new THREE.Mesh(baseGeometry, standMaterial);
  base.position.set(0, 0.785, -0.18);
  room.add(base);

  // Klavye
  const keyboardGeometry = new THREE.BoxGeometry(0.42, 0.015, 0.14);
  const keyboardMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.6,
    metalness: 0.3,
  });
  const keyboard = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
  keyboard.position.set(0, 0.785, 0.12);
  keyboard.castShadow = true;
  keyboard.name = "keyboard";
  room.add(keyboard);

  // Mouse
  const mouseGeometry = new THREE.BoxGeometry(0.055, 0.025, 0.095);
  const mouseMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.4,
    metalness: 0.4,
  });
  const computerMouse = new THREE.Mesh(mouseGeometry, mouseMaterial);
  computerMouse.position.set(0.28, 0.79, 0.15);
  computerMouse.castShadow = true;
  room.add(computerMouse);

  console.log("⚠ Fallback monitör/klavye/mouse kullanıldı");

  return { monitor, screen, keyboard, mouse: computerMouse };
}

function createFallbackChair() {
  // Basit ofis sandalyesi
  const chairGroup = new THREE.Group();

  // Oturma yeri
  const seatGeometry = new THREE.BoxGeometry(0.45, 0.06, 0.45);
  const seatMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.1,
  });
  const seat = new THREE.Mesh(seatGeometry, seatMaterial);
  seat.position.y = 0.45;
  chairGroup.add(seat);

  // Sırt dayama
  const backGeometry = new THREE.BoxGeometry(0.42, 0.5, 0.05);
  const back = new THREE.Mesh(backGeometry, seatMaterial);
  back.position.set(0, 0.73, -0.2);
  back.rotation.x = 0.1;
  chairGroup.add(back);

  // Merkez ayak
  const legGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 12);
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.3,
    metalness: 0.8,
  });
  const centerLeg = new THREE.Mesh(legGeometry, legMaterial);
  centerLeg.position.y = 0.3;
  chairGroup.add(centerLeg);

  // 5 tekerlekli ayak
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const wheelLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8),
      legMaterial
    );
    wheelLeg.position.set(Math.cos(angle) * 0.18, 0.08, Math.sin(angle) * 0.18);
    wheelLeg.rotation.z = (Math.PI / 6) * (angle > Math.PI ? 1 : -1);
    chairGroup.add(wheelLeg);

    // Tekerlek
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.03, 12),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    wheel.position.set(Math.cos(angle) * 0.25, 0.015, Math.sin(angle) * 0.25);
    wheel.rotation.z = Math.PI / 2;
    chairGroup.add(wheel);
  }

  chairGroup.position.set(0, 0, 0.9);
  chairGroup.rotation.y = Math.PI + 0.2;
  room.add(chairGroup);

  console.log("⚠ Fallback sandalye kullanıldı");
}

// Havalandırma Fanı Oluşturur (Airflow Logic)
function createVentilationFan() {
  const fanGroup = new THREE.Group();
  
  // Ana Kasa
  const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.2);
  const boxMat = new THREE.MeshStandardMaterial({ 
      color: 0x888888, 
      metalness: 0.6, 
      roughness: 0.5,
      emissive: 0x222222
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  fanGroup.add(box);

  // Ortadaki Pervane
  window.fanBlades = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.7, 0.1, 0.05);
  const bladeMat = new THREE.MeshStandardMaterial({ 
      color: 0xaaaaaa, 
      metalness: 0.9, 
      roughness: 0.1,
      emissive: 0x222222
  });

  const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
  const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
  blade2.rotation.z = Math.PI / 2;

  window.fanBlades.add(blade1);
  window.fanBlades.add(blade2);
  window.fanBlades.position.z = -0.12; // Adjusted to face the room (negative Z) instead of the wall
  fanGroup.add(window.fanBlades);

  // Etkileşim kutusu (Görünmez ama tıklanabilir)
  const hitGeo = new THREE.BoxGeometry(1.5, 1.5, 0.8);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitbox = new THREE.Mesh(hitGeo, hitMat);
  hitbox.name = "Fan";
  fanGroup.add(hitbox);

  // Move fan to front wall, left of the door (from inside perspective)
  // Position lowered and moved to the other side as requested
  fanGroup.position.set(-1.5, 1.6, 2.4); 
  room.add(fanGroup);
  
  console.log("✓ Ventilation fan added");
}

// Pencere Oluşturur (Airflow Logic)
function createWindowMesh(roomSize, wallHeight, wallThickness) {
  window.windowGroup = new THREE.Group();
  
  // Hitbox (Raycaster için isim ve boyut korunuyor)
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.5, 2.0),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.name = "Window";
  window.windowGroup.add(hitbox);

  // Sol duvarda, duvara tam yaslanmış konumda
  // Position lowered to prevent clipping and improve visibility
  window.windowGroup.position.set(-2.41, 1.3, 0.0);
  
  // Realistik Pencere Modelini Yükle
  loader.load("Window Small.glb", (gltf) => {
    const model = gltf.scene;
    
    // Shrink scale to fit the wall better
    model.scale.set(1.2, 1.2, 1.2);
    model.rotation.y = Math.PI / 2; // Duvara paralel çevir
    
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    window.windowGroup.add(model);
    console.log("✓ Realistik Pencere Modeli Yüklendi.");
  }, undefined, (err) => {
    console.warn("⚠ Pencere modeli yüklenemedi, fallback oluşturuluyor:", err);
    // Hata durumunda eski basit modeli ekle
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 1.5), new THREE.MeshStandardMaterial({color:0x4488ff, transparent:true, opacity:0.8}));
    window.windowGroup.add(glass);
  });
  
  room.add(window.windowGroup);
}

// ----------------- Gaz Kaçağı Kontrol Fonksiyonları ------------------------

function startGasLeak() {
  if (!timerStarted) {
    timerStarted = true;
    startTime = Date.now();
  }

  gasActive = true;
  gasIntensity = 0.15;
  peakGasIntensity = 0.15; // Sızıntı başında sıfırla
  gasStage = "leaking";

  // Işıkları hafif karartabiliriz veya bir uyarı sesi çalabiliriz
  // Şimdilik uyarı mesajı verelim
  decisionLog.push({
    time: Date.now() - startTime,
    action: "gas_leak_started",
    description: "Cylinder leakage started in the laboratory!",
  });

  console.log("💨 Gas leak started!");
}

// Mesaj göster
function showMessage(message, duration = 4000) {
  const messageDiv = document.getElementById("messageBox");
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.style.display = "block";

    setTimeout(() => {
      messageDiv.style.display = "none";
    }, duration);
  }
}

// Oyunu bitiren metot (Zehirlenme Durumu)
function triggerGameOver() {
  endScenario("failed_toxic_gas");
}

// Senaryo sonu
function endScenario(result) {
  if (scenarioEnded) return;

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Zamanlayıcıyı ve animasyonları durdur
  scenarioEnded = true;
  timerStarted = false;

  const timerDiv = document.getElementById("timer");
  if (timerDiv) {
    timerDiv.style.display = "none";
  }
  const gasContainer = document.getElementById("gasLevelContainer");
  if (gasContainer) gasContainer.style.display = "none";
  
  const detectorContainer = document.getElementById("detectorContainer");
  if (detectorContainer) detectorContainer.style.display = "none";

  // Tüm efektleri temizle
  gasActive = false;
  gasRate = 0;

  if (window.stopAlarmSound) {
    window.stopAlarmSound();
  }

  // Sonuç ekranı göster
  const resultDiv = document.getElementById("resultScreen");
  const resultTitle = document.getElementById("resultTitle");
  const resultText = document.getElementById("resultText");
  const scoreText = document.getElementById("scoreText");
  const timeText = document.getElementById("timeText");
  const logText = document.getElementById("decisionLog");

  if (!resultDiv) return;

  resultDiv.style.display = "block";

  let title = "";
  let text = "";
  let color = "";

  if (result === "success") {
    title = "🎉 Congratulations, Area Cleared!";
    text = "You have successfully ventilated the area. Everyone is safe!";
    color = "#00ff00";

    // --- 100 ÜZERİNDEN MANTIKLI PUANLAMA ---
    // 1. Hız (40 Puan): 40 saniyeden önce bitirmek tam puan, sonrası her saniye -0.5 puan
    let timeScore = Math.max(0, 40 - (parseFloat(totalTime) / 2));
    
    // 2. Güvenlik (40 Puan): Gaz seviyesi hiç %50'yi geçmediyse tam puan, sonrası düşer
    // En yüksek ulaşılan yoğunluk üzerinden: (1 - peak) * 40
    let safetyScore = Math.max(0, (1 - peakGasIntensity) * 40);
    
    // 3. Prosedür (20 Puan): Fan ve Pencere açıldığı için
    let procedureScore = 0;
    if (window.isFanOn) procedureScore += 10;
    if (window.isWindowOpen) procedureScore += 10;

    userScore = Math.round(timeScore + safetyScore + procedureScore);
    
    // Minimum 10 puan (başarı ödülü)
    if (userScore < 10) userScore = 10;

  } else if (result === "failed_toxic_gas") {
    title = "☠️ FAILED: Toxic Poisoning!";
    text = "Gas levels reached dangerous levels. You failed to clear the area in time.";
    color = "#ff0000";
    userScore = 0;
  } else if (result === "failed_too_late") {
    title = "❌ FAILED: Too Late";
    text = "You were too late to respond to the gas leak.";
    color = "#ff0000";
    userScore = 0;
  } else {
    title = "Simulation Completed";
    text = "Simulation ended.";
    color = "#ffffff";
    userScore = 0;
  }

  resultTitle.textContent = title;
  resultTitle.style.color = color;
  resultText.textContent = text;
  scoreText.textContent = `Total Score: ${userScore} / 100`;
  timeText.textContent = `Total Time: ${totalTime} seconds`;

  // Alarm süresi takibi (Gelecek sürümlerde eklenebilir)

  // Show decision history
  let logHTML = "<h4>Decision History:</h4><ul>";
  decisionLog.forEach((log) => {
    logHTML += `<li>[${(log.time / 1000).toFixed(1)}s] ${log.description}</li>`;
  });
  logHTML += "</ul>";
  logText.innerHTML = logHTML;

  console.log("=== SCENARIO END ===");
  console.log(`Result: ${result}`);

  // Kontrolleri serbest bırak
  if (controls) controls.unlock();

  // CSV Raporunu Otomatik İndir
  setTimeout(() => {
    try {
      const finalResultText = title + " - " + text;
      exportToCSV(totalTime, userScore, finalResultText);
      console.log("📊 Downloading report...");
    } catch (e) {
      console.error("Report generation error:", e);
    }
  }, 500); // 0.5sn bekleme (UI güncellensin)
  console.log(`Puan: ${userScore}`);
  console.log(`Süre: ${totalTime}s`);
}

// Ses sistemi - Web Audio API ile basit alarm sesi (Tanımlar yukarıya taşındı)

// Global alarm durdurma fonksiyonu
window.stopAlarmSound = function () {
  if (alarmAudio) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    console.log("🔇 Alarm sound stopped");
  }
};

function initAudio() {
  try {
    // DOM üzerinden audio elementini al
    alarmAudio = document.getElementById("alarmAudio");
    if (!alarmAudio) {
      console.warn("Audio element #alarmAudio not found in DOM, creating fallback...");
      alarmAudio = new Audio("assets/audio/alarm.mp3");
      alarmAudio.loop = true;
    }
    alarmAudio.volume = 0.5;
    console.log("✓ Alarm sound system initialized using DOM element");
  } catch (e) {
    console.warn("Audio initialization failed:", e);
  }
}

// ----------------- CSV EXPORT ------------------------

function exportToCSV(totalTime, score, resultText) {
  // Get user information
  const user = window.userData || { name: "Unknown", surname: "User", startTime: new Date().toLocaleString() };

  // Format time as mm:ss.s to prevent Excel from auto-formatting as date
  function formatElapsedTime(seconds) {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const totalSecondsInt = Math.floor(safeSeconds);
    const tenths = Math.floor((safeSeconds - totalSecondsInt) * 10 + 1e-9); // 0-9

    const mins = Math.floor(totalSecondsInt / 60);
    const secs = totalSecondsInt % 60;

    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return `${mm}:${ss}.${tenths}`;
  }

  // Create CSV Content
  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += "Gas Leak and Ventilation Training Report\n";
  csvContent += "--------------------------------\n";
  csvContent += `Full Name;${user.name} ${user.surname}\n`;
  csvContent += `Date;${user.startTime}\n`;
  csvContent += `Total Duration;${totalTime} seconds\n`;
  csvContent += `Score;${score}\n`;
  csvContent += `Result;${resultText.replace(/\n/g, " ")}\n\n`;

  csvContent += "--------------------------------\n";
  csvContent += "DETAILED ACTION LOG\n";
  csvContent += "Time (mm:ss.s);Action;Description\n";

  // Add logs
  decisionLog.forEach(log => {
    const timeSeconds = typeof log.time === 'number' ? (log.time / 1000) : Number(log.time);
    const timeFormatted = formatElapsedTime(timeSeconds);
    const time = `'${timeFormatted}`;
    const desc = log.description.replace(/;/g, ",");
    csvContent += `${time};${log.action};${desc}\n`;
  });

  // Dosya İndirme İşlemi
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  // Dosya adı: Ad_Soyad_Tarih.csv
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `Training_Report_${user.name}_${user.surname}_${dateStr}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ----------------- GUI ------------------------

function addGUI() {
  if (guiEnable) {
    gui = new GUI();
    guiCam = gui.addFolder("GasAR");

    // guiCam.add( guiObject, 'value1', 1, textureCount, 1 ).name('Texture');
    // guiCam.add( guiObject, 'value2', 0, 1 ).name('Box Brightness');
    guiCam.add(guiObject, "value3", 0, 10).name("Scene Brightness");
    // guiCam.add( guiObject, 'value4', 0, 1 ).name('Camera Damping');
    guiCam.addColor(guiObject, "color", 255).name("Floor Color");
    guiCam.add(guiObject, "gasBoolean").name("💨 Gas Leak");
    // Yangın söndürücü kontrolü kaldırıldı - artık kola tıklayarak aktif edilecek
    // guiCam.add(guiObject, "feBoolean").name("🧯 Yangın Söndürücü");
    guiCam.add(guiObject, "pauseBoolean").name("⏸ Duraklat");

    gui.onChange((event) => {
      console.log(event.property);
      // FE animasyonu artık kola tıklayarak kontrol edilecek
      // if (event.property == "feBoolean" && guiObject.feBoolean == true)
      //   playFeAnimations();
      // else stopFeAnimations();
    });
  }
}

// ----------------- Stats ---------------------

const stats = () => {
  if (statsEnable) {
    const stats1 = new Stats();
    stats1.showPanel(0);
    const stats2 = new Stats();
    stats2.showPanel(1);
    stats2.dom.style.cssText = "position:absolute;top:0px;left:80px;";
    const stats3 = new Stats();
    stats3.showPanel(2);
    stats3.dom.style.cssText = "position:absolute;top:0px;left:160px;";
    document.body.appendChild(stats1.dom);
    document.body.appendChild(stats2.dom);
    document.body.appendChild(stats3.dom);

    function statsUpdate() {
      requestAnimationFrame(statsUpdate);
      stats1.update();
      stats2.update();
      stats3.update();
    }
    statsUpdate();
  }
};
stats();

// Yangın hitbox fonksiyonu kaldırıldı.

function animate() {
  requestAnimationFrame(animate);

  deltaTime = clock.getDelta();

  controls.update();
  controls.dampingFactor = guiObject.value4;

  // WASD ile birinci şahıs hareket güncellemesi
  updateFirstPersonMovement(deltaTime);

  updateInteraction();

  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }

  if (mixerSmoke) {
    mixerSmoke.update(deltaTime);
  }

  if (!guiObject.pauseBoolean) {
    if (gasRate > 0 && gasEffect) gasEffect.update(deltaTime, gasRate);
  }

  // Gaz seviyesi yükselme/azalma mantığı
  if (gasActive && gasStage !== "cleared") {
    let gasDelta = deltaTime * 0.02; // Saniyede %2 artış
    if (window.isFanOn && (window.isDoorOpen || window.isWindowOpen)) {
        gasDelta = -deltaTime * 0.05; // Havalandırma tam kapasite açıkken hızlı düşüş
    } else if ((window.isFanOn && !window.isDoorOpen && !window.isWindowOpen) || (window.isDoorOpen || window.isWindowOpen)) {
        gasDelta = -deltaTime * 0.01; // Sadece açık fan veya kapı/pencere ile çok hafif düşüş
    }
    
    gasIntensity += gasDelta;
    if (gasIntensity > peakGasIntensity) peakGasIntensity = gasIntensity; // Zirve noktayı kaydet
    
    if (gasIntensity <= 0.05 && gasStage === "leaking") { 
      gasIntensity = 0.0; 
      gasStage = "cleared"; 
      showMessage("✅ Environment Cleared of Gas! Mission Accomplished.", 3000); 
      setTimeout(() => endScenario("success"), 3500);
    }
    if (gasIntensity > 1.0) {
       gasIntensity = 1.0;
       if (!scenarioEnded) {
         console.log("TOXIC DEATH TRIGGERED");
         triggerGameOver();
       }
    }
    
    // Debug log (Sadece her 60 karede bir)
    if (Math.floor(Date.now() / 1000) % 2 === 0 && Math.random() < 0.01) {
       console.log("Current Gas Intensity:", gasIntensity.toFixed(3));
    }
    
    // Gaz seviyesi UI güncellemesi
    const gasPercent = Math.min(Math.floor(gasIntensity * 100), 100);
    const textEl = document.getElementById("gasPercentageText");
    const barEl = document.getElementById("gasLevelBar");
    if (textEl) textEl.textContent = `%${gasPercent}`;
    if (barEl) {
      barEl.style.width = `${gasPercent}%`;
      // Renk değişimi
      if (gasPercent < 40) barEl.style.backgroundColor = "#4caf50";
      else if (gasPercent < 80) barEl.style.backgroundColor = "#ffaa00";
      else barEl.style.backgroundColor = "#ff0000";
    }

    // Tehlike Efekti (Ekran köşeleri kırmızılaşır)
    const dangerOverlay = document.getElementById("dangerOverlay");
    if (dangerOverlay) {
       if (gasIntensity >= 0.8) {
          dangerOverlay.style.boxShadow = `inset 0 0 150px rgba(255,0,0,${(gasIntensity-0.6)})`;
       } else if (gasIntensity >= 0.5) {
          dangerOverlay.style.boxShadow = `inset 0 0 100px rgba(255,100,0,${(gasIntensity-0.3)/2})`;
       } else {
          dangerOverlay.style.boxShadow = "inset 0 0 0px rgba(255,0,0,0)";
       }
    }

    // Gaz oranı kapasitesi
    gasRate = gasActive ? gasRateValue * gasIntensity : 0;

    // Dedektör Mesafesi Hesaplama (Proximity Sensor)
    const gasPosition = new THREE.Vector3(0.7, 0.25, -1.5);
    const distanceToGas = camera.position.distanceTo(gasPosition);
    
    const dIndicator = document.getElementById("detectorIndicator");
    const dText = document.getElementById("detectorText");
    
    if (dIndicator && dText) {
      if (distanceToGas < 1.5) {
        dIndicator.style.backgroundColor = "#ff0000";
        dIndicator.style.boxShadow = "0 0 20px #ff0000";
        dText.textContent = "DANGER! TOO CLOSE";
        dText.style.color = "#ff0000";
      } else if (distanceToGas < 3.0) {
        dIndicator.style.backgroundColor = "#ffaa00";
        dIndicator.style.boxShadow = "0 0 15px #ffaa00";
        dText.textContent = "WARNING: Near Source";
        dText.style.color = "#ffaa00";
      } else {
        dIndicator.style.backgroundColor = "#4caf50";
        dIndicator.style.boxShadow = "0 0 10px #4caf50";
        dText.textContent = "Safe Distance";
        dText.style.color = "#4caf50";
      }
    }
  }

  // Fan dönüş animasyonu
  if (window.isFanOn && window.fanBlades) {
    window.fanBlades.rotation.z += deltaTime * 15; // Hızlı döner
  }

  // Zamanlayıcıyı göster (sadece senaryo devam ederken)
  if (timerStarted && !scenarioEnded && gasStage !== "cleared") {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const timerDiv = document.getElementById("timer");
    if (timerDiv) {
      timerDiv.textContent = `⏱️ Geçen Süre: ${elapsedTime}s`;

      if (elapsedTime < 40) {
        timerDiv.style.color = "#00ff00";
      } else if (elapsedTime < 60) {
        timerDiv.style.color = "#ffaa00";
      } else {
        timerDiv.style.color = "#ff0000";
      }
    }
  }

  // Eller animasyonu (Sallanma efekti)
  if (handsGroup) {
    handsGroup.visible = true; // Her zaman görünür olsun
    if (moveState.forward || moveState.backward || moveState.left || moveState.right) {
      const time = Date.now() * 0.005;
      handsGroup.position.y = Math.sin(time) * 0.01;
      handsGroup.position.x = Math.cos(time * 0.5) * 0.005;
    } else {
      const time = Date.now() * 0.001;
      handsGroup.position.y = Math.sin(time) * 0.005;
    }
  }

  renderer.toneMappingExposure = guiObject.value3;
}

// ==================== ODA TURU ====================
let tourOverlay;

function showTourMessage(text, duration = 3000) {
  if (!tourOverlay) {
    tourOverlay = document.createElement("div");
    tourOverlay.style.position = "fixed";
    tourOverlay.style.bottom = "20%";
    tourOverlay.style.left = "50%";
    tourOverlay.style.transform = "translate(-50%, 0)";
    tourOverlay.style.backgroundColor = "rgba(0,0,0,0.8)";
    tourOverlay.style.color = "#00ff00";
    tourOverlay.style.padding = "20px 40px";
    tourOverlay.style.fontSize = "24px";
    tourOverlay.style.fontWeight = "bold";
    tourOverlay.style.borderRadius = "15px";
    tourOverlay.style.border = "2px solid #00ff00";
    tourOverlay.style.textAlign = "center";
    tourOverlay.style.zIndex = "10000";
    tourOverlay.style.transition = "opacity 0.5s";
    tourOverlay.style.pointerEvents = "none";
    document.body.appendChild(tourOverlay);
  }

  tourOverlay.textContent = text;
  tourOverlay.style.opacity = "1";
}

function hideTourMessage() {
  if (tourOverlay) tourOverlay.style.opacity = "0";
}

function tweenCameraLookAt(targetPos, targetLookAt, duration) {
  return new Promise((resolve) => {
    const startPos = camera.position.clone();

    // Mevcut bakış yönünü bul
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    const startLookAt = startPos.clone().add(forward.multiplyScalar(2)); // 2m ileriye bakıyor varsayalım

    const startTime = Date.now();

    function update() {
      const now = Date.now();
      let progress = (now - startTime) / duration;
      if (progress > 1) progress = 1;

      // Ease in out quadratic
      const ease =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Pozisyon enterpolasyonu
      camera.position.lerpVectors(startPos, targetPos, ease);

      // Bakış enterpolasyonu
      const currentLook = new THREE.Vector3().lerpVectors(
        startLookAt,
        targetLookAt,
        ease
      );
      camera.lookAt(currentLook);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        resolve();
      }
    }
    update();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRoomTour() {
  console.log("🎬 Otomatik oda turu başlıyor...");

  // Kontrolleri kapalı tut
  if (controls) controls.unlock();

  const initialPos = new THREE.Vector3(0, 1.6, 2.0); // Başlangıç
  const centerPos = new THREE.Vector3(0, 1.6, 0.5); // Merkeze yakın

  const targets = [
    {
      // 1. Gas Leak Source
      pos: centerPos,
      look: new THREE.Vector3(0.7, 0.5, -1.5),
      text: "💨 Gas leak starts here, check connections.",
      wait: 2000,
    },
    {
      // 2. Emergency Alarm
      pos: centerPos,
      look: new THREE.Vector3(-2.4, 1.2, 1.8),
      text: "🚨 Emergency Alarm here. Use it to report leaks.",
      wait: 2500,
    },
    {
      // 3. Ventilation Fan
      pos: centerPos,
      look: new THREE.Vector3(1.5, 2.2, 2.5),
      text: "💨 Turn on the fan to ventilate gas.",
      wait: 2500,
    },
    {
      // 4. Exit and Windows
      pos: new THREE.Vector3(0, 1.6, 0),
      look: new THREE.Vector3(0, 1.5, 3.0),
      text: "🚪 Open doors and windows to increase airflow.",
      wait: 2000,
    },
  ];

  for (const target of targets) {
    showTourMessage(target.text);
    await tweenCameraLookAt(target.pos, target.look, 1500); // 1.5 sn hareket
    await sleep(target.wait); // Bekle
  }

  // Başa dön
  hideTourMessage();
  showTourMessage("✅ Simülasyon Başlıyor! Hazır olun...", 2000);

  // Başlangıç pozisyonuna dön
  await tweenCameraLookAt(initialPos, new THREE.Vector3(0, 1.6, -2.0), 1500);

  await sleep(1000);
  hideTourMessage();

  // Başla butonunu göster
  const startBtn = document.getElementById("startScenarioBtn");
  if (startBtn) {
    startBtn.style.display = "block";

    // Butonu vurgula
    startBtn.style.transform = "translate(-50%, -50%) scale(1.1)";
    startBtn.style.transition = "transform 0.5s";
    setTimeout(() => {
      startBtn.style.transform = "translate(-50%, -50%) scale(1.0)";
    }, 500);
  }
}

// Senaryo başlatıcı
function startScenario() {
  // Başlat butonunu hemen gizle
  const startBtn = document.getElementById("startScenarioBtn");
  if (startBtn) {
    startBtn.style.display = "none";
  }

  // Senaryo talimat penceresini otomatik kapat
  const instructionsDiv = document.getElementById("instructions");
  if (instructionsDiv && !instructionsDiv.classList.contains("collapsed")) {
    instructionsDiv.classList.add("collapsed");
  }

  // Gaz durumu penceresinde uyarı göster
  const statusDiv = document.getElementById("gasStatus");
  if (statusDiv) {
    statusDiv.textContent = "🚪 Entering the office...";
    statusDiv.style.color = "#ffffff";
    statusDiv.style.borderColor = "#ffffff";
  }

  setTimeout(() => {
    if (statusDiv) {
      statusDiv.textContent =
        "⚠️ GAS LEAK DETECTED! Ventilate and Evacuate!";
      statusDiv.style.color = "#ffaa00";
      statusDiv.style.borderColor = "#ffaa00";
      statusDiv.style.animation = "pulse 0.5s infinite";
    }

    startGasLeak();

    // Zamanlayıcıyı ve yeni arayüzleri göster
    const timerDiv = document.getElementById("timer");
    if (timerDiv) timerDiv.style.display = "block";

    const gasContainer = document.getElementById("gasLevelContainer");
    if (gasContainer) gasContainer.style.display = "block";

    const detectorContainer = document.getElementById("detectorContainer");
    if (detectorContainer) detectorContainer.style.display = "block";

    // İmleci kilitle ve nişangahı göster
    if (controls && !controls.isLocked) {
      controls.lock();
    }

    const crosshair = document.getElementById("crosshair");
    if (crosshair) {
      crosshair.style.display = "block";
    }
  }, 2000);
}

// Global fonksiyonları export et
window.gasSimulation = {
  startScenario: startScenario,
  startGasLeak: startGasLeak,
  runRoomTour: runRoomTour,
};

// Sayfa yüklendiğinde Kontrol Bilgilendirme Ekranını göster
window.addEventListener("load", () => {
  setTimeout(() => {
    // Kontrolleri serbest bırak (Mouse görünsün)
    if (controls) controls.unlock();

    // Önce Kullanım Kılavuzu Ekranını Göster
    const controlsIntro = document.getElementById("controls-intro");
    if (controlsIntro) {
      controlsIntro.style.display = "block";
    }
  }, 1000);
});

// Etkileşim kontrolü (her karede çalışır)
function updateInteraction() {
  if (!controls.isLocked) {
    if (interactionHintDiv) interactionHintDiv.style.display = 'none';
    return;
  }

  const raycaster = new THREE.Raycaster();
  // Ekranın tam ortasından ray at
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  let foundInteractable = null;
  let hintText = "";

  // 1. Sahne objelerini kontrol et
  if (room) {
    const intersects = raycaster.intersectObjects(room.children, true);
    if (intersects.length > 0) {
      const object = intersects[0].object;

      // Mesafe kontrolü
      if (intersects[0].distance < 3.0) { // 3 metre etkileşim mesafesi
        if (object.name === "Door") {
          foundInteractable = object;
          const actionText = window.isDoorOpen ? "CLOSE" : "OPEN";
          hintText = `PRESS [E] TO ${actionText} DOOR`;
        } else if (object.name === "Fan") {
          foundInteractable = object;
          hintText = `PRESS [E] TO START/STOP FAN`;
        } else if (object.name === "Window") {
          foundInteractable = object;
          hintText = `PRESS [E] TO OPEN/CLOSE WINDOW`;
        } else if (object.name === "alarmBox") {
          foundInteractable = object;
          hintText = `PRESS [E] TO ACTIVATE EMERGENCY ALARM`;
        }
      }
    }
  }

  // Durumu güncelle
  currentInteractable = foundInteractable;

  // UI Güncelleme
  // Hint div'i henüz oluşturulmadıysa oluştur
  if (!interactionHintDiv) {
    interactionHintDiv = document.createElement('div');
    interactionHintDiv.style.position = 'fixed';
    interactionHintDiv.style.top = '55%'; // Ortadan biraz aşağıda
    interactionHintDiv.style.left = '50%';
    interactionHintDiv.style.transform = 'translate(-50%, -50%)';
    interactionHintDiv.style.color = '#ffffff';
    interactionHintDiv.style.fontFamily = 'Arial, sans-serif';
    interactionHintDiv.style.fontSize = '18px';
    interactionHintDiv.style.fontWeight = 'bold';
    interactionHintDiv.style.textShadow = '0px 0px 5px #000000';
    interactionHintDiv.style.pointerEvents = 'none';
    interactionHintDiv.style.display = 'none';
    interactionHintDiv.style.zIndex = '1000';
    document.body.appendChild(interactionHintDiv);
  }

  if (currentInteractable) {
    interactionHintDiv.textContent = hintText;
    interactionHintDiv.style.display = 'block';
    const crosshair = document.getElementById("crosshair");
    if (crosshair) crosshair.style.backgroundColor = "rgba(255, 255, 0, 0.9)";
  } else {
    interactionHintDiv.style.display = 'none';
    const crosshair = document.getElementById("crosshair");
    if (crosshair) crosshair.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  }
}
