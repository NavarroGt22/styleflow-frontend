import { useNavigate, useParams } from 'react-router-dom';
import AdminDashboard from '../admin-prototype/AdminDashboard';
import { getAdminPrototypePreset } from '../config/admin-prototype';

export default function AdminPrototype() {
  const { salonSlug = 'leleco' } = useParams();
  const navigate = useNavigate();
  const preset = getAdminPrototypePreset(salonSlug);

  return (
    <AdminDashboard
      brandName={preset.brandName}
      unitName={preset.unitName}
      ownerName={preset.ownerName}
      onLogout={() => navigate('/login')}
    />
  );
}
