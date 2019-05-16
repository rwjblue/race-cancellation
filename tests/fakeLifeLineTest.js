// @ts-nocheck
const { cancellableRace, throwIfCancelled } = require("race-cancellation");

// BEGIN simulated ember-lifeline APIs
let CLEANUP = new WeakMap();
function addDestroyable(obj, cleanupFn) {
  let destroyables = CLEANUP.get(obj);
  if (destroyables === undefined) {
    destroyables = [];
    CLEANUP.set(obj, destroyables);
  }

  destroyables.push(cleanupFn);
}

function runDestroyables(obj) {
  let destroyables = CLEANUP.get(obj);
  if (destroyables !== undefined) {
    destroyables.forEach(fn => fn());
  }
}

// END simulated ember-lifeline APIS

// fake object model with a builtin destroy method
class CoolBaseClass {
  isDestroyed = false;

  destroy() {
    this.isDestroyed = true;

    runDestroyables(this);
  }
}

QUnit.module("Promises entangled with object lifetime", () => {
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  QUnit.module("entangling function callback lazily", function() {
    async function entangle(obj, promise, executor) {
      const [raceCancellation, cancel] = cancellableRace();

      addDestroyable(obj, cancel);

      return promise.then(
        async result => await raceCancellation(() => executor(result))
      );
    }

    QUnit.test(
      "returns a promise that functions properly when not destroyed",
      async function(assert) {
        class Child extends CoolBaseClass {
          doStuff() {
            return entangle(this, sleep(50), () =>
              assert.step("promise resolved")
            );
          }
        }

        let obj = new Child();

        await obj.doStuff();

        await sleep(100);

        assert.verifySteps(["promise resolved"]);
      }
    );

    QUnit.test("it can avoid work pending when destroyed", async function(
      assert
    ) {
      class Child extends CoolBaseClass {
        doStuff() {
          return entangle(this, sleep(50), () =>
            assert.step("promise resolved")
          );
        }
      }

      let obj = new Child();

      setTimeout(() => obj.destroy(), 5);

      await obj.doStuff();

      await sleep(100);

      assert.verifySteps([]);
    });
  });

  QUnit.module("entangling promise directly", function() {
    async function entangle(obj, promise) {
      const [raceCancellation, cancel] = cancellableRace();

      addDestroyable(obj, cancel);

      return throwIfCancelled(await raceCancellation(() => promise));
    }

    QUnit.test(
      "returns a promise that functions properly when not destroyed",
      async function(assert) {
        class Child extends CoolBaseClass {
          doStuff() {
            return entangle(this, sleep(50)).then(() =>
              assert.step("promise resolved")
            );
          }
        }

        let obj = new Child();

        await obj.doStuff();

        await sleep(100);

        assert.verifySteps(["promise resolved"]);
      }
    );

    QUnit.test("it can avoid work pending when destroyed", async function(
      assert
    ) {
      class Child extends CoolBaseClass {
        doStuff() {
          return entangle(this, sleep(50)).then(() =>
            assert.step("promise resolved")
          );
        }
      }

      let obj = new Child();

      setTimeout(() => obj.destroy(), 5);

      try {
        await obj.doStuff();
      } catch (e) {
        // 🤔
      }

      await sleep(100);

      assert.verifySteps([]);
    });

    QUnit.test(
      "any finalization work can still be done when destroyed",
      async function(assert) {
        class Child extends CoolBaseClass {
          doStuff() {
            return entangle(this, sleep(15))
              .then(() => assert.step("promise resolved"))
              .finally(() => assert.step("finally called"));
          }
        }

        let obj = new Child();

        setTimeout(() => obj.destroy(), 5);

        try {
          await obj.doStuff();
        } catch (e) {
          // 🤔
        }
        await sleep(100);

        assert.verifySteps(["finally called"]);
      }
    );
  });
});
