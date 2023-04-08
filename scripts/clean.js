const fs = require('fs')
if (fs.existsSync('build')) {
  fs.rmdirSync('build', { recursive: true })
}