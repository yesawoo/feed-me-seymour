import * as zmq from 'zeromq'

console.log('Workers starting up')

async function run() {
  const sock = new zmq.Pull()

  sock.connect('tcp://127.0.0.1:5678')
  console.log('Worker connected to port 5678')

  for await (const [msg] of sock) {
    const event = JSON.parse(msg.toString())
    if (event.record.langs?.includes('en')) {
      console.log(event.record.text.trim())
    } else {
      console.log('Record does not contain English')
    }
  }
}

run()
