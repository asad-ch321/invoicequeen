import { useEffect, useState, useRef } from 'react';
import { Save, Building, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessProfile } from '../hooks/useBusinessProfile';
import { useAiCredits } from '../hooks/useAiCredits';
import CurrencySelect from '../components/CurrencySelect';

export default function Settings() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, refetch } = useBusinessProfile();
  const { balance: aiBalance } = useAiCredits();
  const [activeTab, setActiveTab] = useState('business');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [business, setBusiness] = useState({
    business_name: '', email: '', phone: '', address: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [reminders, setReminders] = useState({
    reminder_enabled: false,
    late_fee_enabled: false,
    late_fee_percent: 0,
    late_fee_grace_days: 0,
  });

  const [payments, setPayments] = useState({
    paypal_me: '', stripe_payment_link: '', payment_instructions: '',
  });

  const [profiles, setProfiles] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ email: '', role: 'viewer' });

  const loadProfiles = async () => {
    if (!user) return;
    const { data } = await supabase.from('business_profiles').select('*').eq('user_id', user.id).order('created_at');
    setProfiles(data || []);
  };
  const loadTeam = async () => {
    if (!user) return;
    const { data } = await supabase.from('team_members').select('*').eq('owner_id', user.id).order('created_at');
    setTeam(data || []);
  };
  useEffect(() => { loadProfiles(); loadTeam(); }, [user]);

  const setDefaultProfile = async (pid: string) => {
    if (!user) return;
    await (supabase.from('business_profiles') as any).update({ is_default: false }).eq('user_id', user.id);
    await (supabase.from('business_profiles') as any).update({ is_default: true }).eq('id', pid);
    loadProfiles(); refetch();
  };
  const addProfile = async () => {
    if (!user) return;
    const name = window.prompt('Name for the new business profile:');
    if (!name?.trim()) return;
    await (supabase.from('business_profiles') as any).insert({ user_id: user.id, business_name: name.trim(), profile_name: name.trim(), is_default: false });
    loadProfiles();
  };
  const addMember = async () => {
    if (!user || !newMember.email.trim()) return;
    await (supabase.from('team_members') as any).insert({ owner_id: user.id, email: newMember.email.trim(), role: newMember.role });
    setNewMember({ email: '', role: 'viewer' });
    loadTeam();
  };
  const removeMember = async (id: string) => {
    await supabase.from('team_members').delete().eq('id', id);
    loadTeam();
  };

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
      setReminders({
        reminder_enabled: profile.reminder_enabled ?? false,
        late_fee_enabled: profile.late_fee_enabled ?? false,
        late_fee_percent: Number(profile.late_fee_percent) || 0,
        late_fee_grace_days: Number(profile.late_fee_grace_days) || 0,
      });
      setPayments({
        paypal_me: profile.paypal_me || '',
        stripe_payment_link: profile.stripe_payment_link || '',
        payment_instructions: profile.payment_instructions || '',
      });
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
      reminder_enabled: reminders.reminder_enabled,
      late_fee_enabled: reminders.late_fee_enabled,
      late_fee_percent: reminders.late_fee_percent,
      late_fee_grace_days: reminders.late_fee_grace_days,
      paypal_me: payments.paypal_me || null,
      stripe_payment_link: payments.stripe_payment_link || null,
      payment_instructions: payments.payment_instructions || null,
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
    { id: 'payments', label: 'Payments' },
    { id: 'reminders', label: 'Reminders & Late Fees' },
    { id: 'profiles', label: 'Business Profiles' },
    { id: 'team', label: 'Team' },
    { id: 'ai', label: 'AI Credits' },
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

      {activeTab === 'payments' && (
        <div className="card">
          <h3>Accept Payments</h3>
          <p className="text-sm text-secondary">
            Connect your own payment accounts. Payments go directly to you — InvoiceQueen never touches the funds.
            These links appear on invoices you send and on the client portal.
          </p>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>PayPal.me Username</label>
            <input
              type="text"
              value={payments.paypal_me}
              onChange={e => setPayments({ ...payments, paypal_me: e.target.value })}
              placeholder="e.g. kingasad (from paypal.me/kingasad)"
            />
            <span className="text-sm text-secondary">The invoice amount is added automatically.</span>
          </div>

          <div className="form-group">
            <label>Stripe Payment Link</label>
            <input
              type="text"
              value={payments.stripe_payment_link}
              onChange={e => setPayments({ ...payments, stripe_payment_link: e.target.value })}
              placeholder="https://buy.stripe.com/..."
            />
            <span className="text-sm text-secondary">Create one in your Stripe dashboard → Payment Links.</span>
          </div>

          <div className="form-group">
            <label>Other Payment Instructions</label>
            <textarea
              value={payments.payment_instructions}
              onChange={e => setPayments({ ...payments, payment_instructions: e.target.value })}
              rows={3}
              placeholder="Bank transfer details, IBAN, or other instructions shown on invoices..."
            />
          </div>

          <div className="form-actions">
            <button onClick={handleSaveBusiness} className="btn btn-primary" disabled={saving || !business.business_name}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Payment Settings'}
            </button>
          </div>
          {!business.business_name && (
            <p className="text-sm text-secondary">Set up your Business Profile first.</p>
          )}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="card">
          <h3>Automated Reminders & Late Fees</h3>
          <p className="text-sm text-secondary">
            Reminders are emailed daily to clients with overdue invoices (max once every 3 days per invoice).
          </p>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="flex gap-2" style={{ alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={reminders.reminder_enabled}
                onChange={e => setReminders({ ...reminders, reminder_enabled: e.target.checked })}
              />
              Send automatic payment reminders for overdue invoices
            </label>
          </div>

          <div className="form-group">
            <label className="flex gap-2" style={{ alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={reminders.late_fee_enabled}
                onChange={e => setReminders({ ...reminders, late_fee_enabled: e.target.checked })}
              />
              Apply late fees to overdue invoices
            </label>
          </div>

          {reminders.late_fee_enabled && (
            <div className="form-grid-2">
              <div className="form-group">
                <label>Late Fee (% of invoice total)</label>
                <input
                  type="number"
                  value={reminders.late_fee_percent}
                  onChange={e => setReminders({ ...reminders, late_fee_percent: parseFloat(e.target.value) || 0 })}
                  min="0" step="0.1"
                />
              </div>
              <div className="form-group">
                <label>Grace Period (days after due date)</label>
                <input
                  type="number"
                  value={reminders.late_fee_grace_days}
                  onChange={e => setReminders({ ...reminders, late_fee_grace_days: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
          )}

          <div className="form-actions">
            <button onClick={handleSaveBusiness} className="btn btn-primary" disabled={saving || !business.business_name}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          {!business.business_name && (
            <p className="text-sm text-secondary">Set up your Business Profile first to enable these settings.</p>
          )}
        </div>
      )}

      {activeTab === 'profiles' && (
        <div className="card">
          <div className="card-header-row">
            <h3>Business Profiles</h3>
            <button onClick={addProfile} className="btn btn-sm btn-primary"><Save size={16} /> Add Profile</button>
          </div>
          <p className="text-sm text-secondary">Run multiple businesses from one account. The default profile is used on new invoices; edit its details in the Business Profile tab.</p>
          <table className="table" style={{ marginTop: 12 }}>
            <thead><tr><th>Name</th><th>Default</th><th></th></tr></thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.profile_name || p.business_name}</td>
                  <td>{p.is_default ? <span className="badge badge-paid">Default</span> : <button onClick={() => setDefaultProfile(p.id)} className="btn btn-sm btn-ghost">Set Default</button>}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="card">
          <h3>Team Members</h3>
          <p className="text-sm text-secondary">
            Add teammates and assign roles. Note: shared login access for members is being rolled out —
            roles are recorded here now and will activate when member access goes live.
          </p>
          <div className="flex gap-2" style={{ marginTop: 12 }}>
            <input type="email" placeholder="teammate@email.com" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} />
            <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={addMember} className="btn btn-primary" disabled={!newMember.email.trim()}>Add</button>
          </div>
          <table className="table" style={{ marginTop: 16 }}>
            <thead><tr><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {team.map(m => (
                <tr key={m.id}>
                  <td>{m.email}</td>
                  <td><span className="badge badge-unpaid">{m.role}</span></td>
                  <td><button onClick={() => removeMember(m.id)} className="btn-icon danger"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="card">
          <h3>AI Credits</h3>
          <p className="text-sm text-secondary">
            AI features (invoice writer, smart due dates, reminder drafting) use credits. 1 credit = 1 AI action.
          </p>
          <div className="totals-section" style={{ marginTop: 16 }}>
            <div className="total-row total-final">
              <span>Current balance</span>
              <span>{aiBalance === null ? '…' : `${aiBalance} credits`}</span>
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={() => alert('Credit purchase checkout coming soon. For now, credits can be granted from the admin dashboard.')}
            >
              Buy Credits
            </button>
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
