import { cn } from '@oven/oven-ui';

export default function NotFound() {
  return (
    <div className={cn('portal-error')}>
      <h2>Portal Not Found</h2>
      <p>No published portal could be found for this domain.</p>
    </div>
  );
}
