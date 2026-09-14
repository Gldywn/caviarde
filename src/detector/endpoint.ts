/** The port the managed container must publish on, or null when the preference
 * names something this command cannot serve. The accepted set has to equal what
 * `containerArgs` binds, plain HTTP on 127.0.0.1: publishing one address while
 * polling another reports a failure for a detector that is running perfectly. */
export function loopbackPort(baseUrl: string): number | null {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "http:") return null;
  if (url.hostname !== "127.0.0.1") return null;
  // The health probe appends /health to the preference as written, so anything
  // before the path, or after it, would be probed at the wrong address.
  if (url.pathname !== "/") return null;
  if (url.search !== "" || url.hash !== "") return null;
  if (url.username !== "" || url.password !== "") return null;

  const port = url.port === "" ? 80 : Number(url.port);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : null;
}
