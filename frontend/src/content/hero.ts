// Built-in hero images. Drop files into src/assets/hero/ named
//   desktop.(jpg|jpeg|webp)  – a wide/landscape photo, shown at 768px and up
//   mobile.(jpg|jpeg|webp)   – a tall/portrait photo, shown on phones
// Vite bundles and fingerprints them at build time, so they load without waiting on the API.
const files = import.meta.glob('../assets/hero/*.{jpg,jpeg,webp,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const find = (name: string) =>
  Object.entries(files).find(([path]) => path.split('/').pop()!.startsWith(name))?.[1];

export const heroDesktop = find('desktop');
export const heroMobile = find('mobile');
