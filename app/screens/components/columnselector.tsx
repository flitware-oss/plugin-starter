import { useEffect, useRef, useState } from "react";
import IconFilter from "./iconfilter";

type ColumnSelectorProps = {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    schema?: string;
};

export default function ColumnSelector({ options, selected, onChange, schema }: ColumnSelectorProps) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (key: string) => {
        if (selected.includes(key)) {
            onChange(selected.filter(k => k !== key));
        } else {
            onChange([...selected, key]);
        }
    };

    return (
        <div style={{
            alignItems: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}>
            <div
                ref={dropdownRef}
                style={{
                    position: "relative",
                    display: "inline-block",
                }}
            >
                <button
                    onClick={() => setOpen(!open)}
                    style={{
                        backgroundColor: 'transparent',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: "#bebebf8a",
                        padding: "0.3rem 0.5rem",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        width: '100%'
                    }}
                >
                    {selected.length > 0 ? (<div className="position">
                        <div className="badge red">{selected.length}</div>
                    </div>) : ""}
                    <IconFilter stroke="var(--text-color)" height={18} width={18} />
                </button>

                {open && (
                    <div
                        style={{
                            position: "absolute",
                            top: "110%",
                            left: 0,
                            background: 'rgba(0, 0, 0, 0.389)',
                            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.429)',
                            backdropFilter: ' blur(8px)',
                            borderRadius: "8px",
                            padding: "1rem",
                            zIndex: 9999,
                            minWidth: "200px",
                        }}
                    >
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {options.map((key, index) => (
                                <li key={index}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            value={key}
                                            checked={selected.includes(key)}
                                            onChange={() => toggleOption(key)}
                                        />{" "}
                                        {key}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
