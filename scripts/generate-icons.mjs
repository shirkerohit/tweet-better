import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../src/assets')
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function createPng(size) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const raw = Buffer.alloc((size * (1 + size * 4)))
  let offset = 0
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0
    for (let x = 0; x < size; x++) {
      const cx = size / 2
      const cy = size / 2
      const r = size * 0.38
      const dist = Math.hypot(x - cx + 0.5, y - cy + 0.5)
      if (dist < r) {
        raw[offset++] = 29
        raw[offset++] = 155
        raw[offset++] = 240
        raw[offset++] = 255
      } else {
        raw[offset++] = 0
        raw[offset++] = 0
        raw[offset++] = 0
        raw[offset++] = 0
      }
    }
  }

  const idat = deflateSync(raw)
  return Buffer.concat([
    header,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', idat),
    createChunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [16, 48, 128]) {
  writeFileSync(join(outDir, `icon-${size}.png`), createPng(size))
  console.log(`Created icon-${size}.png`)
}