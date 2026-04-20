import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// --- CONFIGURACIÓN PRINCIPAL ---
const container = document.getElementById('game-container');
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 2);

// --- ILUMINACIÓN ---
new RGBELoader()
    .setPath('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/equirectangular/')
    .load('royal_esplanade_1k.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = new THREE.Color(0xefefef);
    });

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.5);
sunLight.position.set(-15, 8, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 50;
sunLight.shadow.camera.left = -15;
sunLight.shadow.camera.right = 15;
sunLight.shadow.camera.top = 15;
sunLight.shadow.camera.bottom = -15;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const fillLight = new THREE.PointLight(0xffeedd, 0.5, 15); // Intensidad reducida, la lámpara central ilumina ahora
fillLight.position.set(0, 3.5, 0);
fillLight.castShadow = true;
scene.add(fillLight);


// --- TEXTURAS Y MATERIALES ---
const texLoader = new THREE.TextureLoader();

const texWoodColor = texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_diffuse.jpg');
const texWoodBump = texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_bump.jpg');
const texWoodRoughness = texLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_roughness.jpg');
[texWoodColor, texWoodBump, texWoodRoughness].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
});

// Generador de Relieve Procedural (Para tela y paredes)
function createNoiseMap(size, scale) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgb(128,128,128)'; ctx.fillRect(0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * scale;
        imgData.data[i] = Math.min(255, Math.max(0, 128 + noise));
        imgData.data[i + 1] = Math.min(255, Math.max(0, 128 + noise));
        imgData.data[i + 2] = Math.min(255, Math.max(0, 128 + noise));
        imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

const fabricBump = createNoiseMap(512, 40);
fabricBump.repeat.set(10, 10);
const wallBump = createNoiseMap(512, 15);
wallBump.repeat.set(8, 8);

const texWindowsXP = texLoader.load('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=100&w=2048');

const floorMat = new THREE.MeshStandardMaterial({ map: texWoodColor, bumpMap: texWoodBump, bumpScale: 0.01, roughnessMap: texWoodRoughness, metalness: 0.1, envMapIntensity: 0.8 });
const marbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.5 });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.9, envMapIntensity: 1.0 });
const silverMetalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.8, envMapIntensity: 1.2 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.05, transmission: 0.9, ior: 1.5, thickness: 0.5, envMapIntensity: 2.0 });

// Materiales Mejorados (Paredes realistas y Tela Azul Marino)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.95, bumpMap: wallBump, bumpScale: 0.008 }); // Gris para las paredes
const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.95, bumpMap: wallBump, bumpScale: 0.002 }); // Gris claro para el techo
const fabricMat = new THREE.MeshStandardMaterial({ color: 0x224455, roughness: 0.9, bumpMap: fabricBump, bumpScale: 0.015 });


// --- ARQUITECTURA ---
const interactables = [];
const obstacles = [];

const roomW = 16;
const roomD = 16;
const wallH = 4.0;

const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilingMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = wallH;
scene.add(ceiling);

const wallN = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.4), wallMat);
wallN.position.set(0, wallH / 2, -roomD / 2);
wallN.receiveShadow = true; wallN.castShadow = true;
scene.add(wallN);

const wallS = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, 0.4), wallMat);
wallS.position.set(0, wallH / 2, roomD / 2);
wallS.receiveShadow = true; wallS.castShadow = true;
scene.add(wallS);

const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallH, roomD), wallMat);
wallE.position.set(roomW / 2, wallH / 2, 0);
wallE.receiveShadow = true; wallE.castShadow = true;
scene.add(wallE);

const wallW_bottom = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, roomD), wallMat);
wallW_bottom.position.set(-roomW / 2, 0.3, 0);
scene.add(wallW_bottom);

const wallW_top = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, roomD), wallMat);
wallW_top.position.set(-roomW / 2, wallH - 0.3, 0);
scene.add(wallW_top);

const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, wallH - 1.2, roomD), glassMat);
windowGlass.position.set(-roomW / 2, wallH / 2, 0);
scene.add(windowGlass);

const exteriorXP = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), new THREE.MeshBasicMaterial({ map: texWindowsXP }));
exteriorXP.rotation.y = Math.PI / 2;
exteriorXP.position.set(-8.5, 4.0, 0);
scene.add(exteriorXP);

const windowFrameGeo = new THREE.BoxGeometry(0.5, wallH - 1.2, 0.2);
for (let z of [-8, -4, 0, 4, 8]) {
    let frame = new THREE.Mesh(windowFrameGeo, darkMetalMat);
    frame.position.set(-roomW / 2, wallH / 2, z);
    scene.add(frame);
}

// --- DECORACIÓN ARQUITECTÓNICA (Molduras y Lámpara de Techo) ---
const baseboardGeo = new THREE.BoxGeometry(roomW, 0.2, 0.05);
const baseboardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

const bbN = new THREE.Mesh(baseboardGeo, baseboardMat); bbN.position.set(0, 0.1, -roomD / 2 + 0.2); scene.add(bbN);
const bbS = new THREE.Mesh(baseboardGeo, baseboardMat); bbS.position.set(0, 0.1, roomD / 2 - 0.2); scene.add(bbS);
const bbE = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, roomD), baseboardMat); bbE.position.set(roomW / 2 - 0.2, 0.1, 0); scene.add(bbE);
const bbW = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, roomD), baseboardMat); bbW.position.set(-roomW / 2 + 0.2, 0.1, 0); scene.add(bbW);

const moldingGeo = new THREE.BoxGeometry(roomW, 0.15, 0.15);
const moldN = new THREE.Mesh(moldingGeo, baseboardMat); moldN.position.set(0, wallH - 0.075, -roomD / 2 + 0.2); scene.add(moldN);
const moldS = new THREE.Mesh(moldingGeo, baseboardMat); moldS.position.set(0, wallH - 0.075, roomD / 2 - 0.2); scene.add(moldS);
const moldE = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, roomD), baseboardMat); moldE.position.set(roomW / 2 - 0.2, wallH - 0.075, 0); scene.add(moldE);

// Lámpara de Techo Moderna
const chandelier = new THREE.Group();
chandelier.position.set(0, wallH, 0);
scene.add(chandelier);
const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 32), darkMetalMat);
cBase.position.y = -0.05; chandelier.add(cBase);
const cPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 16), darkMetalMat);
cPole.position.y = -0.5; chandelier.add(cPole);
const cRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 16, 64), silverMetalMat);
cRing.rotation.x = Math.PI / 2; cRing.position.y = -1.0; chandelier.add(cRing);
const cLight = new THREE.PointLight(0xffffee, 1.5, 20);
cLight.position.y = -1.0; cLight.castShadow = true; chandelier.add(cLight);


// --- ZONA DE TV ---
const tvGroup = new THREE.Group();
tvGroup.position.set(0, 0, -7);
scene.add(tvGroup);

const tvBackdrop = new THREE.Mesh(new THREE.BoxGeometry(6.0, wallH, 0.2), new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 }));
tvBackdrop.position.set(0, wallH / 2, -0.2);
tvBackdrop.castShadow = true; tvBackdrop.receiveShadow = true;
tvGroup.add(tvBackdrop);

const consoleMesh = new THREE.Mesh(new RoundedBoxGeometry(5.0, 0.4, 0.8, 4, 0.05), new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.2, metalness: 0.1 }));
consoleMesh.position.set(0, 0.6, 0.2);
consoleMesh.castShadow = true; consoleMesh.receiveShadow = true;
tvGroup.add(consoleMesh);

// Patas del mueble de TV
const tLegGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.4, 16);
const cLeg1 = new THREE.Mesh(tLegGeo, darkMetalMat); cLeg1.position.set(-2.3, 0.2, 0.4); cLeg1.castShadow = true; tvGroup.add(cLeg1);
const cLeg2 = new THREE.Mesh(tLegGeo, darkMetalMat); cLeg2.position.set(2.3, 0.2, 0.4); cLeg2.castShadow = true; tvGroup.add(cLeg2);
const cLeg3 = new THREE.Mesh(tLegGeo, darkMetalMat); cLeg3.position.set(-2.3, 0.2, -0.1); cLeg3.castShadow = true; tvGroup.add(cLeg3);
const cLeg4 = new THREE.Mesh(tLegGeo, darkMetalMat); cLeg4.position.set(2.3, 0.2, -0.1); cLeg4.castShadow = true; tvGroup.add(cLeg4);

