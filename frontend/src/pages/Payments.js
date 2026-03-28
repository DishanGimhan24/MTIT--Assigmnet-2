import { useEffect, useState } from 'react';
import { paymentsApi } from '../api';
import Modal from '../components/Modal';
import './Page.css';

const empty = { orderId: '', customerId: '', amount: '', method: 'credit_card' };
const METHODS = ['credit_card', 'debit_card', 'paypal', 'bank_transfer'];
const STATUSES = ['pending', 'completed', 'failed', 'refunded'];

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { const res = await paymentsApi.getAll(); setPayments(res.data); }
    catch { setError('Failed to load payments'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ orderId: p.orderId, customerId: p.customerId, amount: p.amount, method: p.method, status: p.status });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await paymentsApi.update(editing.id, { status: form.status });
      } else {
        await paymentsApi.create({ orderId: form.orderId, customerId: form.customerId, amount: parseFloat(form.amount), method: form.method });
      }
      setShowModal(false); load();
    } catch { setError('Failed to save payment'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment?')) return;
    try { await paymentsApi.delete(id); load(); }
    catch { setError('Failed to delete payment'); }
  };

  const statusColor = { pending: '#f9e2af', completed: '#a6e3a1', failed: '#f38ba8', refunded: '#89dceb' };

  return (
    <div className="page">
      <div className="page-header">
        <h1>💳 Payments</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Payment</button>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? <div className="loading">Loading...</div> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Order ID</th><th>Customer ID</th><th>Amount</th><th>Method</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td><code>{p.orderId}</code></td>
                  <td><code>{p.customerId}</code></td>
                  <td>${p.amount?.toFixed(2)}</td>
                  <td><span className="badge">{p.method}</span></td>
                  <td><span className="badge" style={{background: statusColor[p.status] || '#cdd6f4', color: '#1e1e2e'}}>{p.status}</span></td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-edit" onClick={() => openEdit(p)}>✏️ Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(p.id)}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Update Payment Status' : 'New Payment'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="form">
            {!editing ? (
              <>
                <label>Order ID<input value={form.orderId} onChange={e => setForm({...form, orderId: e.target.value})} required /></label>
                <label>Customer ID<input value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})} required /></label>
                <div className="form-row">
                  <label>Amount<input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required /></label>
                  <label>Method
                    <select value={form.method} onChange={e => setForm({...form, method: e.target.value})}>
                      {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <label>Status
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Update Status' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
