/** Same rule as the backend: r:a is granted by r:a, r:*, *:a or *:*. */
export function grants(held: readonly string[], required: string): boolean {
  const [resource, action] = required.split(':');
  return (
    held.includes(required) ||
    held.includes(`${resource}:*`) ||
    held.includes(`*:${action}`) ||
    held.includes('*:*')
  );
}
