"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

type Row = {
  상품명: string;
  보관장: string;
};

const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

const toText = (v: unknown) => String(v ?? "").trim();

const pick = (obj: any, keys: string[]) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined) return obj[k];
    const foundKey = Object.keys(obj ?? {}).find((kk) => norm(kk) === norm(k));
    if (foundKey) return obj[foundKey];
  }
  return "";
};

const fallbackLocation = (v: unknown) => {
  const s = toText(v);
  return s ? s : "미지정";
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  // ✅ 앱 켜질 때 public/data.xlsx 자동 로드
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setStatus("loading");
        setMessage("데이터 로딩 중…");

        const res = await fetch("/data.xlsx", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const parsed: Row[] = (json ?? [])
          .map((r) => {
            const 상품명 = toText(pick(r, ["상품명", "품명", "제품명", "상품", "Item", "Name"]));
            const 보관장 = fallbackLocation(pick(r, ["보관장", "보관위치", "위치", "로케이션", "진열", "Location"]));
            return { 상품명, 보관장 };
          })
          .filter((r) => r.상품명); // 상품명 없는 행은 제거

        if (cancelled) return;

        setRows(parsed);
        setStatus("ready");
        setMessage(parsed.length ? `데이터 ${parsed.length}건 로딩 완료` : "데이터가 비어 있어요");
        setTimeout(() => inputRef.current?.focus(), 50);
      } catch (e) {
        if (cancelled) return;
        setRows([]);
        setStatus("error");
        setMessage("자동 로딩 실패: public/data.xlsx 파일명/위치를 확인해 주세요. (파일명은 data.xlsx)");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query) return [];
    const q = norm(query);
    return rows.filter((r) => norm(r.상품명).includes(q)).slice(0, 200);
  }, [rows, query]);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#000" }}>
      {/* 상단 고정 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e5e5" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>물품 보관장</div>
            <div style={{ fontSize: 12, color: "#333" }}>
              {status === "ready" ? `데이터 ${rows.length}건` : status === "loading" ? "로딩 중" : "오류"}
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              border: "1px solid #e5e5e5",
              background: "#fafafa",
              fontSize: 13,
              color: status === "error" ? "#b42318" : "#111",
            }}
          >
            {message}
          </div>

          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="상품명 검색"
            disabled={status !== "ready"}
            style={{
              marginTop: 10,
              width: "100%",
              padding: 14,
              fontSize: 16,
              borderRadius: 14,
              border: "2px solid #111",
              outline: "none",
              color: "#000",
              background: "#fff",
            }}
          />

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelected(null);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              style={{
                flex: 1,
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid #ddd",
                fontWeight: 900,
                background: "#fff",
                color: "#000",
              }}
            >
              검색 초기화
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                flex: 1,
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid #ddd",
                fontWeight: 900,
                background: "#fff",
                color: "#000",
              }}
            >
              데이터 다시 불러오기
            </button>
          </div>
        </div>
      </div>

      {/* 리스트 */}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: 14 }}>
        {query && status === "ready" && (
          <div style={{ fontSize: 13, color: "#111", marginBottom: 10 }}>
            검색 결과 <b style={{ color: "#000" }}>{filtered.length}</b>건
          </div>
        )}

        {status === "ready" && query && filtered.length === 0 && (
          <div style={{ padding: 14, borderRadius: 14, border: "2px dashed #999", color: "#000", fontSize: 14 }}>
            검색 결과가 없어요.
          </div>
        )}

        {filtered.map((r, i) => (
          <div
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(r)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelected(r);
            }}
            style={{
              border: "2px solid #d0d0d0",
              borderRadius: 18,
              padding: 16,
              marginBottom: 12,
              background: "#fff",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.25 }}>{r.상품명}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#333" }}>보관장</div>
              </div>

              <div
                style={{
                  flex: "0 0 auto",
                  fontSize: 30,
                  fontWeight: 1000,
                  padding: "10px 14px",
                  borderRadius: 16,
                  border: "3px solid #000",
                  lineHeight: 1,
                  background: "#fff",
                }}
              >
                {r.보관장}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 상세 모달 */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
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
              color: "#000",
            }}
          >
            <div style={{ fontSize: 14, color: "#111" }}>보관장</div>
            <div style={{ fontSize: 72, fontWeight: 1000, margin: "8px 0 12px", color: "#000" }}>
              {selected.보관장}
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.7, color: "#000", fontWeight: 800 }}>
              <div>상품명: {selected.상품명}</div>
            </div>

            <button
              onClick={() => setSelected(null)}
              style={{
                marginTop: 16,
                width: "100%",
                padding: 12,
                borderRadius: 14,
                border: "2px solid #000",
                fontWeight: 1000,
                background: "#fff",
                color: "#000",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}