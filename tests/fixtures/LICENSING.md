# Pramaan Test Fixtures Dataset & Licensing Notes

All test fixtures located in this directory (`tests/fixtures/`) are 100% synthetically generated via programmatic algorithms using NumPy, Pillow, and SoundFile.

- **Zero Real Human PII:** No actual human faces, biometric photographs, or real human speech recordings are included.
- **Image Fixtures (`images/`):**
  - `clear_face.jpg`: Programmatically rendered synthetic facial geometry (oval, landmarks).
  - `no_face.jpg`: Uniform neutral pixel canvas.
  - `blurred_face.jpg`: Gaussian-blurred variant.
  - `low_light.jpg`: High-attenuation dark canvas.
- **Audio Fixtures (`audio/`):**
  - `clean_speech.wav`: Synthesized multi-harmonic harmonic waveforms with modulated envelope.
  - `silent.wav`: Mathematical zero arrays.
  - `too_short.wav`: Sub-second synthetic chirps.
  - `noisy.wav`: Uniform pseudo-random Gaussian noise.
- **License:** CC0 1.0 Universal (Public Domain Dedication). Suitable for public CI/CD runners without privacy or copyright restrictions.