const tvMesh = new THREE.Mesh(new RoundedBoxGeometry(3.8, 2.2, 0.15, 4, 0.02), silverMetalMat);
tvMesh.position.set(0, 2.3, 0.1);
tvMesh.castShadow = true;
tvGroup.add(tvMesh);

const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.0), new THREE.MeshBasicMaterial({ color: 0x020202 }));
tvScreen.position.set(0, 2.3, 0.18);
tvGroup.add(tvScreen);

function createPlant(x, z) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pot.position.set(x, 0.9, z);
    pot.castShadow = true;
    tvGroup.add(pot);

    for (let i = 0; i < 6; i++) {
        let leaf = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.6 }));
        leaf.position.set(x + (Math.random() - 0.5) * 0.1, 1.05, z + (Math.random() - 0.5) * 0.1);
        leaf.rotation.x = (Math.random() - 0.5) * 0.8;
        leaf.rotation.z = (Math.random() - 0.5) * 0.8;
        leaf.castShadow = true;
        tvGroup.add(leaf);
    }
}
createPlant(-1.8, 0.3);
createPlant(1.8, 0.3);

const tvHitbox = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.5, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
tvHitbox.position.set(0, 2.3, 0.5);
tvGroup.add(tvHitbox); // Añadido al grupo de TV para que herede la posición Z = -7 de la pared
tvHitbox.userData = { type: 'tv', ref: tvMesh };
interactables.push(tvHitbox);


// --- ZONA CENTRAL ---
const rugGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.02, 64);
const rug = new THREE.Mesh(rugGeo, new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0 }));
rug.position.set(0, 0.01, 1.0);
rug.receiveShadow = true;
scene.add(rug);

const tableGroup = new THREE.Group();
tableGroup.position.set(1.5, 0, -1.5); // Movida para no chocar con el sofá
scene.add(tableGroup);

const t1Top = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.05, 64), marbleMat);
t1Top.position.set(-0.5, 0.5, 0);
t1Top.castShadow = true; t1Top.receiveShadow = true;
tableGroup.add(t1Top);

const t1Leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 16), darkMetalMat);
t1Leg1.position.set(-0.5 - 0.8, 0.25, 0); t1Leg1.castShadow = true; tableGroup.add(t1Leg1);
const t1Leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 16), darkMetalMat);
t1Leg2.position.set(-0.5 + 0.4, 0.25, 0.7); t1Leg2.castShadow = true; tableGroup.add(t1Leg2);
const t1Leg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 16), darkMetalMat);
t1Leg3.position.set(-0.5 + 0.4, 0.25, -0.7); t1Leg3.castShadow = true; tableGroup.add(t1Leg3);

const t2Top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 64), marbleMat);
t2Top.position.set(0.8, 0.35, 0.8);
t2Top.castShadow = true; t2Top.receiveShadow = true;
tableGroup.add(t2Top);

const t2Leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 32), darkMetalMat);
t2Leg.position.set(0.8, 0.175, 0.8);
t2Leg.castShadow = true;
tableGroup.add(t2Leg);

// --- SOFÁ ---
const sofaGroup = new THREE.Group();
sofaGroup.position.set(0, 0.15, 4); // Sofá más abajo para que no flote
scene.add(sofaGroup);

// Patas del sofá
const sLegGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.15, 16);
const sLegsPos = [
    [-2.8, -0.8], [2.8, -0.8], [-2.8, 0.8], [2.8, 0.8], [0, -0.8], [0, 0.8], // sBase legs
    [-2.8, -3.8], [-1.2, -3.8] // sChais front legs
];
for(let p of sLegsPos) {
    let leg = new THREE.Mesh(sLegGeo, darkMetalMat);
    leg.position.set(p[0], -0.075, p[1]); // Posición en negativo para que bajen de la base y toquen el suelo
    leg.castShadow = true;
    sofaGroup.add(leg);
}

const sofaHitbox = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.5, 2.0), new THREE.MeshBasicMaterial({ visible: false }));
sofaHitbox.position.copy(sofaGroup.position);
scene.add(sofaHitbox);
sofaHitbox.userData = { type: 'sofa' };
interactables.push(sofaHitbox);

const sBaseGeo = new RoundedBoxGeometry(6.0, 0.4, 2.0, 4, 0.1);
const sBase = new THREE.Mesh(sBaseGeo, fabricMat);
sBase.position.set(0, 0.2, 0);
sBase.castShadow = true; sBase.receiveShadow = true;
sofaGroup.add(sBase);

const sChaisGeo = new RoundedBoxGeometry(2.0, 0.4, 3.0, 4, 0.1);
const sChais = new THREE.Mesh(sChaisGeo, fabricMat);
sChais.position.set(-2.0, 0.2, -2.5);
sChais.castShadow = true; sChais.receiveShadow = true;
sofaGroup.add(sChais);

const sBackGeo = new RoundedBoxGeometry(6.0, 0.6, 0.4, 4, 0.1);
const sBack = new THREE.Mesh(sBackGeo, fabricMat);
sBack.position.set(0, 0.7, 0.8);
sBack.castShadow = true; sBack.receiveShadow = true;
sofaGroup.add(sBack);

const sChaisBackGeo = new RoundedBoxGeometry(0.4, 0.6, 3.0, 4, 0.1);
const sChaisBack = new THREE.Mesh(sChaisBackGeo, fabricMat);
sChaisBack.position.set(-2.8, 0.7, -2.5);
sChaisBack.castShadow = true; sChaisBack.receiveShadow = true;
sofaGroup.add(sChaisBack);

const cushionGeo = new RoundedBoxGeometry(1.2, 0.5, 1.2, 4, 0.15);
for (let i = 0; i < 4; i++) {
    let cushion = new THREE.Mesh(cushionGeo, fabricMat);
    cushion.position.set(-1.5 + i * 1.2, 0.5, 0);
    cushion.castShadow = true; cushion.receiveShadow = true;
    sofaGroup.add(cushion);
}
const cushionGeo2 = new RoundedBoxGeometry(1.2, 0.5, 2.5, 4, 0.15);
let cushion2 = new THREE.Mesh(cushionGeo2, fabricMat);
cushion2.position.set(-2.0, 0.5, -2.0);
cushion2.castShadow = true; cushion2.receiveShadow = true;
sofaGroup.add(cushion2);


// --- DINOSAURIO Y VHS ---
const dinoGroup = new THREE.Group();
// Mover a la mesa 1 (Absolute: x=1.5 - 0.5 = 1.0, z=-1.5)
dinoGroup.position.set(1.0, 0.52, -1.5); 
scene.add(dinoGroup);

// Materiales idénticos a la foto del peluche
const dinoGreen = new THREE.MeshStandardMaterial({ color: 0x98d498, roughness: 0.9 });
const dinoBelly = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
const dinoPink = new THREE.MeshStandardMaterial({ color: 0xff9999, roughness: 0.9 });
const dinoBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
const hatColor = new THREE.MeshStandardMaterial({ color: 0xaa77ff, roughness: 0.7 });
const hairColor = new THREE.MeshStandardMaterial({ color: 0x663311, roughness: 0.9 });

const bodyGeo = new THREE.SphereGeometry(0.15, 32, 32);
const dBody = new THREE.Mesh(bodyGeo, dinoGreen);
dBody.scale.set(1, 1.2, 1); dBody.position.y = 0.15; dBody.castShadow = true;
dinoGroup.add(dBody);

const bellyGeo = new THREE.SphereGeometry(0.12, 32, 32);
const dBelly = new THREE.Mesh(bellyGeo, dinoBelly);
dBelly.scale.set(1, 1.1, 0.5); dBelly.position.set(0, 0.12, 0.11);
dinoGroup.add(dBelly);

const headGeo = new THREE.SphereGeometry(0.14, 32, 32);
const dHead = new THREE.Mesh(headGeo, dinoGreen);
dHead.scale.set(1, 0.9, 1); dHead.position.set(0, 0.35, 0.02); dHead.castShadow = true;
dinoGroup.add(dHead);

const eyeGeo = new THREE.SphereGeometry(0.015, 16, 16);
const eyeL = new THREE.Mesh(eyeGeo, dinoBlack); eyeL.position.set(-0.05, 0.36, 0.15); dinoGroup.add(eyeL);
const eyeR = new THREE.Mesh(eyeGeo, dinoBlack); eyeR.position.set(0.05, 0.36, 0.15); dinoGroup.add(eyeR);

const blushGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.01, 16);
const blushL = new THREE.Mesh(blushGeo, dinoPink); blushL.rotation.x = Math.PI / 2; blushL.position.set(-0.08, 0.33, 0.14); dinoGroup.add(blushL);
const blushR = new THREE.Mesh(blushGeo, dinoPink); blushR.rotation.x = Math.PI / 2; blushR.position.set(0.08, 0.33, 0.14); dinoGroup.add(blushR);

const armGeo = new THREE.CapsuleGeometry(0.03, 0.06, 8, 16);
const armL = new THREE.Mesh(armGeo, dinoGreen); armL.position.set(-0.13, 0.15, 0.08); armL.rotation.set(Math.PI / 4, 0, Math.PI / 4); dinoGroup.add(armL);
const armR = new THREE.Mesh(armGeo, dinoGreen); armR.position.set(0.13, 0.15, 0.08); armR.rotation.set(Math.PI / 4, 0, -Math.PI / 4); dinoGroup.add(armR);

const legGeo = new THREE.CapsuleGeometry(0.04, 0.04, 8, 16);
const legL = new THREE.Mesh(legGeo, dinoGreen); legL.position.set(-0.08, 0.04, 0.08); legL.rotation.x = Math.PI / 2; dinoGroup.add(legL);
const legR = new THREE.Mesh(legGeo, dinoGreen); legR.position.set(0.08, 0.04, 0.08); legR.rotation.x = Math.PI / 2; dinoGroup.add(legR);

// Cola notablemente más grande
const tailGeo = new THREE.ConeGeometry(0.12, 0.3, 16);
const dTail = new THREE.Mesh(tailGeo, dinoGreen);
dTail.position.set(0, 0.08, -0.16);
dTail.rotation.x = -Math.PI / 2.5;
dinoGroup.add(dTail);

// Escamas de colores redondeadas fijadas al cuerpo
const scaleColors = [0xff99cc, 0xffff66, 0xcc99ff, 0x660099]; 
const scalePos = [
    {y: 0.38, z: -0.13, rx: -Math.PI/6}, // Cabeza
    {y: 0.28, z: -0.16, rx: -Math.PI/4}, // Cuello
    {y: 0.16, z: -0.18, rx: -Math.PI/3}, // Espalda media
    {y: 0.06, z: -0.16, rx: -Math.PI/2}  // Espalda baja
];
for(let i=0; i<4; i++) {
    let scale = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), new THREE.MeshStandardMaterial({color: scaleColors[i], roughness: 0.5}));
    scale.scale.set(1, 1, 0.5); 
    scale.position.set(0, scalePos[i].y, scalePos[i].z);
    scale.rotation.x = scalePos[i].rx;
    dinoGroup.add(scale);
}

// Hitbox interactuable para el dinosaurio
const dinoHitbox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
dinoHitbox.position.copy(dinoGroup.position);
scene.add(dinoHitbox);
dinoHitbox.userData = { type: 'dino', ref: dBody };
interactables.push(dinoHitbox);

const hatGeo = new THREE.ConeGeometry(0.06, 0.15, 16);
const dHat = new THREE.Mesh(hatGeo, hatColor); dHat.position.set(0, 0.52, 0.02); dHat.rotation.x = -0.1; dinoGroup.add(dHat);

const hairGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.06, 8);
for (let i = 0; i < 5; i++) {
    let hair = new THREE.Mesh(hairGeo, hairColor);
    hair.position.set(0, 0.6, 0.02);
    hair.rotation.set((Math.random() - 0.5) * 1, 0, (Math.random() - 0.5) * 1);
    dinoGroup.add(hair);
}

const vhsGroup = new THREE.Group();
// Mover a la mesa 1 junto al dino
vhsGroup.position.set(0.6, 0.55, -1.3);
scene.add(vhsGroup);

// Forma realista de VHS
const vhsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.187, 0.025, 0.103), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7 }));
vhsMesh.castShadow = true;
vhsGroup.add(vhsMesh);

const vhsLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07), new THREE.MeshBasicMaterial({ color: 0xeeeeee }));
vhsLabel.rotation.x = -Math.PI / 2;
vhsLabel.position.y = 0.013;
vhsGroup.add(vhsLabel);

const vhsWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.04), new THREE.MeshBasicMaterial({ color: 0x050505 }));
vhsWindow.rotation.x = -Math.PI / 2;
vhsWindow.position.set(0, 0.014, -0.01);
vhsGroup.add(vhsWindow);

const vhsHitbox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
vhsHitbox.position.copy(vhsGroup.position);
scene.add(vhsHitbox);
vhsHitbox.userData = { type: 'vhs', ref: vhsMesh };
interactables.push(vhsHitbox);

// --- RADIO ---
const radioGroup = new THREE.Group();
radioGroup.position.set(1.4, 0.6, -1.2); // En la mesa, cerca del dino
scene.add(radioGroup);

const rGeo = new RoundedBoxGeometry(0.3, 0.2, 0.15, 4, 0.04);
const rMat = new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.9 }); // Madera retro
const radioMesh = new THREE.Mesh(rGeo, rMat);
radioMesh.castShadow = true; radioGroup.add(radioMesh);

const rSpeaker = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0x222222 }));
rSpeaker.rotation.x = Math.PI / 2; rSpeaker.position.set(-0.06, 0, 0.076); radioGroup.add(rSpeaker);

const rDial = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
rDial.rotation.x = Math.PI / 2; rDial.position.set(0.08, 0, 0.076); radioGroup.add(rDial);

const rAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3), silverMetalMat);
rAntenna.position.set(-0.1, 0.15, -0.05); rAntenna.rotation.z = -0.3; radioGroup.add(rAntenna);

// Configuración de Audio de la Radio (Autoplay)
const listener = new THREE.AudioListener();
camera.add(listener);
const radioAudio = new THREE.PositionalAudio(listener);
const audioLoader = new THREE.AudioLoader();

// Nuevos Efectos de Sonido
const grabAudio = new THREE.Audio(listener);
const insertAudio = new THREE.Audio(listener);
const tapeAudio = new THREE.Audio(listener);
const loadedAudio = new THREE.Audio(listener);

audioLoader.load('assets/agarrar.wav', (buffer) => {
    grabAudio.setBuffer(buffer);
    grabAudio.setVolume(1.0);
}, undefined, () => { console.log('Falta agregar agarrar.wav'); });

audioLoader.load('assets/insertar.wav', (buffer) => {
    insertAudio.setBuffer(buffer);
    insertAudio.setVolume(1.0);
}, undefined, () => { console.log('Falta agregar insertar.wav'); });

audioLoader.load('assets/ruido_cinta.wav', (buffer) => {
    tapeAudio.setBuffer(buffer);
    tapeAudio.setVolume(0.5);
    tapeAudio.setLoop(true); // Ruido constante de cinta rodando
}, undefined, () => { console.log('Falta agregar ruido_cinta.wav'); });

audioLoader.load('assets/cargado.wav', (buffer) => {
    loadedAudio.setBuffer(buffer);
    loadedAudio.setVolume(1.0);
}, undefined, () => { console.log('Falta agregar cargado.wav'); });

const vhsAudio = new THREE.Audio(listener);
audioLoader.load('assets/the_craving.mp3', (buffer) => {
    vhsAudio.setBuffer(buffer);
    vhsAudio.setVolume(1.0);
}, undefined, () => { console.log('Falta agregar the_craving.mp3'); });

const instrumentalAudio = new THREE.Audio(listener);
audioLoader.load('assets/instrumental.mp3', (buffer) => {
    instrumentalAudio.setBuffer(buffer);
    instrumentalAudio.setVolume(1.0);
}, undefined, () => { console.log('Falta agregar instrumental.mp3'); });

