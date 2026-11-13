// Windows caps a command line near 32K characters; a large change set must scan in batches.
const MAX_FILE_ARG_CHARS = 24_000

export function batchFileArgs(files) {
  const batches = []
  let batch = []
  let length = 0
  for (const file of files) {
    if (batch.length > 0 && length + file.length + 1 > MAX_FILE_ARG_CHARS) {
      batches.push(batch)
      batch = []
      length = 0
    }
    batch.push(file)
    length += file.length + 1
  }
  if (batch.length > 0) {
    batches.push(batch)
  }
  return batches
}
