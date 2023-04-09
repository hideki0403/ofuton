import type { FastifyReply, FastifyRequest } from 'fastify'

import * as database from '@/database/controller'

export default async function(req: FastifyRequest, res: FastifyReply) {
    const stat = database.bucketStat({ bucket: (req.params as any).bucket })
    return res.send({
        objects: stat.objects,
        totalSize: stat.totalSize,
    })
}