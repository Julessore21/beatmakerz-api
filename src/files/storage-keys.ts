/** Références de fichiers : `r2:<clé>` dans R2, ou ancienne adresse http(s) FileUp. */
export const R2_PREFIX = 'r2:';

/** Seules les pochettes sont lisibles sans achat. */
const PUBLIC_DIRS = ['covers/'];

export const isR2Key = (storageKey: string): boolean =>
  storageKey.startsWith(R2_PREFIX);

export const keyOf = (storageKey: string): string =>
  storageKey.slice(R2_PREFIX.length);

export const isPublicKey = (key: string): boolean =>
  !key.includes('..') && PUBLIC_DIRS.some((dir) => key.startsWith(dir));

/**
 * Clé d'objet propre et unique : chemin logique conservé, caractères sûrs
 * seulement, suffixe aléatoire avant l'extension (un nouvel envoi ne
 * remplace jamais l'ancien fichier).
 * `beats/123/cover.jpg` devient `covers/123/cover-ab12cd34.jpg`.
 */
export function objectKey(name: string, suffix: string): string {
  const parts = name
    .split('/')
    .map((p) =>
      p
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-')
        .replace(/^[.-]+|-+$/g, ''),
    )
    .filter((p) => p && p !== '.' && p !== '..');
  let path = parts.length ? parts.join('/') : 'file';
  // Une pochette va dans covers/ pour être servie publiquement.
  const cover = path.match(/^beats\/([^/]+)\/cover(\.[\w]+)?$/);
  if (cover) path = `covers/${cover[1]}/cover${cover[2] ?? ''}`;
  const dot = path.lastIndexOf('.');
  const slash = path.lastIndexOf('/');
  return dot > slash + 1
    ? `${path.slice(0, dot)}-${suffix}${path.slice(dot)}`
    : `${path}-${suffix}`;
}
