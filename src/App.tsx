import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="app">
      <header>
        <h1>STO Ship Ranking</h1>
        <p>
          Filter, compare, and rank Star Trek Online starships. Early
          scaffolding — data loading, filters, and the scoring rubric are next.
        </p>
      </header>

      <section className="scaffolding-check">
        <button type="button" onClick={() => setCount((c) => c + 1)}>
          HMR sanity check: clicked {count} times
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save — Vite+ should hot reload.
        </p>
      </section>
    </main>
  );
}