// Letra de The Craving (Jenna's version) - Twenty One Pilots (Traducida al español)
const cravingSubtitles = [
    { time: 14.62, text: "Parece que me interpongo en mi propio camino" },
    { time: 17.43, text: "Mientras más pienso, menos digo" },
    { time: 20.42, text: "Espero poder comunicar este anhelo" },
    { time: 26.41, text: "Ahora veo que las intenciones no significan mucho" },
    { time: 32.59, text: "Di lo suficiente, di lo suficiente" },
    { time: 34.81, text: "¿Se lo hice saber, se lo hice saber?" },
    { time: 37.93, text: "Si encontrara mi cuerpo encadenado" },
    { time: 42.27, text: "Me recostaría a esperar" },
    { time: 45.95, text: "Y esperaría que ella me busque" },
    { time: 49.80, text: "" },
    { time: 52.02, text: "Y esperaría que ella me busque" },
    { time: 57.35, text: "" },
    { time: 59.72, text: "Ella solo quiere atrapar una ola" },
    { time: 62.58, text: "Montarla hasta el fin de sus días" },
    { time: 65.29, text: "Espero poder saciar este anhelo" },
    { time: 71.50, text: "Ahora veo que un gesto no significa mucho" },
    { time: 77.54, text: "Di lo suficiente, di lo suficiente" },
    { time: 79.86, text: "¿Se lo hice saber, se lo hice saber?" },
    { time: 82.86, text: "Si encontrara mi cuerpo encadenado" },
    { time: 87.59, text: "Me recostaría a esperar" },
    { time: 90.92, text: "Y esperaría que ella me busque" },
    { time: 97.08, text: "Y esperaría que ella me busque" },
    { time: 101.68, text: "(Ooh-ooh-ooh-ooh-ooh)" },
    { time: 105.92, text: "" },
    { time: 122.86, text: "Di lo suficiente, di lo suficiente" },
    { time: 125.13, text: "¿Se lo hice saber, se lo hice saber?" },
    { time: 128.03, text: "Si encontrara mi cuerpo encadenado" },
    { time: 132.54, text: "Me recostaría a esperar" },
    { time: 135.18, text: "Porque es el miedo a lo desconocido" },
    { time: 138.05, text: "Lo que paraliza cada paso que damos" },
    { time: 141.29, text: "Y odio tener que ponerle este peso" },
    { time: 144.68, text: "Pero juro que daré más de lo que quito" },
    { time: 155.24, text: "" },
    { time: 161.53, text: "El anhelo..." },
    { time: 164.96, text: "Ahora veo que las intenciones no significan mucho" },
    { time: 168.28, text: "" }
];

// Canción Formidable
// (NOTA: No se puede reproducir un link de YouTube directo aquí por bloqueos de seguridad del navegador. 
// Para que suene Formidable, descarga el MP3, guárdalo en esta carpeta y cambia la URL de abajo por 'formidable.mp3')
audioLoader.load('assets/formidable.mp3', (buffer) => {
    radioAudio.setBuffer(buffer);
    radioAudio.setRefDistance(2);
    radioAudio.setVolume(0.2); // Tono bajo
    radioAudio.setLoop(true);

    // Efecto de radio antigua (Filtro pasa-banda)
    const filter = radioAudio.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1.0;
    radioAudio.setFilter(filter);
});
radioGroup.add(radioAudio);

// Audio del Dinosaurio ("Te amo")
// (NOTA: Como tu PC usó una voz gruesa, he cambiado esto para usar un archivo de audio real.
// Descarga un efecto de voz tierna, llámalo 'te_amo.mp3' y reemplaza la URL de abajo)
const dinoAudio = new THREE.PositionalAudio(listener);
audioLoader.load('assets/te_amo.mp3', (buffer) => {
    dinoAudio.setBuffer(buffer);
    dinoAudio.setRefDistance(2);
    dinoAudio.setVolume(1.0);
});
dinoHitbox.add(dinoAudio);
dinoHitbox.userData.audio = dinoAudio;

// Letra de Formidable en Español con tiempos perfectos (LRC)
// Si el audio que descargaste de YouTube tiene una intro más larga que la canción original, 
// puedes ajustar este número (ej: 4.5) para retrasar los subtítulos.
const LYRIC_OFFSET = 0; 

const songSubtitles = [
    { time: 0, text: "" },
    { time: 17.70, text: "Eres formidable para mí" },
    { time: 21.26, text: "Porque pareces saber a dónde quieres ir" },
    { time: 25.00, text: "Sí, sí, sí, te seguiré" },
    { time: 30.09, text: "Pero debes saber que podría ser cínico hacia ti" },
    { time: 35.57, text: "Pero simplemente no puedo creer que sea para ti" },
    { time: 39.19, text: "Sí, sí, sí, puedo morir contigo" },
    { time: 44.08, text: "Solo dímelo" },
    { time: 48.00, text: "" }, // Pausa instrumental
    { time: 51.93, text: "Y sé que apenas nos conocemos" },
    { time: 55.42, text: "¿Pero podrías llevarme a todos los lugares donde has estado?" },
    { time: 59.27, text: "Quiero verlo todo, sin sorpresas" },
    { time: 64.00, text: "" }, // Pausa instrumental
    { time: 66.97, text: "Eres formidable para mí" },
    { time: 70.44, text: "Porque pareces saber a dónde quieres ir" },
    { time: 74.17, text: "Sí, sí, sí, te seguiré" },
    { time: 79.22, text: "Pero debes saber que podría ser clínico, no lo digas" },
    { time: 84.27, text: "No te romperé el corazón si puedes romper mi hechizo" },
    { time: 88.48, text: "Sí, sí, sí, puedo morir contigo" },
    { time: 93.46, text: "Solo dímelo" },
    { time: 95.00, text: "" }, // Pausa instrumental
    { time: 96.36, text: "Adelantemos 13 años en el tiempo" },
    { time: 99.93, text: "No sé qué fue, pero de alguna forma lo vivimos al revés" },
    { time: 104.44, text: "Te tengo miedo ahora, más que al principio" },
    { time: 108.10, text: "Y sé que te acabas de ir, ¿pero puedo llevarte a todos los lugares donde hemos estado?" },
    { time: 115.28, text: "Quiero verlo todo, sin sorpresas" },
    { time: 120.00, text: "" }, // Pausa instrumental
    { time: 123.05, text: "Eres formidable para mí" },
    { time: 126.49, text: "Porque pareces saber a dónde quieres ir" },
    { time: 130.34, text: "Sí, sí, sí, te seguiré" },
    { time: 135.29, text: "Pero debes saber que podría ser cínico hacia ti" },
    { time: 140.62, text: "Solo me preocupa que mi lealtad te aburra" },
    { time: 144.06, text: "Sí, sí, sí, puedo morir contigo" },
    { time: 149.15, text: "Solo dímelo" },
    { time: 151.37, text: "Sí, sí, sí, puedo morir contigo" },
    { time: 156.22, text: "Solo dímelo" },
    { time: 158.00, text: "" } // Fin
];
let radioStartTime = 0;

// Reproducir automáticamente al primer clic (por políticas de navegadores, el audio no puede iniciar sin que el usuario toque la pantalla)
const startRadio = () => {
    if (radioAudio.buffer && !radioAudio.isPlaying && state.objective !== 'done') {
        if (radioAudio.context.state === 'suspended') radioAudio.context.resume();
        radioAudio.play();
        radioStartTime = Date.now();
    }
    document.removeEventListener('click', startRadio);
    document.removeEventListener('touchstart', startRadio);
};
document.addEventListener('click', startRadio);
document.addEventListener('touchstart', startRadio);

const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
arrow.rotation.x = Math.PI;
scene.add(arrow);


// --- DECORACIONES EXTRA (Lámparas, Plantas, Estantería, Reloj) ---
const shelfGroup = new THREE.Group();
shelfGroup.position.set(-7.4, 0, 2);
scene.add(shelfGroup);
const sWoodMat = new THREE.MeshStandardMaterial({color: 0x4a3224, roughness: 0.8});
const pilar1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.8, 0.8), darkMetalMat);
pilar1.position.set(0, 1.4, -1.0); pilar1.castShadow = true; shelfGroup.add(pilar1);
const pilar2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.8, 0.8), darkMetalMat);
pilar2.position.set(0, 1.4, 1.0); pilar2.castShadow = true; shelfGroup.add(pilar2);
for(let i=0; i<5; i++) {
    let repisa = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 2.1), sWoodMat);
    repisa.position.set(0, 0.4 + i*0.55, 0); repisa.castShadow = true; shelfGroup.add(repisa);
}
const bookColors = [0xaa3333, 0x33aa33, 0x3333aa, 0xaaaa33, 0x33aaaa, 0x111111, 0xffffff];
for(let i=0; i<25; i++) {
    let bW = 0.04 + Math.random()*0.04; let bH = 0.2 + Math.random()*0.1; let bD = 0.15 + Math.random()*0.1;
    let book = new THREE.Mesh(new THREE.BoxGeometry(bD, bH, bW), new THREE.MeshStandardMaterial({color: bookColors[Math.floor(Math.random()*bookColors.length)], roughness: 0.6}));
    let level = Math.floor(Math.random()*5); let bZ = -0.9 + Math.random()*1.8;
    book.position.set(0, 0.4 + level*0.55 + bH/2, bZ);
    if(Math.random() > 0.7) book.rotation.x = (Math.random()-0.5)*0.5;
    book.castShadow = true; shelfGroup.add(book);
}
const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.3, 16), new THREE.MeshStandardMaterial({color: 0xeeeeee, roughness: 0.2}));
vase.position.set(0, 0.4 + 4*0.55 + 0.15, -0.6); vase.castShadow = true; shelfGroup.add(vase);
obstacles.push({x: -7.4, z: 2, r: 1.5});

