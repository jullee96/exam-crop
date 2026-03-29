import { useState, useRef, useEffect } from "react";
import JSZip from "jszip";

// ─────────────────────────────────────────────
//  CropCanvas
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

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const container = containerRef.current;
      if (!container) return;
      const maxW = container.clientWidth - 8;
      const maxH = window.innerHeight * 0.6;
      const s = Math.min(maxW / img.width, maxH / img.height, 1);
      setScale(s);
      setImgSize({ w: img.width * s, h: img.height * s });
    };
    img.src = image.url;
  }, [image.url]);

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

    crops.forEach((c, i) => {
      const isActive = activeCrop === i;
      const x = c.x * scale, y = c.y * scale, w = c.w * scale, h = c.h * scale;
      ctx.fillStyle = isActive ? "rgba(255,59,92,0.12)" : "rgba(43,127,255,0.07)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = isActive ? "#ff3b5c" : "#2b7fff";
      ctx.lineWidth = isActive ? 2.5 : 1.8;
      ctx.setLineDash(isActive ? [] : [6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
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

    if (drawing && start && current) {
      ctx.fillStyle = "rgba(255,59,92,0.08)";
      ctx.fillRect(start.x, start.y, current.x - start.x, current.y - start.y);
      ctx.strokeStyle = "#ff3b5c";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(start.x, start.y, current.x - start.x, current.y - start.y);
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
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  }

  function handleDown(e) {
    e.preventDefault();
    const pos = getPos(e);
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
            cursor: "crosshair", display: "block",
            borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          }}
          onMouseDown={handleDown} onMouseMove={handleMove}
          onMouseUp={handleUp} onMouseLeave={handleUp}
          onTouchStart={handleDown} onTouchMove={handleMove} onTouchEnd={handleUp}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function loadImage(url) {
  return new Promise((res, rej) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = rej;
    el.src = url;
  });
}

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

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(url) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ width: img.width, height: img.height });
    img.src = url;
  });
}

// ─────────────────────────────────────────────
//  Analyzing overlay
// ─────────────────────────────────────────────
const ANALYZE_MESSAGES = [
  "시험지 구조 파악 중...",
  "문제 영역 탐색 중...",
  "문제 번호 인식 중...",
  "영역 좌표 계산 중...",
];

