export default function SectionHeading({ step, eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div className="step-badge">{step}</div>
      <div className="section-heading-copy">
        <div className="section-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="section-heading-action">{action}</div> : null}
    </div>
  );
}
