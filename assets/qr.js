// QR Model 2, version 4-L, byte mode, one Reed–Solomon block, mask 0.
const SIZE = 33;
const DATA_WORDS = 80;
const ECC_WORDS = 20;
const multiply = (left, right) => {
  let result = 0;
  while (right) {
    if (right & 1) result ^= left;
    left = (left << 1) ^ (left & 128 ? 0x11d : 0);
    right >>>= 1;
  }
  return result;
};

function payload(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 78) throw new RangeError('The URL is too long for the preview QR code.');
  const bits = [];
  const append = (value, length) => {
    for (let shift = length - 1; shift >= 0; shift--) bits.push((value >>> shift) & 1);
  };
  append(4, 4);
  append(bytes.length, 8);
  bytes.forEach(byte => append(byte, 8));
  append(0, 4);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((sum, bit) => sum * 2 + bit, 0));
  for (let pad = 0; data.length < DATA_WORDS; pad++) data.push(pad % 2 ? 0x11 : 0xec);

  let generator = [1];
  for (let i = 0, root = 1; i < ECC_WORDS; i++, root = multiply(root, 2)) {
    const product = Array(generator.length + 1).fill(0);
    generator.forEach((value, index) => {
      product[index] ^= value;
      product[index + 1] ^= multiply(value, root);
    });
    generator = product;
  }
  const remainder = [...data, ...Array(ECC_WORDS).fill(0)];
  data.forEach((_, i) => {
    const coefficient = remainder[i];
    generator.forEach((value, index) => { remainder[i + index] ^= multiply(value, coefficient); });
  });
  return [...data, ...remainder.slice(DATA_WORDS)];
}

export function qrMatrix(text) {
  const data = payload(text);
  const matrix = Array.from({ length:SIZE }, () => Array(SIZE).fill(null));
  const set = (x,y,dark) => { if (matrix[y] && x >= 0 && x < SIZE) matrix[y][x] = dark; };
  for (let i = 0; i < SIZE; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [centerX, centerY] of [[3,3],[SIZE-4,3],[3,SIZE-4]]) {
    for (let y = -4; y <= 4; y++) {
      for (let x = -4; x <= 4; x++) {
        const distance = Math.max(Math.abs(x), Math.abs(y));
        set(centerX+x,centerY+y,distance !== 2 && distance !== 4);
      }
    }
  }
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) set(26+x,26+y,Math.max(Math.abs(x),Math.abs(y)) !== 1);
  }
  const format = index => Boolean((0x77c4 >>> index) & 1);
  for (let i = 0; i <= 5; i++) set(8,i,format(i));
  set(8,7,format(6));
  set(8,8,format(7));
  set(7,8,format(8));
  for (let i = 9; i < 15; i++) set(14-i,8,format(i));
  for (let i = 0; i < 8; i++) set(SIZE-1-i,8,format(i));
  for (let i = 8; i < 15; i++) set(8,SIZE-15+i,format(i));
  set(8,SIZE-8,true);

  let index = 0;
  let upwards = true;
  for (let right = SIZE-1; right > 0; right -= 2) {
    if (right === 6) right--;
    for (let vertical = 0; vertical < SIZE; vertical++) {
      const y = upwards ? SIZE-1-vertical : vertical;
      for (const x of [right,right-1]) {
        if (matrix[y][x] !== null) continue;
        const bit = ((data[index >>> 3] ?? 0) >>> (7 - (index & 7))) & 1;
        set(x,y,Boolean(bit ^ ((x+y)%2 === 0 ? 1 : 0)));
        index++;
      }
    }
    upwards = !upwards;
  }
  return matrix;
}

export function renderQr(element,text) {
  const scale = 5;
  const quiet = 4;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = (SIZE + quiet * 2) * scale;
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','QR code for the sample Skill Passport link');
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.fillStyle = '#000';
  qrMatrix(text).forEach((row,y) => row.forEach((dark,x) => {
    if (dark) context.fillRect((x+quiet)*scale,(y+quiet)*scale,scale,scale);
  }));
  element.replaceChildren(canvas);
}
