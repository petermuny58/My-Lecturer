/**
 * Rewrites academic text using Zambian analogies and slang (dictionary-based).
 */

const zedDictionary: Record<string, string> = {
  loop: 'Minibus conductors going round the route again and again',
  loops: 'Minibus conductors on repeat — same route, same hustle',
  iteration: 'another lap like a minibus conductor',
  'for loop': 'a minibus conductor counting each passenger',
  'while loop': 'stopping when the conductor says "last one"',
  variable: 'a Kantemba shelf — small storage for one thing at a time',
  variables: 'Kantemba boxes — each one holds something small',
  memory: 'Kantemba storage — tight but it works',
  array: 'a row of Kantemba stalls — each slot has its goods',
  'data structure': 'how you pack your Kantemba',
  stack: 'plates at a wedding — last in, first out',
  queue: 'people lining up at a bus stop',
  recursion: 'calling yourself like asking your cousin who asks your cousin',
  function: 'a choreographed dance move the program can repeat',
  algorithm: 'the route map before you enter town',
  database: 'the big market warehouse where records sleep',
  cache: 'keeping change in your pocket for speed',
  'binary search': 'splitting the chitenge like you are halving the price',
  'time complexity': 'how long the minibus takes per lap',
  'space complexity': 'how many Kantemba shelves you need',
  pointer: 'a conductor pointing which stop is next',
  class: 'a family name — everyone under it shares traits',
  object: 'one person in that family',
  inheritance: 'picking up your elder sibling’s hustle',
  polymorphism: 'same greeting, different tribe — same idea, different shape',
  abstraction: 'hiding the wiring like a neat dashboard',
  encapsulation: 'locking your Kantemba so no one tampers',
  compiler: 'the translator at the border making sure language matches',
  syntax: 'grammar — if you miss a comma, the bouncer bounces you',
  bug: 'a pothole on the Great East Road',
  debug: 'filling the pothole before the bus drops',
  server: 'the kitchen — requests are orders, responses are plates',
  client: 'the customer shouting their order through the window',
  api: 'the menu board — tells you what you can order',
  network: 'the string of minibus routes connecting towns',
  security: 'padlocks on the Kantemba at night',
  encryption: 'writing your diary in Nyanja only your cousin understands',
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Takes a normal academic sentence and rewrites known terms using Zambian analogies.
 */
export function translateToZedStyle(text: string): string {
  if (!text || !text.trim()) return text;

  let out = text;
  const keys = Object.keys(zedDictionary).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const replacement = zedDictionary[key];
    const re = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'gi');
    out = out.replace(re, (match) => {
      const isTitleCase = match[0] === match[0].toUpperCase() && match.slice(1) !== match.slice(1).toUpperCase();
      const phrase = replacement;
      if (isTitleCase && phrase.length > 0) {
        return phrase.charAt(0).toUpperCase() + phrase.slice(1);
      }
      return phrase;
    });
  }

  if (out === text) {
    return `${text.trim()} (Zed spice: think Kantemba for storage, minibus routes for loops.)`;
  }

  return out;
}
