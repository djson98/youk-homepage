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
      className="hidden lg:block w-36 ml-4 flex-shrink-0"
      style={{ position: 'relative' }}
    >
      <div
        className="sticky-index sticky z-30"
        style={{ position: 'sticky', top }}
      >
        <Card className="bg-surface/90 backdrop-blur-sm border-0 shadow-none">
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
                    'block text-xs py-1 px-2 rounded transition-colors duration-200 whitespace-nowrap font-light',
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
