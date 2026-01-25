"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

type Row = {
  업체명: string;
  상품명: string;
  입고수량: string;
  유통기한: string;
  보관장: string;
};

const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const formatExpiry = (v: string) => {
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const n = Number(s);
  if (!Number.isNaN(n) && n > 20000 && n < 90000) {
    const d = XLSX.SSF.parse_date_code(n);
    if (d) {
      const yyyy = String(d.y).padStart(4, "0");
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return s;
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [rows.length]);

  const filtered = useMemo(() => {
    if (!query) return [];
    const q = norm(query);
    return rows.filter(
      (r) => norm(r.업체명).includes(q) || norm(r.상품명).includes(q)
    );
  }, [rows, query]);

  async function handleFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const parsed: Row[] = json.map((r) => ({
        업체명: String(r["업체명"] ?? "").trim(),
        상품명: String(r["상품명"] ?? "").trim(),
        입고수량: String(r["입고수량"] ?? "").trim(),
        유통기한: String(r["유통기한"] ?? "").trim(),
        보관장: String(r["보관장"] ?? "").trim(),
      }));

      setRows(parsed);
      setQuery("");
      setSelected(null);
      setError("");
    } catch (e) {
      console.error(e);
      setError("엑셀 파일을 읽을 수 없습니다 (.xlsx 확인)");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* 상단 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#fff",
          borderBottom: "1px solid #eee",
        }}
      >
        <div style={{ maxWidth: 520, margin: "0 auto", padding: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>물품 보관장</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            데이터 {rows.length}건
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <label
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                fontWeight: 700,
              }}
            >
              엑셀 업로드
              <input
                type="file"
                accept=".xlsx"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>

            <button
              onClick={() => {
                setQuery("");
                setSelected(null);
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ddd",
                fontWeight: 700,
                background: "#fff",
              }}
            >
              초기화
            </button>
          </div>

          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="업체명 또는 상품명 검색"
            disabled={!rows.length}
            style={{
              marginTop: 10,
              width: "100%",
              padding: 14,
              fontSize: 16,
              borderRadius: 14,
              border: "1px solid #ddd",
            }}
          />
        </div>
      </div>

      {/* 리스트 */}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: 14 }}>
        {filtered.map((r, i) => (
          <button
            key={i}
            onClick={() => setSelected(r)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "1px solid #eee",
              borderRadius: 18,
              padding: 16,
              marginBottom: 12,
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: "#666" }}>{r.업체명}</div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  {r.상품명}
                </div>
              </div>

              {/* 보관장 크게 */}
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 1000,
                  padding: "8px 12px",
                  borderRadius: 14,
                  border: "2px solid #000",
                  lineHeight: 1,
                }}
              >
                {r.보관장 || "-"}
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#f5f5f5",
                  fontWeight: 900,
                }}
              >
                입고{" "}
                {String(r.입고수량 ?? "").trim() === ""
                  ? "0"
                  : r.입고수량}
              </span>

              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#f5f5f5",
                  fontWeight: 900,
                }}
              >
                유통 {formatExpiry(r.유통기한) || "-"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 상세 */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-end",
            padding: 14,
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 22,
              width: "100%",
              maxWidth: 520,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 14, color: "#666" }}>보관장</div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 1000,
                margin: "8px 0 12px",
              }}
            >
              {selected.보관장}
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div>업체명: {selected.업체명}</div>
              <div>상품명: {selected.상품명}</div>
              <div>
                입고예정수량:{" "}
                {String(selected.입고수량 ?? "").trim() === ""
                  ? "0"
                  : selected.입고수량}
              </div>
              <div>유통기한: {formatExpiry(selected.유통기한)}</div>
            </div>

            <button
              onClick={() => setSelected(null)}
              style={{
                marginTop: 16,
                width: "100%",
                padding: 12,
                borderRadius: 14,
                border: "1px solid #ddd",
                fontWeight: 900,
                background: "#fff",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: "red", textAlign: "center", padding: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}