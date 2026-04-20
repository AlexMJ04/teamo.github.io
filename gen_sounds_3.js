const fs = require('fs');

function writeWave(filename, samples, sampleRate = 44100) {
    const buffer = Buffer.alloc(44 + samples.length * 2);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + samples.length * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples.length * 2, 40);
    
    for (let i = 0; i < samples.length; i++) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        let val = s < 0 ? s * 32768 : s * 32767;
        buffer.writeInt16LE(Math.floor(val), 44 + i * 2);
    }
    fs.writeFileSync(filename, buffer);
}

// 1. Pasos más realistas (ruido filtrado + doble toque)
console.log("Generando pasos_realistas.wav...");
const fs_samples = [];
let lastVal = 0;
for (let t = 0; t < 15000; t++) {
    let env1 = Math.exp(-t / 600); // Talón
    let env2 = t > 1500 ? Math.exp(-(t - 1500) / 1200) : 0; // Punta
    let noise = (Math.random() * 2 - 1);
    lastVal = (lastVal * 0.5) + (noise * 0.5); // Lowpass simple para ruido sordo
    
    let thump1 = Math.exp(-t / 300) * Math.sin(2 * Math.PI * 70 * (t / 44100));
    let thump2 = t > 1500 ? Math.exp(-(t - 1500) / 300) * Math.sin(2 * Math.PI * 80 * ((t - 1500) / 44100)) : 0;
    
    fs_samples.push((lastVal * (env1 * 0.4 + env2 * 0.6)) + ((thump1 + thump2) * 0.15));
}
for (let t = 0; t < 12000; t++) fs_samples.push(0);
writeWave('assets/pasos.wav', fs_samples);

// 2. Sonido de cargado (clack mecánico)
console.log("Generando cargado.wav...");
const loaded_samples = [];
for (let t = 0; t < 4000; t++) {
    let env = Math.exp(-t / 400);
    let click = env * Math.sin(2 * Math.PI * 250 * (t / 44100));
    let noise = env * (Math.random() * 2 - 1) * 0.3;
    loaded_samples.push(click + noise);
}
// Silencio breve
for (let t = 0; t < 2000; t++) loaded_samples.push(0);
// Clack fuerte
for (let t = 0; t < 12000; t++) {
    let env = Math.exp(-t / 800);
    let click = env * Math.sin(2 * Math.PI * 120 * (t / 44100));
    let noise = env * (Math.random() * 2 - 1) * 0.4;
    loaded_samples.push(click + noise);
}
writeWave('assets/cargado.wav', loaded_samples);

console.log("Archivos generados exitosamente.");
