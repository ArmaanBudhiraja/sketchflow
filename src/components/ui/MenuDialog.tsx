interface MenuItem {
  label: string;
  action: () => void;
}

interface MenuDialogProps {
  title: string;
  items: MenuItem[];
  onClose: () => void;
}

const MenuDialog = ({ title, items, onClose }: MenuDialogProps) => {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="menu-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="menu-title">{title}</h3>

        <div className="menu-items">
          {items.map((item) => (
            <button
              key={item.label}
              className="menu-item"
              onClick={() => {
                item.action();
                onClose();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuDialog;
