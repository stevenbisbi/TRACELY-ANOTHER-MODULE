import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, X, Inbox } from 'lucide-react';

// Selector con búsqueda en vivo (debounced) contra el backend, en vez de un
// <select> con miles de <option>. Uso: <SearchSelect fetchResults={q => ...}
// getLabel={item => ...} renderItem={item => <jsx/>} onSelect={item => ...} />
export default function SearchSelect({
  value,
  onSelect,
  fetchResults,
  getLabel,
  renderItem,
  placeholder = 'Buscar...',
  minChars = 1,
  disabled = false,
  isItemDisabled,
}) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const runSearch = useCallback((q) => {
    if (q.trim().length < minChars) { setResults([]); setLoading(false); return; }
    const reqId = ++reqIdRef.current;
    setLoading(true);
    fetchResults(q.trim())
      .then((items) => { if (reqId === reqIdRef.current) setResults(items ?? []); })
      .catch(() => { if (reqId === reqIdRef.current) setResults([]); })
      .finally(() => { if (reqId === reqIdRef.current) setLoading(false); });
  }, [fetchResults, minChars]);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 300);
  };

  const handleSelect = (item) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setResults([]);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {value ? (
        <div className="input-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
          <span style={{ fontWeight: 500 }}>{getLabel(value)}</span>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 2 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            className="input-field"
            style={{ width: '100%', paddingLeft: 32, boxSizing: 'border-box' }}
            placeholder={placeholder}
            value={query}
            disabled={disabled}
            onChange={handleChange}
            onFocus={() => query.trim().length >= minChars && setOpen(true)}
          />
          {loading && <Loader2 size={14} className="spin" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />}
        </div>
      )}

      <AnimatePresence>
        {open && !value && query.trim().length >= minChars && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
              background: 'var(--card)', border: '1.5px solid var(--border2)', borderRadius: 10,
              boxShadow: 'var(--shadow-md)', maxHeight: 240, overflowY: 'auto',
            }}
          >
            {loading && results.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>Buscando...</div>
            ) : results.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text3)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Inbox size={16} />
                Sin resultados
              </div>
            ) : (
              results.map((item) => {
                const itemDisabled = isItemDisabled?.(item) ?? false;
                return (
                  <div
                    key={item.id ?? getLabel(item)}
                    onClick={() => !itemDisabled && handleSelect(item)}
                    style={{
                      padding: '10px 14px', borderBottom: '1px solid var(--border)',
                      cursor: itemDisabled ? 'not-allowed' : 'pointer',
                      opacity: itemDisabled ? 0.5 : 1,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {renderItem ? renderItem(item) : <span style={{ fontSize: 13 }}>{getLabel(item)}</span>}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
