import './index.css';
import { DeviceProvider } from './context/DeviceContext';
import { ToastProvider } from './context/ToastContext';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <ToastProvider>
      <DeviceProvider>
        <Dashboard />
      </DeviceProvider>
    </ToastProvider>
  );
}
