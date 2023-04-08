import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'path'
import bytes from 'bytes'

import config from '@/config'
import * as logger from '@/utils/logger'

import objects from './objects'

const log = logger.getLogger('server')

export default async function () {
    const app = Fastify({
        bodyLimit: bytes(config.storage.maxUploadSize)
    })

    app.register(fastifyStatic, {
        root: path.resolve(config.storage.path),
        prefix: '/'
    })

    app.addContentTypeParser('*', { parseAs: 'buffer' }, function (_, payload, done) {
        done(null, payload)
    })

    app.all('/:bucket/*', objects)

    app.listen({ port: Number(config.port) || 3000 }, (err, address) => {
        if (err) {
            log.error(err)
            process.exit(1)
        }

        log.info(`Server listening at ${address}`)
    })
}