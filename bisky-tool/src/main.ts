/**
 * Some predefined delay values (in milliseconds).
 */
export enum Delays {
  Short = 500,
  Medium = 2000,
  Long = 5000,
}

/**
 * Returns a Promise<string> that resolves after a given time.
 *
 * @param {string} name - A name.
 * @param {number=} [delay=Delays.Medium] - A number of milliseconds to delay resolution of the Promise.
 * @returns {Promise<string>}
 */
function delayedHello(
  name: string,
  delay: number = Delays.Medium,
): Promise<string> {
  return new Promise((resolve: (value?: string) => void) =>
    setTimeout(() => resolve(`Hello, ${name}`), delay),
  );
}

// Please see the comment in the .eslintrc.json file about the suppressed rule!
// Below is an example of how to use ESLint errors suppression. You can read more
// at https://eslint.org/docs/latest/user-guide/configuring/rules#disabling-rules

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-explicit-any
export async function greeter(name: any) {
  // The name parameter should be of type string. Any is used only to trigger the rule.
  return await delayedHello(name, Delays.Long);
}

import { AtpAgent } from '@atproto/api'

// console.log("test " + await greeter("bork"));
const agent = new AtpAgent({
  service: 'https://bsky.social'
})

const response = await agent.login({
  identifier: "buddyinu.bsky.social",
  password: process.env.BSKY_PASSWORD,
});

if (response.success) {
  console.log('Login successful');
} else {
  console.error('Login failed', response);
  throw new Error('Login failed');
}
const bork = await agent.app.bsky.feed.getFeedSkeleton(
  { feed: 'at://did:plc:ziduwz64yj7sjsw45mckd2bg/app.bsky.feed.generator/whats-alf', limit: 10 }
);
console.log(bork);