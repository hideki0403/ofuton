import fs from 'fs'

import config from '@/config'
import resolveFilename from '@/utils/resolve-filename'
import * as database from '@/database/controller'

export default function createIndex() {
    const objects = listFiles(config.storage.path)
    console.log(`Found ${objects.length} objects.`)
    console.log('Creating index...')

    const index = objects.map(async filePath => {
        const path = filePath.replace(config.storage.path + '/', '')
        const [bucket, ...key] = path.split('/')
        const stat = await resolveFilename(null, filePath, null)

        return {
            bucket,
            key: key.join('/'),
            filename: stat.name,
            mime: stat.mime || 'application/octet-stream',
            size: fs.statSync(filePath).size,
        }
    })

    Promise.all(index).then(index => {
        index.forEach(object => {
            database.putObject(object)
        })
        
        console.log('Index created.')
    })
}

function listFiles(baseDir: string): string[] {
    return fs.readdirSync(baseDir, { withFileTypes: true }).flatMap(dirent => {
        return dirent.isFile() ? [`${baseDir}/${dirent.name}`] : listFiles(`${baseDir}/${dirent.name}`)
    })
}