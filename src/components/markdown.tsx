import Markdown from 'react-markdown';
import { cn } from '@/lib/utils';

/**
 * Renders Markdown written by staff. Raw HTML in the source is shown as text,
 * and react-markdown drops unsafe link targets such as javascript: URLs.
 */
export function MarkdownBody({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn('markdown', className)}>
      <Markdown>{children}</Markdown>
    </div>
  );
}
