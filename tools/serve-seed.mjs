import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'

const seedUrl = new URL('../supabase/seed-recipes.sql', import.meta.url)
createServer((_request, response) => {
  response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  createReadStream(seedUrl).pipe(response)
}).listen(48921, '127.0.0.1')
