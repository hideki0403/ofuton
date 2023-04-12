import type { FastifyReply, FastifyRequest } from 'fastify'
import fs from 'fs'
import path from 'path'
import * as xmlParser from 'js2xmlparser'
import crypto from 'crypto'
import os from 'os'

import config from '@/config'
import resolveFilename from '@/utils/resolve-filename'
import * as database from '@/database/controller'
import * as stream from '@/utils/stream'
import * as signature from '@/utils/signature'
import * as logger from '@/utils/logger'

type UploadMeta = {
    timerId: NodeJS.Timeout,
    disposition: string,
    mime: string,
    tempDirPath: string,
}

const log = logger.getLogger('server:objects')
const acceptableMultiPartUploadIds = new Map<string, UploadMeta>()

export default async function(req: FastifyRequest, res: FastifyReply) {
    const query = req.query as Record<string, string | undefined>
    const params = req.params as Record<string, string | undefined>
    const bucket = params.bucket
    const key = params['*']

    // メソッドチェック
    if (!includeMethod(req.method, ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'])) {
        return res.status(405).send('Method Not Allowed')
    }

    log.debug(`${req.method} ${req.url}`)

    // バケット名とキーが指定されているかチェック
    // ディレクトリトラバーサルできそうなパスは弾く
    if (!bucket || !key || bucket.includes('..') || key.includes('..')) {
        return res.status(400).send('Bad request')
    }

    const filePath = path.join(config.storage.path, bucket, key)
    const fileDir = path.dirname(filePath)

    // GETリクエストならファイルを返す
    // HEADリクエストならヘッダのみ
    if (includeMethod(req.method, ['GET', 'HEAD'])) {
        const object = database.getObject({ bucket, key })
        if (!object) return res.status(404).send('Not Found')

        res.header('Content-Type', object.mime)
        res.header('Content-Length', object.size)
        res.header('Content-Disposition', object.filename)
        res.header('Cache-Control', 'max-age=31536000, immutable')

        return req.method === 'HEAD' ? res.send()  : res.send(fs.createReadStream(filePath))
    }

    // POST, PUT, DELETEでのリクエスト時はAccessKey, SecretKeyのチェックを行う
    if (!signature.verifySignature(req, config.account.accessKey, config.account.secretKey)) {
        return res.status(403).send('Forbidden')
    }

    // POST, PUTでのリクエスト時はディレクトリの存在チェックを行う
    if (includeMethod(req.method, ['POST', 'PUT']) && !fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true })
    }

    switch (query['x-id']) {
        case 'PutObject': {
            fs.writeFileSync(filePath, req.body as Buffer)
            database.putObject({
                bucket,
                key,
                mime: req.headers['content-type'] as string,
                size: Number(req.headers['content-length'] as string),
                filename: (await resolveFilename(req.headers['content-disposition'] as string, key)).name,
            })

            return res.send()
        }

        case 'DeleteObject': {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
            database.deleteObject({ bucket, key })

            return res.send()
        }

        case 'CreateMultipartUpload': {
            const uploadId = crypto.randomBytes(16).toString('hex')
            const tempDirPath = path.join(os.tmpdir(), `ofuton-${uploadId}`)

            fs.mkdirSync(tempDirPath, { recursive: true })

            // 30分間のみ有効
            const timerId = setTimeout((uploadId, tempDirPath) => {
                acceptableMultiPartUploadIds.delete(uploadId)
                cleanupTempDir(tempDirPath)
            }, 1000 * 60 * 30, uploadId, tempDirPath)

            acceptableMultiPartUploadIds.set(uploadId, {
                timerId,
                disposition: req.headers['content-disposition'] as string,
                mime: req.headers['content-type'] as string,
                tempDirPath
            })

            return res.send(xmlParser.parse('InitiateMultipartUploadResult', {
                Bucket: bucket,
                Key: key,
                UploadId: uploadId
            }))
        }

        case 'UploadPart': {
            const { uploadId, partNumber } = query
            const body = req.body as Buffer

            if (!uploadId || !partNumber || !acceptableMultiPartUploadIds.has(uploadId)) {
                return res.status(400).send('Bad request')
            }

            const partFilePath = path.join(os.tmpdir(), `ofuton-${uploadId}`, `${uploadId}.${partNumber}.part`)
            fs.writeFileSync(partFilePath, body)

            res.header('ETag', `"${crypto.randomBytes(16).toString('hex')}"`)

            return res.send()
        }

        case 'CompleteMultipartUpload': {
            const { uploadId } = query

            if (!uploadId) {
                return res.status(400).send('Bad request')
            }

            const partDirPath = path.join(os.tmpdir(), `ofuton-${uploadId}`)

            if (!fs.existsSync(partDirPath)) {
                return res.status(404).send('NoSuchUpload')
            }

            const partFiles = fs.readdirSync(partDirPath).sort().map(partFile => path.join(partDirPath, partFile))
            await stream.merge(partFiles, filePath)

            const meta = acceptableMultiPartUploadIds.get(uploadId) as UploadMeta
            database.putObject({
                bucket,
                key,
                mime: meta.mime || 'application/octet-stream',
                filename: (await resolveFilename(meta.disposition, key)).name,
                size: fs.statSync(filePath).size
            })

            cleanupMultiPartUploads(uploadId)
            return res.send(xmlParser.parse('CompleteMultipartUploadResult', {
                Location: req.url.split('?')[0],
                Bucket: bucket,
                Key: key,
                ETag: crypto.randomBytes(16).toString('hex')
            }))
        }

        case 'AbortMultipartUpload': {
            const { uploadId } = query

            if (!uploadId) {
                return res.status(400).send('Bad request')
            }

            cleanupMultiPartUploads(uploadId)
            return res.send()
        }

        default: {
            return
        }
    }
}

function cleanupMultiPartUploads(uploadId: string) {
    if (!acceptableMultiPartUploadIds.has(uploadId)) return false

    const meta = acceptableMultiPartUploadIds.get(uploadId)

    if (meta) {
        clearTimeout(meta.timerId)
        cleanupTempDir(meta.tempDirPath)
    }

    acceptableMultiPartUploadIds.delete(uploadId)
    return true
}

function cleanupTempDir(path: string) {
    if (fs.existsSync(path)) fs.rmSync(path, { recursive: true })
}

function includeMethod(method: string, methods: string[]) {
    return methods.includes(method)
}