function AnalyzingOverlay({ progress }) {
  const msgIdx = Math.min(Math.floor(progress / 25), ANALYZE_MESSAGES.length - 1);
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      background: "rgba(255,255,255,0.88)", backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      borderRadius: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid #e0ddd5", borderTopColor: "#2b7fff",
        animation: "spin 0.8s linear infinite",
        marginBottom: 16,
      }} />
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
        AI 자동 감지 중
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
        {ANALYZE_MESSAGES[msgIdx]}
      </div>
      <div style={{
        width: 180, height: 4, background: "#e8e5dd", borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", background: "#2b7fff", borderRadius: 2,
          width: `${progress}%`, transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
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
  const [analyzing, setAnalyzing] = useState({}); // { [imageId]: progress }
  const [errors, setErrors] = useState({});
  const [autoMode, setAutoMode] = useState(true);
  const fileInputRef = useRef(null);

  const currentImage = images[currentIdx];
  const crops = currentImage ? (allCrops[currentImage.id] || []) : [];
  const nextNum = crops.length > 0 ? Math.max(...crops.map(c => c.num)) + 1 : 1;
  const totalCrops = Object.values(allCrops).reduce((s, c) => s + c.length, 0);
  const isAnalyzing = currentImage && analyzing[currentImage.id] !== undefined;

  // ── AI 분석 요청 ──
  async function analyzeImage(imgData) {
    const id = imgData.id;
    setAnalyzing(prev => ({ ...prev, [id]: 5 }));
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });

    // 프로그레스 시뮬레이션
    const progressTimer = setInterval(() => {
      setAnalyzing(prev => {
        if (prev[id] === undefined) return prev;
        return { ...prev, [id]: Math.min((prev[id] || 0) + Math.random() * 12, 90) };
      });
    }, 400);

    try {
      const base64 = await fileToBase64(imgData.file);
      const dims = await getImageDimensions(imgData.url);
      const mediaType = imgData.file.type || "image/jpeg";

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          width: dims.width,
          height: dims.height,
          mediaType,
        }),
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `서버 오류 (${res.status})`);
      }

      const data = await res.json();
      const regions = data.regions || [];

      setAnalyzing(prev => ({ ...prev, [id]: 100 }));

      // 약간의 딜레이 후 결과 적용
      setTimeout(() => {
        if (regions.length > 0) {
          setAllCrops(prev => ({ ...prev, [id]: regions }));
        }
        setAnalyzing(prev => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
      }, 400);

    } catch (err) {
      clearInterval(progressTimer);
      console.error("Analysis failed:", err);
      setErrors(prev => ({ ...prev, [id]: err.message }));
      setAnalyzing(prev => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    }
  }

  // ── 파일 추가 ──
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

    // 자동 모드면 바로 분석 시작
    if (autoMode) {
      newImages.forEach(img => analyzeImage(img));
    }
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

  function setCropsForCurrent(newCrops) {
    if (!currentImage) return;
    setAllCrops(prev => ({ ...prev, [currentImage.id]: newCrops }));
  }

  function deleteCrop(idx) {
    setCropsForCurrent(crops.filter((_, i) => i !== idx));
    setActiveCrop(null);
  }

  function updateCropNum(idx, num) {
    setCropsForCurrent(crops.map((c, i) => i === idx ? { ...c, num: parseInt(num) || 1 } : c));
  }

  function clearAllCrops() {
    if (!currentImage) return;
    setCropsForCurrent([]);
    setActiveCrop(null);
  }

  function removeImage(idx) {
    const img = images[idx];
    URL.revokeObjectURL(img.url);
    const nac = { ...allCrops }; delete nac[img.id];
    setAllCrops(nac);
    const na = { ...analyzing }; delete na[img.id];
    setAnalyzing(na);
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
        const ic = allCrops[img.id] || [];
        if (!ic.length) continue;
        const bitmap = await loadImage(img.url);
        for (const crop of ic) {
          const canvas = document.createElement("canvas");
          canvas.width = crop.w; canvas.height = crop.h;
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

  // ── 키보드 단축키 ──
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && activeCrop !== null) deleteCrop(activeCrop);
      if (e.key === "ArrowLeft" && currentIdx > 0) { setCurrentIdx(currentIdx - 1); setActiveCrop(null); }
      if (e.key === "ArrowRight" && currentIdx < images.length - 1) { setCurrentIdx(currentIdx + 1); setActiveCrop(null); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCrop, currentIdx, images.length, crops]);

  // ═════════════════════════════════════════
  //  EMPTY STATE
  // ═════════════════════════════════════════
  if (images.length === 0) {
    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", padding: 40,
        }}
      >
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 480, maxWidth: "92vw", padding: "56px 44px",
            border: `2.5px dashed ${dragOver ? "#1a1a1a" : "#ccc"}`,
            borderRadius: 20, textAlign: "center", cursor: "pointer",
            background: dragOver ? "#f0f0eb" : "#fff",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#1a1a1a"}
          onMouseLeave={e => { if (!dragOver) e.currentTarget.style.borderColor = "#ccc"; }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>✂️</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.5px" }}>
            시험지 크롭
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8, marginBottom: 24 }}>
            시험지 이미지를 업로드하면<br />
            <strong style={{ color: "#2b7fff" }}>AI가 문제 영역을 자동 감지</strong>합니다<br />
            결과를 확인하고 수정한 뒤 다운로드하세요
          </div>

          {/* Auto toggle */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "#f7f7f2", padding: "8px 16px", borderRadius: 10,
            marginBottom: 20, fontSize: 13,
          }}>
            <span style={{ color: "#666" }}>AI 자동감지</span>
            <button
              onClick={e => { e.stopPropagation(); setAutoMode(!autoMode); }}
              style={{
                width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: autoMode ? "#2b7fff" : "#ccc", position: "relative",
                transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3,
                left: autoMode ? 21 : 3,
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }} />
            </button>
          </div>

          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#1a1a1a", color: "#fff",
              padding: "12px 28px", borderRadius: 12,
              fontSize: 14, fontWeight: 600,
            }}>
              📁 이미지 선택 또는 드래그 앤 드롭
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "#bbb" }}>
            여러 장 동시 업로드 · JPG, PNG 지원
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple
          onChange={handleFiles} style={{ display: "none" }} />
      </div>
    );
  }

  // ═════════════════════════════════════════
  //  MAIN WORKSPACE
  // ═════════════════════════════════════════
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* ── Header ── */}
      <header style={{
        background: "#fff", borderBottom: "1px solid #e0ddd5",
        padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "#1a1a1a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
          }}>✂</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>시험지 크롭</div>
            <div style={{ fontSize: 11, color: "#999" }}>
              이미지 {images.length}장 · 영역 {totalCrops}개
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Auto mode toggle */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, color: "#888",
          }}>
            <span>AI</span>
            <button
              onClick={() => setAutoMode(!autoMode)}
              style={{
                width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
                background: autoMode ? "#2b7fff" : "#ccc", position: "relative",
                transition: "background 0.2s",
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3,
                left: autoMode ? 19 : 3,
                transition: "left 0.2s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }} />
            </button>
          </div>

          <button onClick={() => fileInputRef.current?.click()} style={{
            background: "#f0f0eb", color: "#1a1a1a",
            padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600,
            border: "1px solid #ddd", cursor: "pointer",
          }}>+ 추가</button>

          {totalCrops > 0 && (
            <button onClick={downloadAll} disabled={downloading} style={{
              background: "#1a1a1a", color: "#fff",
              padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer",
              opacity: downloading ? 0.6 : 1,
            }}>
              {downloading ? "⏳ 처리 중..." : `📦 ZIP (${totalCrops})`}
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
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div style={{
              display: "flex", gap: 6, padding: "8px 16px",
              overflowX: "auto", background: "#fff",
              borderBottom: "1px solid #e8e5dd", flexShrink: 0,
            }}>
              {images.map((img, i) => {
                const isProcessing = analyzing[img.id] !== undefined;
                const hasError = !!errors[img.id];
                const cropCount = (allCrops[img.id] || []).length;
                return (
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
                    {isProcessing && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(255,255,255,0.7)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%",
                          border: "2px solid #ddd", borderTopColor: "#2b7fff",
                          animation: "spin 0.8s linear infinite",
                        }} />
                      </div>
                    )}
                    {!isProcessing && hasError && (
                      <div style={{
                        position: "absolute", top: 2, right: 2,
                        background: "#e53e3e", color: "#fff",
                        fontSize: 9, fontWeight: 700,
                        width: 16, height: 16, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>!</div>
                    )}
                    {!isProcessing && !hasError && cropCount > 0 && (
                      <div style={{
                        position: "absolute", top: 2, right: 2,
                        background: "#2b7fff", color: "#fff",
                        fontSize: 9, fontWeight: 700,
                        width: 16, height: 16, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{cropCount}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Canvas area */}
          <div style={{
            flex: 1, overflow: "auto", padding: 16, position: "relative",
            display: "flex", justifyContent: "center", alignItems: "flex-start",
          }}>
            {currentImage && (
              <div style={{ position: "relative", display: "inline-block" }}>
                <CropCanvas
                  image={currentImage} crops={crops}
                  setCrops={setCropsForCurrent} activeCrop={activeCrop}
                  setActiveCrop={setActiveCrop} nextNum={nextNum}
                />
                {isAnalyzing && <AnalyzingOverlay progress={analyzing[currentImage.id] || 0} />}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{
            padding: "8px 16px", background: "#fff",
            borderTop: "1px solid #e8e5dd", flexShrink: 0,
            fontSize: 12, color: "#aaa", textAlign: "center",
            display: "flex", justifyContent: "center", gap: 16,
          }}>
            <span>🖱️ 드래그: 영역 추가</span>
            <span>🔢 다음: <strong style={{ color: "#1a1a1a" }}>{nextNum}</strong></span>
            <span>⌫ 삭제</span>
            <span>◀▶ 전환</span>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <aside style={{
          width: 290, background: "#fff",
          borderLeft: "1px solid #e8e5dd",
          display: "flex", flexDirection: "column",
          overflow: "hidden", flexShrink: 0,
        }}>
          {/* File info + actions */}
          {currentImage && (
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #e8e5dd" }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                marginBottom: 6,
              }}>{currentImage.file.name}</div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => analyzeImage(currentImage)}
                  disabled={isAnalyzing}
                  style={{
                    fontSize: 11, fontWeight: 600,
                    background: isAnalyzing ? "#f0f0eb" : "#eef4ff",
                    color: isAnalyzing ? "#999" : "#2b7fff",
                    padding: "5px 10px", borderRadius: 7,
                    border: "none", cursor: isAnalyzing ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}>
                  {isAnalyzing ? "⏳ 분석 중..." : "🤖 AI 재분석"}
                </button>
                {crops.length > 0 && (
                  <button onClick={clearAllCrops} style={{
                    fontSize: 11, color: "#888",
                    background: "#f5f5f0", padding: "5px 10px", borderRadius: 7,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                  }}>전체 초기화</button>
                )}
                <button onClick={() => removeImage(currentIdx)} style={{
                  fontSize: 11, color: "#e53e3e",
                  background: "#fef2f2", padding: "5px 10px", borderRadius: 7,
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                }}>제거</button>
              </div>

              {/* Error message */}
              {errors[currentImage.id] && (
                <div style={{
                  marginTop: 8, padding: "8px 10px",
                  background: "#fef2f2", borderRadius: 8,
                  fontSize: 11, color: "#e53e3e", lineHeight: 1.5,
                  animation: "fadeIn 0.3s ease",
                }}>
                  ⚠️ 자동 감지 실패: {errors[currentImage.id]}
                  <br />
                  <span style={{ color: "#999" }}>수동으로 영역을 선택하거나 다시 시도하세요</span>
                </div>
              )}

              {/* AI 결과 안내 */}
              {!isAnalyzing && !errors[currentImage.id] && crops.length > 0 && (
                <div style={{
                  marginTop: 8, padding: "6px 10px",
                  background: "#f0fdf4", borderRadius: 8,
                  fontSize: 11, color: "#16a34a",
                  animation: "fadeIn 0.3s ease",
                }}>
                  ✅ {crops.length}개 영역 감지됨 — 번호와 영역을 확인/수정하세요
                </div>
              )}
            </div>
          )}

          {/* Crop list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {crops.length === 0 && !isAnalyzing && (
              <div style={{
                padding: "48px 24px", textAlign: "center",
                color: "#bbb", fontSize: 13, lineHeight: 1.7,
              }}>
                {autoMode
                  ? "AI 분석 결과가 표시됩니다\n수동으로 추가할 수도 있어요"
                  : "이미지 위에서\n드래그하여 영역을 선택하세요"
                }
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
                  animation: "fadeIn 0.2s ease",
                  animationDelay: `${i * 40}ms`,
                  animationFillMode: "backwards",
                }}>
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

          {/* Bottom download */}
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

      {/* Drag overlay */}
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
          }}>📁 여기에 이미지를 놓으세요</div>
        </div>
      )}
    </div>
  );
}
