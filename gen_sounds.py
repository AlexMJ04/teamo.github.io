import wave
import math
import struct
import random

def save_wav(filename, samples, sample_rate=44100):
    with wave.open(filename, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        for s in samples:
            w.writeframesraw(struct.pack('<h', int(max(-32768, min(32767, s * 32767)))))

print("Generando pasos.wav...")
fs_samples = []
# Create a single loopable footstep
for t in range(15000):
    envelope = math.exp(-t/1500)
    val = envelope * math.sin(2 * math.pi * 60 * (t/44100.0)) * (random.random() * 0.5 + 0.5)
    fs_samples.append(val)
for t in range(10000):
    fs_samples.append(0)
save_wav('assets/pasos.wav', fs_samples)

print("Generando agarrar.wav...")
grab_samples = []
for t in range(6000):
    envelope = math.exp(-t/800)
    val = envelope * (random.random() * 2 - 1) * 0.8
    grab_samples.append(val)
save_wav('assets/agarrar.wav', grab_samples)

print("Generando insertar.wav...")
ins_samples = []
# Click 1
for t in range(3000):
    envelope = math.exp(-t/300)
    val = envelope * math.sin(2 * math.pi * 300 * (t/44100.0))
    ins_samples.append(val)
for t in range(15000): ins_samples.append(0)
# Click 2
for t in range(6000):
    envelope = math.exp(-t/500)
    val = envelope * math.sin(2 * math.pi * 150 * (t/44100.0)) * (random.random()*0.5+0.5)
    ins_samples.append(val)
# Whir
for t in range(30000):
    val = math.sin(2 * math.pi * 80 * (t/44100.0)) * 0.2 * math.exp(-t/10000)
    ins_samples.append(val)
save_wav('assets/insertar.wav', ins_samples)

print("¡Sonidos generados exitosamente!")
