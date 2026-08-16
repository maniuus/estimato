import { readdirSync, statSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import JavaScriptObfuscator from 'javascript-obfuscator'

const root = process.cwd()
const out = join(root, 'out')

const opts = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: false,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.6,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
}

function walk(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      files.push(...walk(p))
    } else if (p.endsWith('.js') && !name.includes('.obf.js')) {
      files.push(p)
    }
  }
  return files
}

let total = 0
for (const file of walk(out)) {
  const code = readFileSync(file, 'utf8')
  if (code.includes('__OBFUSCATED__')) continue
  const result = JavaScriptObfuscator.obfuscate(code, opts).getObfuscatedCode()
  writeFileSync(file, '/* __OBFUSCATED__ */\n' + result)
  total += 1
}
console.log(`Obfuscated ${total} file(s)`)