// Reloj de Pared (Movido a la pared derecha)
const clockGroup = new THREE.Group();
clockGroup.position.set(7.8, 2.5, -2); clockGroup.rotation.y = -Math.PI / 2; scene.add(clockGroup);
const cBaseC = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32), new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.2}));
cBaseC.rotation.x = Math.PI / 2; clockGroup.add(cBaseC);
const cFace = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 32), new THREE.MeshBasicMaterial({color: 0xffffff}));
cFace.rotation.x = Math.PI / 2; clockGroup.add(cFace);
const minPivot = new THREE.Group();
const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.01), new THREE.MeshBasicMaterial({color: 0x000000}));
minHand.position.set(0, 0.15, 0.035); minPivot.add(minHand); minPivot.rotation.z = -Math.PI / 4; clockGroup.add(minPivot);
const hourPivot = new THREE.Group();
const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.01), new THREE.MeshBasicMaterial({color: 0x000000}));
hourHand.position.set(0, 0.1, 0.035); hourPivot.add(hourHand); hourPivot.rotation.z = Math.PI / 6; clockGroup.add(hourPivot);

// Aparador (Mueble en la pared derecha para rellenar)
const cabinetGroup = new THREE.Group();
cabinetGroup.position.set(7.2, 0, 2); scene.add(cabinetGroup);
const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 2.0), new THREE.MeshStandardMaterial({color: 0xdddddd, roughness: 0.3}));
cabBody.position.y = 0.4; cabBody.castShadow = true; cabinetGroup.add(cabBody);
const cabTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 2.1), sWoodMat);
cabTop.position.y = 0.825; cabTop.castShadow = true; cabinetGroup.add(cabTop);
const cabVase = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), new THREE.MeshStandardMaterial({color: 0xaa3333}));
cabVase.position.set(0, 1.0, 0); cabVase.castShadow = true; cabinetGroup.add(cabVase);
obstacles.push({x: 7.2, z: 2, r: 1.5});

const tBooksGroup = new THREE.Group();
tBooksGroup.position.set(1.3, 0.525, -1.8); scene.add(tBooksGroup);
const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.4), new THREE.MeshStandardMaterial({color: 0x222222, roughness: 0.4}));
b1.rotation.y = 0.2; b1.castShadow = true; tBooksGroup.add(b1);
const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.38), new THREE.MeshStandardMaterial({color: 0x880000, roughness: 0.5}));
b2.position.set(0, 0.035, 0); b2.rotation.y = -0.1; b2.castShadow = true; tBooksGroup.add(b2);

function createStandingLamp(x, z) {
    const lGroup = new THREE.Group();
    lGroup.position.set(x, 0, z);
    scene.add(lGroup);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), darkMetalMat);
    base.position.y = 0.025; base.castShadow = true; lGroup.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 16), darkMetalMat);
    pole.position.y = 0.9; pole.castShadow = true; lGroup.add(pole);

    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.4, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xffeedd, roughness: 0.9, side: THREE.DoubleSide }));
    shade.position.y = 1.8; lGroup.add(shade);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffee }));
    bulb.position.y = 1.8; lGroup.add(bulb);

    const light = new THREE.PointLight(0xffffee, 0.8, 8);
    light.position.y = 1.8; light.castShadow = true; lGroup.add(light);

    obstacles.push({ x: x, z: z, r: 0.4 });
}
createStandingLamp(6.0, 6.0);
createStandingLamp(-6.0, 6.0);

function createLargePlant(x, z) {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, 0, z);
    scene.add(pGroup);

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.6, 32), new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 1.0 }));
    pot.position.y = 0.3; pot.castShadow = true; pGroup.add(pot);

    for (let i = 0; i < 12; i++) {
        let leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.7 }));
        leaf.position.set((Math.random() - 0.5) * 0.2, 0.9, (Math.random() - 0.5) * 0.2);
        leaf.rotation.x = (Math.random() - 0.5) * 1.0;
        leaf.rotation.z = (Math.random() - 0.5) * 1.0;
        leaf.castShadow = true;
        pGroup.add(leaf);
    }
    obstacles.push({ x: x, z: z, r: 0.5 });
}
createLargePlant(6.5, -6.5);
createLargePlant(-6.5, -6.5); // Nueva planta esquina izquierda

// --- CUADROS (Carga de Imágenes JPG/PNG + Fallback Abstracto) ---
function createPainting(imageUrl, color1, color2, shapeType, x, y, z, rotY, hitX, hitY, hitZ, zoomX, zoomZ) {
    const pMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });

    // Fallback: Generar arte abstracto por si la imagen no existe aún
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 426;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 512, 426);
    grad.addColorStop(0, color1); grad.addColorStop(1, color2);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 426);
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.8; ctx.beginPath();
    if (shapeType === 0) { ctx.arc(256, 213, 100, 0, Math.PI * 2); }
    else if (shapeType === 1) { ctx.fillRect(156, 113, 200, 200); }
    else { ctx.moveTo(256, 100); ctx.lineTo(356, 300); ctx.lineTo(156, 300); }
    ctx.fill(); ctx.globalAlpha = 1.0;
    
    pMat.map = new THREE.CanvasTexture(canvas);

    // Intentar cargar la foto real desde assets/
    if (imageUrl) {
        new THREE.TextureLoader().load(imageUrl, 
            (tex) => { 
                tex.colorSpace = THREE.SRGBColorSpace;
                pMat.map = tex; 
                pMat.needsUpdate = true; 
            },
            undefined,
            (err) => { 
                // No mostramos error fuerte, solo avisamos que usa el fallback
                console.log("Falta agregar la imagen: " + imageUrl); 
            }
        );
    }

    const pGeo = new THREE.PlaneGeometry(1.8, 1.5);
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.set(x, y, z);
    p.rotation.y = rotY;
    scene.add(p);

    const pFrame = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.6, 0.05, 2, 0.01), darkMetalMat);
    pFrame.position.copy(p.position);
    pFrame.rotation.y = rotY;
    pFrame.translateZ(-0.03);
    pFrame.castShadow = true;
    scene.add(pFrame);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(hitX, hitY, hitZ);
    scene.add(hit);

    hit.userData = { type: 'painting', ref: p, zoomPos: new THREE.Vector3(zoomX, y, zoomZ), lookAtPos: new THREE.Vector3(x, y, z) };
    interactables.push(hit);
}

// Cuadro derecha (Puedes reemplazar la foto colocando cuadro1.jpg en tu carpeta assets)
createPainting('assets/cuadro1.jpg', '#ff5555', '#550000', 0, 7.78, 2.0, 0, -Math.PI / 2, 7.5, 2.0, 0, 5.5, 0);

// 3 Cuadros atrás (Reemplaza con cuadro2.jpg, cuadro3.jpg, cuadro4.jpg)
createPainting('assets/cuadro2.jpg', '#55ff55', '#005500', 1, -4.5, 2.0, 7.78, Math.PI, -4.5, 2.0, 7.5, -4.5, 5.5);
createPainting('assets/cuadro3.jpg', '#5555ff', '#000055', 2, 0, 2.0, 7.78, Math.PI, 0, 2.0, 7.5, 0, 5.5);
createPainting('assets/cuadro4.jpg', '#ffff55', '#555500', 0, 4.5, 2.0, 7.78, Math.PI, 4.5, 2.0, 7.5, 4.5, 5.5);


// --- ESTADO Y COLISIONES ---
const state = { objective: 'vhs', hasVHS: false, zoomedPainting: null, savedCameraPose: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }, isSeated: false };

