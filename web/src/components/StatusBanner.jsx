import { CheckCircle2, CircleAlert, LoaderCircle, Radio } from 'lucide-react';
import { statusTone } from '../lib/format.js';
import shared from '../styles/shared.module.css';
import styles from './StatusBanner.module.css';

export default function StatusBanner({ status, message }) {
  const tone = statusTone(status);
  const Icon = tone === 'success'
    ? CheckCircle2
    : tone === 'danger'
      ? CircleAlert
      : tone === 'loading'
        ? LoaderCircle
        : Radio;
  const toneClass = tone === 'success'
    ? styles.statusSuccess
    : tone === 'danger'
      ? styles.statusDanger
      : tone === 'loading'
        ? styles.statusLoading
        : '';

  return (
    <div className={`${styles.statusBanner} ${toneClass}`} role="status" aria-live="polite">
      <Icon className={tone === 'loading' ? shared.spin : ''} size={17} />
      <span>{message}</span>
    </div>
  );
}
