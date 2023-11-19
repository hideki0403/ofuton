import pino from 'pino'

export function getLogger(name: string) {
    return pino({
        transport: {
            target: 'pino-pretty',
            options: {
                ignore: 'pid,hostname',
            },
        },
        name,
    })
}