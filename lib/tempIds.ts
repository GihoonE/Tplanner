let nextTempHomeworkId = -1;

/** IDs below zero exist only in client state until a session save succeeds. */
export function makeTempHomeworkId() {
  return nextTempHomeworkId--;
}
