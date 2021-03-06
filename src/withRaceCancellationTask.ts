import combineRaceCancellation from "./combineRaceCancellation";
import {
  CancellableTask,
  Cancellation,
  OptionallyCancellableTask,
  RaceCancellation,
} from "./interfaces";
import newRaceCancellation from "./newRaceCancellation";
import withRaceSettled from "./withRaceSettled";

/**
 * Wrap a cancellable task to pass in a raceCancellation that combines the input raceCancellation
 * with a race against a cancellable cancellation task.
 *
 * ```js
 * async function fetchWithTimeout(url, timeoutMs, outerRaceCancellation) {
 *   const timeoutTask = raceCancellation => cancellableTimeout(timeoutMs, raceCancellation);
 *   const task = raceCancellation => cancellableFetch(url, raceCancellation);
 *   const taskWithTimeout = withRaceCancellableTask(
 *     task,
 *     timeoutTask,
 *     () => newTimeoutCancellation(`fetch did not resolve within ${timeoutMs}`),
 *   );
 *   return await taskWithTimeout(outerRaceCancellation);
 * }
 * ```
 *
 * @param task a cancellable task
 * @param cancellationTask a cancellable cancellation task, either resolves as void
 *                         or it resolves in a `Cancellation`, if void, it will default
 *                         the creating the default `Cancellation` or the provided
 *                         `newCancellation` argument.
 * @param newCancellation optional function for creating a `Cancellation`
 */
export default function withRaceCancellationTask<Result>(
  task: CancellableTask<Result>,
  cancellationTask: CancellableTask<void | Cancellation>,
  cancellationMessage?: string,
  cancellationKind?: string
): OptionallyCancellableTask<Result> {
  return withRaceSettled((raceCancellation: RaceCancellation) =>
    task(
      // combination allows the outer cancellation to avoid starting the task
      // if it is already cancelled since cancellationTask will always start
      // the raced task because it doesn't have a way to peek the completion
      combineRaceCancellation(
        raceCancellation,
        newRaceCancellation(
          () => cancellationTask(raceCancellation),
          cancellationMessage,
          cancellationKind
        )
      )
    )
  );
}
