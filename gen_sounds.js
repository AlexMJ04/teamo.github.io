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
    
    // Write samples
    for (let i = 0; i < samples.length; i++) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        let val = s < 0 ? s * 32768 : s * 32767;
        buffer.writeInt16LE(Math.floor(val), 44 + i * 2);
    }
    
    fs.writeFileSync(filename, buffer);
}

console.log("Generando pasos.wav...");
const fs_samples = [];
for (let t = 0; t < 15000; t++) {
    let env = Math.exp(-t / 1500);
    fs_samples.push(env * Math.sin(2 * Math.PI * 60 * (t / 44100)) * (Math.random() * 0.5 + 0.5));
}
for (let t = 0; t < 15000; t++) fs_samples.push(0);
writeWave('assets/pasos.wav', fs_samples);

console.log("Generando agarrar.wav...");
const grab_samples = [];
for (let t = 0; t < 5000; t++) {
    let env = Math.exp(-t / 600);
    grab_samples.push(env * (Math.random() * 2 - 1) * 0.7);
}
writeWave('assets/agarrar.wav', grab_samples);

console.log("Generando insertar.wav...");
const ins_samples = [];
for (let t = 0; t < 3000; t++) {
    let env = Math.exp(-t / 300);
    ins_samples.push(env * Math.sin(2 * Math.PI * 300 * (t / 44100)));
}
for (let t = 0; t < 10000; t++) ins_samples.push(0);
for (let t = 0; t < 6000; t++) {
    let env = Math.exp(-t / 500);
    ins_samples.push(env * Math.sin(2 * Math.PI * 150 * (t / 44100)) * (Math.random() * 0.5 + 0.5));
}
for (let t = 0; t < 20000; t++) {
    ins_samples.push(Math.sin(2 * Math.PI * 80 * (t / 44100)) * 0.15 * Math.exp(-t / 10000));
}
writeWave('assets/insertar.wav', ins_samples);

console.log("Sonidos generados exitosamente.");
