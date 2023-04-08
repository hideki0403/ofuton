const fs = require('fs')
if (fs.existsSync('build')) {
  fs.rmSync('build', { recursive: true })
}