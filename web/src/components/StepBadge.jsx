import styles from './StepBadge.module.css';

export default function StepBadge({ value }) {
  return <div className={styles.stepBadge}>{value}</div>;
}
