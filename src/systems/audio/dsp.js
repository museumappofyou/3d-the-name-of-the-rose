// Small helpers for the sound engine: random ranges and decibels. (The
// synthesis toolkit that once lived here is gone: every source is now a
// recording, see ./banks.js.)

export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const dB = x => Math.pow(10, x / 20);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
