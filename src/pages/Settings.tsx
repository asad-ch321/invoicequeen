import { useState } from 'react';
import { Save, Building } from 'lucide-react';
import CurrencySelect from '../components/CurrencySelect';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('business');
  const [saved, setSaved] = useState(false);

  const [business, setBusiness] = useState(() => {
    const saved = localStorage.getItem('iq-business');
    return saved ? JSON.parse(saved) : {
      name: '', email: '', phone: '', address: '', website: '', taxId: '', logo: '',
    };
  });

  const [defaults, setDefaults] = useState(() => {
    const saved = localStorage.getItem('iq-defaults');
    return saved ? JSON.parse(saved) : {
      currency: 'USD', taxRate: 0, paymentTerms: 30, invoicePrefix: 'INV-', notes: '',
    };
  });

  const handleSaveBusiness = () => {
    localStorage.setItem('iq-business', JSON.stringify(business));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveDefaults = () => {
    localStorage.setItem('iq-defaults', JSON.stringify(defaults));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'business', label: 'Business Profile' },
    { id: 'defaults', label: 'Invoice Defaults' },
    { id: 'templates', label: 'Templates' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        {saved && <span className="badge badge-paid">Saved!</span>}
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >{tab.label}</button>
        ))}
      </div>

      {activeTab === 'business' && (
        <div className="card">
          <div className="card-header-row">
            <h3>Business Profile</h3>
            <Building size={20} className="text-secondary" />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Business Name</label>
              <input type="text" value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })} placeholder="Your Business Name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={business.email} onChange={e => setBusiness({ ...business, email: e.target.value })} placeholder="billing@company.com" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="text" value={business.phone} onChange={e => setBusiness({ ...business, phone: e.target.value })} placeholder="+1 234 567 890" />
            </div>
            <div className="form-group">
              <label>Website</label>
              <input type="text" value={business.website} onChange={e => setBusiness({ ...business, website: e.target.value })} placeholder="https://company.com" />
            </div>
            <div className="form-group">
              <label>Tax ID</label>
              <input type="text" value={business.taxId} onChange={e => setBusiness({ ...business, taxId: e.target.value })} placeholder="Tax / VAT number" />
            </div>
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea value={business.address} onChange={e => setBusiness({ ...business, address: e.target.value })} rows={3} placeholder="Business address..." />
          </div>
          <div className="form-actions">
            <button onClick={handleSaveBusiness} className="btn btn-primary"><Save size={18} /> Save Profile</button>
          </div>
        </div>
      )}

      {activeTab === 'defaults' && (
        <div className="card">
          <h3>Invoice Defaults</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Default Currency</label>
              <CurrencySelect value={defaults.currency} onChange={v => setDefaults({ ...defaults, currency: v })} />
            </div>
            <div className="form-group">
              <label>Default Tax Rate (%)</label>
              <input type="number" value={defaults.taxRate} onChange={e => setDefaults({ ...defaults, taxRate: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
            </div>
            <div className="form-group">
              <label>Payment Terms (days)</label>
              <input type="number" value={defaults.paymentTerms} onChange={e => setDefaults({ ...defaults, paymentTerms: parseInt(e.target.value) || 30 })} min="0" />
            </div>
            <div className="form-group">
              <label>Invoice Prefix</label>
              <input type="text" value={defaults.invoicePrefix} onChange={e => setDefaults({ ...defaults, invoicePrefix: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Default Notes</label>
            <textarea value={defaults.notes} onChange={e => setDefaults({ ...defaults, notes: e.target.value })} rows={3} placeholder="Default invoice notes..." />
          </div>
          <div className="form-actions">
            <button onClick={handleSaveDefaults} className="btn btn-primary"><Save size={18} /> Save Defaults</button>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="card">
          <h3>Invoice Templates</h3>
          <div className="templates-grid">
            {['Classic', 'Modern', 'Minimal'].map(tpl => (
              <div key={tpl} className="template-card">
                <div className="template-preview" />
                <p className="font-medium">{tpl}</p>
                <p className="text-sm text-secondary">Clean and professional</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
