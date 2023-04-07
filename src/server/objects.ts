import type { FastifyReply, FastifyRequest } from 'fastify'
import fs from 'fs'
import path from 'path'
import * as xmlParser from 'js2xmlparser'
import crypto from 'crypto'
import os from 'os'

import config from '@/config'
import * as signature from '@/utils/signature'
import * as logger from '@/utils/logger'

export default function(req: FastifyRequest, res: FastifyReply) {
    const query = req.query as Record<string, string | undefined>
    const params = req.params as Record<string, string | undefined>
    const bucket = params.bucket
    const key = params['*']

    console.log(req.method, req.url)

    // メソッドチェック
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
        return res.status(405).send('Method Not Allowed')
    }

    // バケット名とキーが指定されているかチェック
    if (!bucket || !key) {
        return res.status(400).send('Bad request')
    }

    const filePath = path.join(config.storage.path, bucket, key)
    const fileDir = path.dirname(filePath)

    // GETリクエストならファイルを返す
    if (req.method === 'GET') {
        return res.sendFile(path.join(bucket, key))
    }

    // POST, PUTでのリクエスト時はディレクトリの存在チェックを行う
    if (['POST', 'PUT'].includes(req.method) && !fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true })
    }

    // POST, PUT, DELETEでのリクエスト時はAccessKey, SecretKeyのチェックを行う
    if (!signature.verifySignature(req, config.account.accessKey, config.account.secretKey)) {
        return res.status(403).send('Forbidden')
    }

    switch (query['x-id']) {
        case 'PutObject': {
            return fs.writeFileSync(filePath, req.body as Buffer)
        }

        case 'DeleteObject': {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
            return res.send()
        }

        case 'CreateMultipartUpload': {
            const uploadId = crypto.randomBytes(16).toString('hex')

            fs.mkdirSync(path.join(os.tmpdir(), `ofuton-${uploadId}`), { recursive: true })

            return res.send(xmlParser.parse('InitiateMultipartUploadResult', {
                Bucket: bucket,
                Key: key,
                UploadId: uploadId
            }))
        }

        case 'UploadPart': {
            const { uploadId, partNumber } = query
            const body = req.body as Buffer

            if (!uploadId || !partNumber) {
                return res.status(400).send('Bad request')
            }

            const partFilePath = path.join(os.tmpdir(), `ofuton-${uploadId}`, `${uploadId}.${partNumber}`)
            fs.writeFileSync(partFilePath, body)

            res.header('ETag', `"${crypto.createHash('md5').update(body).digest('hex')}"`)

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

            const partFiles = fs.readdirSync(partDirPath).sort()

            // TODO: パートファイルを結合する

            return res.send(xmlParser.parse('CompleteMultipartUploadResult', {
                Location: req.url.split('?')[0],
                Bucket: bucket,
                Key: key,
                ETag: 'TODO'
            }))
        }

        case 'AbortMultipartUpload': {
            // TODO
        }

        default: {
            return
        }
    }
}
