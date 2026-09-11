import sharp from 'sharp'
import { mkdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const svg = readFileSync(join(root, 'public', 'favicon.svg'))

for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(join(outDir, `icon-${size}.png`))
}

const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f2928"/>
  <g transform="translate(96 96) scale(10)">
    <rect width="32" height="32" rx="7" fill="#1f2928"/>
    <path fill="#f4f0e9" d="M6.5 23V9.5h3.2l3.1 8.2 3.1-8.2H19V23h-2.7v-9.4L13.2 23h-2.4L7.9 13.6V23H6.5z"/>
    <path fill="#e67356" d="M21.2 9.5h2.8v9.8c0 2.4-1.5 3.9-4 3.9-.7 0-1.5-.1-2.1-.3l.4-2.3c.3.1.7.2 1.1.2 1 0 1.5-.5 1.5-1.6V9.5h.3z"/>
  </g>
</svg>
`

await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(join(outDir, 'icon-512-maskable.png'))
await sharp(svg).resize(180, 180).png().toFile(join(outDir, 'apple-touch-icon.png'))

console.log('PWA icons generated in public/icons')
