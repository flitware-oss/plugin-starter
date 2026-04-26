import React, { JSX, useEffect, useRef, useState } from "react";
import type { RecordModel } from "pocketbase";
import SearchBar from "./searchbar";
import ColumnSelector from "./columnselector";
import ScrollTopButton from "./scrolltop";
import { useGetData } from "../../hooks/useGetData";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    AccessorKeyColumnDef,
} from '@tanstack/react-table';
import InfiniteScroll from 'react-infinite-scroll-component';
import Loader from "./loader";
import IconSetting from "./iconsetting";
import IconDownload from "./icondownload";
import IconClose from "./iconclose";
import FormNewService from "../create";



type ItemListProps = {
    collectionName: string
    columList: { key: string, label: string }[]
    actionRow?: (item: RecordModel) => React.ReactNode | JSX.Element | JSX.Element[]
    defaultSearchColumn: string
}
export default function ItemList({ collectionName, columList, actionRow, defaultSearchColumn }: ItemListProps) {
    const defaultListOption = { sort: '-created', limit: 10 };
    const {
        items,
        loadMore,
        isLoading,
        firstLoad,
        hasMore,
        refresh,
        setListOptions,
    } = useGetData(collectionName, defaultListOption);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [exporting, setExporting] = useState(false);
    const isCamelCase = (str: string) => /[a-z][A-Z]/.test(str);
    const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const columnHelper = createColumnHelper();

    const dataExport = () => {
        if (items.length === 0 || isLoading || exporting) return;
        setExporting(true);
        const a = document.createElement("a");

        try {

            const headers = columList.map(obj => obj.label);

            const rows = items.map(obj =>
                columList.map(c => c.key).map(key => JSON.stringify(obj[key] ?? "")).join(",")
            );

            const csvContent = [headers.join(","), ...rows].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

            const url = URL.createObjectURL(blob);

            a.href = url;
            a.download = `data_export_${Date.now().toString()}.csv`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.log((error as Error).message)

        } finally {
            setExporting(false);
            a.remove();
        }
    };

    const table = useReactTable({
        data: items,
        columns: columList.map((c) =>
            columnHelper.accessor(c.key, {
                header: c.label,
                /*cell: info => (
                    <input
                        value={info.getValue()}
                        onChange={(e) => console.log(e.target.value)}
                    />
                )*/
            }) as unknown as AccessorKeyColumnDef<unknown, never>
        ),
        getCoreRowModel: getCoreRowModel(),
        meta: {},
    });

    useEffect(() => {
        firstLoad();
    }, [firstLoad, selectedColumns]);


    return (

        <div style={containerStyle}>
            <SearchBar
                onInput={(e) => {
                    const text = e.currentTarget.value;
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    if (text === "") {
                        setListOptions(defaultListOption);
                        return;
                    }
                    debounceRef.current = setTimeout(() => {
                        if (text.length >= 3) {
                            const safeQuery = normalizeText(text.replace(/"/g, '\\"'));

                            const columnsToUse = selectedColumns.length > 0 ? selectedColumns : [defaultSearchColumn];

                            const filter = columnsToUse
                                .map((col) => `${col} ~ "${safeQuery}" || ${col} ~ "${safeQuery.toUpperCase()}"`)
                                .join(' || ');
                            const newOptions = {
                                ...defaultListOption,
                                filter,
                            };
                            setListOptions(newOptions);
                        }
                    }, 700);
                }}

                filterComponents={showFilters ? (
                    <div style={filterInputStyle}>

                        <label style={dateLabelStyle}>
                            <small>{'>='}</small>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                style={dateInputStyle}
                            />
                        </label>
                        <label style={dateLabelStyle}>
                            <small>{'<='}</small>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                style={dateInputStyle}
                            />
                        </label>
                        <label style={dateLabelStyle}>
                            <select style={selectStyle}>
                                {[50, 100, 500].map((v, i) => (
                                    <option key={i} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <ColumnSelector
                            options={columList.map((i) => i.key).filter((key) => !isCamelCase(key) && key !== defaultSearchColumn)}
                            selected={selectedColumns}
                            onChange={setSelectedColumns}
                        />
                        <label style={dateLabelStyle}>
                            <button style={buttonWithoutStyle} onClick={dataExport} disabled={exporting}><IconDownload stroke="var(--text-color)" height={18} width={18} /></button>
                        </label>
                        <label style={dateLabelStyle}>
                            <button style={buttonWithoutStyle} onClick={() => { setShowFilters(!showFilters) }}><IconClose stroke="var(--primary-color)" height={18} width={18} /></button>
                        </label>

                    </div>

                ) : <button style={buttonWithoutStyle} onClick={() => setShowFilters(true)}><IconSetting stroke="var(--primary-color)" height={18} width={18} /></button>}
            />
            <InfiniteScroll
                dataLength={items.length}
                next={() => {
                    if (!isLoading) {
                        loadMore();
                    }
                }}
                hasMore={hasMore}
                loader={isLoading ? <Loader /> : null}
                height={items.length > 10 ? window.innerHeight - 100 : 300}

            >
                <table style={tableStyle}>
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        style={thRow}
                                        scope="col"
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                                {actionRow && (
                                    <th
                                        style={thRow}
                                        scope="col"
                                    >
                                        Acciones
                                    </th>
                                )}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} style={trRow}>
                                {row.getVisibleCells().map(cell => (
                                    <td
                                        key={cell.id}
                                        style={tdRow}
                                        data-label={cell.column.columnDef.header}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                                {actionRow && (
                                    <td
                                        style={tdRow}
                                        data-label="Acciones"
                                    >
                                        {actionRow(row.original as unknown as RecordModel)}
                                    </td>
                                )}
                            </tr>
                        ))}
                        {!hasMore && (
                            <tr style={trRow}>
                                <td
                                    style={{ ...tdRow, textAlign: "center", justifyContent: "center" }}
                                >
                                    <span style={{ textAlign: "center" }}>No hay datos para mostrar.</span>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </InfiniteScroll>
            {items.length > 10 && <ScrollTopButton onClick={() => { refresh(); }} />}

        </div>
    );

}


const filterInputStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "1rem",
};

const dateInputStyle: React.CSSProperties = {
    marginLeft: "0.5rem",
    border: "1px solid #ccc",
    backgroundColor: 'transparent',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: "#bebebf8a",
    padding: "0.3rem 0.5rem",
    borderRadius: "8px",
    cursor: "pointer",
    width: '100%',
    color: 'var(--text-color)'
};

const dateLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
};

const buttonWithoutStyle: React.CSSProperties = {
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
const selectStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: "#bebebf8a",
    padding: "0.3rem 0.5rem",
    color: 'var(--text-color)',
    borderRadius: "8px",
    cursor: "pointer",
    width: '90%'
}


const containerStyle: React.CSSProperties = {
    letterSpacing: '0.05em',
    padding: '1em 2em',
    borderRadius: '5px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
}

const tableStyle: React.CSSProperties = {
    borderCollapse: 'separate',
    borderSpacing: 0,
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
}

const thRow: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #e9ecef',
    position: 'sticky',
    top: 0,
    zIndex: 2,
}
const tdRow: React.CSSProperties = {
    padding: '10px 16px',
    borderBottom: '1px solid #e9ecef',
}
const trRow: React.CSSProperties = {
    borderRadius: '5px 0 0 5px',
    textAlign: 'center'
}