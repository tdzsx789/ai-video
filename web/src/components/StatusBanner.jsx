import { CheckCircle2, CircleAlert, LoaderCircle, Radio } from 'lucide-react';
import { statusTone } from '../lib/format.js';

export default function StatusBanner({ status, message }) {
  const tone = statusTone(status);
  const Icon = tone === 'success'
    ? CheckCircle2
    : tone === 'danger'
      ? CircleAlert
      : tone === 'loading'
        ? LoaderCircle
        : Radio;

  return (
    <div className={`status-banner status-${tone}`} role="status" aria-live="polite">
      <Icon className={tone === 'loading' ? 'spin' : ''} size={17} />
      <span>{message}</span>
    </div>
  );
}
