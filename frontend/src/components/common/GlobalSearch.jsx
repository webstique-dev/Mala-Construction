import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Boxes, HardHat, Receipt, UserCog, Wallet } from 'lucide-react';
import { useGlobalSearch } from '../../hooks/useSearch';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants';
import { formatCurrency, formatDate } from '../../utils/format';
import './GlobalSearch.css';

const SECTIONS = [
  { key: 'sites', label: 'Sites', icon: Building2, to: (item) => `/sites`, adminOnly: true },
  { key: 'siteAdmins', label: 'Site Admins', icon: UserCog, to: () => `/site-admins`, adminOnly: true },
  { key: 'workers', label: 'Workers', icon: HardHat, to: (item) => `/workers/${item._id}` },
  { key: 'materials', label: 'Materials', icon: Boxes, to: () => `/materials` },
  { key: 'payments', label: 'Payments', icon: Wallet, to: () => `/payments` },
  { key: 'expenses', label: 'Expenses', icon: Receipt, to: () => `/expenses` },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const { role } = useAuth();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const { data, isFetching } = useGlobalSearch(query);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasResults = data && data.total > 0;
  const showDropdown = isOpen && query.length >= 2;

  return (
    <div className="global-search" ref={containerRef}>
      <input
        type="search"
        placeholder="Search sites, workers, materials..."
        aria-label="Global search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />

      {showDropdown && (
        <div className="global-search__dropdown" role="listbox">
          {isFetching && <div className="global-search__status">Searching...</div>}
          {!isFetching && !hasResults && <div className="global-search__status">No results found.</div>}

          {!isFetching && hasResults && SECTIONS.map(({ key, label, icon: Icon, to, adminOnly }) => {
            if (adminOnly && !isSuperAdmin) return null;
            const items = data[key];
            if (!items?.length) return null;

            return (
              <div key={key} className="global-search__section">
                <div className="global-search__section-title"><Icon size={14} /> {label}</div>
                <ul>
                  {items.map((item) => (
                    <li key={item._id}>
                      <Link to={to(item)} onClick={() => { setIsOpen(false); setQuery(''); }}>
                        <span className="global-search__item-title">
                          {item.name || item.materialName || item.title || item.worker?.name}
                        </span>
                        <span className="global-search__item-meta">
                          {item.code && `${item.code} · `}
                          {item.site?.name && `${item.site.name} · `}
                          {item.totalAmount != null && formatCurrency(item.totalAmount)}
                          {item.netSalary != null && formatCurrency(item.netSalary)}
                          {item.amount != null && formatCurrency(item.amount)}
                          {item.date && formatDate(item.date)}
                          {item.paidOn && formatDate(item.paidOn)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
