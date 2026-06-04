import { useEffect, useState, useRef } from 'react';
import { Save, Building, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessProfile } from '../hooks/useBusinessProfile';
import CurrencySelect from '../components/CurrencySelect';

export default function Settings() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, refetch } = useBusinessProfile();
  const [activeTab, setActiveTab] = useState('business');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [business, setBusiness] = useState({
    business_name: '', email: '', phone: '', address: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [defaults, setDefaults] = useState(() => {
    const saved = localStorage.getItem('iq-defaults');
    return saved ? JSON.parse(saved) : {
      currency: 'USD', taxRate: 0, paymentTerms: 30, invoicePrefix: 'INV-', notes: '',
    };
  });

  // Pre-fill form when profile loads
  useEffect(() => {
    if (profile) {
      setBusiness({
        business_name: profile.business_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
      });
      setLogoUrl(profile.logo_url);
    }
  }, [profile]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Logo must be under 2MB.'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${user.id}/logo.${ext}`;

    // Remove old logo if exists (different extension)
    const { data: existing } = await supabase.storage.from('logos').list(user.id);
    if (existing && existing.length > 0) {
      await supabase.storage.from('logos').remove(existing.map(f => `${user.id}/${f.name}`));
    }

    const { error } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });
    if (error) { alert('Upload failed: ' + error.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
    // Append cache-buster so browsers pick up new logo
    setLogoUrl(urlData.publicUrl + '?t=' + Date.now());
    setUploading(false);
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    const { data: existing } = await supabase.storage.from('logos').list(user.id);
    if (existing && existing.length > 0) {
      await supabase.storage.from('logos').remove(existing.map(f => `${user.id}/${f.name}`));
    }
    setLogoUrl(null);
  };

  const handleSaveBusiness = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      business_name: business.business_name,
      email: business.email || null,
      phone: business.phone || null,
      address: business.address || null,
      logo_url: logoUrl || null,
      updated_at: new Date().toISOString(),
    };

    if (profile) {
      await (supabase.from('business_profiles') as any).update(payload).eq('id', profile.id);
    } else {
      await (supabase.from('business_profiles') as any).insert(payload);
    }

    setSaving(false);
    setSaved(true);
    refetch();
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

  if (profileLoading) return <div className="loading-screen"><div className="spinner" /></div>;

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

          {/* Logo Upload */}
          <div className="form-group">
            <label>Business Logo</label>
            <div className="logo-upload-area">
              {logoUrl ? (
                <div className="logo-preview-wrapper">
                  <img src={logoUrl} alt="Logo" className="logo-preview" />
                  <button type="button" onClick={handleRemoveLogo} className="btn btn-sm btn-ghost danger-text">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ) : (
                <div
                  className="logo-placeholder"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={24} />
                  <span>{uploading ? 'Uploading...' : 'Click to upload logo'}</span>
                  <span className="text-sm text-secondary">PNG, JPG up to 2MB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              {logoUrl && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-sm btn-ghost mt-2">
                  <Upload size={14} /> Change Logo
                </button>
              )}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Business Name *</label>
              <input type="text" value={business.business_name} onChange={e => setBusiness({ ...business, business_name: e.target.value })} placeholder="Your Business Name" required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={business.email} onChange={e => setBusiness({ ...business, email: e.target.value })} placeholder="billing@company.com" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="text" value={business.phone} onChange={e => setBusiness({ ...business, phone: e.target.value })} placeholder="+1 234 567 890" />
            </div>
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea value={business.address} onChange={e => setBusiness({ ...business, address: e.target.value })} rows={3} placeholder="Business address..." />
          </div>
          <div className="form-actions">
            <button onClick={handleSaveBusiness} className="btn btn-primary" disabled={saving || !business.business_name}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
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
