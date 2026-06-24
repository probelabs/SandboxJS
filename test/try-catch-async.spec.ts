'use strict';
import Sandbox from '../src/Sandbox.js';

const sandbox = new Sandbox();

describe('Try-catch with async/await', () => {
  // =========================================================================
  // BASIC ASYNC ERROR CATCHING
  // =========================================================================

  it('should catch errors from awaited calls that reject', async () => {
    const code = `
      var result;
      try {
        var val = await failingFn();
        result = "should not reach";
      } catch(e) {
        result = "caught: " + e.message;
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => {
        throw new Error("async failure");
      },
    };
    const result = await fn(scope).run();
    expect(result).toBe("caught: async failure");
  });

  it('should catch TypeError after awaited call', async () => {
    const code = `
      var result;
      try {
        var val = await succeedingFn();
        val.nonexistent.property;
        result = "should not reach";
      } catch(e) {
        result = "caught";
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      succeedingFn: async () => {
        return null;
      },
    };
    const result = await fn(scope).run();
    expect(result).toBe("caught");
  });

  it('should execute code after try-catch when error is caught', async () => {
    const code = `
      var result = "before";
      try {
        var val = await failingFn();
      } catch(e) {
        result = "caught";
      }
      result = result + " after";
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => {
        throw new Error("fail");
      },
    };
    const result = await fn(scope).run();
    expect(result).toBe("caught after");
  });

  it('should provide error object in catch variable', async () => {
    const code = `
      var result;
      try {
        await failingFn();
      } catch(e) {
        result = e.message;
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => {
        throw new Error("specific error");
      },
    };
    const result = await fn(scope).run();
    expect(result).toBe("specific error");
  });

  it('should handle try-catch-finally with async', async () => {
    const code = `
      var result = "";
      try {
        await failingFn();
      } catch(e) {
        result = result + "caught ";
      } finally {
        result = result + "finally";
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => {
        throw new Error("fail");
      },
    };
    const result = await fn(scope).run();
    expect(result).toBe("caught finally");
  });

  // =========================================================================
  // SYNC TRY-CATCH REGRESSION TESTS
  // =========================================================================

  it('should handle sync try-catch without async (regression)', () => {
    const code = `
      var result;
      try {
        null.property;
      } catch(e) {
        result = "caught";
      }
      return result;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("caught");
  });

  it('should handle sync try-catch with return from catch', () => {
    const code = `try {a.x.a} catch {return 1}; return 2`;
    const fn = sandbox.compile(code, true);
    const result = fn({ a: {} }).run();
    expect(result).toBe(1);
  });

  it('should handle sync try-catch with exception variable', () => {
    const code = `try { throw new Error("test"); } catch(e) { return e.message; }`;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("test");
  });

  it('should handle sync try-catch with variable assignment in catch', () => {
    const code = `var r = "before"; try { null.x; } catch(e) { r = "caught"; } return r;`;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("caught");
  });

  it('should handle sync try-catch without exception variable', () => {
    const code = `var r; try { null.x; } catch { r = "caught"; } return r;`;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("caught");
  });

  // =========================================================================
  // SYNC TRY-CATCH-FINALLY
  // =========================================================================

  it('should execute finally block after successful try (sync)', () => {
    const code = `
      var result = "";
      try {
        result = result + "try ";
      } finally {
        result = result + "finally";
      }
      return result;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("try finally");
  });

  it('should execute finally block after catch (sync)', () => {
    const code = `
      var result = "";
      try {
        throw new Error("oops");
      } catch(e) {
        result = result + "caught ";
      } finally {
        result = result + "finally";
      }
      return result;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("caught finally");
  });

  it('should run finally even when returning from try (sync)', () => {
    const code = `
      var log = [];
      function test() {
        try {
          log.push("try");
          return "from-try";
        } finally {
          log.push("finally");
        }
      }
      var r = test();
      return log.join(",") + "|" + r;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("try,finally|from-try");
  });

  it('should run finally even when returning from catch (sync)', () => {
    const code = `
      var log = [];
      function test() {
        try {
          throw new Error("e");
        } catch(e) {
          log.push("catch");
          return "from-catch";
        } finally {
          log.push("finally");
        }
      }
      var r = test();
      return log.join(",") + "|" + r;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("catch,finally|from-catch");
  });

  // =========================================================================
  // ASYNC TRY-CATCH-FINALLY EXECUTION ORDER
  // =========================================================================

  it('should execute in correct order: try -> catch -> finally (async)', async () => {
    const code = `
      var log = [];
      try {
        log.push("try");
        await failingFn();
        log.push("after-fail");
      } catch(e) {
        log.push("catch");
      } finally {
        log.push("finally");
      }
      return log.join(",");
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("fail"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("try,catch,finally");
  });

  it('should execute in correct order: try -> finally when no error (async)', async () => {
    const code = `
      var log = [];
      try {
        log.push("try");
        await succeedingFn();
        log.push("after-succeed");
      } catch(e) {
        log.push("catch");
      } finally {
        log.push("finally");
      }
      return log.join(",");
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      succeedingFn: async () => "ok",
    };
    const result = await fn(scope).run();
    expect(result).toBe("try,after-succeed,finally");
  });

  // =========================================================================
  // NESTED TRY-CATCH
  // =========================================================================

  it('should handle nested try-catch (sync)', () => {
    const code = `
      var result = "";
      try {
        try {
          throw new Error("inner");
        } catch(e) {
          result = result + "inner-catch ";
        }
        result = result + "outer-try ";
      } catch(e) {
        result = result + "outer-catch";
      }
      return result;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("inner-catch outer-try ");
  });

  it('should handle nested try-catch with re-throw (sync)', () => {
    const code = `
      var result = "";
      try {
        try {
          throw new Error("inner");
        } catch(e) {
          result = result + "inner-catch ";
          throw e;
        }
      } catch(e) {
        result = result + "outer-catch:" + e.message;
      }
      return result;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("inner-catch outer-catch:inner");
  });

  it('should handle nested try-catch (async)', async () => {
    const code = `
      var result = "";
      try {
        try {
          await failingFn();
        } catch(e) {
          result = result + "inner-catch ";
        }
        result = result + "outer-try";
      } catch(e) {
        result = result + "outer-catch";
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("fail"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("inner-catch outer-try");
  });

  it('should handle nested try-catch with async re-throw', async () => {
    const code = `
      var result = "";
      try {
        try {
          await failingFn();
        } catch(e) {
          result = result + "inner ";
          throw new Error("rethrown");
        }
      } catch(e) {
        result = result + "outer:" + e.message;
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("original"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("inner outer:rethrown");
  });

  // =========================================================================
  // MULTIPLE AWAIT IN TRY-CATCH
  // =========================================================================

  it('should handle multiple await calls, first one fails', async () => {
    const code = `
      var result;
      try {
        var a = await fn1();
        var b = await fn2();
        result = a + b;
      } catch(e) {
        result = "caught: " + e.message;
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      fn1: async () => { throw new Error("fn1 failed"); },
      fn2: async () => "b",
    };
    const result = await fn(scope).run();
    expect(result).toBe("caught: fn1 failed");
  });

  it('should handle multiple await calls, second one fails', async () => {
    const code = `
      var result;
      try {
        var a = await fn1();
        var b = await fn2();
        result = a + b;
      } catch(e) {
        result = "caught: " + e.message;
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      fn1: async () => "a",
      fn2: async () => { throw new Error("fn2 failed"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("caught: fn2 failed");
  });

  it('should handle multiple await calls, all succeed', async () => {
    const code = `
      var result;
      try {
        var a = await fn1();
        var b = await fn2();
        result = a + b;
      } catch(e) {
        result = "caught";
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      fn1: async () => "hello ",
      fn2: async () => "world",
    };
    const result = await fn(scope).run();
    expect(result).toBe("hello world");
  });

  // =========================================================================
  // CATCH VARIABLE SCOPING
  // =========================================================================

  it('catch variable should be accessible inside catch block', () => {
    const code = `
      var caught = "no";
      try {
        throw new Error("test");
      } catch(err) {
        caught = err.message;
      }
      return caught;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("test");
  });

  it('should handle catch with different error types', async () => {
    const code = `
      var result;
      try {
        await failingFn();
      } catch(e) {
        result = e;
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);

    // Test with string error
    let result = await fn({ failingFn: async () => { throw "string error"; } }).run();
    expect(result).toBe("string error");

    // Test with number error
    result = await fn({ failingFn: async () => { throw 42; } }).run();
    expect(result).toBe(42);

    // Test with Error object
    result = await fn({ failingFn: async () => { throw new TypeError("type err"); } }).run();
    expect(result).toBeInstanceOf(TypeError);
    expect((result as Error).message).toBe("type err");
  });

  // =========================================================================
  // TRY-CATCH IN LOOPS
  // =========================================================================

  it('should handle try-catch inside a for loop (sync)', () => {
    const code = `
      var errors = 0;
      var successes = 0;
      for (var i = 0; i < 5; i++) {
        try {
          if (i % 2 === 0) throw new Error("even");
          successes++;
        } catch(e) {
          errors++;
        }
      }
      return errors + "," + successes;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("3,2");
  });

  it('should handle try-catch inside async for loop', async () => {
    const code = `
      var errors = 0;
      var successes = 0;
      for (var i = 0; i < 5; i++) {
        try {
          if (i % 2 === 0) {
            await failingFn();
          }
          successes++;
        } catch(e) {
          errors++;
        }
      }
      return errors + "," + successes;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("fail"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("3,2");
  });

  it('should handle break inside try in a loop (sync)', () => {
    const code = `
      var result = 0;
      for (var i = 0; i < 10; i++) {
        try {
          if (i === 3) break;
          result = result + 1;
        } catch(e) {}
      }
      return result;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe(3);
  });

  it('should handle continue inside try in a loop (sync)', () => {
    const code = `
      var result = 0;
      for (var i = 0; i < 5; i++) {
        try {
          if (i === 2) continue;
          result = result + 1;
        } catch(e) {}
      }
      return result;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe(4);
  });

  // =========================================================================
  // TRY-CATCH WITH RETURN VALUES
  // =========================================================================

  it('should return value from try body when no error (sync)', () => {
    const code = `
      function test() {
        try {
          return "from try";
        } catch(e) {
          return "from catch";
        }
      }
      return test();
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("from try");
  });

  it('should return value from catch body when error (sync)', () => {
    const code = `
      function test() {
        try {
          throw new Error("oops");
        } catch(e) {
          return "from catch";
        }
      }
      return test();
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("from catch");
  });

  it('should return value from async catch body', async () => {
    const code = `
      async function test() {
        try {
          await failingFn();
          return "from try";
        } catch(e) {
          return "from catch: " + e.message;
        }
      }
      return await test();
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("async err"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("from catch: async err");
  });

  // =========================================================================
  // TRY-FINALLY (no catch)
  // =========================================================================

  it('should handle try-finally without catch (sync, no error)', () => {
    const code = `
      var log = [];
      try {
        log.push("try");
      } finally {
        log.push("finally");
      }
      return log.join(",");
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("try,finally");
  });

  it('should handle try-finally without catch (sync, with error)', () => {
    const code = `
      var log = [];
      try {
        try {
          log.push("try");
          throw new Error("err");
        } finally {
          log.push("finally");
        }
      } catch(e) {
        log.push("outer-catch:" + e.message);
      }
      return log.join(",");
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("try,finally,outer-catch:err");
  });

  it('should handle try-finally without catch (async, with error)', async () => {
    const code = `
      var log = [];
      try {
        try {
          log.push("try");
          await failingFn();
        } finally {
          log.push("finally");
        }
      } catch(e) {
        log.push("outer-catch:" + e.message);
      }
      return log.join(",");
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("async-err"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("try,finally,outer-catch:async-err");
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  it('should handle empty try-catch blocks (sync)', () => {
    const code = `
      var result = "ok";
      try {} catch(e) {}
      return result;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("ok");
  });

  it('should handle empty try-catch blocks (async)', async () => {
    const code = `
      var result = "ok";
      try {} catch(e) {}
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const result = await fn({}).run();
    expect(result).toBe("ok");
  });

  it('should handle throw inside catch block (sync)', () => {
    const code = `
      var result;
      try {
        try {
          throw new Error("first");
        } catch(e) {
          throw new Error("second");
        }
      } catch(e) {
        result = e.message;
      }
      return result;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe("second");
  });

  it('should handle throw inside async catch block', async () => {
    const code = `
      var result;
      try {
        try {
          await failingFn();
        } catch(e) {
          throw new Error("rethrown: " + e.message);
        }
      } catch(e) {
        result = e.message;
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("original"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("rethrown: original");
  });

  it('should handle synchronous error thrown after await succeeds', async () => {
    const code = `
      var result;
      try {
        var val = await succeedingFn();
        null.property;
      } catch(e) {
        result = "caught sync error";
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      succeedingFn: async () => 42,
    };
    const result = await fn(scope).run();
    expect(result).toBe("caught sync error");
  });

  it('should handle try-catch with no error (normal flow)', async () => {
    const code = `
      var result;
      try {
        result = await succeedingFn();
      } catch(e) {
        result = "should not reach";
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      succeedingFn: async () => "success",
    };
    const result = await fn(scope).run();
    expect(result).toBe("success");
  });

  it('should handle try-catch where try body modifies outer variable then fails', async () => {
    const code = `
      var x = 1;
      try {
        x = 2;
        await failingFn();
        x = 3;
      } catch(e) {
        x = x * 10;
      }
      return x;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("fail"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe(20);
  });

  it('should handle var declaration inside try being visible in catch (sync)', () => {
    const code = `
      try {
        var x = 10;
        throw new Error("e");
      } catch(e) {
        return x;
      }
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe(10);
  });

  it('should handle var declaration inside try being visible after try-catch', () => {
    const code = `
      try {
        var x = 10;
      } catch(e) {}
      return x;
    `;
    const fn = sandbox.compile(code, true);
    const result = fn().run();
    expect(result).toBe(10);
  });

  it('should handle consecutive try-catch blocks (async)', async () => {
    const code = `
      var results = [];
      try {
        await failingFn();
      } catch(e) {
        results.push("first: " + e.message);
      }
      try {
        await failingFn2();
      } catch(e) {
        results.push("second: " + e.message);
      }
      return results.join("|");
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("err1"); },
      failingFn2: async () => { throw new Error("err2"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("first: err1|second: err2");
  });

  it('should handle try-catch around Promise.reject', async () => {
    const code = `
      var result;
      try {
        result = await Promise.reject(new Error("rejected"));
      } catch(e) {
        result = "caught: " + e.message;
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const result = await fn({}).run();
    expect(result).toBe("caught: rejected");
  });

  it('should handle try-catch around Promise.resolve', async () => {
    const code = `
      var result;
      try {
        result = await Promise.resolve(42);
      } catch(e) {
        result = "caught";
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const result = await fn({}).run();
    expect(result).toBe(42);
  });

  // =========================================================================
  // COMPLEX REAL-WORLD PATTERNS
  // =========================================================================

  it('should handle async function that conditionally throws', async () => {
    const code = `
      var results = [];
      for (var i = 0; i < 3; i++) {
        try {
          var val = await conditionalFn(i);
          results.push("ok:" + val);
        } catch(e) {
          results.push("err:" + e.message);
        }
      }
      return results.join(",");
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      conditionalFn: async (i: number) => {
        if (i === 1) throw new Error("bad");
        return i * 10;
      },
    };
    const result = await fn(scope).run();
    expect(result).toBe("ok:0,err:bad,ok:20");
  });

  it('should handle async error with default value pattern', async () => {
    const code = `
      var value;
      try {
        value = await fetchData();
      } catch(e) {
        value = "default";
      }
      return value;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      fetchData: async () => { throw new Error("network error"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("default");
  });

  it('should handle try-catch in async function defined in sandbox', async () => {
    const code = `
      async function safeFetch() {
        try {
          var data = await fetchData();
          return data;
        } catch(e) {
          return "fallback: " + e.message;
        }
      }
      return await safeFetch();
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      fetchData: async () => { throw new Error("timeout"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("fallback: timeout");
  });

  it('should handle try-catch wrapping async arrow function', async () => {
    const code = `
      var safeFetch = async () => {
        try {
          return await fetchData();
        } catch(e) {
          return "error handled";
        }
      };
      return await safeFetch();
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      fetchData: async () => { throw new Error("fail"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("error handled");
  });

  it('should handle chained async calls where later one fails', async () => {
    const code = `
      var result;
      try {
        var a = await step1();
        var b = await step2(a);
        var c = await step3(b);
        result = c;
      } catch(e) {
        result = "failed at: " + e.message;
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      step1: async () => "data1",
      step2: async (input: string) => { throw new Error("step2:" + input); },
      step3: async (input: string) => "final:" + input,
    };
    const result = await fn(scope).run();
    expect(result).toBe("failed at: step2:data1");
  });

  it('should handle exception in expression after await', async () => {
    const code = `
      var result;
      try {
        var data = await getData();
        result = data.items.map(function(x) { return x.name; }).join(",");
      } catch(e) {
        result = "caught";
      }
      return result;
    `;
    const fn = sandbox.compileAsync(code, true);

    // Test with null items
    const scope = {
      getData: async () => ({ items: null }),
    };
    const result = await fn(scope).run();
    expect(result).toBe("caught");
  });

  // =========================================================================
  // ASYNC TRY-CATCH-FINALLY EDGE CASES
  // =========================================================================

  it('should execute finally even when catch throws (async)', async () => {
    const code = `
      var log = [];
      try {
        try {
          await failingFn();
        } catch(e) {
          log.push("catch");
          throw new Error("from-catch");
        } finally {
          log.push("finally");
        }
      } catch(e) {
        log.push("outer:" + e.message);
      }
      return log.join(",");
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("fail"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("catch,finally,outer:from-catch");
  });

  it('should handle finally with return from catch in function (async)', async () => {
    const code = `
      var finallyRan = false;
      async function test() {
        try {
          await failingFn();
        } catch(e) {
          return "caught";
        } finally {
          finallyRan = true;
        }
      }
      var result = await test();
      return result + "|" + finallyRan;
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      failingFn: async () => { throw new Error("fail"); },
    };
    const result = await fn(scope).run();
    expect(result).toBe("caught|true");
  });

  it('should handle async successful try with finally', async () => {
    const code = `
      var log = [];
      try {
        var val = await succeedFn();
        log.push("val:" + val);
      } catch(e) {
        log.push("catch");
      } finally {
        log.push("finally");
      }
      return log.join(",");
    `;
    const fn = sandbox.compileAsync(code, true);
    const scope = {
      succeedFn: async () => 42,
    };
    const result = await fn(scope).run();
    expect(result).toBe("val:42,finally");
  });
});
