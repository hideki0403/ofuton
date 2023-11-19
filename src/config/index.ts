import * as fs from 'fs'
import * as yaml from 'js-yaml'
import appRootPath from 'app-root-path'
import deepmerge from 'deepmerge'
import type { Config } from './types'

const config = yaml.load(fs.readFileSync(appRootPath.resolve('config.yml'), 'utf8'), {
    schema: yaml.FAILSAFE_SCHEMA
}) as Config

const fallbackConfig: Config = {
    port: '3000',
    storage: {
        path: './bucket',
        maxUploadSize: '10MB'
    },
    account: {
        accessKey: '',
        secretKey: ''
    }
}

export default deepmerge(fallbackConfig, config)