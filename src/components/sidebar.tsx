import {Search, ChevronDown, ChevronRightIcon} from "lucide-react"
import { useState } from "react";
import { SHAPES } from "./shapes/General";

const Sidebar = () => {
    const[isGeneralOpen, setIsGeneralOpen] = useState(false);
    const[isMiscOpen, setIsMiscOpen] = useState(false);
    const[isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const[isBasicOpen, setIsBasicOpen] = useState(false);
    const[isArrowsOpen, setIsArrowsOpen] = useState(false);
    const[isFlowchartOpen, setIsFlowchartOpen] = useState(false);
    const[isEntityOpen, setIsEntityOpen] = useState(false);
    const[isUmlOpen, setIsUmlOpen] = useState(false);
  return (
    <div className="sidebar">
        <div className="search-bar">
            <input
                type="text"
                className="search-input"
                placeholder="Type / to search"
            />
            <Search className="search-icon" />
        </div>
        <div className="sidebar-folders">
            <div className="general-folder">
                <div className="general-folder-header" onClick={() => setIsGeneralOpen(!isGeneralOpen)}>
                    {isGeneralOpen ? <ChevronDown className="folder-icon" /> : <ChevronRightIcon className="folder-icon" />}
                    <span className="folder-title">General</span>
                </div>
                {isGeneralOpen && (
                    <div className="shape-grid">
                        {SHAPES.map(({ name, Component }) => (
                            <div key={name} title={name} className="shape-item">
                                <Component size={24} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="misc-folder">
                <div className="misc-folder-header" onClick={() => setIsMiscOpen(!isMiscOpen)}>
                    {isMiscOpen ? <ChevronDown className="folder-icon" /> : <ChevronRightIcon className="folder-icon" />}
                    <span className="folder-title">Misc</span>
                </div>
                {isMiscOpen && (
                    <div className="folder-contents">
                        <div className="file-item">Welcome.md</div>
                        <div className="file-item">GettingStarted.md</div>
                    </div>
                )}
            </div>
            <div className="advanced-folder">
                <div className="advanced-folder-header" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}>
                    {isAdvancedOpen ? <ChevronDown className="folder-icon" /> : <ChevronRightIcon className="folder-icon" />}
                    <span className="folder-title">Advanced</span>
                </div>
                {isAdvancedOpen && (
                    <div className="folder-contents">
                        <div className="file-item">Welcome.md</div>
                        <div className="file-item">GettingStarted.md</div>
                    </div>
                )}
            </div>
            <div className="basic-folder">
                <div className="basic-folder-header" onClick={() => setIsBasicOpen(!isBasicOpen)}>
                    {isBasicOpen ? <ChevronDown className="folder-icon" /> : <ChevronRightIcon className="folder-icon" />}
                    <span className="folder-title">Basic</span>
                </div>
                {isBasicOpen && (
                    <div className="folder-contents">
                        <div className="file-item">Welcome.md</div>
                        <div className="file-item">GettingStarted.md</div>
                    </div>
                )}
            </div>
            <div className="arrows-folder">
                <div className="arrows-folder-header" onClick={() => setIsArrowsOpen(!isArrowsOpen)}>
                    {isArrowsOpen ? <ChevronDown className="folder-icon" /> : <ChevronRightIcon className="folder-icon" />}
                    <span className="folder-title">Arrows</span>
                </div>
                {isArrowsOpen && (
                    <div className="folder-contents">
                        <div className="file-item">Welcome.md</div>
                        <div className="file-item">GettingStarted.md</div>
                    </div>
                )}
            </div>
            <div className="flowchart-folder">
                <div className="flowchart-folder-header" onClick={() => setIsFlowchartOpen(!isFlowchartOpen)}>
                    {isFlowchartOpen ? <ChevronDown className="folder-icon" /> : <ChevronRightIcon className="folder-icon" />}
                    <span className="folder-title">Flowchart</span>
                </div>
                {isFlowchartOpen && (
                    <div className="folder-contents">
                        <div className="file-item">Welcome.md</div>
                        <div className="file-item">GettingStarted.md</div>
                    </div>
                )}
            </div>
            <div className="entity-folder">
                <div className="entity-folder-header" onClick={() => setIsEntityOpen(!isEntityOpen)}>
                    {isEntityOpen ? <ChevronDown className="folder-icon" /> : <ChevronRightIcon className="folder-icon" />}
                    <span className="folder-title">Entity Relation</span>
                </div>
                {isEntityOpen && (
                    <div className="folder-contents">
                        <div className="file-item">Welcome.md</div>
                        <div className="file-item">GettingStarted.md</div>
                    </div>
                )}
            </div>
            <div className="uml-folder">
                <div className="uml-folder-header" onClick={() => setIsUmlOpen(!isUmlOpen)}>
                    {isUmlOpen ? <ChevronDown className="folder-icon" /> : <ChevronRightIcon className="folder-icon" />}
                    <span className="folder-title">UML</span>
                </div>
                {isUmlOpen && (
                    <div className="folder-contents">
                        <div className="file-item">Welcome.md</div>
                        <div className="file-item">GettingStarted.md</div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Sidebar;
