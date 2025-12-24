import "../../global.css";
import { Network } from "lucide-react"; 
import { useState } from "react";
import ChangeName from "./ui/changeName";

const Navbar = () => {
    const [fileName, setFileName] = useState("Untitled");
  const [isEditing, setIsEditing] = useState(false);
  return (
    <div className="navbar-main">
        <div className="navbar-logo">
            <Network className="navbar-logo-icon" />
        </div>
        <div className="navbar-text">
            <div className="navbar-file-name">
                {isEditing ? (
                    <ChangeName
                    initialValue={fileName}
                    onConfirm={(newName) => {
                        setFileName(newName);
                        setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                    />
                ) : (
                    <h1
                    className="navbar-file-name-text"
                    onClick={() => setIsEditing(true)}
                    >
                    {fileName}
                    </h1>
                )}
            </div>
            <div className="navbar-links">
                <div className="navbar-separator" >
                    <h2 className="navbar-link-text">File</h2>
                </div>
                <div className="navbar-separator" >
                    <h2 className="navbar-link-text">Edit</h2>
                </div>
                <div className="navbar-separator" >
                    <h2 className="navbar-link-text">View</h2>
                </div>
                <div className="navbar-separator" >
                    <h2 className="navbar-link-text">Arrange</h2>
                </div>
                <div className="navbar-separator" >
                    <h2 className="navbar-link-text">Extras</h2>
                </div>
                <div className="navbar-separator" >
                    <h2 className="navbar-link-text">Help</h2>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Navbar;
