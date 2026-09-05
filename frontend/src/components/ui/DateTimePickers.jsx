import { useState, useRef, useEffect } from 'react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS  = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onOutside(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

const pad2 = n => String(n).padStart(2, '0');
const fmtISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Acepta dd/mm/aaaa, dd-mm-aaaa o aaaa-mm-dd escritos a mano.
function parseFechaEscrita(str) {
  const s = (str || '').trim();
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    return (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) ? dt : null;
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m.map(Number);
    const dt = new Date(y, mo - 1, d);
    return (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) ? dt : null;
  }
  return null;
}

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL + 6 - (ANIO_ACTUAL - 100) + 1 }, (_, i) => ANIO_ACTUAL - 100 + i);

/* ─── Selector de fecha con mini calendario (+ escritura manual) ─────────── */
export function DatePickerField({ name, value, onChange, className, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const seleccionado = value ? new Date(`${value}T00:00:00`) : null;
  const [vista, setVista] = useState(seleccionado ?? new Date());
  const [texto, setTexto] = useState(seleccionado ? seleccionado.toLocaleDateString('es-BO') : '');
  const ref = useRef(null);

  useEffect(() => {
    setTexto(seleccionado ? seleccionado.toLocaleDateString('es-BO') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const cerrar = () => setAbierto(false);
  useClickOutside(ref, cerrar);

  const abrir = () => { setVista(seleccionado ?? new Date()); setAbierto(true); };

  const primerDiaMes = new Date(vista.getFullYear(), vista.getMonth(), 1);
  const diasEnMes    = new Date(vista.getFullYear(), vista.getMonth() + 1, 0).getDate();
  const offset       = (primerDiaMes.getDay() + 6) % 7; // lunes = 0

  const celdas = [...Array(offset).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)];

  const elegir = (d) => {
    onChange({ target: { name, value: fmtISO(new Date(vista.getFullYear(), vista.getMonth(), d)) } });
    setAbierto(false);
  };

  const confirmarTexto = () => {
    if (!texto.trim()) { onChange({ target: { name, value: '' } }); return; }
    const dt = parseFechaEscrita(texto);
    if (dt) onChange({ target: { name, value: fmtISO(dt) } });
    else setTexto(seleccionado ? seleccionado.toLocaleDateString('es-BO') : ''); // inválida → revierte
  };

  const esSeleccionado = d => seleccionado
    && seleccionado.getDate() === d
    && seleccionado.getMonth() === vista.getMonth()
    && seleccionado.getFullYear() === vista.getFullYear();

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onFocus={abrir}
        onBlur={confirmarTexto}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmarTexto(); } if (e.key === 'Escape') cerrar(); }}
        placeholder={placeholder ?? 'dd/mm/aaaa'}
        className={className}
      />
      {abierto && (
        <div className="absolute z-20 mt-1 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl p-3">
          <div className="flex items-center justify-between gap-1 mb-2">
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setVista(new Date(vista.getFullYear(), vista.getMonth() - 1, 1))}
              className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800">‹</button>
            <select
              value={vista.getMonth()}
              onChange={e => setVista(new Date(vista.getFullYear(), Number(e.target.value), 1))}
              className="text-xs font-semibold text-gray-700 dark:text-zinc-200 bg-transparent focus:outline-none"
            >
              {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select
              value={vista.getFullYear()}
              onChange={e => setVista(new Date(Number(e.target.value), vista.getMonth(), 1))}
              className="text-xs font-semibold text-gray-700 dark:text-zinc-200 bg-transparent focus:outline-none"
            >
              {ANIOS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setVista(new Date(vista.getFullYear(), vista.getMonth() + 1, 1))}
              className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-400 dark:text-zinc-500 mb-1">
            {DIAS.map(d => <div key={d} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((d, i) => d ? (
              <button key={i} type="button" onMouseDown={e => e.preventDefault()} onClick={() => elegir(d)}
                className={`text-xs h-7 w-7 rounded-full transition-colors ${
                  esSeleccionado(d)
                    ? 'bg-amber-500 text-white font-semibold'
                    : 'text-gray-700 dark:text-zinc-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                }`}
              >{d}</button>
            ) : <div key={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Selector de hora: columnas Hora/Minuto + escritura manual ──────────── */
const HORAS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 60 }, (_, i) => i);

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${pad2(h12)}:${pad2(m)} ${ampm}`;
}

// Acepta "10:35", "10:35 pm", "10 35", "1035" escritos a mano.
function parseHoraEscrita(str) {
  const s = (str || '').trim().toLowerCase();
  let m = s.match(/^(\d{1,2})[:.\s]?(\d{2})\s*(am|pm)?$/);
  if (!m) return null;
  let [, h, min, ampm] = m;
  h = Number(h); min = Number(min);
  if (min > 59) return null;
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
  } else if (h > 23) return null;
  return `${pad2(h)}:${pad2(min)}`;
}

export function TimePickerField({ name, value, onChange, className, placeholder }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(fmt12(value));
  const ref = useRef(null);
  const [h, m] = value ? value.split(':').map(Number) : [null, null];

  useEffect(() => { setTexto(fmt12(value)); }, [value]);

  const cerrar = () => setAbierto(false);
  useClickOutside(ref, cerrar);

  const setParte = (nuevaH, nuevaM) => {
    onChange({ target: { name, value: `${pad2(nuevaH ?? h ?? 0)}:${pad2(nuevaM ?? m ?? 0)}` } });
  };

  const confirmarTexto = () => {
    if (!texto.trim()) { onChange({ target: { name, value: '' } }); return; }
    const t = parseHoraEscrita(texto);
    if (t) onChange({ target: { name, value: t } });
    else setTexto(fmt12(value)); // inválida → revierte
  };

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onFocus={() => setAbierto(true)}
        onBlur={confirmarTexto}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmarTexto(); } if (e.key === 'Escape') cerrar(); }}
        placeholder={placeholder ?? 'hh:mm a. m.'}
        className={className}
      />
      {abierto && (
        <div className="absolute z-20 mt-1 flex bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
          <div className="w-16 max-h-48 overflow-y-auto py-1 border-r border-gray-100 dark:border-zinc-800">
            {HORAS.map(opt => (
              <button
                key={opt} type="button" onMouseDown={e => e.preventDefault()}
                onClick={() => setParte(opt, null)}
                className={`w-full text-center px-2 py-1 text-sm transition-colors ${
                  opt === h ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold' : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >{pad2(opt)}</button>
            ))}
          </div>
          <div className="w-16 max-h-48 overflow-y-auto py-1">
            {MINUTOS.map(opt => (
              <button
                key={opt} type="button" onMouseDown={e => e.preventDefault()}
                onClick={() => setParte(null, opt)}
                className={`w-full text-center px-2 py-1 text-sm transition-colors ${
                  opt === m ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold' : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >{pad2(opt)}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
