import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import styles from './SelectField.module.css';

function normalizeOptions(options) {
  return options.map(option => {
    if (typeof option === 'string' || typeof option === 'number') {
      return {
        value: String(option),
        label: String(option),
        disabled: false,
      };
    }

    return {
      value: String(option.value),
      label: String(option.label ?? option.value),
      disabled: Boolean(option.disabled),
    };
  });
}

function firstEnabledIndex(options) {
  return options.findIndex(option => !option.disabled);
}

function nextEnabledIndex(options, currentIndex, direction) {
  if (!options.length) return -1;
  let index = currentIndex;

  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index].disabled) return index;
  }

  return currentIndex;
}

export default function SelectField({
  value,
  onChange,
  options = [],
  disabled = false,
  placeholder = '请选择',
  ariaLabel,
  className = '',
  compact = false,
}) {
  const normalizedOptions = normalizeOptions(options);
  const selectedValue = String(value ?? '');
  const selectedIndex = normalizedOptions.findIndex(option => option.value === selectedValue);
  const selectedOption = normalizedOptions[selectedIndex];
  const rootRef = useRef(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex >= 0 && !selectedOption?.disabled
      ? selectedIndex
      : firstEnabledIndex(normalizedOptions),
  );

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key === 'Tab') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const nextIndex = selectedIndex >= 0 && !selectedOption?.disabled
      ? selectedIndex
      : firstEnabledIndex(normalizedOptions);
    setActiveIndex(nextIndex);
  }, [selectedIndex, selectedOption?.disabled, normalizedOptions.length]);

  const chooseOption = option => {
    if (!option || option.disabled || disabled) return;
    onChange?.(option.value);
    setOpen(false);
  };

  const handleKeyDown = event => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = nextEnabledIndex(
        normalizedOptions,
        activeIndex >= 0 ? activeIndex : firstEnabledIndex(normalizedOptions),
        direction,
      );
      setActiveIndex(nextIndex);
      setOpen(true);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) {
        chooseOption(normalizedOptions[activeIndex]);
      } else {
        setOpen(true);
      }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.selectField} ${compact ? styles.compact : ''} ${open ? styles.isOpen : ''} ${className}`}
    >
      <button
        type="button"
        className={styles.selectTrigger}
        onClick={() => {
          if (!disabled) setOpen(current => !current);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
      >
        <span className={`${styles.selectedLabel} ${selectedOption ? '' : styles.placeholder}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={open ? styles.chevronOpen : ''} size={16} aria-hidden="true" />
      </button>

      {open ? (
        <div className={styles.selectMenu} id={listboxId} role="listbox" aria-label={ariaLabel}>
          {normalizedOptions.map((option, index) => (
            <button
              type="button"
              role="option"
              key={`${option.value}-${index}`}
              className={[
                styles.selectOption,
                index === activeIndex ? styles.isActive : '',
                option.value === selectedValue ? styles.isSelected : '',
              ].filter(Boolean).join(' ')}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(option)}
              disabled={option.disabled}
              aria-selected={option.value === selectedValue}
            >
              <span>{option.label}</span>
              {option.value === selectedValue ? <Check size={15} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
