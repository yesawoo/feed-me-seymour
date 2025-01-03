function sayHelloPiss(): void {
  const phrases = [
    'Ah, the golden greeting of the day: Hello, Piss!',
    'Breaking the seal of silence: Hello, Piss!',
    "Yellow there! It's 'Hello, Piss!'",
    'Hydration station says: Hello, Piss!',
    'Stream of consciousness initiated: Hello, Piss!',
  ]

  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)]

  console.log(randomPhrase)
}

sayHelloPiss()
