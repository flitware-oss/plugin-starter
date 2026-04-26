type ScrollTopButtonProps = {
    onClick: (...arg: unknown[]) => void
};

export default function ScrollTopButton(props: ScrollTopButtonProps) {
    const { onClick } = props
    return (
        <button
            onClick={onClick}
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "fixed",
                bottom: "4rem",
                right: "1rem",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                color: "white",
                fontSize: "24px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                zIndex: 1000,
                transition: "all 0.5s ease",
            }}
        >
            ☝️
        </button>
    )

}

const scrollToTopBtnStyle: React.CSSProperties = {
    backgroundColor: "black",
    border: "none",
    borderRadius: "50%",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
    lineHeight: "48px",
    width: "48px",
    height: "48px", // importante para que sea un círculo perfecto
    position: "fixed",
    bottom: "30px",
    right: "30px",
    zIndex: 1000,
    opacity: 0,
    transform: "translateY(100px)",
    transition: "all 0.5s ease",
};