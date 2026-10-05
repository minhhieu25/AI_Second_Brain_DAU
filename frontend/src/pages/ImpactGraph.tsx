import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useDetail } from '../context/DetailContext';

const ImpactGraph: React.FC = () => {
  const { openDetail } = useDetail();
  const { data, loading } = useData();
  const impact = data.impact || [];
  const [filterType, setFilterType] = useState('Tất cả');
  const [selectedCanCu, setSelectedCanCu] = useState<string>('');

  const filteredImpact = useMemo(() => {
    if (filterType === 'Tất cả') return impact;
    return impact.filter((item: any) => {
      const name = item.canCu.toLowerCase();
      if (filterType === 'Khác') {
        return !name.includes('nghị định') && !name.includes('thông tư') && !name.includes('quyết định') && !name.includes('luật');
      }
      return name.includes(filterType.toLowerCase());
    });
  }, [impact, filterType]);

  useEffect(() => {
    if (filteredImpact.length > 0) {
      if (!selectedCanCu || !filteredImpact.find((item: any) => item.canCu === selectedCanCu)) {
        setSelectedCanCu(filteredImpact[0].canCu);
      }
    } else {
      setSelectedCanCu('');
    }
  }, [filteredImpact, selectedCanCu]);

  if (loading) {
    return (
      <section id="do-thi" className="fade-in">
        <div className="wrap">
          <h2>Đồ thị mức độ ảnh hưởng</h2>
          <p className="sub">Đang tải dữ liệu đồ thị...</p>
          <div className="impact" style={{ padding: '24px' }}>
             <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
               <span className="skeleton" style={{ width: '100%', height: '100%', borderRadius: '12px' }}></span>
             </div>
          </div>
        </div>
      </section>
    );
  }

  if (impact.length === 0) {
    return (
      <section id="do-thi" className="fade-in">
        <div className="wrap">
          <h2>Đồ thị mức độ ảnh hưởng</h2>
          <p className="sub">Trực quan hoá dây chuyền "văn bản kéo văn bản".</p>
          <div className="impact" style={{ padding: '60px 24px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--muted)', fontSize: '18px' }}>Chưa có dữ liệu phân tích đồ thị</h3>
          </div>
        </div>
      </section>
    );
  }

  const x = filteredImpact.find((item: any) => item.canCu === selectedCanCu) || filteredImpact[0];
  const deps = x ? x.dependents : [];

  // Calculate dynamic widths based on text length
  const charWidth = 7.5;
  const boxPadding = 30;
  
  let rootTextLen = x && x.canCu ? x.canCu.length : 0;
  if (x && x.thayBang && x.thayBang.length > rootTextLen) {
    rootTextLen = x.thayBang.length;
  }
  const bw = Math.max(214, rootTextLen * charWidth + boxPadding);
  
  let maxDepLen = 0;
  deps.forEach((d: any) => {
    if (d.soHieu && d.soHieu.length > maxDepLen) maxDepLen = d.soHieu.length;
  });
  const dw = Math.max(250, maxDepLen * charWidth + boxPadding);

  const bx = 18;
  const arrowSpacing = 80;
  const dx = bx + bw + arrowSpacing;
  const W = dx + dw + 20;
  
  const rowH = 50;
  const pad = 44;
  const dh = 38;
  const H = Math.max(240, pad * 2 + deps.length * rowH);
  const by = H / 2;

  return (
    <section id="do-thi" style={{ background: 'var(--bg)' }}>
      <div className="wrap">
        <h2>Đồ thị mức độ ảnh hưởng</h2>
        <p className="sub">Trực quan hoá dây chuyền "văn bản kéo văn bản".</p>

        <div className="impact" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '14px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                Lọc loại văn bản:
              </span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  fontSize: '14px',
                  padding: '8px 10px',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  minWidth: '150px',
                }}
              >
                <option value="Tất cả">Tất cả</option>
                <option value="Nghị định">Nghị định</option>
                <option value="Thông tư">Thông tư</option>
                <option value="Quyết định">Quyết định</option>
                <option value="Luật">Luật</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                Chọn căn cứ thay đổi:
              </span>
              <select
                value={selectedCanCu}
                onChange={(e) => setSelectedCanCu(e.target.value)}
                style={{
                  fontSize: '14px',
                  padding: '8px 10px',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  width: '100%',
                  maxWidth: '500px',
                }}
              >
                {filteredImpact.length === 0 ? (
                  <option value="">Không có dữ liệu phù hợp</option>
                ) : (
                  filteredImpact.map((item: any) => (
                    <option key={item.canCu} value={item.canCu}>
                      {item.canCu} ({item.dependents.length} văn bản phụ thuộc)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div id="impactOut">
            {x && (
              <>
                <div className="note">
                  Nếu <b>{x.canCu}</b> thay đổi {x.thayBang ? `(${x.lyDo} → ` : `(${x.lyDo})`}
                  {x.thayBang && <b>{x.thayBang}</b>}
                  {x.thayBang ? ')' : ''}, {deps.length} văn bản dưới đây cần rà lại.
                </div>
                {deps.length === 0 ? (
                  <p className="sub">Không có văn bản phụ thuộc trong kho.</p>
                ) : (
                  <div style={{ overflowX: 'auto', marginTop: '14px' }}>
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      width={W}
                      style={{ minWidth: `${W}px`, maxWidth: `${W}px`, fontFamily: 'inherit' }}
                    >
                      <defs>
                        <marker
                          id="ah"
                          markerWidth="9"
                          markerHeight="9"
                          refX="7"
                          refY="3"
                          orient="auto"
                        >
                          <path d="M0,0 L7,3 L0,6 Z" fill="var(--red)" />
                        </marker>
                      </defs>

                      {deps.map((_d: any, i: number) => {
                        const dy = pad + i * rowH + dh / 2;
                        const x1 = bx + bw;
                        const y1 = by;
                        const x2 = dx;
                        const y2 = dy;
                        const mx = (x1 + x2) / 2;
                        return (
                          <path
                            key={`path-${i}`}
                            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 2},${y2}`}
                            fill="none"
                            stroke="var(--red)"
                            strokeWidth="1.6"
                            markerEnd="url(#ah)"
                          />
                        );
                      })}

                      <g>
                        <rect
                          x={bx}
                          y={by - 28}
                          width={bw}
                          height={56}
                          rx={10}
                          fill="var(--red-bg)"
                          stroke="var(--red)"
                          strokeWidth="1.8"
                          strokeDasharray="5 3"
                        />
                        <text
                          x={bx + bw / 2}
                          y={by - 6}
                          textAnchor="middle"
                          fontSize="9.5"
                          fill="var(--red)"
                          fontWeight="700"
                        >
                          CĂN CỨ HẾT HIỆU LỰC
                        </text>
                        <text
                          x={bx + bw / 2}
                          y={by + 12}
                          textAnchor="middle"
                          fontSize="13"
                          fill="var(--ink)"
                          fontWeight="700"
                        >
                          {x.canCu}
                        </text>
                      </g>

                      {x.thayBang && (
                        <>
                          <g>
                            <rect
                              x={bx}
                              y={by + 40}
                              width={bw}
                              height={30}
                              rx={8}
                              fill="rgba(21, 128, 61, 0.1)"
                              stroke="var(--green)"
                              strokeWidth="1.4"
                            />
                            <text x={bx + bw / 2} y={by + 59} textAnchor="middle" fontSize="11.5" fill="var(--green)">
                              thay bằng:{' '}
                              <tspan fontWeight="700">{x.thayBang}</tspan>
                            </text>
                          </g>
                          <line x1={bx + bw / 2} y1={by + 28} x2={bx + bw / 2} y2={by + 40} stroke="var(--green)" strokeWidth="1.2" />
                        </>
                      )}

                      {deps.map((d: any, i: number) => {
                        const dy = pad + i * rowH + dh / 2;
                        return (
                          <g
                            key={`node-${i}`}
                            className="dnode"
                            style={{ cursor: 'pointer' }}
                            onClick={() => openDetail(d.soHieu)}
                          >
                            <rect
                              x={dx}
                              y={dy - dh / 2}
                              width={dw}
                              height={dh}
                              rx={8}
                              fill="var(--surface)"
                              stroke="var(--red)"
                              strokeWidth="1.3"
                            />
                            <text x={dx + 12} y={dy + 2} fontSize="12.5" fill="var(--ink)" fontWeight="600">
                              {d.soHieu}
                            </text>
                            {d.loai && (
                              <text x={dx + 12} y={dy + 15} fontSize="9.5" fill="var(--muted)">
                                {d.loai} · bấm xem chi tiết
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImpactGraph;
