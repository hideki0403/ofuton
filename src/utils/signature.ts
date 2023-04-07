import { createHmac, createHash } from 'crypto'
import { FastifyRequest } from 'fastify'

function getComponents(auth: string) {
    const map: [string, string][] = auth.split(' ').slice(1).join('').split(',').map((component) => {
        const [key, ...value] = component.split('=')
        return [key, value.join('=')]
    })

    return new Map(map)
}

function getQueryString(query: { [key: string]: string }) {
    return Object.entries(query).filter(([param]) => param !== 'X-Amz-Signature')
        .map(([param, value]) => [param, value].map(encodeURIComponent).join('='))
        .sort()
        .join('&')
}

function getStringToSign(request: FastifyRequest, credential: string[], signedHeaders: string[]) {
    const canonicalHeaders = signedHeaders.map((header) => `${header}:${request.headers[header]}\n`).join('')
    const contentHash = request.headers['x-amz-content-sha256'] || 'UNSIGNED-PAYLOAD'
    const canonicalRequestString = [
        request.method,
        request.url.replace(/\?.*/, ''),
        getQueryString(request.query as any),
        canonicalHeaders,
        signedHeaders.join(';'),
        contentHash
    ].join('\n')

    return [
        'AWS4-HMAC-SHA256',
        request.headers['x-amz-date'],
        [
            credential[1],
            credential[2],
            credential[3],
            credential[4]
        ].join('/'),
        createHash('sha256').update(canonicalRequestString).digest('hex'),
    ].join('\n')
}

export function verifySignature(request: FastifyRequest, accessKey: string, secretKey: string) {
    const components = getComponents(request.headers.authorization as string)
    const signature = components.get('Signature')
    const credential = components.get('Credential')?.split('/') // [AccessKey, Date, Region, Service]

    if (!signature || !credential) {
        return false
    }

    if (credential[0] !== accessKey) {
        return false
    }

    const stringToSign = getStringToSign(request, credential, components.get('SignedHeaders')?.split(';') || [])

    const dateKey = createHmac('sha256', 'AWS4' + secretKey).update(credential[1]).digest()
    const regionKey = createHmac('sha256', dateKey).update(credential[2]).digest()
    const serviceKey = createHmac('sha256', regionKey).update(credential[3]).digest()
    const signingKey = createHmac('sha256', serviceKey).update(credential[4]).digest()

    const calculatedSignature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex')

    return signature === calculatedSignature
}