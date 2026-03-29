import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";

// ─────────────────────────────────────────────
//  CropCanvas: 이미지 위에 영역을 드래그로 선택
// ─────────────────────────────────────────────
function CropCanvas({ image, crops, setCrops, activeCrop, setActiveCrop, nextNum }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState(null);
  const [current, setCurrent] = useState(null);
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);

  // 이미지 로드 & 스케일 계산
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const container = containerRef.current;
      if (!container) return;
      const maxW = container.clientWidth - 8;
      const maxH = window.innerHeight * 0.62;
      const s = Math.min(maxW / img.width, maxH / img.height, 1);
      setScale(s);
      setImgSize({ w: img.width * s, h: img.height * s });
    };
    img.src = image.url;
  }, [image.url]);

  // 캔버스 렌더
  useEffect(() => { draw(); });

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgSize.w) return;
    canvas.width = imgSize.w;
    canvas.height = imgSize.h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, imgSize.w, imgSize.h);

    // 기존 crop 영역 표시
    crops.forEach((c, i) => {
      const isActive = activeCrop === i;
      const x = c.x * scale, y = c.y * scale, w = c.w * scale, h = c.h * scale;

      // 반투명 배경
      ctx.fillStyle = isActive ? "rgba(255,59,92,0.10)" : "rgba(43,127,255,0.06)";
      ctx.fillRect(x, y, w, h);

      // 테두리
      ctx.strokeStyle = isActive ? "#ff3b5c" : "#2b7fff";
      ctx.lineWidth = isActive ? 2.5 : 1.8;
      ctx.setLineDash(isActive ? [] : [6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // 번호 라벨
      const label = `${c.num}`;
      const fs = Math.max(13, 15 * scale);
      ctx.font = `600 ${fs}px "Noto Sans KR", sans-serif`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = isActive ? "#ff3b5c" : "#2b7fff";
      roundRect(ctx, x, y, tw + 14, fs + 8, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 7, y + fs + 1);
    });

    // 현재 드래그 중인 영역
    if (drawing && start && current) {
      const sx = start.x, sy = start.y;
      const cx = current.x, cy = current.y;
      ctx.fillStyle = "rgba(255,59,92,0.08)";
      ctx.fillRect(sx, sy, cx - sx, cy - sy);
      ctx.strokeStyle = "#ff3b5c";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(sx, sy, cx - sx, cy - sy);
      ctx.setLineDash([]);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function handleDown(e) {
    e.preventDefault();
    const pos = getPos(e);
    // 기존 crop 클릭 확인
    for (let i = crops.length - 1; i >= 0; i--) {
      const c = crops[i];
      const cx = c.x * scale, cy = c.y * scale, cw = c.w * scale, ch = c.h * scale;
      if (pos.x >= cx && pos.x <= cx + cw && pos.y >= cy && pos.y <= cy + ch) {
        setActiveCrop(i);
        return;
      }
    }
    setActiveCrop(null);
    setDrawing(true);
    setStart(pos);
    setCurrent(pos);
  }

  function handleMove(e) {
    if (!drawing) return;
    e.preventDefault();
    setCurrent(getPos(e));
  }

  function handleUp() {
    if (!drawing || !start || !current) { setDrawing(false); return; }
    const x1 = Math.min(start.x, current.x) / scale;
    const y1 = Math.min(start.y, current.y) / scale;
    const x2 = Math.max(start.x, current.x) / scale;
    const y2 = Math.max(start.y, current.y) / scale;
    const w = x2 - x1, h = y2 - y1;
    if (w > 10 && h > 10) {
      const newCrop = { x: Math.round(x1), y: Math.round(y1), w: Math.round(w), h: Math.round(h), num: nextNum };
      const updated = [...crops, newCrop];
      setCrops(updated);
      setActiveCrop(updated.length - 1);
    }
    setDrawing(false);
    setStart(null);
    setCurrent(null);
  }

  return (
    <div ref={containerRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      {imgSize.w > 0 && (
        <canvas
          ref={canvasRef}
          style={{
            cursor: "crosshair",
            display: "block",
            borderRadius: 10,
            boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          }}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
          onTouchStart={handleDown}
          onTouchMove={handleMove}
          onTouchEnd={handleUp}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Helper: 개별 crop 다운로드
// ─────────────────────────────────────────────
async function downloadSingle(imgData, crop) {
  const bitmap = await loadImage(imgData.url);
  const canvas = document.createElement("canvas");
  canvas.width = crop.w;
  canvas.height = crop.h;
  canvas.getContext("2d").drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/jpeg", 0.95);
  a.download = `${imgData.name}_${crop.num}.jpg`;
  a.click();
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = rej;
    el.src = url;
  });
}

// ─────────────────────────────────────────────
//  App
// ─────────────────────────────────────────────
export default function App() {
  const [images, setImages] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allCrops, setAllCrops] = useState({});
  const [activeCrop, setActiveCrop] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const currentImage = images[currentIdx];
  const crops = currentImage ? (allCrops[currentImage.id] || []) : [];
  const nextNum = crops.length > 0 ? Math.max(...crops.map(c => c.num)) + 1 : 1;
  const totalCrops = Object.values(allCrops).reduce((s, c) => s + c.length, 0);

  function addFiles(files) {
    const imgFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!imgFiles.length) return;
    const newImages = imgFiles.map((f, i) => ({
      id: `${Date.now()}_${i}`,
      file: f,
      name: f.name.replace(/\.[^.]+$/, ""),
      url: URL.createObjectURL(f),
    }));
    setImages(prev => {
      if (prev.length === 0) setCurrentIdx(0);
      return [...prev, ...newImages];
    });
  }

  function handleFiles(e) {
    addFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function setCrops(newCrops) {
    if (!currentImage) return;
    setAllCrops(prev => ({ ...prev, [currentImage.id]: newCrops }));
  }

  function deleteCrop(idx) {
    setCrops(crops.filter((_, i) => i !== idx));
    setActiveCrop(null);
  }

  function updateCropNum(idx, num) {
    setCrops(crops.map((c, i) => i === idx ? { ...c, num: parseInt(num) || 1 } : c));
  }

  function removeImage(idx) {
    const img = images[idx];
    URL.revokeObjectURL(img.url);
    const newAllCrops = { ...allCrops };
    delete newAllCrops[img.id];
    setAllCrops(newAllCrops);
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    if (currentIdx >= newImages.length) setCurrentIdx(Math.max(0, newImages.length - 1));
    setActiveCrop(null);
  }

  async function downloadAll() {
    setDownloading(true);
    try {
      const zip = new JSZip();
      let count = 0;

      for (const img of images) {
        const imgCrops = allCrops[img.id] || [];
        if (!imgCrops.length) continue;
        const bitmap = await loadImage(img.url);
        for (const crop of imgCrops) {
          const canvas = document.createElement("canvas");
          canvas.width = crop.w;
          canvas.height = crop.h;
          canvas.getContext("2d").drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
          const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.95));
          zip.file(`${img.name}_${crop.num}.jpg`, blob);
          count++;
        }
      }

      if (count > 0) {
        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cropped_problems.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (err) {
      console.error("ZIP failed:", err);
    }
    setDownloading(false);
  }

  // 키보드 단축키
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && activeCrop !== null) {
        deleteCrop(activeCrop);
      }
      if (e.key === "ArrowLeft" && currentIdx > 0) {
        setCurrentIdx(currentIdx - 1);
        setActiveCrop(null);
      }
      if (e.key === "ArrowRight" && currentIdx < images.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setActiveCrop(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCrop, currentIdx, images.length, crops]);

  // ─── Empty State ───
  if (images.length === 0) {
    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "100vh", padding: 40,
        }}
      >
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 460, maxWidth: "92vw", padding: "64px 44px",
            border: `2.5px dashed ${dragOver ? "#1a1a1a" : "#ccc"}`,
            borderRadius: 20,
            textAlign: "center", cursor: "pointer",
            background: dragOver ? "#f0f0eb" : "#fff",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#1a1a1a"}
          onMouseLeave={e => { if (!dragOver) e.currentTarget.style.borderColor = "#ccc"; }}
        >
          <div style={{ fontSize: 56, marginBottom: 20 }}>✂️</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.5px" }}>
            시험지 크롭
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8, marginBottom: 20 }}>
            시험지 이미지를 업로드하고<br />
            드래그로 문제 영역을 선택하면<br />
            <code style={{
              fontFamily: '"JetBrains Mono"', background: "#f0f0eb",
              padding: "2px 8px", borderRadius: 5, fontSize: 12,
            }}>파일명_문제번호.jpg</code> 로 저장됩니다
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#1a1a1a", color: "#fff",
            padding: "12px 28px", borderRadius: 12,
            fontSize: 14, fontWeight: 600,
          }}>
            📁 이미지 선택 또는 드래그 앤 드롭
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "#bbb" }}>
            여러 장 동시 업로드 가능 · JPG, PNG 지원
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple
          onChange={handleFiles} style={{ display: "none" }} />
      </div>
    );
  }

  // ─── Main Workspace ───
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* ── Header ── */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e0ddd5",
        padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "#1a1a1a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17,
          }}>✂</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>시험지 크롭</div>
            <div style={{ fontSize: 11, color: "#999" }}>
              이미지 {images.length}장 · 영역 {totalCrops}개
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => fileInputRef.current?.click()} style={{
            background: "#f0f0eb", color: "#1a1a1a",
            padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
            border: "1px solid #ddd", cursor: "pointer",
            transition: "all 0.15s",
          }}>
            + 추가
          </button>
          {totalCrops > 0 && (
            <button onClick={downloadAll} disabled={downloading} style={{
              background: "#1a1a1a", color: "#fff",
              padding: "8px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer",
              opacity: downloading ? 0.6 : 1,
              transition: "all 0.15s",
            }}>
              {downloading ? "⏳ 처리 중..." : `📦 ZIP 다운로드 (${totalCrops})`}
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple
          onChange={handleFiles} style={{ display: "none" }} />
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Left: Canvas ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* 이미지 썸네일 스트립 */}
          {images.length > 1 && (
            <div style={{
              display: "flex", gap: 6, padding: "10px 16px",
              overflowX: "auto", background: "#fff",
              borderBottom: "1px solid #e8e5dd", flexShrink: 0,
            }}>
              {images.map((img, i) => (
                <div key={img.id}
                  onClick={() => { setCurrentIdx(i); setActiveCrop(null); }}
                  style={{
                    flexShrink: 0, width: 72, height: 52,
                    borderRadius: 7, overflow: "hidden",
                    border: i === currentIdx ? "2.5px solid #1a1a1a" : "2px solid #e0ddd5",
                    cursor: "pointer", position: "relative",
                    opacity: i === currentIdx ? 1 : 0.6,
                    transition: "all 0.15s",
                  }}>
                  <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {(allCrops[img.id]?.length || 0) > 0 && (
                    <div style={{
                      position: "absolute", top: 2, right: 2,
                      background: "#2b7fff", color: "#fff",
                      fontSize: 9, fontWeight: 700,
                      width: 16, height: 16, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{allCrops[img.id].length}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 캔버스 영역 */}
          <div style={{
            flex: 1, overflow: "auto", padding: 16,
            display: "flex", justifyContent: "center", alignItems: "flex-start",
          }}>
            {currentImage && (
              <CropCanvas
                image={currentImage}
                crops={crops}
                setCrops={setCrops}
                activeCrop={activeCrop}
                setActiveCrop={setActiveCrop}
                nextNum={nextNum}
              />
            )}
          </div>

          {/* 하단 힌트 바 */}
          <div style={{
            padding: "8px 16px", background: "#fff",
            borderTop: "1px solid #e8e5dd", flexShrink: 0,
            fontSize: 12, color: "#aaa", textAlign: "center",
            display: "flex", justifyContent: "center", gap: 16,
          }}>
            <span>🖱️ 드래그: 영역 선택</span>
            <span>🔢 다음 번호: <strong style={{ color: "#1a1a1a" }}>{nextNum}</strong></span>
            <span>⌫ Delete: 선택 삭제</span>
            <span>◀▶ 이미지 전환</span>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <aside style={{
          width: 286, background: "#fff",
          borderLeft: "1px solid #e8e5dd",
          display: "flex", flexDirection: "column",
          overflow: "hidden", flexShrink: 0,
        }}>
          {/* 현재 파일 정보 */}
          {currentImage && (
            <div style={{
              padding: "14px 16px",
              borderBottom: "1px solid #e8e5dd",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{currentImage.file.name}</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                  {crops.length}개 영역
                </div>
              </div>
              <button onClick={() => removeImage(currentIdx)} style={{
                fontSize: 11, color: "#e53e3e",
                background: "#fef2f2", padding: "5px 10px", borderRadius: 7,
                border: "none", cursor: "pointer", fontWeight: 500,
                fontFamily: "inherit", flexShrink: 0,
              }}>제거</button>
            </div>
          )}

          {/* Crop 리스트 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {crops.length === 0 && (
              <div style={{
                padding: "48px 24px", textAlign: "center",
                color: "#bbb", fontSize: 13, lineHeight: 1.7,
              }}>
                이미지 위에서<br />드래그하여 영역을 선택하세요
              </div>
            )}
            {crops.map((crop, i) => (
              <div key={i}
                onClick={() => setActiveCrop(i)}
                style={{
                  padding: "10px 14px",
                  background: activeCrop === i ? "#fafaf5" : "transparent",
                  borderLeft: activeCrop === i ? "3px solid #ff3b5c" : "3px solid transparent",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "background 0.1s",
                }}>
                {/* 번호 수정 */}
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 11, color: "#bbb", fontWeight: 500 }}>#</span>
                  <input
                    type="number" min="1" value={crop.num}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateCropNum(i, e.target.value)}
                    style={{
                      width: 38, height: 28,
                      border: "1px solid #e0ddd5", borderRadius: 6,
                      textAlign: "center", fontSize: 13,
                      fontFamily: '"JetBrains Mono"', fontWeight: 500,
                      outline: "none", background: "#fff",
                    }}
                  />
                </div>

                {/* 파일명 미리보기 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontFamily: '"JetBrains Mono"',
                    color: "#555", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {currentImage?.name}_{crop.num}.jpg
                  </div>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>
                    {crop.w} × {crop.h} px
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button title="다운로드"
                    onClick={e => { e.stopPropagation(); downloadSingle(currentImage, crop); }}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: "#f0f0eb", border: "none",
                      fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>⬇</button>
                  <button title="삭제"
                    onClick={e => { e.stopPropagation(); deleteCrop(i); }}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: "#fef2f2", color: "#e53e3e",
                      border: "none", fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* 하단 다운로드 버튼 */}
          {crops.length > 0 && (
            <div style={{ padding: 12, borderTop: "1px solid #e8e5dd" }}>
              <button onClick={downloadAll} disabled={downloading} style={{
                width: "100%", padding: "11px 0",
                background: "#1a1a1a", color: "#fff",
                borderRadius: 9, fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer",
                opacity: downloading ? 0.6 : 1,
                fontFamily: "inherit",
              }}>
                {downloading ? "⏳ 처리 중..." : "📦 전체 ZIP 다운로드"}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* 드래그 오버레이 */}
      {dragOver && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(26,26,26,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, pointerEvents: "none",
        }}>
          <div style={{
            background: "#fff", padding: "32px 48px",
            borderRadius: 16, fontSize: 16, fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}>
            📁 여기에 이미지를 놓으세요
          </div>
        </div>
      )}
    </div>
  );
}
