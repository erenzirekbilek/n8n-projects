import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TicketDetail from './pages/TicketDetail';

if (!localStorage.getItem('token')) {
  localStorage.setItem('token', 'demo-token');
  localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' }));
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
      </Routes>
    </BrowserRouter>
  );
}