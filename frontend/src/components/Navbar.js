import { NavLink } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">🛒 E-Commerce Admin</div>
      <div className="navbar-links">
        <NavLink to="/products" className={({ isActive }) => isActive ? 'active' : ''}>📦 Products</NavLink>
        <NavLink to="/customers" className={({ isActive }) => isActive ? 'active' : ''}>👥 Customers</NavLink>
        <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}>🧾 Orders</NavLink>
        <NavLink to="/payments" className={({ isActive }) => isActive ? 'active' : ''}>💳 Payments</NavLink>
      </div>
    </nav>
  );
}
