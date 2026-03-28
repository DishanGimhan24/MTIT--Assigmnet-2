import { useEffect, useState } from 'react';
import { ordersApi } from '../api';
import Modal from '../components/Modal';
import './Page.css';

const empty = { customerId: '', products: '[{"productId":"","quantity":1,"price":0}]', totalAmount: '', status: 'pending' };
const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { const res = await ordersApi.getAll(); setOrders(res.data); }
    catch { setError('Failed to load orders'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (o) => {
    setEditing(o);
    setForm({ customerId: o.customerId, products: JSON.stringify(o.products, null, 2), totalAmount: o.totalAmount, status: o.status });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let products;
    try { products = JSON.parse(form.products); }
    catch { setError('Products must be valid JSON'); return; }
    const data = { customerId: form.customerId, products, totalAmount: parseFloat(form.totalAmount), status: form.status };
    try {
      if (editing) await ordersApi.update(editing.id, data);
      else await ordersApi.create(data);
      setShowModal(false); load();
    } catch { setError('Failed to save order'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    try { await ordersApi.delete(id); load(); }
    catch { setError('Failed to delete order'); }
  };

  const statusColor = { pending: '#f9e2af', confirmed: '#89dceb', shipped: '#89b4fa', delivered: '#a6e3a1', cancelled: '#f38ba8' };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🧾 Orders</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Order</button>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? <div className="loading">Loading...</div> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Customer ID</th><th>Products</th><th>Total</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td><code>{o.customerId}</code></td>
                  <td>{o.products?.length} item(s)</td>
                  <td>${o.totalAmount?.toFixed(2)}</td>
                  <td><span className="badge" style={{background: statusColor[o.status] || '#cdd6f4', color: '#1e1e2e'}}>{o.status}</span></td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-edit" onClick={() => openEdit(o)}>✏️ Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(o.id)}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Order' : 'Add Order'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="form">
            <label>Customer ID<input value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})} required /></label>
            <label>Products (JSON)
              <textarea rows={4} value={form.products} onChange={e => setForm({...form, products: e.target.value})} required />
            </label>
            <div className="form-row">
              <label>Total Amount<input type="number" step="0.01" value={form.totalAmount} onChange={e => setForm({...form, totalAmount: e.target.value})} required /></label>
              <label>Status
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
