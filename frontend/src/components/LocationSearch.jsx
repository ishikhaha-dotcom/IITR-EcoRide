import { useState, useEffect, useRef } from 'react';

export default function LocationSearch({ placeholder, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error('Nominatim search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (item) => {
    setQuery(item.display_name.split(',')[0]); // Use short name
    setIsOpen(false);
    if (onSelect) {
      onSelect({
        name: `Custom: ${item.display_name.split(',')[0]}`,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      });
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || "Where are you headed?"}
          className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl pl-10 pr-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder-slate-400"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin w-4 h-4 text-teal-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {results.map((item) => (
              <li 
                key={item.place_id}
                onClick={() => handleSelect(item)}
                className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-600 truncate">
                  {item.display_name.split(',')[0]}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {item.display_name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