function checkCollision(nx, nz) {
    if (nx < -7.5 || nx > 7.5 || nz < -7.5 || nz > 7.5) return true; // Paredes

    // Mueble de TV (Hecho más ancho para que no pasen por detrás)
    if (nz < -5.5 && nx > -3.5 && nx < 3.5) return true;

    // Posiciones absolutas de las mesas (TableGroup está en 1.5, 0, -1.5)
    // Mesa 1 centro: (1.0, -1.5)
    // Mesa 2 centro: (2.3, -0.7)
    if (Math.hypot(nx - 1.0, nz - (-1.5)) < 1.4) return true; // Mesa 1
    if (Math.hypot(nx - 2.3, nz - (-0.7)) < 1.0) return true; // Mesa 2

    // Sofá L - Ajuste preciso
    if (nx > -3.5 && nx < 3.5 && nz > 2.0 && nz < 5.0) return true;
    if (nx > -3.5 && nx < -0.5 && nz > -1.0 && nz < 3.0) return true;

    // Obstáculos dinámicos (Lámparas, Plantas)
    for (let o of obstacles) {
        if (Math.hypot(nx - o.x, nz - o.z) < o.r) return true;
    }

    return false;
}

// --- CONTROLES Y LÓGICA ---
const moveSpeed = 4.0;
const keys = { w: false, a: false, s: false, d: false };

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = true;
        if (e.key.toLowerCase() === 'w' && state.isSeated) {
            state.isSeated = false;
            camera.position.set(0, 1.6, 1.5); // Levantarse suficientemente lejos para no chocar
            document.getElementById('objective-box').innerText = state.objective === 'vhs' ? 'Objetivo: Encuentra el VHS en la mesa redonda de mármol.' : 'Objetivo: Inserta el VHS en el televisor.';
        }
    }
});
document.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; });

let joystickMove = { x: 0, y: 0 };
if (window.nipplejs) {
    const joystickManager = nipplejs.create({ zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '75px', bottom: '75px' }, color: 'white', size: 100 });
    joystickManager.on('move', (evt, data) => {
        joystickMove.x = Math.cos(data.angle.radian) * (data.distance / 50);
        joystickMove.y = Math.sin(data.angle.radian) * (data.distance / 50);
        if (data.distance > 30 && joystickMove.y > 0.5 && state.isSeated) {
            state.isSeated = false;
            camera.position.set(0, 1.6, 1.5); // Levantarse suficientemente lejos para no chocar
            document.getElementById('objective-box').innerText = state.objective === 'vhs' ? 'Objetivo: Encuentra el VHS en la mesa redonda de mármol.' : 'Objetivo: Inserta el VHS en el televisor.';
        }
    });
    joystickManager.on('end', () => { joystickMove = { x: 0, y: 0 }; });
}

let touchStart = { x: 0, y: 0 };
let euler = new THREE.Euler(0, 0, 0, 'YXZ');
euler.setFromQuaternion(camera.quaternion);

document.addEventListener('touchstart', (e) => {
    if (state.zoomedPainting || e.target.id === 'interaction-prompt' || e.target.closest('#joystick-zone')) return;
    for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].clientX > window.innerWidth / 2) { touchStart.x = e.touches[i].clientX; touchStart.y = e.touches[i].clientY; break; }
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (state.zoomedPainting || e.target.id === 'interaction-prompt' || e.target.closest('#joystick-zone')) return;
    for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].clientX > window.innerWidth / 2) {
            euler.y -= (e.touches[i].clientX - touchStart.x) * 0.004;
            euler.x -= (e.touches[i].clientY - touchStart.y) * 0.004;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
            camera.quaternion.setFromEuler(euler);
            touchStart.x = e.touches[i].clientX; touchStart.y = e.touches[i].clientY; break;
        }
    }
}, { passive: false });

const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', (e) => {
    if (e.target.id !== 'interaction-prompt' && !window.matchMedia("(pointer: coarse)").matches && !state.zoomedPainting) controls.lock();
});

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const interactBtn = document.getElementById('interaction-prompt');
const objectiveBox = document.getElementById('objective-box');

let currentTarget = null;
let hoveredObject = null;

let cinematicLoopIds = { timeouts: [], intervals: [] };

function resetCinematicState() {
    cinematicLoopIds.timeouts.forEach(clearTimeout);
    cinematicLoopIds.intervals.forEach(clearInterval);
    cinematicLoopIds.timeouts = [];
    cinematicLoopIds.intervals = [];
    if (vhsAudio.isPlaying) vhsAudio.stop();
    if (instrumentalAudio.isPlaying) instrumentalAudio.stop();
    if (tapeAudio.isPlaying) tapeAudio.stop();
}

function setTimeoutC(fn, delay) {
    let id = setTimeout(fn, delay);
    cinematicLoopIds.timeouts.push(id);
    return id;
}

function setIntervalC(fn, delay) {
    let id = setInterval(fn, delay);
    cinematicLoopIds.intervals.push(id);
    return id;
}

