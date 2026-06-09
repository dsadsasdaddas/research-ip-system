const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const crateDir = path.join(root, 'native', 'search-engine')
const targetDir = path.join(crateDir, 'target', 'release')

const byPlatform = {
  darwin: 'libresearch_search_engine.dylib',
  linux: 'libresearch_search_engine.so',
  win32: 'research_search_engine.dll',
}

const sourceName = byPlatform[process.platform]
if (!sourceName) throw new Error(`Unsupported platform: ${process.platform}`)

const source = path.join(targetDir, sourceName)
const dest = path.join(crateDir, 'index.node')

if (!fs.existsSync(source)) {
  throw new Error(`Rust addon was not built: ${source}`)
}

fs.copyFileSync(source, dest)
console.log(`Copied Rust addon to ${dest}`)
