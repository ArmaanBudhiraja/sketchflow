import { useState } from "react";

interface RenameDialogProps {
  initialValue: string;
  onRename: (value: string) => void;
  onCancel: () => void;
}

const RenameDialog = ({
  initialValue,
  onRename,
  onCancel,
}: RenameDialogProps) => {
  const [value, setValue] = useState(initialValue);

  const handleRename = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel(); 
      return;
    }
    onRename(trimmed);
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">File Name</h3>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") onCancel();
          }}
          className="dialog-input"
        />

        <div className="dialog-actions">
          <button className="dialog-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dialog-btn primary" onClick={handleRename}>
            Rename
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameDialog;
