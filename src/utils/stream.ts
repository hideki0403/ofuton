import MultiStream from 'multistream'
import fs from 'fs'

export async function merge(inputPaths: string[], outputPath: string) {
    const fd = fs.openSync(outputPath, 'w+')
    const output = fs.createWriteStream(outputPath)
    const inputs = inputPaths.map(path => {
        return fs.createReadStream(path)
    })

    return new Promise((resolve, reject) => {
        const multistream = new MultiStream(inputs)
        
        multistream.pipe(output)
        multistream.on('end', () => {
            fs.closeSync(fd)
            resolve(true)
        })
        multistream.on('error', () => {
            fs.closeSync(fd)
            reject(false)
        })
    })
}
