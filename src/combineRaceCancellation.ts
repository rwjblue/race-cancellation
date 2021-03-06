import { RaceCancellation } from "./interfaces";
import noopRaceCancellation from "./noopRaceCancellation";

/**
 * Returns a RaceCancellation that is the combination of two RaceCancellation implemenations.
 *
 * For convenience of writing methods that take cancellations, the params
 * are optional. If a is undefined, then b is retuned, if b is undefined then a
 * is returned, and if they both are undefined a noop race that just invokes
 * the task is returned.
 */
export default function combineRaceCancellation(
  a: RaceCancellation | undefined,
  b: RaceCancellation | undefined
): RaceCancellation {
  return a === undefined
    ? b === undefined
      ? noopRaceCancellation
      : b
    : b === undefined
    ? a
    : task => a(() => b(task));
}