function performAction() {
    if (state.zoomedPainting) {
        state.zoomedPainting = null;
        camera.position.copy(state.savedCameraPose.pos);
        camera.quaternion.copy(state.savedCameraPose.quat);
        euler.setFromQuaternion(camera.quaternion);
        if (!window.matchMedia("(pointer: coarse)").matches) controls.lock();
        return;
    }

    if (!currentTarget) return;

    if (currentTarget.userData.type === 'vhs' && state.objective === 'vhs') {
        state.hasVHS = true; state.objective = 'tv';
        scene.remove(vhsGroup); interactables.splice(interactables.indexOf(currentTarget), 1); scene.remove(currentTarget);
        objectiveBox.innerText = 'Objetivo: Inserta el VHS en el televisor.';
        arrow.material.color.setHex(0xffaa00);
        
        // Efecto de sonido de agarrar
        if (grabAudio.buffer) {
            if (grabAudio.isPlaying) grabAudio.stop();
            grabAudio.play();
        }
    }
    else if (currentTarget.userData.type === 'tv' && (state.objective === 'tv' || state.objective === 'done')) {
        state.objective = 'done'; objectiveBox.innerText = 'Objetivo: Completado.'; scene.remove(arrow);

        resetCinematicState();

        // Efecto de sonido de insertar VHS
        if (insertAudio.buffer) {
            if (insertAudio.isPlaying) insertAudio.stop();
            insertAudio.play();
        }
        const cinematic = document.getElementById('cinematic-screen'); cinematic.classList.remove('hidden');
        document.getElementById('game-container').style.display = 'none';
        if (controls.isLocked) controls.unlock();
        
        const vhsText = document.querySelector('.vhs-text');
        vhsText.style.display = 'block'; // Asegurar que sea visible
        
        const timeDisplay = document.getElementById('vhs-time');
        timeDisplay.innerText = "00:00:00"; // En cero inicialmente

        // Empezar el zumbido de la cinta rodando después de que se inserte
        setTimeoutC(() => {
            if (tapeAudio.buffer && !tapeAudio.isPlaying) tapeAudio.play();
            
            // Después de 5 segundos, detener la cinta y reproducir el sonido final de carga
            setTimeoutC(() => {
                if (tapeAudio.isPlaying) tapeAudio.stop();
                if (loadedAudio.buffer) loadedAudio.play();
                
                // Ocultar la leyenda de VHS porque ya cargó
                vhsText.style.display = 'none';
                
                // Iniciar el cronómetro de grabación/reproducción
                let seconds = 0;
                setIntervalC(() => {
                    seconds++;
                    timeDisplay.innerText = `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
                }, 1000);
                
                // Aquí inicia el video y la canción The Craving
                setTimeoutC(() => {
                    startCinematic();
                }, 2000);
                
            }, 5000);
            
        }, 1500);

        // Apagar la música de la radio al insertar el VHS
        if (radioAudio.isPlaying) {
            radioAudio.stop();
        }
    }
    else if (currentTarget.userData.type === 'dino') {
        // Reproducir el archivo de audio tierno
        const audio = currentTarget.userData.audio;
        if (audio && audio.buffer) {
            if (audio.isPlaying) audio.stop();
            audio.play();
        }
    }
    else if (currentTarget.userData.type === 'painting') {
        if (controls.isLocked) controls.unlock();
        state.savedCameraPose.pos.copy(camera.position); state.savedCameraPose.quat.copy(camera.quaternion);
        state.zoomedPainting = currentTarget;
        camera.position.copy(currentTarget.userData.zoomPos); camera.lookAt(currentTarget.userData.lookAtPos);
        interactBtn.innerHTML = "Presiona <span class='key'>E</span> o toca para salir"; interactBtn.classList.remove('hidden');
    }
    else if (currentTarget.userData.type === 'sofa' && !state.isSeated) {
        state.isSeated = true;
        // Subimos la cámara a 1.4 y la movemos a 3.8 para estar realmente SOBRE el cojín y no atravesarlo
        camera.position.set(0, 1.4, 3.8);
        camera.rotation.set(0, 0, 0);
        document.getElementById('objective-box').innerText = "Estás sentado. Muévete hacia adelante (W o Joystick) para levantarte.";
        
        // Limpiar interfaz y variables de interacción
        interactBtn.classList.add('hidden');
        if (hoveredObject && hoveredObject.userData.ref) hoveredObject.userData.ref.material.emissive.setHex(0x000000);
        hoveredObject = null;
        currentTarget = null;
        canInteract = false;
    }
}

interactBtn.addEventListener('click', performAction);
document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'e') performAction(); });

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (state.objective === 'vhs') {
        arrow.position.set(vhsGroup.position.x, vhsGroup.position.y + 0.4 + Math.sin(time * 4) * 0.05, vhsGroup.position.z);
        arrow.visible = camera.position.distanceTo(arrow.position) < 4.0;
    } else if (state.objective === 'tv') {
        arrow.position.set(tvGroup.position.x, tvGroup.position.y + 1.5 + Math.sin(time * 4) * 0.05, tvGroup.position.z);
        arrow.visible = camera.position.distanceTo(arrow.position) < 4.0;
    }

    if (!state.zoomedPainting && !state.isSeated) {
        const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
        const right = new THREE.Vector3(); right.crossVectors(camera.up, dir).normalize();
        let moveX = 0, moveZ = 0;

        if (keys.w) moveZ += 1; if (keys.s) moveZ -= 1; if (keys.a) moveX += 1; if (keys.d) moveX -= 1;
        if (joystickMove.y !== 0) moveZ += joystickMove.y; if (joystickMove.x !== 0) moveX -= joystickMove.x;

        if (moveX !== 0 || moveZ !== 0) {
            const moveVec = new THREE.Vector3().addScaledVector(dir, moveZ).addScaledVector(right, moveX).normalize().multiplyScalar(moveSpeed * delta);
            let nx = camera.position.x + moveVec.x, nz = camera.position.z + moveVec.z;
            if (!checkCollision(nx, camera.position.z)) camera.position.x = nx;
            if (!checkCollision(camera.position.x, nz)) camera.position.z = nz;
        }

        raycaster.setFromCamera(center, camera);
        const intersects = raycaster.intersectObjects(interactables);
        let canInteract = false; currentTarget = null;

        if (intersects.length > 0 && intersects[0].distance < 2.0 && !state.isSeated) {
            const type = intersects[0].object.userData.type;
            if ((type === 'vhs' && state.objective === 'vhs') || (type === 'tv' && state.objective === 'tv') || type === 'painting' || type === 'dino' || type === 'sofa') {
                canInteract = true; currentTarget = intersects[0].object;
            }
        }

        if (currentTarget !== hoveredObject) {
            if (hoveredObject && hoveredObject.userData.ref) hoveredObject.userData.ref.material.emissive.setHex(0x000000);
            hoveredObject = currentTarget;
            if (hoveredObject && hoveredObject.userData.ref) hoveredObject.userData.ref.material.emissive.setHex(0x222222);
        }

        if (canInteract) {
            interactBtn.innerHTML = "Presiona <span class='key'>E</span> o toca para interactuar"; interactBtn.classList.remove('hidden');
        } else {
            interactBtn.classList.add('hidden');
        }
    }

    // --- UPDATE SUBTITLES ---
    if (radioAudio.isPlaying && radioAudio.buffer && state.objective !== 'done') {
        let songTime = ((Date.now() - radioStartTime) / 1000) % radioAudio.buffer.duration;
        let lyricTime = songTime - LYRIC_OFFSET; 
        
        let currentText = "";
        for (let i = 0; i < songSubtitles.length; i++) {
            if (lyricTime >= songSubtitles[i].time) {
                currentText = songSubtitles[i].text;
            }
        }
        document.getElementById('subtitles').innerText = currentText;
    } else {
        document.getElementById('subtitles').innerText = "";
    }

    renderer.render(scene, camera);
}

// ... CÓDIGO FINAL ...
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- FUNCIÓN CINEMÁTICA ---
function startCinematic() {
    // 1. Quitar el color azul sólido para revelar las imágenes
    document.getElementById('cinematic-screen').style.backgroundColor = 'transparent';
    
    const slideshow = document.getElementById('cinematic-slideshow');
    slideshow.style.opacity = 1;

    // 2. Empezar a reproducir The Craving
    if (vhsAudio.buffer) vhsAudio.play();

    // 3. Slideshow de imágenes y videos mixtos
    // NOTA PARA EL USUARIO: Puedes colocar fotos (.jpg, .png) o videos (.mp4)
    const mediaFiles = [
        { type: 'image', src: 'assets/cinematica1.jpeg' },
        { type: 'video', src: 'assets/cinematica2.mp4' },
        { type: 'image', src: 'assets/cinematica3.jpeg' },
        { type: 'image', src: 'assets/cinematica4.jpeg' },
        { type: 'image', src: 'assets/cinematica5.jpeg' },
        { type: 'image', src: 'assets/cinematica6.jpeg' },
        { type: 'image', src: 'assets/cinematica7.jpeg' },
        { type: 'image', src: 'assets/cinematica8.jpeg' },
        { type: 'image', src: 'assets/cinematica9.jpeg' },
        { type: 'image', src: 'assets/cinematica10.jpeg' },
        { type: 'image', src: 'assets/cinematica11.jpeg' },
        { type: 'image', src: 'assets/cinematica12.jpeg' },
        { type: 'video', src: 'assets/cinematica13.mp4' },
        { type: 'image', src: 'assets/cinematica14.jpeg' },
        { type: 'image', src: 'assets/cinematica15.jpeg' },
        { type: 'image', src: 'assets/cinematica16.jpeg' },
        { type: 'image', src: 'assets/cinematica17.jpeg' },
        { type: 'image', src: 'assets/cinematica18.jpeg' },
        { type: 'image', src: 'assets/cinematica19.jpeg' },
        { type: 'video', src: 'assets/cinematica20.mp4' },
        { type: 'image', src: 'assets/cinematica21.jpeg' },
        { type: 'image', src: 'assets/cinematica22.jpeg' },
        { type: 'image', src: 'assets/cinematica23.jpeg' },
        { type: 'image', src: 'assets/cinematica24.jpeg' },
        { type: 'video', src: 'assets/cinematica25.mp4' },
        { type: 'image', src: 'assets/cinematica26.jpeg' },
        { type: 'image', src: 'assets/cinematica27.jpeg' },
        { type: 'image', src: 'assets/cinematica28.jpeg' },
        { type: 'image', src: 'assets/cinematica29.jpeg' },
        { type: 'video', src: 'assets/cinematica30.mp4' },
        { type: 'image', src: 'assets/cinematica31.jpeg' },
        { type: 'image', src: 'assets/cinematica32.jpeg' },
        { type: 'image', src: 'assets/cinematica33.jpeg' },
        { type: 'video', src: 'assets/cinematica34.mp4' },
        { type: 'image', src: 'assets/cinematica35.jpeg' },
        { type: 'image', src: 'assets/cinematica36.jpeg' },
        { type: 'video', src: 'assets/cinematica37.mp4' }
    ];

    slideshow.innerHTML = ''; // Limpiar div

    let mediaElements = [];
    mediaFiles.forEach((file, index) => {
        let el;
        if (file.type === 'video') {
            el = document.createElement('video');
            el.src = file.src;
            el.muted = true; // Mutear para no tapar la música (SIN sonido)
            el.setAttribute('muted', '');
            el.playsInline = true;
            el.setAttribute('playsinline', '');
            el.preload = 'auto';
            // No usamos loop para poder escuchar el evento "ended"
            el.style.objectFit = 'contain'; // Para que no se corte (zoom in)
        } else {
            el = document.createElement('div');
            el.style.backgroundImage = `url('${file.src}')`;
            el.style.backgroundSize = 'contain'; // Para que la foto se vea completa
            el.style.backgroundPosition = 'center';
            el.style.backgroundRepeat = 'no-repeat';
        }
        el.style.position = 'absolute';
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.opacity = index === 0 ? 1 : 0;
        el.style.transition = 'opacity 2s ease-in-out';
        slideshow.appendChild(el);
        mediaElements.push(el);
    });
    
    let currentSlide = 0;
    let isFinalPile = false;
    let slideTimeoutId;
    
    function playNextMedia() {
        if (isFinalPile || mediaElements.length === 0) return;
        
        let prevSlide = currentSlide;
        currentSlide++;
        if (currentSlide >= mediaElements.length) currentSlide = 0;
        
        // Transición de opacidad
        mediaElements[prevSlide].style.opacity = 0;
        mediaElements[currentSlide].style.opacity = 1;
        
        // Pausar el video viejo
        if (mediaFiles[prevSlide].type === 'video') {
            setTimeoutC(() => {
                if (mediaElements[prevSlide]) mediaElements[prevSlide].pause();
            }, 2000); 
        }

        scheduleNextMedia(currentSlide);
    }

    function scheduleNextMedia(index) {
        if (isFinalPile) return;
        
        if (mediaFiles[index].type === 'video') {
            let vid = mediaElements[index];
            vid.currentTime = 0;
            let playPromise = vid.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => { 
                    console.log("Video autoplay blocked", error); 
                    // Si falla, esperamos 4.5s en lugar de saltarlo inmediatamente
                    slideTimeoutId = setTimeoutC(() => {
                        playNextMedia();
                    }, 4500);
                });
            }
            // Avanzar cuando el video acabe de reproducirse completamente
            vid.onended = () => {
                playNextMedia();
            };
            
            // Fallback de seguridad: si el video es infinito o se queda estático, avanzar a los 10 segundos
            slideTimeoutId = setTimeoutC(() => {
                if (currentSlide === index) { // Solo si seguimos en el mismo slide
                    playNextMedia();
                }
            }, 10000); 
        } else {
            // Si es foto, avanzar a los 4.5 segundos
            slideTimeoutId = setTimeoutC(() => {
                playNextMedia();
            }, 4500);
        }
    }

    // Iniciar la reproducción con el primer elemento
    if (mediaElements.length > 0) {
        scheduleNextMedia(0);
    }

    // --- ANIMACIÓN FINAL: LA PILA EN LA MESA ---
    // A los 170 segundos (al terminar la canción)
    setTimeoutC(() => {
        isFinalPile = true;
        clearTimeout(slideTimeoutId);
        
        // Convertir el fondo a una "mesa de madera" (color marrón oscuro)
        slideshow.style.backgroundColor = '#2c1e16';
        
        mediaElements.forEach((el, i) => {
            // Cambiar la transición para que vuelen a la mesa
            el.style.transition = 'all 2s ease-in-out';
            
            // Hacerlos parecer fotos tipo polaroid (borde blanco y sombra)
            el.style.border = '12px solid white';
            el.style.borderBottom = '35px solid white'; // Borde inferior más grueso (estilo polaroid)
            el.style.boxShadow = '5px 5px 15px rgba(0,0,0,0.6)';
            
            // Tamaños más pequeños para la pila final
            // Formato 4:3 o polaroid
            el.style.width = '350px';
            el.style.height = '250px';
            if (el.tagName === 'VIDEO') {
                el.style.objectFit = 'cover'; // En la mesa final sí queremos que se vean como fotos completas llenando el borde
            } else {
                el.style.backgroundSize = 'cover'; 
            }
            
            // Posición centrada pero dispersa al azar
            let centerX = window.innerWidth / 2;
            let centerY = window.innerHeight / 2;
            
            let randomX = centerX - 175 + (Math.random() - 0.5) * 500;
            let randomY = centerY - 125 + (Math.random() - 0.5) * 300;
            let randomRot = (Math.random() - 0.5) * 40; // Rotación aleatoria
            
            el.style.left = randomX + 'px';
            el.style.top = randomY + 'px';
            el.style.transform = `rotate(${randomRot}deg)`;
            
            el.style.opacity = 1;
            el.style.zIndex = i + 10; // Para que se apilen
            
            // Asegurarnos de que los videos se sigan reproduciendo infinitamente
            if (el.tagName === 'VIDEO') {
                el.loop = true;
                el.play().catch(e => {}); 
            }
        });

        // Bucle instrumental independiente al final
        setIntervalC(() => {
            // Si pusiste un archivo instrumental.mp3, sonará. Si no, quedará en silencio.
            if (!instrumentalAudio.isPlaying && instrumentalAudio.buffer) {
                instrumentalAudio.play();
            }
        }, 1000);

        // CREAR EL MENSAJE FINAL FLOTANTE
        const finalMsg = document.createElement('div');
        finalMsg.id = 'cinematic-final-message';
        // ESTA ES LA LÍNEA QUE PUEDES CAMBIAR PARA EL MENSAJE FINAL
        finalMsg.innerText = "Y así, nuestra historia apenas comienza...";
        
        finalMsg.style.position = 'absolute';
        finalMsg.style.top = '10%'; // En la parte superior de la mesa
        finalMsg.style.left = '50%';
        finalMsg.style.transform = 'translateX(-50%)';
        finalMsg.style.color = '#fff';
        finalMsg.style.fontSize = '54px';
        finalMsg.style.fontFamily = "'Courier New', Courier, monospace";
        finalMsg.style.textAlign = 'center';
        finalMsg.style.textShadow = '2px 2px 10px #000, 0px 0px 20px rgba(0,0,0,0.8)';
        finalMsg.style.zIndex = 1000;
        finalMsg.style.opacity = 0;
        finalMsg.style.transition = 'opacity 3s ease-in';
        finalMsg.style.width = '90%';
        
        document.getElementById('cinematic-screen').appendChild(finalMsg);
        
        // Aparece lentamente
        setTimeoutC(() => {
            finalMsg.style.opacity = 1;
        }, 1500);

        // Botón para salir (volver a la sala)
        const exitBtn = document.getElementById('cinematic-exit');
        exitBtn.classList.remove('hidden');
        exitBtn.onclick = () => {
            resetCinematicState();
            
            const cinematicScreen = document.getElementById('cinematic-screen');
            cinematicScreen.classList.add('hidden');
            
            document.getElementById('game-container').style.display = 'block';
            
            slideshow.innerHTML = '';
            slideshow.style.backgroundColor = 'transparent';
            
            document.getElementById('cinematic-message').classList.add('hidden');
            document.getElementById('cinematic-subtitles').innerText = '';
            
            exitBtn.classList.add('hidden');
            if (finalMsg) finalMsg.remove();
        };

    }, 170000); // 170 segundos (tiempo de la canción)

    // 4. Subtítulos y Mensaje Central coordinado
    const messageBox = document.getElementById('cinematic-message');
    const subtitleBox = document.getElementById('cinematic-subtitles');
    
    // Unos mensajes hermosos para Gabriela:
    const messages = [
        { time: 0, text: "" },
        { time: 2, text: "Para Gabriela..." },
        { time: 6, text: "" },
        { time: 8, text: "A veces es difícil encontrar las palabras exactas..." },
        { time: 13, text: "" },
        // Interludio de 1:46 a 2:02 (106s a 122s)
        { time: 106, text: "Pero este mundo está hecho de recuerdos y momentos." },
        { time: 112, text: "" },
        { time: 114, text: "Y tú..." },
        { time: 118, text: "" },
        { time: 120, text: "Tú eres mi favorito." },
        { time: 122, text: "" },
        // Interludio de 2:26 a 2:41 (146s a 161s)
        { time: 146, text: "No importa el tiempo que pase." },
        { time: 150, text: "" },
        { time: 152, text: "Siempre serás mi lugar seguro." },
        { time: 156, text: "" },
        { time: 158, text: "Te amo." },
        { time: 161, text: "" }
    ];

    let startTime = Date.now();
    
    setInterval(() => {
        let elapsed = (Date.now() - startTime) / 1000;
        
        // Actualizar subtítulos
        let activeSubtitle = "";
        for (let i = 0; i < cravingSubtitles.length; i++) {
            if (elapsed >= cravingSubtitles[i].time) activeSubtitle = cravingSubtitles[i].text;
            else break;
        }
        subtitleBox.innerText = activeSubtitle;

        // Actualizar mensaje central
        let activeMsg = "";
        for (let i = 0; i < messages.length; i++) {
            if (elapsed >= messages[i].time) activeMsg = messages[i].text;
            else break;
        }
        
        if (activeMsg !== "") {
            messageBox.innerText = activeMsg;
            messageBox.classList.remove('hidden');
        } else {
            messageBox.classList.add('hidden');
        }
    }, 100);
}

animate();
