export const APP_NAME = "Monyr";
export const APP_DOMAIN = "monyr.xyz";

export function appUrl(path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${APP_DOMAIN}${normalizedPath}`;
}

export function handleUrl(handle: string, path = "") {
  const normalizedHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";

  return appUrl(`${normalizedHandle}${normalizedPath}`);
}
