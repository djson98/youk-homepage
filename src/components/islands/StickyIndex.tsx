import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';

export interface StickyIndexItem {
  id: string;
  label: string;
}

interface StickyIndexProps {
  items: StickyIndexItem[];
  activeId?: string;
  top?: string;
}

const StickyIndex: React.FC<StickyIndexProps> = ({
  items,
  activeId,
  top = '8rem',
}) => {
  return (
    <div
      className="ml-4 hidden w-36 flex-shrink-0 lg:block"
      style={{ position: 'relative' }}
    >
      <div
        className="sticky-index sticky z-30"
        style={{ position: 'sticky', top }}
      >
        <Card className="bg-surface/90 border-0 shadow-none backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle>Index</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <nav className="space-y-1">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    'block rounded px-2 py-1 text-xs font-light whitespace-nowrap transition-colors duration-200',
                    activeId === item.id
                      ? 'text-accent'
                      : 'text-muted hover:text-accent'
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StickyIndex;
