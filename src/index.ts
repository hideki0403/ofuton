import * as database from '@/database'
import server from '@/server'
import createIndex from '@/scripts/create-index'

database.init()

if (process.argv.includes('--create-index')) {
    createIndex()
} else {
    server()
}