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

const formatExpiry = (v: string) => {
  const s = String(v ?? "").trim();
  if (!s) return "-";
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

const qtyLabel = (v: string) => {
  const s = String(v ?? "").trim();
  return s === "" ? "0" : s;
};

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

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
            const 업체명 = toText(pick(r, ["업체명", "업체", "회사명", "제조사"]));
            const 상품명 = toText(pick(r, ["상품명", "품명", "제품명", "상품"]));
            const 입고수량 = toText(pick(r, ["입고수량", "입고예정수량", "수량", "입고"]));
            const 유통기한 = toText(pick(r, ["유통기한", "유통", "기한", "소비기한"]));
            const 보관장 = toText(pick(r, ["보관장", "보관위치", "위치", "로케이션", "진열"]));
            return { 업체명, 상품명, 입고수량, 유통기한, 보관장 };
          })
          .filter((r) => r.업체명 || r.상품명 || r.보관장);

        if (cancelled) return;

        setRows(parsed);
        setStatus("ready");
        setMessage(`데이터 ${parsed.length}건 로딩 완료`);
        setTimeout(() => inputRef.current?.focus(), 50);
      } catch (e) {
        if (cancelled) return;
        setRows([]);
        setStatus("error");
        setMessage("자동 로딩 실패: public/data.xlsx 파일명/위치를 확인해 주세요.");
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
    return rows
      .filter((r) => norm(r.업체명).includes(q) || norm(r.상품명).includes(q))
      .slice(0, 120);
  }, [rows, query]);

  return (
    // ✅ 전역 CSS가 뭘 하든 무조건 진하게 보이도록 강제
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        color: "#000",
        opacity: 1,
        filter: "none",
      }}
    >
      {/* 상단 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#fff",
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        <div style={{ maxWidth: 520, margin: "0 auto", padding: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#000" }}>물품 보관장</div>
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
              opacity: 1,
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
            placeholder="업체명 또는 상품명 검색"
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
              opacity: 1,
              WebkitTextFillColor: "#000",
            }}
          />
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
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: "2px dashed #999",
              color: "#000",
              fontSize: 14,
              opacity: 1,
            }}
          >
            검색 결과가 없어요.
          </div>
        )}

        {/* ✅ button 사용 금지(비활성/흐림 원인) → div로 변경 */}
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
              width: "100%",
              textAlign: "left",
              border: "2px solid #d0d0d0",
              borderRadius: 18,
              padding: 16,
              marginBottom: 12,
              background: "#fff",
              cursor: "pointer",
              userSelect: "none",
              opacity: 1,
              filter: "none",
              color: "#000",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#111", opacity: 1 }}>{r.업체명}</div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1.25,
                    color: "#000",
                    opacity: 1,
                  }}
                >
                  {r.상품명}
                </div>
              </div>

              {/* 보관장 크게 */}
              <div
                style={{
                  flex: "0 0 auto",
                  fontSize: 30,
                  fontWeight: 1000,
                  padding: "10px 14px",
                  borderRadius: 16,
                  border: "3px solid #000",
                  lineHeight: 1,
                  color: "#000",
                  background: "#fff",
                  opacity: 1,
                  WebkitTextFillColor: "#000",
                }}
              >
                {r.보관장 || "-"}
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 1000, color: "#000", opacity: 1 }}>
                입고 {qtyLabel(r.입고수량)}
              </span>
              <span style={{ fontWeight: 1000, color: "#000", opacity: 1 }}>
                유통 {formatExpiry(r.유통기한)}
              </span>
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
              opacity: 1,
            }}
          >
            <div style={{ fontSize: 14, color: "#111" }}>보관장</div>
            <div style={{ fontSize: 72, fontWeight: 1000, margin: "8px 0 12px", color: "#000" }}>
              {selected.보관장 || "-"}
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.7, color: "#000", fontWeight: 800 }}>
              <div>업체명: {selected.업체명}</div>
              <div>상품명: {selected.상품명}</div>
              <div>입고수량: {qtyLabel(selected.입고수량)}</div>
              <div>유통기한: {formatExpiry(selected.유통기한)}</div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setSelected(null)}
                style={{
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
        </div>
      )}
    </div>
  );
}