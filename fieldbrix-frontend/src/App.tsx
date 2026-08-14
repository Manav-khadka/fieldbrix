import "./App.css";
import { useApiHealth } from "./hooks/use-api-health";

function App() {
  const apiHealth = useApiHealth();

  return (
    <main className="app-shell">
      <section aria-labelledby="page-title">
        <p className="eyebrow">FieldBrix</p>
        <h1 id="page-title">Admin</h1>
        <p className="status">
          <span aria-hidden="true" />
          API is {apiHealth}.
        </p>
      </section>
    </main>
  );
}

export default App;
