export type Config = {
    port: string
    storage: {
        path: string
        maxUploadSize: string
    }
    account: {
        accessKey: string
        secretKey: string
    }
}