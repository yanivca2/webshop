import './App.css';
import GreetingPanel from './components/GreetingPanel';

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">React + Spring Boot (Kotlin)</h1>
        <p className="app__subtitle">
          Vite dev server on <code>:5173</code>, API proxied to <code>:8080</code>.
        </p>
      </header>

      <main className="app__main">
        <GreetingPanel />
      </main>
    </div>
  );
}
