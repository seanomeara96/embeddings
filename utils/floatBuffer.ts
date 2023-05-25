export function float32Buffer(arr: number[]) {
    return Buffer.from(new Float32Array(arr).buffer);
  }