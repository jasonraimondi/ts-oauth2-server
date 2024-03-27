export function urlsAreSameIgnoringPort(url1: string, url2: string): boolean {
  try {
    const parsedUrl1 = new URL(url1);
    const parsedUrl2 = new URL(url2);

    // Compare protocol, hostname, and pathname to ensure URLs are the same, ignoring port
    return (
      parsedUrl1.protocol === parsedUrl2.protocol &&
      parsedUrl1.hostname === parsedUrl2.hostname &&
      parsedUrl1.pathname === parsedUrl2.pathname
    );
  } catch (error) {
    return false;
  }
}
