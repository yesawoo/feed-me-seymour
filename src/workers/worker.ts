import * as zmq from 'zeromq'

console.log('Workers starting up')

async function run() {
  const sock = new zmq.Pull()

  sock.connect('tcp://127.0.0.1:5678')
  console.log('Worker connected to port 5678')

  for await (const [msg] of sock) {
    console.log('work: %s', msg.toString())
  }
}

run()
