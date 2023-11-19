import type { FastifyReply, FastifyRequest } from 'fastify'
import fs from 'fs'
import path from 'path'
import * as xmlParser from 'js2xmlparser'
import crypto from 'crypto'
import os from 'os'

import config from '@/config'
import * as stream from '@/utils/stream'
import * as signature from '@/utils/signature'
import * as logger from '@/utils/logger'

type UploadMeta = {
    timerId: NodeJS.Timeout,
    tempDirPath: string,
}

const log = logger.getLogger('bucket')
const acceptableMultiPartUploadIds = new Map<string, UploadMeta>()

export default async function(req: FastifyRequest, res: FastifyReply) {
    const query = req.query as Record<string, string | undefined>
    const params = req.params as Record<string, string | undefined>
    const bucket = params.bucket
    const key = params['*']

    log.debug(`${req.method} ${req.url}`)

    // バケット名とキーが指定されているかチェック
    // ディレクトリトラバーサルできそうなパスは弾く
    if (!bucket || !key || bucket.includes('..') || key.includes('..')) {
        return res.status(400).send('Bad request')
    }

    const filePath = path.join(config.storage.path, bucket, key)
    const fileDir = path.dirname(filePath)

    // AccessKey, SecretKeyをチェック
    if (!signature.verifySignature(req, config.account.accessKey, config.account.secretKey)) {
        return res.status(403).send('Forbidden')
    }

    // POST, PUTでのリクエスト時はディレクトリの存在チェックを行う
    if (includeMethod(req.method, ['POST', 'PUT']) && !fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true })
    }

    // x-idクエリが指定されているかチェック
    if (!query['x-id']) {
        return res.status(400).send('"x-id" query is required')
    }

    switch (query['x-id']) {
        case 'PutObject': {
            fs.writeFileSync(filePath, req.body as Buffer)
            log.info(`Created object: ${bucket} - ${key} (${req.headers['content-length']} bytes)`)
            return res.send()
        }

        case 'DeleteObject': {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
            log.info(`Deleted object: ${bucket} - ${key}`)
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
                tempDirPath
            })

            log.debug(`Created multipart upload: ${uploadId}`)

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

            log.info(`Uploaded part: ${uploadId} / ${partNumber} (${body.length} bytes)`)

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

            log.info(`Completed multipart upload: ${uploadId}`)

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

            log.info(`Aborted multipart upload: ${uploadId}`)

            cleanupMultiPartUploads(uploadId)
            return res.send()
        }

        default: {
            return res.status(400).send('Unknown type')
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
