import * as React from 'react';
import { useCallback } from 'react';
import { HiOutlineDownload } from 'react-icons/hi';
import { toBibtexCollection, type PublicationData } from '../../lib/bibtex';

interface BibtexBulkDownloadProps {
  publications: PublicationData[];
  /** File name (sans extension) for the downloaded .bib. */
  filename?: string;
  label?: string;
}

const BibtexBulkDownload: React.FC<BibtexBulkDownloadProps> = ({
  publications,
  filename = 'publications',
  label = '전체 BibTeX 다운로드',
}) => {
  const onDownload = useCallback(() => {
    const text = toBibtexCollection(publications);
    const blob = new Blob([text], { type: 'application/x-bibtex' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [publications, filename]);

  if (publications.length === 0) return null;

  return (
    <button
      type="button"
      onClick={onDownload}
      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-default text-muted hover:text-primary hover:border-accent-hover transition-colors"
      aria-label={label}
    >
      <HiOutlineDownload className="w-4 h-4" aria-hidden />
      <span>{label}</span>
      <span className="text-xs text-muted-subtle">
        ({publications.length})
      </span>
    </button>
  );
};

export default BibtexBulkDownload;
