import "../../global.css";
import { Network } from "lucide-react"; 
import { useState } from "react";

const Navbar = () => {
    const [fileName, setFileName] = useState("Untitled");
    const handleFileNameChange = () => {
        const newFileName = prompt("Enter new file name:", fileName);
        if (newFileName) {
            setFileName(newFileName);
        }
    };
  return (
    <div className="navbar-main">
        <div className="navbar-logo">
            <Network size={32} color="#4A90E2" />
        </div>
        <div className="navbar-text">
            <div className="navbar-file-name">
                <h1 onClick={() => handleFileNameChange()} className="navbar-file-name-text">{fileName}</h1>
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
