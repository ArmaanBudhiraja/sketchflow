import "../../global.css";
import { Network, Sidebar, ZoomIn, ZoomOut, Undo2, Redo2, Trash2, Plus, Shapes, Table } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import RenameDialog from "./ui/renameDialog";

const Navbar = () => {
  const [fileName, setFileName] = useState("Untitled");
  const [showRename, setShowRename] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  return (
    <>
      <div className="navbar-main">
        <div className="navbar-logo">
          <Network className="navbar-logo-icon" />
        </div>

        <div className="navbar-text">
          <div className="navbar-file-name">
            <h1
              className="navbar-file-name-text"
              onClick={() => setShowRename(true)}
            >
              {fileName}
            </h1>
          </div>

          <div className="navbar-links">
          {/* FILE */}
            <div className="menu-wrapper">
                <div className="menu-header">
                    <h2
                    className="navbar-link-text"
                        onClick={() =>
                            setActiveMenu(activeMenu === "File" ? null : "File")
                        }
                        >
                        File
                    </h2>
                </div>
                {activeMenu === "File" && (
                <div className="dropdown-menu">
                    <button>New</button>
                    <button>Open</button>
                    <hr className="divider-line"/>
                    <button>Save</button>
                    <button>Save As</button>
                    <hr className="divider-line"/>
                    <button>Export</button>
                    <button>Share</button>
                    <button>Rename</button>
                    <hr className="divider-line"/>
                    <button>Close</button>
                </div>
                )}
            </div>

          {/* EDIT */}
          <div className="menu-wrapper">
            <div className="menu-header">
            <h2
              className="navbar-link-text"
              onClick={() =>
                setActiveMenu(activeMenu === "Edit" ? null : "Edit")
              }
            >
              Edit
            </h2>
            </div>
            {activeMenu === "Edit" && (
              <div className="dropdown-menu">
                <button>Undo</button>
                <button>Redo</button>
                <button>Copy</button>
                <button>Paste</button>
              </div>
            )}
          </div>
          {/* View */}
            <div className="menu-wrapper">
                <div className="menu-header">
                    <h2 className="navbar-link-text"
                        onClick={() =>
                            setActiveMenu(activeMenu === "View" ? null : "View")
                        }
                    >
                        View
                    </h2>
                </div>
                {activeMenu === "View" && (
                    <div className="dropdown-menu">
                        <button>Reset View</button>
                        <button>Zoom In</button>
                        <button>Zoom Out</button>
                        <hr className="divider-line"/>
                        <button>Fullscreen</button>
                    </div>
                )}
            </div>
                <div className="menu-header">
                    <h2 className="navbar-link-text">Arrange</h2>
                </div>
                <div className="menu-header">
                    <h2 className="navbar-link-text">Help</h2>
                </div>
        </div>
        </div>
      </div>

      {showRename && (
        <RenameDialog
          initialValue={fileName}
          onRename={(newName) => {
            setFileName(newName);
            setShowRename(false);
          }}
          onCancel={() => setShowRename(false)}
        />
      )}
        <hr className="divider-line" />
        <div className="taskbar">
            <div className="sidebar-icon-wrapper">
                <Sidebar className="sidebar-icon" />
            </div>
            <hr className="divider-line" id="divider-line-vertical" />
            <div className="zoom-level-wrapper">
                <select className="zoom-level-dropdown">
                    <option>50%</option>
                    <option>75%</option>
                    <option selected>100%</option>
                    <option>125%</option>
                    <option>150%</option>
                    <option>200%</option>
                </select>
            </div>
            <hr className="divider-line" id="divider-line-vertical" />
            <div className="zoom-buttons">
                <div className="zoom-in-wrapper">
                    <ZoomIn className="zoom-in-icon" />
                </div>
                <div className="zoom-out-wrapper">
                    <ZoomOut className="zoom-out-icon" />
                </div>
            </div>
            <hr className="divider-line" id="divider-line-vertical" />
            <div className="undo-redo-wrapper">
                <div className="undo-wrapper">
                    <Undo2 className="undo-icon" />
                </div>
                <div className="redo-wrapper">
                    <Redo2 className="redo-icon" />
                </div>
            </div>
            <hr className="divider-line" id="divider-line-vertical" />
            <div className="delete-button">
                <Trash2 className="delete-icon" />
            </div>
            <hr className="divider-line" id="divider-line-vertical" />
            <div className="insert-buttons">
                <div className="insert-plus-wrapper">
                    <Plus className="insert-plus-icon" />
                </div>
                <div className="insert-shape-wrapper">
                    <Shapes className="insert-shape-icon" />
                </div>
                <div className="insert-table-wrapper">
                    <Table className="insert-table-icon" />
                </div>
            </div>
        </div>
        <hr className="divider-line"/>
    </>
  );
};

export default Navbar;
