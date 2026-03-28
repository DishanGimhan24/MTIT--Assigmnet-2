import { useEffect, useState } from 'react';
import { customersApi } from '../api';
import Modal from '../components/Modal';
import './Page.css';

const empty = { name: '', email: '', phone: '', address: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { const res = await customersApi.getAll(); setCustomers(res.data); }
    catch { setError('Failed to load customers'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, email: c.email, phone: c.phone, address: c.address }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await customersApi.update(editing.id, form);
      else await customersApi.create(form);
      setShowModal(false); load();
    } catch { setError('Failed to save customer'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try { await customersApi.delete(id); load(); }
    catch { setError('Failed to delete customer'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>👥 Customers</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Customer</button>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? <div className="loading">Loading...</div> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>{c.address}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-edit" onClick={() => openEdit(c)}>✏️ Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(c.id)}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Customer' : 'Add Customer'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="form">
            <label>Name<input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></label>
            <label>Email<input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></label>
            <label>Phone<input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required /></label>
            <label>Address<input value={form.address} onChange={e => setForm({...form, address: e.target.value})} required /></label>
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
