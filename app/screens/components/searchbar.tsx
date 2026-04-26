type SearchBarProps = {
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  onInput?: React.FormEventHandler<HTMLInputElement>;
  searchLabel?: string;
  filterComponents?: React.ReactNode | React.ReactNode[];
};

export default function SearchBar(props: SearchBarProps) {
  const { inputProps,  onInput, filterComponents } = props;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        width: "90%",
        maxWidth: "100%",
        margin: "1rem auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flex: 1, gap: "0.5rem", minWidth: "150px" }}>
        <input
          onInput={onInput}
          {...inputProps}
          placeholder={inputProps?.placeholder ?? "Buscar...🔍"}
          type="search"
          style={{
            flex: 1,
            border: "1px solid #bebebf8a",
            borderRadius: "9999px",
            outline: "none",
            fontSize: "1rem",
            padding: "0.5rem 1rem",
            whiteSpace: "nowrap",
            overflowX: "auto",
            textOverflow: "ellipsis",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            minWidth: "100px",
            background:'var(--background-color)',
            color:'var(--text-color)',
          }}
          
        />
      </div>
      {filterComponents && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {Array.isArray(filterComponents)
            ? filterComponents.map((fc, i) => <div key={i}>{fc}</div>)
            : <div>{filterComponents}</div>}
        </div>
      )}
    </div>
  );
}
