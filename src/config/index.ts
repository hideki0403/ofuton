import * as fs from 'fs'
import * as yaml from 'js-yaml'
import rootPath from 'app-root-path'
import deepmerge from 'deepmerge'
import type { Config } from './types'

const config = yaml.load(fs.readFileSync(rootPath.resolve('config.yml'), 'utf8')) as Config

const fallbackConfig: Config = {
    port: 3000,
}

export default deepmerge(fallbackConfig, config)