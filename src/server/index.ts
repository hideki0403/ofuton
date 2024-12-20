import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import appRootPath from 'app-root-path'
import bytes from 'bytes'

import config from '@/config'
import * as logger from '@/utils/logger'

import objects from './objects'

const log = logger.getLogger('server')

export default async function () {
    const app = Fastify({
        bodyLimit: bytes(config.storage.maxUploadSize)
    })

    app.setErrorHandler((err, req, res) => {
        log.error(`RequestID: ${req.id},`, err)
        res.status(500).send(`Internal Server Error (RequestID: ${req.id})`)
    })

    app.addContentTypeParser('*', { parseAs: 'buffer' }, function (_, payload, done) {
        done(null, payload)
    })

    app.register(fastifyStatic, {
        root: appRootPath.resolve(config.storage.path),
        immutable: true,
        maxAge: '1y',
    })

    app.route({
        url: '/robots.txt',
        method: 'GET',
        handler: (_, res) => {
            res.type('text/plain').send('User-agent: *\nDisallow: /')
        }
    })

    app.route({
        url: '/:bucket/*',
        method: ['POST', 'PUT', 'DELETE'],
        handler: objects,
    })

    app.addHook('onResponse', (req, res) => {
        if (!(req.method === 'GET' || req.method === 'HEAD')) return
        log.info(`${req.method} ${res.statusCode} ${req.url} (${res.elapsedTime.toFixed(1)}ms)`)
    })

    const port = Number(config.port)
    app.listen({
        port: isNaN(port) ? 3000 : port,
        host: '0.0.0.0'
    }, (err, address) => {
        if (err) {
            log.error(err)
            process.exit(1)
        }

        log.info(`Server listening at ${address}`)
    })
}
