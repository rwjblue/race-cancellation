import { Cancellation, cancellationBrand } from "./interfaces";

/**
 * Test whether an unknown result is a Cancellation of the specified kind.
 *
 * ```js
 * if (isCancellation(result, CancellationKind.Timeout)) {
 *   // retry
 * }
 * ```
 *
 * @param result
 * @param kind
 */
export default function isCancellation<Kind extends string>(
  result: unknown,
  kind: Kind
): result is Cancellation<Kind>;

/**
 * Test whether an unknown result is a Cancellation.
 * @param result
 */
export default function isCancellation(result: unknown): result is Cancellation;

export default function isCancellation(
  result: unknown,
  kind?: string
): result is Cancellation {
  return (
    typeof result === "object" &&
    result !== null &&
    cancellationBrand in result &&
    (kind === undefined || kind === (result as Cancellation).kind)
  );
}
