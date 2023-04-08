import sqlite3 from 'better-sqlite3'

export const db = sqlite3('database.sqlite3')
export function init() {
    db.prepare('CREATE TABLE IF NOT EXISTS objects (id TEXT PRIMARY KEY, bucket TEXT, key TEXT, mime TEXT, filename TEXT, size INTEGER)').run()
}