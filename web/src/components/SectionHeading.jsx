import styles from './SectionHeading.module.css';
import shared from '../styles/shared.module.css';
import StepBadge from './StepBadge.jsx';

export default function SectionHeading({ step, eyebrow, title, description, action, compact = false }) {
  return (
    <div className={`${styles.sectionHeading} ${compact ? styles.compact : ''}`}>
      <StepBadge value={step} />
      <div className={styles.sectionHeadingCopy}>
        <div className={shared.sectionEyebrow}>{eyebrow}</div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className={styles.sectionHeadingAction}>{action}</div> : null}
    </div>
  );
}
