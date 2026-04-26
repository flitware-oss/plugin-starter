type ButtonType = "primary" | "secondary" | "outline" | "default";

export const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { styleType?: ButtonType }) => {
    const { styleType } = props;
    const buttonType = String(styleType).toUpperCase() as ButtonType;
    return (
        <button
            {...props}
            style={ButtonStyle[buttonType ?? "DEFAULT"]}
        />
    )
}


class ButtonStyle {
    static PRIMARY: React.CSSProperties = {
        backgroundColor: 'var(--primary-color)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--primary-color)',
        padding: "0.3rem 0.5rem",
        borderRadius: "8px",
        fontWeight: "bold",
        cursor: "pointer",
        width: '100%',
        color: 'var(--text-color)',
        textAlign: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    }
    static SECONDARY: React.CSSProperties = {
        backgroundColor: 'var(--secondary-color)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--secondary-color)',
        padding: "0.3rem 0.5rem",
        borderRadius: "8px",
        fontWeight: "bold",
        cursor: "pointer",
        width: '100%',
        color: 'var(--text-color)',
        textAlign: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    }
    static OUTLINE: React.CSSProperties = {
        backgroundColor: 'transparent',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: "#bebebf8a",
        padding: "0.3rem 0.5rem",
        borderRadius: "8px",
        fontWeight: "bold",
        cursor: "pointer",
        width: '100%',
        color: 'var(--text-color)',
        textAlign: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    }
    static DEFAULT: React.CSSProperties = {
        backgroundColor: 'transparent',
        padding: "0.3rem 0.5rem",
        borderRadius: "8px",
        fontWeight: "bold",
        cursor: "pointer",
        width: '100%',
        color: 'var(--text-color)',
        textAlign: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    }

}