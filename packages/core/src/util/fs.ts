import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Writes a file atomically: data is written to a uniquely named temp file in the
 * same directory, then `rename`d into place. Because `rename` within a directory
 * is atomic, a concurrent reader never observes a partially written file, and
 * two writers cannot corrupt each other. Parent directories are created as
 * needed.
 *
 * Used by both the object store and the ref store — every durable write in the
 * engine goes through here.
 */
export async function writeFileAtomic(
  file: string,
  data: Buffer | string,
): Promise<void> {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });

  const tmp = path.join(dir, `tmp-${randomUUID()}`);
  await fs.writeFile(tmp, data);
  try {
    await fs.rename(tmp, file);
  } catch (error) {
    await fs.rm(tmp, { force: true });
    throw error;
  }
}
