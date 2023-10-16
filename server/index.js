import dotenv from 'dotenv'
import express from 'express'
import logger from 'morgan'

import { createServer } from 'node:http'
import { Server } from 'socket.io'

import { createClient } from '@libsql/client'

dotenv.config()
const PORT = process.env.PORT ?? 1234

// App de Express
const app = express()
// Router
const router = express.Router()
// Server Http
const server = createServer(app)
// Server WebSocket
const io = new Server(server, {
  // Recupera los mensajes que no se han recibido durante un periodo de tiempo por una posible
  // caida de conexión sin necesidad de persistir los msg en una base de datos.
  connectionStateRecovery: {}
})
// DB Conection (SQLite)
const db = createClient({
  url: 'libsql://grown-pestilence-nheil3dev.turso.io',
  authToken: process.env.DB_TOKEN
})

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    content TEXT
  )
`)

io.on('connection', async (socket) => {
  console.log('A user has connected!')

  // Cuando se desconecta un usuario
  socket.on('disconnect', () => {
    console.log('An user has disconected')
  })

  // Cuando recibimos mensajes
  socket.on('chat message', async (msg) => {
    // console.log('Message:', msg)
    let result
    // Recuperamos el usuario
    const user = socket.handshake.auth.user ?? 'anonymous'
    try {
      result = await db.execute({
        sql: 'INSERT INTO messages (user, content) VALUES (?, ?)',
        args: [user, msg]
      })
    } catch (e) {
      console.error(e)
      return
    }
    // lo emitimos a todos los usuarios
    io.emit('chat message', msg, result.lastInsertRowid.toString(), user)
  })

  // Comprobamos que haya recibido todos los mensajes
  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: 'SELECT * FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0] // <-- Recuperamos el serverOffset del cliente
      })

      // Es importante emitir a nivel socket (usuario) y no io que seria para todos los clientes
      results.rows.forEach(({ id, user, content }) => {
        socket.emit('chat message', content, id.toString(), user)
      })
    } catch (e) {
      console.error(e)
    }
  }
})

// Middlewares

app.use(logger('dev'))

// Router

router.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html')
})

router.get('/style', (req, res) => {
  res.sendFile(process.cwd() + '/client/src/style.css')
})

router.get('/js', (req, res) => {
  res.sendFile(process.cwd() + '/client/src/index.js')
})

app.use('/', router)

server.listen(PORT, () => {
  console.log(`Listening on: http://localhost:${PORT}`)
})
