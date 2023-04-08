import path from 'path'
import fileType from 'file-type'

export default async function(filename: string | null | undefined, fallbackPath: string, extension?: string | null) {
    let name = filename ?? path.basename(fallbackPath)
    let ext = extension
    let mime = null

    // extにnullを渡した場合のみ拡張子を推測する
    if (ext === null) {
        const type = await fileType.fromFile(fallbackPath)
        if (type) {
            mime = type.mime
            ext = type.ext
        }
    }

    if (path.extname(name).replace('.', '') !== ext && ext) {
        name = `${name}.${ext}`
    }

    return { name, mime }
} 