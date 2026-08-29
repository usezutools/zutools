import { WordCounter } from '@zutools/react/word-counter';
import '@zutools/react/word-counter.css';

export default function IsolatedExample({ language }) {
  return (
    <section className="example-isolated">
      <div className="example-package-label">
        <code>@zutools/react/word-counter</code>
        <span>Lazy-loaded individual JavaScript + CSS export</span>
      </div>
      <WordCounter language={language} />
    </section>
  );
}
