const fs = require('fs');

function writeWave(filename, samples, sampleRate = 44100) {
    const buffer = Buffer.alloc(44 + samples.length * 2);
    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + samples.length * 2, 4);
    buffer.write('WAVE', 8);
    // fmt subchunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(1, 22); // NumChannels
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
    buffer.writeUInt16LE(2, 32); // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    // data subchunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples.length * 2, 40);
    
    for (let i = 0; i < samples.length; i++) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        let val = s < 0 ? s * 32768 : s * 32767;
        buffer.writeInt16LE(Math.floor(val), 44 + i * 2);
    }
    fs.writeFileSync(filename, buffer);
}

// 1. Mejores pasos (zapato real)
console.log("Generando pasos_mejorados.wav...");
const fs_samples = [];
for (let t = 0; t < 15000; t++) {
    let envT = Math.exp(-t / 1000);
    let envN = Math.exp(-t / 400);
    let thump = envT * Math.sin(2 * Math.PI * 45 * (t / 44100)); // Grave del talón
    let noise = envN * (Math.random() * 2 - 1) * 0.4; // Fricción del zapato
    fs_samples.push(thump * 0.7 + noise);
}
for (let t = 0; t < 12000; t++) fs_samples.push(0); // Pausa más corta
writeWave('assets/pasos.wav', fs_samples);

// 2. Ruido de cinta rodando
console.log("Generando ruido_cinta.wav...");
const tape_samples = [];
for (let t = 0; t < 44100 * 2; t++) { // 2 segundos, loop
    let clicks = Math.pow(Math.sin(2 * Math.PI * 18 * (t / 44100)), 10) * 0.3; // 18 clicks/segundo
    let hum = Math.sin(2 * Math.PI * 100 * (t / 44100)) * 0.05; // Motor de fondo
    let noise = (Math.random() * 2 - 1) * 0.05; // Cinta pasando
    tape_samples.push(clicks + hum + noise);
}
writeWave('assets/ruido_cinta.wav', tape_samples);

console.log("Nuevos audios generados.");
