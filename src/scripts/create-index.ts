import fs from 'fs'

import config from '@/config'
import resolveFilename from '@/utils/resolve-filename'
import * as database from '@/database/controller'

export default async function createIndex() {
    const objects = listFiles(config.storage.path)
    console.log(`Found ${objects.length} objects.`)
    console.log('Creating index...')

    for (const filePath of objects) {
        if (!fs.existsSync(filePath)) continue

        const path = filePath.replace(config.storage.path + '/', '')
        const [bucket, ...key] = path.split('/')

        if (database.getObject({ bucket, key: key.join('/') })) continue

        const stat = await resolveFilename(null, filePath, null)

        database.putObject({
            bucket,
            key: key.join('/'),
            filename: stat.name,
            mime: stat.mime || 'application/octet-stream',
            size: fs.statSync(filePath).size,
        })
    }

    console.log('Index created.')
}

function listFiles(baseDir: string): string[] {
    return fs.readdirSync(baseDir, { withFileTypes: true }).flatMap(dirent => {
        return dirent.isFile() ? [`${baseDir}/${dirent.name}`] : listFiles(`${baseDir}/${dirent.name}`)
    })
}