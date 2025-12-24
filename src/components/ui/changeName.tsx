import { useState } from "react";

interface ChangeNameProps {
  initialValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const ChangeName = ({ initialValue, onConfirm, onCancel }: ChangeNameProps) => {
  const [value, setValue] = useState(initialValue);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onConfirm(value.trim() || initialValue);
    if (e.key === "Escape") onCancel();
  };

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onConfirm(value.trim() || initialValue)}
      onKeyDown={handleKeyDown}
      className="change-name-input"
    />
  );
};

export default ChangeName;
