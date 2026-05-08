import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { HiOutlineClipboardCopy, HiOutlineDownload } from 'react-icons/hi';
import { citationKey, toBibtex, type PublicationData } from '../../lib/bibtex';

interface BibtexButtonProps {
  publication: PublicationData;
  /** Visual variant — "ghost" (compact, default) or "outline". */
  variant?: 'ghost' | 'outline';
}

/** Copy + download button for a single publication. */
const BibtexButton: React.FC<BibtexButtonProps> = ({
  publication,
  variant = 'ghost',
}) => {
  const [copied, setCopied] = useState(false);
  const bib = React.useMemo(() => toBibtex(publication), [publication]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bib);
      setCopied(true);
    } catch {
      // Fallback: synthesize a textarea + execCommand for older browsers.
      const ta = document.createElement('textarea');
      ta.value = bib;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch {
        /* swallow */
      }
      document.body.removeChild(ta);
    }
  }, [bib]);

  const onDownload = useCallback(() => {
    const key = citationKey(publication);
    const blob = new Blob([bib + '\n'], { type: 'application/x-bibtex' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [bib, publication]);

  const baseStyle =
    variant === 'outline'
      ? 'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-default text-muted hover:text-primary hover:border-accent-hover transition-colors'
      : 'inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-muted hover:text-primary hover:bg-surface-muted transition-colors';

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onCopy}
        className={baseStyle}
        aria-label={`Copy BibTeX for ${publication.title}`}
        title="BibTeX 복사"
      >
        <HiOutlineClipboardCopy className="w-3.5 h-3.5" aria-hidden />
        <span>{copied ? 'BibTeX 복사됨' : 'BibTeX'}</span>
      </button>
      <button
        type="button"
        onClick={onDownload}
        className="inline-flex items-center text-xs px-1.5 py-1 rounded text-muted hover:text-primary hover:bg-surface-muted transition-colors"
        aria-label={`Download BibTeX file for ${publication.title}`}
        title=".bib 파일 다운로드"
      >
        <HiOutlineDownload className="w-3.5 h-3.5" aria-hidden />
      </button>
    </span>
  );
};

export default BibtexButton;
