import { db } from './index'

import * as logger from '@/utils/logger'
const log = logger.getLogger('database')

export type S3Object = {
    id: string,
    bucket: string,
    key: string,
    mime: string,
    filename: string,
    size: number
}

export function putObject(props: {
    bucket: string
    key: string
    mime: string
    filename: string
    size: number
}) {
    try {
        db.prepare('INSERT INTO objects (id, bucket, key, mime, filename, size) VALUES (?, ?, ?, ?, ?, ?)').run([
            `${props.bucket}/${props.key}`,
            props.bucket,
            props.key,
            props.mime,
            props.filename,
            props.size
        ])

        log.info(`Created object: ${props.bucket} - ${props.key} (${props.size} bytes)`)
    } catch (err: any) {
        if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            log.info(`Object already exists: ${props.bucket} - ${props.key}`)
        } else {
            log.error(`Failed to create object: ${props.bucket} - ${props.key}`)
            log.error(err.code)
        }
    }
}

export function deleteObject(props: {
    bucket: string
    key: string
}) {
    db.prepare('DELETE FROM objects WHERE bucket = ? AND key = ?').run([
        props.bucket,
        props.key
    ])

    log.info(`Deleted object: ${props.bucket} - ${props.key}`)
}

export function getObject(props: {
    bucket: string
    key: string
}) {
    return db.prepare('SELECT * FROM objects WHERE bucket = ? AND key = ?').get([
        props.bucket,
        props.key
    ]) as unknown as S3Object | undefined
}