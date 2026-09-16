const encodeFilePath = (filePath: string) => {
  return encodeURI(filePath.replace(/\\/g, "/"))
    .replace(/#/g, "%23")
    .replace(/\?/g, "%3F")
    .replace(/\u0026/g, "%26");
};

export const toFileUrl = (filePath: string): string => {
  const normalizedPath = encodeFilePath(filePath);

  if (normalizedPath.startsWith("//")) {
    return `file:${normalizedPath}`;
  }

  if (/^[A-Za-z]:\//.test(normalizedPath)) {
    return `file:///${normalizedPath}`;
  }

  if (normalizedPath.startsWith("/")) {
    return `file://${normalizedPath}`;
  }

  return `file:///${normalizedPath}`;
};
