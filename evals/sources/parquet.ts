import { parquetReadObjects } from "hyparquet";
import { HarnessError } from "../cases";
import { readPinned } from "./fetch";

export async function readParquet(
  path: string,
  digest: string,
  columns: readonly string[],
): Promise<Record<string, unknown>[]> {
  const data = await readPinned(path, digest);
  const file = new Uint8Array(data).buffer;
  try {
    return await parquetReadObjects({ file, columns: [...columns] });
  } catch {
    // The reader's own message may quote cell contents.
    throw new HarnessError(`Unreadable Parquet file: ${path}`);
  }
}
