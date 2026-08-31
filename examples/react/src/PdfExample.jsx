import { useState } from 'react';
import { MergePdf } from '@zutools/react/merge-pdf';
import { OrganizePdf } from '@zutools/react/organize-pdf';
import { SplitPdf } from '@zutools/react/split-pdf';
import '@zutools/react/merge-pdf.css';
import '@zutools/react/organize-pdf.css';
import '@zutools/react/split-pdf.css';

const tools = { merge: MergePdf, organize: OrganizePdf, split: SplitPdf };
const names = { es: ['Unir PDF', 'Organizar PDF', 'Dividir PDF'], en: ['Merge PDF', 'Organize PDF', 'Split PDF'] };
export default function PdfExample({ language }) {
  const [mode, setMode] = useState('merge');
  const Tool = tools[mode];
  return <section>
    <nav className="example-segmented" aria-label="PDF tools">
      {Object.keys(tools).map((key, index) => <button type="button" key={key} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}>{names[language][index]}</button>)}
    </nav>
    <Tool key={mode} language={language} />
  </section>;
}
