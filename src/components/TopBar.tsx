import { LANGUAGES } from '../lib/languages';
import type { TimeWindow } from '../lib/types';
import { ChevronIcon } from './Icons';

export const WINDOW_LABELS: Record<TimeWindow, string> = {
  day: 'Today',
  week: 'This week',
  month: 'This month',
};

interface TopBarProps {
  window: TimeWindow;
  language: string;
  onWindowChange: (window: TimeWindow) => void;
  onLanguageChange: (language: string) => void;
}

export default function TopBar({ window, language, onWindowChange, onLanguageChange }: TopBarProps) {
  return (
    <header className="topbar">
      <h1 className="brand">G.tok</h1>
      <div className="filters">
        <label className="picker">
          <span className="visually-hidden">Created</span>
          <select
            value={window}
            onChange={(event) => {
              event.currentTarget.blur();
              onWindowChange(event.target.value as TimeWindow);
            }}
          >
            {Object.entries(WINDOW_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronIcon />
        </label>
        <label className="picker">
          <span className="visually-hidden">Language</span>
          <select
            value={language}
            onChange={(event) => {
              event.currentTarget.blur();
              onLanguageChange(event.target.value);
            }}
          >
            <option value="">All languages</option>
            {LANGUAGES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronIcon />
        </label>
      </div>
    </header>
  );
}
