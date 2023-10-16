import { io } from 'https:/cdn.socket.io/4.3.2/socket.io.esm.min.js'

const getUserName = async () => {
  const username = window.localStorage.getItem('user_chat')
  if (username) {
    return username
  }
  return 'Anonymous'
}

// El serverOffset nos permite saber el último mensaje que ha recibido el usuario
// Dentro de auth le podria pasar un token, el usuario, etc ya que esto es info que
// siempre va pegada en todos los mensajes.
const socket = io({
  auth: {
    user: await getUserName(),
    serverOffset: 0
  }
})

const form = document.getElementById('form')
const input = document.getElementById('input')
const messages = document.getElementById('messages')

// Escucha que se reciban mensajes
// serverOffset sería el id del mensaje en la bd
socket.on('chat message', (msg, serverOffset, user) => {
  // Comprobar que el último mensajes lo escribió el mismo usuario
  const lastUser = document
    .querySelector('#messages li:last-child small')
    ?.innerText?.slice(0, -2)
  console.log(lastUser)
  if (lastUser === user) {
    const lastMsg = document.querySelector('#messages li:last-child')
    const newLine = document.createElement('p')
    newLine.append(msg)
    lastMsg.appendChild(newLine)
  } else {
    const item = document.createElement('li')
    const text = document.createElement('p')
    const userName = document.createElement('small')

    userName.innerText = `${user}:\n`
    item.appendChild(userName)
    text.append(msg)
    item.appendChild(text)
    messages.appendChild(item)
  }

  // Actualizamos el último mensaje que ha recibido
  socket.auth.serverOffset = serverOffset

  // Scroll to bottom
  messages.scrollTop = messages.scrollHeight
})

// Evento para enviar mensajes
form.addEventListener('submit', async (ev) => {
  ev.preventDefault()

  if (input.value) {
    socket.emit('chat message', input.value)
    input.value = ''
  }
})
