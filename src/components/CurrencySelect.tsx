import { currencies } from '../lib/currencies';

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export default function CurrencySelect({ value, onChange }: Props) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {currencies.map(c => (
        <option key={c.code} value={c.code}>
          {c.symbol} – {c.name} ({c.code})
        </option>
      ))}
    </select>
  );
}
