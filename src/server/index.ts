import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import koaLogger from 'koa-logger'

import config from '@/config'
import * as logger from '@/utils/logger'

const log = logger.getLogger('server')
const router = new Router()
const app = new Koa()

export default function () {
    app.use(koaLogger(logs => {
        log.trace(logs)
    }))

    // create routing

    // Object.keys(Routes.get).forEach((path) => {
    //     router.get(path, Routes.get[path])
    // })

    // Object.keys(Routes.post).forEach((path) => {
    //     router.post(path, Routes.post[path])
    // })

    router.all('(.*)', async (ctx) => {
        console.log(ctx.request.body)
    })

    app.use(bodyParser())

    app.use(router.routes())
    app.use(router.allowedMethods())
    // end

    app.listen(config.port, () => {
        log.info(`Server listening on port ${config.port}`)
    })
}