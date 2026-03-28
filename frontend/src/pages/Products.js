import { useEffect, useState } from 'react';
import { productsApi } from '../api';
import Modal from '../components/Modal';
import './Page.css';

const empty = { name: '', description: '', price: '', category: '', stock: '' };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { const res = await productsApi.getAll(); setProducts(res.data); }
    catch { setError('Failed to load products'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, description: p.description, price: p.price, category: p.category, stock: p.stock }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) };
    try {
      if (editing) await productsApi.update(editing.id, data);
      else await productsApi.create(data);
      setShowModal(false); load();
    } catch { setError('Failed to save product'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await productsApi.delete(id); load(); }
    catch { setError('Failed to delete product'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>📦 Products</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? <div className="loading">Loading...</div> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong><br/><small>{p.description}</small></td>
                  <td><span className="badge">{p.category}</span></td>
                  <td>${p.price?.toFixed(2)}</td>
                  <td>{p.stock}</td>
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
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="form">
            <label>Name<input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></label>
            <label>Description<input value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></label>
            <label>Category<input value={form.category} onChange={e => setForm({...form, category: e.target.value})} required /></label>
            <div className="form-row">
              <label>Price<input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required /></label>
              <label>Stock<input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required /></label>
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
